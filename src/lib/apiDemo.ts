import type { Api, Aviso, CambioHistorial, MovimientoPuntos, Nota, ProgresoSector, ReportePublico } from './api'
import { distanciaMetros } from './geo'
import type { Categoria, Gravedad } from './tipos'

// Datos de ejemplo alrededor de Plaza Vergara, para recorrer la app sin
// backend. Nada de esto se guarda: se reinicia al recargar la página.
const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()

function ejemplo(
  id: string,
  categoria: Categoria,
  gravedad: Gravedad,
  lat: number,
  lng: number,
  descripcion: string,
  extra: Partial<ReportePublico> = {},
): ReportePublico {
  return {
    id,
    categoria,
    gravedad_propuesta: gravedad,
    gravedad_municipal: null,
    descripcion,
    fotos: [],
    lat,
    lng,
    estado: 'nuevo',
    creado_en: hace(3),
    gravedades_confirmadas: [],
    programado_en: null,
    reparado_en: null,
    foto_reparacion: null,
    sector_id: 1,
    verificado_en: null,
    ...extra,
  }
}

export function crearApiDemo(): Api {
  const misIds = new Set(['demo-1', 'demo-5'])
  const confirmados = new Set<string>()
  const reportes: ReportePublico[] = [
    ejemplo('demo-1', 'accesibilidad', 2, -33.02455, -71.5521, 'Un poste de faena tapa la rampa de la esquina. En silla de ruedas hay que bajar a la calzada.', {
      estado: 'reparado',
      gravedades_confirmadas: [3, 3, 3, 2, 3, 3, 3, 3, 3],
      creado_en: hace(15),
      verificado_en: hace(13),
      programado_en: hace(6),
      reparado_en: hace(0),
    }),
    ejemplo('demo-2', 'calzada', 3, -33.0262, -71.5545, 'Bache profundo en la pista derecha.', { estado: 'verificado', verificado_en: hace(1), gravedades_confirmadas: [3, 2, 3], sector_id: 2 }),
    ejemplo('demo-3', 'vereda', 2, -33.0231, -71.5502, 'Baldosas levantadas por raíces.', { gravedades_confirmadas: [2] }),
    ejemplo('demo-4', 'senaletica_alumbrado', 1, -33.0219, -71.5487, 'Luminaria apagada hace una semana.'),
    ejemplo('demo-5', 'obra_inconclusa', 2, -33.0271, -71.5509, 'Zanja tapada con tablas desde hace un mes.', {
      estado: 'programado',
      verificado_en: hace(2),
      programado_en: hace(1),
      sector_id: 3,
      gravedades_confirmadas: [2, 3, 2],
    }),
    ejemplo('demo-6', 'calzada', 1, -33.0249, -71.5562, 'Tapa de alcantarilla suelta.', { sector_id: 4 }),
    ejemplo('demo-7', 'vereda', 2, -33.0228, -71.5531, 'Vereda hundida frente al paradero.', {
      estado: 'reparado',
      creado_en: hace(40),
      verificado_en: hace(37),
      reparado_en: hace(30),
      gravedades_confirmadas: [2, 2, 2],
      sector_id: 2,
    }),
  ]
  const puntos: MovimientoPuntos[] = [
    { motivo: 'reporte_reparado', puntos: 5, reporte_id: 'demo-1', creado_en: hace(0) },
    { motivo: 'reporte_verificado', puntos: 10, reporte_id: 'demo-5', creado_en: hace(2) },
    { motivo: 'reporte_verificado', puntos: 10, reporte_id: 'demo-1', creado_en: hace(13) },
  ]
  const avisos: Aviso[] = [
    { id: 'aviso-1', reporte_id: 'demo-1', tipo: 'reparado', leido: false, creado_en: hace(0) },
    { id: 'aviso-2', reporte_id: 'demo-5', tipo: 'programado', leido: false, creado_en: hace(1) },
  ]
  const sectores: ProgresoSector[] = [
    { id: 1, nombre: 'Plaza Vergara', pct_revisado: 88, pct_reparado: 45, reparados: 5, total_reportes: 11, dias_respuesta_promedio: 6 },
    { id: 2, nombre: 'Av. Libertad', pct_revisado: 71, pct_reparado: 30, reparados: 3, total_reportes: 10, dias_respuesta_promedio: 8 },
    { id: 3, nombre: 'Calle Valparaíso', pct_revisado: 64, pct_reparado: 40, reparados: 4, total_reportes: 10, dias_respuesta_promedio: 5 },
    { id: 4, nombre: 'Calle Quillota', pct_revisado: 28, pct_reparado: 10, reparados: 1, total_reportes: 7, dias_respuesta_promedio: null },
  ]
  const fotoLocal = (b: Blob) => URL.createObjectURL(b)
  let funcionario = false
  const notas: Record<string, Nota[]> = {}
  const historial: Record<string, CambioHistorial[]> = {}
  const ahora = () => new Date().toISOString()

  return {
    modo: 'demo',
    async iniciarSesion() {},
    async listarReportes() {
      return reportes
    },
    async obtenerReporte(id) {
      return reportes.find((r) => r.id === id) ?? null
    },
    async cercanos(lat, lng, categoria) {
      return reportes.filter(
        (r) =>
          r.categoria === categoria &&
          ['nuevo', 'verificado', 'programado'].includes(r.estado) &&
          distanciaMetros(lat, lng, r.lat, r.lng) <= 15,
      )
    },
    async crearReporte(r) {
      const id = `demo-${reportes.length + 1}`
      reportes.push(ejemplo(id, r.categoria, r.gravedad, r.lat, r.lng, r.descripcion ?? '', { fotos: r.fotos.map(fotoLocal), creado_en: hace(0) }))
      misIds.add(id)
      return id
    },
    async confirmar(reporteId, gravedad, opciones = {}) {
      const r = reportes.find((x) => x.id === reporteId)
      if (!r) return
      confirmados.add(reporteId)
      r.gravedades_confirmadas = [...r.gravedades_confirmadas, gravedad]
      if (opciones.sigueRoto && r.estado === 'reparado') r.estado = 'verificado'
      if (r.estado === 'nuevo' && r.gravedades_confirmadas.length >= 3) r.estado = 'verificado'
    },
    async yaConfirme(reporteId) {
      return confirmados.has(reporteId)
    },
    async misReportes() {
      return reportes.filter((r) => misIds.has(r.id)).reverse()
    },
    async misPuntos() {
      return puntos
    },
    async misAvisos() {
      return avisos
    },
    async marcarAvisoLeido(id) {
      const a = avisos.find((x) => x.id === id)
      if (a) a.leido = true
    },
    async progresoSectores() {
      return sectores
    },
    async marcarTramoSinDanos() {},
    async vincularCorreo() {},

    async esFuncionario() {
      return funcionario
    },
    async entrarComoFuncionario() {
      funcionario = true
    },
    async salir() {
      funcionario = false
    },
    async actualizarReporte(id, cambios) {
      const r = reportes.find((x) => x.id === id)
      if (!r) return
      const h = (historial[id] ??= [])
      if (cambios.estado && cambios.estado !== r.estado) {
        h.unshift({ detalle: `Estado: ${r.estado} → ${cambios.estado}`, creado_en: ahora() })
        if (cambios.estado === 'verificado' && !r.verificado_en) r.verificado_en = ahora()
        if (cambios.estado === 'programado') r.programado_en = ahora()
        if (cambios.estado === 'reparado') r.reparado_en = ahora()
        r.estado = cambios.estado
      }
      if (cambios.gravedad_municipal !== undefined && cambios.gravedad_municipal !== r.gravedad_municipal) {
        h.unshift({ detalle: `Gravedad final: ${cambios.gravedad_municipal ?? 'sin fijar'}`, creado_en: ahora() })
        r.gravedad_municipal = cambios.gravedad_municipal
      }
      if (cambios.fotoReparacion) r.foto_reparacion = fotoLocal(cambios.fotoReparacion)
    },
    async notas(id) {
      return notas[id] ?? []
    },
    async agregarNota(id, texto) {
      ;(notas[id] ??= []).unshift({ texto, creado_en: ahora() })
    },
    async historial(id) {
      return historial[id] ?? []
    },
    async metrosRevisados() {
      return 18_200
    },
  }
}
