import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Direccion } from '../components/Direccion'
import { IconoVolver } from '../components/Iconos'
import { useApi } from '../lib/contexto'
import { progresoDeNivel } from '../lib/niveles'
import { fechaCorta, NOMBRE_CATEGORIA } from '../lib/textos'
import { useCarga } from '../lib/useCarga'

export function AvisoPage() {
  const { id = '' } = useParams()
  const api = useApi()
  const { datos: avisos } = useCarga(() => api.misAvisos(), [api])
  const aviso = avisos?.find((a) => a.id === id)
  const { datos: r } = useCarga(() => (aviso ? api.obtenerReporte(aviso.reporte_id) : Promise.resolve(null)), [api, aviso?.reporte_id])
  const { datos: puntos } = useCarga(() => api.misPuntos(), [api])

  useEffect(() => {
    if (aviso && !aviso.leido) api.marcarAvisoLeido(aviso.id).catch(() => {})
  }, [api, aviso])

  if (avisos && !aviso) return <div className="pantalla"><p>No encontramos este aviso.</p><Link to="/perfil">Volver</Link></div>
  if (!aviso || !r) return <div className="pantalla"><p className="suave">Cargando…</p></div>

  const reparado = aviso.tipo === 'reparado'
  const total = (puntos ?? []).reduce((s, p) => s + p.puntos, 0)
  const nivel = progresoDeNivel(total).nivel.nombre
  const dias = r.reparado_en ? Math.max(1, Math.round((new Date(r.reparado_en).getTime() - new Date(r.creado_en).getTime()) / 86_400_000)) : null
  const otros = r.gravedades_confirmadas.length
  const categoria = NOMBRE_CATEGORIA[r.categoria].toLowerCase()

  const compartir = () => {
    const texto = reparado ? `Repararon un daño que reporté en VeredaViva (${categoria}).` : `La municipalidad programó la reparación de un daño que reporté en VeredaViva.`
    const url = `${location.origin}/reporte/${r.id}`
    if (navigator.share) navigator.share({ text: texto, url }).catch(() => {})
    else navigator.clipboard?.writeText(`${texto} ${url}`)
  }

  const linea = [
    ['Reportado', r.creado_en],
    ['Programado', r.programado_en],
    [dias ? `Reparado en ${dias} ${dias === 1 ? 'día' : 'días'}` : 'Reparado', r.reparado_en],
  ].filter(([, f]) => f) as [string, string][]

  return (
    <div className="pantalla">
      <div className="cabecera">
        <Link to="/perfil" aria-label="Volver" className="boton-redondo"><IconoVolver /></Link>
        <span style={{ fontSize: 15, color: 'var(--gris)' }}>Aviso de impacto</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className={`chip ${reparado ? 'e-reparado' : 'e-programado'}`} style={{ alignSelf: 'flex-start' }}>{reparado ? 'Reparado' : 'Programado'}</span>
        <h1 style={{ fontSize: 24, lineHeight: 1.2 }}>{reparado ? `Repararon el daño que reportaste` : 'La municipalidad programó la reparación'}</h1>
        <span style={{ fontSize: 15, color: 'var(--gris)' }}>{NOMBRE_CATEGORIA[r.categoria]} · <Direccion lat={r.lat} lng={r.lng} /></span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: reparado ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 8 }}>
        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {r.fotos[0] ? <img className="foto" src={r.fotos[0]} alt="Foto de antes" style={{ height: 150 }} /> : <div className="foto-vacia" style={{ height: 150 }}>Antes</div>}
          <figcaption className="suave">{fechaCorta(r.creado_en)} · tu foto</figcaption>
        </figure>
        {reparado && (
          <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {r.foto_reparacion ? <img className="foto" src={r.foto_reparacion} alt="Foto de después" style={{ height: 150 }} /> : <div className="foto-vacia" style={{ height: 150 }}>Sin foto de la reparación</div>}
            <figcaption className="suave">{r.reparado_en ? fechaCorta(r.reparado_en) : ''} · municipalidad</figcaption>
          </figure>
        )}
      </div>

      <ol className="tarjeta" style={{ listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {linea.map(([t, f]) => (
          <li key={t} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
            <span>{t}</span>
            <span className="suave">{fechaCorta(f)}</span>
          </li>
        ))}
      </ol>

      {reparado && (
        <div style={{ background: 'var(--amarillo)', color: 'var(--amarillo-texto)', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 700 }}>+5</span>
          <span style={{ fontSize: 15, lineHeight: 1.35 }}>
            puntos. Ya tienes {total} y eres <b>{nivel}</b>.{otros > 0 && ` Tú y otros ${otros} ${otros === 1 ? 'vecino' : 'vecinos'} lo hicieron posible.`}
          </span>
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <button type="button" className="boton secundario" onClick={compartir}>Compartir</button>
        <Link to="/barrio" className="boton">Ver mi barrio</Link>
      </div>
    </div>
  )
}
