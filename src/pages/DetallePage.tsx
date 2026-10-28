import { useState } from 'react'
import { CircleMarker } from 'react-leaflet'
import { Link, useParams } from 'react-router-dom'
import { Direccion } from '../components/Direccion'
import { IconoVolver } from '../components/Iconos'
import { MapaBase } from '../components/MapaBase'
import { SelectorGravedad } from '../components/SelectorGravedad'
import type { ReportePublico } from '../lib/api'
import { useApi } from '../lib/contexto'
import { gravedadDe } from '../lib/reporte'
import { COLOR_GRAVEDAD, haceCuanto, NOMBRE_CATEGORIA, NOMBRE_ESTADO, NOMBRE_GRAVEDAD } from '../lib/textos'
import type { Gravedad } from '../lib/tipos'
import { useCarga } from '../lib/useCarga'

const PASOS = ['nuevo', 'verificado', 'programado', 'reparado'] as const

// Explica por qué el reporte tiene la gravedad que muestra el mapa.
function explicacion(r: ReportePublico, g: Gravedad): string {
  const propuesta = NOMBRE_GRAVEDAD[r.gravedad_propuesta].toLowerCase()
  if (r.gravedad_municipal) return `El vecino propuso ${propuesta}. La municipalidad la fijó en ${NOMBRE_GRAVEDAD[r.gravedad_municipal].toLowerCase()}.`
  const n = r.gravedades_confirmadas.length
  if (g === r.gravedad_propuesta) {
    return n === 0
      ? `Es la gravedad que propuso el vecino. Cambiará si otros vecinos la ven distinta.`
      : `El vecino propuso ${propuesta} y ${n} ${n === 1 ? 'confirmación coincide' : 'confirmaciones coinciden'}.`
  }
  const razones = []
  if (n > 0) razones.push(`${n} ${n === 1 ? 'confirmación' : 'confirmaciones'}`)
  if (g > r.gravedad_propuesta && (r.categoria === 'accesibilidad' || r.categoria === 'obra_inconclusa'))
    razones.push(`la regla de ${NOMBRE_CATEGORIA[r.categoria].toLowerCase()}`)
  const verbo = g > r.gravedad_propuesta ? 'La subieron' : 'La bajaron'
  return `El vecino propuso ${propuesta}. ${verbo} ${razones.join(' y ')}.`
}

export function DetallePage() {
  const { id = '' } = useParams()
  const api = useApi()
  const { datos: r, error, recargar } = useCarga(() => api.obtenerReporte(id), [api, id])
  const { datos: yaConfirme, recargar: recargarConfirmacion } = useCarga(() => api.yaConfirme(id), [api, id])
  const [eligiendo, setEligiendo] = useState(false)
  const [gravedad, setGravedad] = useState<Gravedad | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  if (error) return <div className="pantalla"><div className="error">No pudimos cargar el reporte: {error}</div></div>
  if (r === null) return <div className="pantalla"><p className="suave">Cargando…</p></div>
  if (!r) return <div className="pantalla"><p>Este reporte no existe.</p><Link to="/">Volver al mapa</Link></div>

  const g = gravedadDe(r)
  const n = r.gravedades_confirmadas.length
  const paso = PASOS.indexOf(r.estado as (typeof PASOS)[number])

  const enviar = async (gr: Gravedad, sigueRoto = false) => {
    setEnviando(true)
    setFallo(null)
    try {
      await api.confirmar(r.id, gr, { sigueRoto })
      setEligiendo(false)
      recargar()
      recargarConfirmacion()
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No pudimos guardar tu confirmación.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ position: 'relative', height: 236 }}>
        <MapaBase centro={[r.lat, r.lng]} zoom={18} interactivo={false} etiqueta="Mapa centrado en el reporte">
          <CircleMarker center={[r.lat, r.lng]} radius={16} pathOptions={{ color: '#fff', weight: 4, fillColor: COLOR_GRAVEDAD[g], fillOpacity: 1 }} />
        </MapaBase>
        <Link to="/" aria-label="Volver al mapa" className="boton-redondo flotante" style={{ position: 'absolute', left: 12, top: 12, zIndex: 500, border: 'none' }}>
          <IconoVolver />
        </Link>
      </div>

      <div style={{ flexGrow: 1, marginTop: -20, position: 'relative', zIndex: 600, background: '#fff', borderRadius: '22px 22px 0 0', boxShadow: '0 -4px 18px rgba(20,32,27,.14)', padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="chip categoria">{NOMBRE_CATEGORIA[r.categoria]}</span>
          <span className={`chip g${g}`}>{NOMBRE_GRAVEDAD[g]}</span>
          <span className="suave" style={{ marginLeft: 'auto' }}>{haceCuanto(r.creado_en)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ fontSize: 21, lineHeight: 1.2 }}>{NOMBRE_CATEGORIA[r.categoria]}</h1>
          <span style={{ fontSize: 14, color: 'var(--gris)' }}><Direccion lat={r.lat} lng={r.lng} /></span>
        </div>
        {r.fotos[0] ? (
          <img className="foto" src={r.fotos[0]} alt="Foto del daño tomada por el vecino" style={{ height: 180 }} />
        ) : (
          <div className="foto-vacia" style={{ height: 120 }}>Sin foto</div>
        )}
        {r.descripcion && <p style={{ fontSize: 15, lineHeight: 1.4 }}>{r.descripcion}</p>}
        <div className="nota" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 700, color: 'var(--tinta)' }}>Por qué es {NOMBRE_GRAVEDAD[g].toLowerCase()}</span>
          <span>{explicacion(r, g)}</span>
        </div>

        {r.estado === 'descartado' ? (
          <span className="chip e-descartado" style={{ alignSelf: 'flex-start' }}>Descartado por la municipalidad</span>
        ) : (
          <ol aria-label={`Estado: ${NOMBRE_ESTADO[r.estado]}`} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, fontSize: 12, textAlign: 'center' }}>
            {PASOS.map((p, i) => (
              <li key={p} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', fontWeight: i === paso ? 700 : 400, color: i <= paso ? 'var(--tinta)' : 'var(--gris)' }}>
                <span style={{ width: '100%', height: 5, borderRadius: 3, background: i <= paso ? 'var(--azul)' : 'var(--borde-2)' }} />
                {NOMBRE_ESTADO[p]}
              </li>
            ))}
          </ol>
        )}

        {fallo && <div className="error">{fallo}</div>}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {r.estado === 'reparado' ? (
            <button type="button" className="boton secundario" disabled={enviando || !!yaConfirme} onClick={() => enviar(g, true)}>
              {yaConfirme ? 'Gracias, lo revisaremos' : 'Sigue roto: reabrir el reporte'}
            </button>
          ) : r.estado === 'descartado' ? null : yaConfirme ? (
            <button type="button" className="boton marcado" disabled>
              Confirmado · {n} {n === 1 ? 'vecino lo vio' : 'vecinos lo vieron'}
            </button>
          ) : eligiendo ? (
            <>
              <h2 style={{ fontSize: 17 }}>¿Qué tan grave te parece?</h2>
              <SelectorGravedad valor={gravedad} onCambio={setGravedad} />
              <button type="button" className="boton" disabled={!gravedad || enviando} onClick={() => gravedad && enviar(gravedad)}>
                Confirmar
              </button>
            </>
          ) : (
            <button type="button" className="boton" onClick={() => setEligiendo(true)}>
              Yo también lo vi{n > 0 ? ` · ${n} ${n === 1 ? 'vecino' : 'vecinos'}` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
