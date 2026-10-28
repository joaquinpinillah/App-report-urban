import type { SupabaseClient } from '@supabase/supabase-js'
import type { Api, NuevoReporte } from './api'

async function subirFoto(db: SupabaseClient, foto: Blob): Promise<string> {
  const ruta = `${crypto.randomUUID()}.jpg`
  const { error } = await db.storage.from('fotos').upload(ruta, foto, { contentType: 'image/jpeg' })
  if (error) throw error
  return db.storage.from('fotos').getPublicUrl(ruta).data.publicUrl
}

function ok<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error
  return r.data as T
}

export function crearApiSupabase(db: SupabaseClient): Api {
  return {
    modo: 'supabase',

    async iniciarSesion() {
      // Sesión anónima: el progreso del vecino queda en este teléfono.
      const { data } = await db.auth.getSession()
      if (!data.session) ok(await db.auth.signInAnonymously())
    },

    async listarReportes() {
      return ok(await db.from('reportes_publicos').select('*'))
    },

    async obtenerReporte(id) {
      return ok(await db.from('reportes_publicos').select('*').eq('id', id).maybeSingle())
    },

    async cercanos(lat, lng, categoria) {
      return ok(await db.rpc('reportes_cercanos', { lat, lng, cat: categoria }))
    },

    async crearReporte(r: NuevoReporte) {
      const fotos = await Promise.all(r.fotos.map((f) => subirFoto(db, f)))
      const { data: sesion } = await db.auth.getUser()
      const fila = ok<{ id: string }>(
        await db
          .from('reportes')
          .insert({
            categoria: r.categoria,
            gravedad_propuesta: r.gravedad,
            descripcion: r.descripcion,
            fotos,
            ubicacion: `SRID=4326;POINT(${r.lng} ${r.lat})`,
            autor_id: sesion.user?.id,
          })
          .select('id')
          .single(),
      )
      return fila.id
    },

    async confirmar(reporteId, gravedad, opciones = {}) {
      const foto = opciones.foto ? await subirFoto(db, opciones.foto) : null
      const { data: sesion } = await db.auth.getUser()
      ok(
        await db.from('confirmaciones').insert({
          reporte_id: reporteId,
          gravedad,
          sigue_roto: opciones.sigueRoto ?? false,
          foto,
          autor_id: sesion.user?.id,
        }),
      )
    },

    async yaConfirme(reporteId) {
      return ok(await db.rpc('ya_confirme', { reporte: reporteId })) as boolean
    },

    async misReportes() {
      return ok(await db.rpc('mis_reportes'))
    },

    async misPuntos() {
      return ok(await db.from('puntos').select('motivo, puntos, reporte_id, creado_en').order('creado_en', { ascending: false }))
    },

    async misAvisos() {
      return ok(await db.from('avisos').select('*').order('creado_en', { ascending: false }))
    },

    async marcarAvisoLeido(id) {
      ok(await db.from('avisos').update({ leido: true }).eq('id', id))
    },

    async progresoSectores() {
      return ok(await db.from('progreso_sectores').select('*').order('nombre'))
    },

    async marcarTramoSinDanos(puntos) {
      const linea = puntos.map(([lat, lng]) => `${lng} ${lat}`).join(', ')
      const { data: sesion } = await db.auth.getUser()
      ok(await db.from('tramos_sin_danos').insert({ trazado: `SRID=4326;LINESTRING(${linea})`, autor_id: sesion.user?.id }))
    },

    async vincularCorreo(correo) {
      const { error } = await db.auth.updateUser({ email: correo })
      if (error) throw error
    },
  }
}
