import type { Map as LeafletMap } from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker } from 'react-leaflet'
import { Link, useNavigate } from 'react-router-dom'
import { MapaBase } from '../components/MapaBase'
import { IconoCamara, IconoCheck, IconoFiltros, IconoOjo, IconoUbicarme } from '../components/Iconos'
import { useApi } from '../lib/contexto'
import { CENTRO_VINA, distanciaMetros } from '../lib/geo'
import { gravedadDe } from '../lib/reporte'
import { COLOR_GRAVEDAD, NOMBRE_CATEGORIA, NOMBRE_GRAVEDAD } from '../lib/textos'
import { CATEGORIAS, type Categoria, type Gravedad } from '../lib/tipos'
import { filtrosIniciales, pasaFiltros, type Filtros } from '../lib/filtros'
import { useCarga } from '../lib/useCarga'
import { FiltrosHoja } from './FiltrosHoja'

const ABIERTOS = ['nuevo', 'verificado', 'programado']
const RADIO: Record<Gravedad, number> = { 1: 8, 2: 11, 3: 14 }

export function MapaPage() {
  const api = useApi()
  const navigate = useNavigate()
  const mapa = useRef<LeafletMap>(null)
  const { datos: reportes, error } = useCarga(() => api.listarReportes(), [api])
  const { datos: puntos } = useCarga(() => api.misPuntos(), [api])
  const { datos: avisos } = useCarga(() => api.misAvisos(), [api])
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales)
  const [verFiltros, setVerFiltros] = useState(false)

  const visibles = useMemo(() => (reportes ?? []).filter((r) => pasaFiltros(r, filtros, gravedadDe(r))), [reportes, filtros])
  const abiertos = (reportes ?? []).filter((r) => ABIERTOS.includes(r.estado)).length
  const total = (puntos ?? []).reduce((s, p) => s + p.puntos, 0)
  const avisoNuevo = (avisos ?? []).find((a) => !a.leido)
  const unaCategoria = filtros.categorias.size === 1 ? [...filtros.categorias][0] : null

  const elegirChip = (c: Categoria | null) =>
    setFiltros({ ...filtros, categorias: new Set(c ? [c] : CATEGORIAS) })

  const centrarEnMi = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => mapa.current?.flyTo([p.coords.latitude, p.coords.longitude], 17),
      () => alert('No pudimos obtener tu ubicación. Revisa los permisos del navegador.'),
    )

  return (
    <div className="mapa-pantalla">
      <MapaBase centro={CENTRO_VINA} mapaRef={mapa} etiqueta="Mapa de reportes del centro de Viña del Mar">
        {visibles.map((r) => {
          const g = gravedadDe(r)
          return (
            <CircleMarker
              key={r.id}
              center={[r.lat, r.lng]}
              radius={RADIO[g]}
              pathOptions={{ color: '#fff', weight: 3, fillColor: r.estado === 'reparado' ? '#1e6b35' : COLOR_GRAVEDAD[g], fillOpacity: 1 }}
              eventHandlers={{ click: () => navigate(`/reporte/${r.id}`) }}
            />
          )
        })}
      </MapaBase>

      {/* Los marcadores del mapa no se alcanzan con teclado: esta lista sí. */}
      <ul className="visually-hidden">
        {visibles.map((r) => (
          <li key={r.id}>
            <Link to={`/reporte/${r.id}`}>
              {NOMBRE_CATEGORIA[r.categoria]}, {NOMBRE_GRAVEDAD[gravedadDe(r)]}, {r.gravedades_confirmadas.length} confirmaciones
            </Link>
          </li>
        ))}
      </ul>

      <div className="mapa-arriba">
        <div className="barra-titulo flotante">
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 19, fontWeight: 700 }}>VeredaViva</span>
            <span className="suave">Centro de Viña del Mar · {abiertos} reportes abiertos</span>
          </div>
          <Link to="/perfil" className="chip puntos" aria-label={`Mi aporte: ${total} puntos`} style={{ height: 44, display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, textDecoration: 'none', borderRadius: 12 }}>
            <IconoOjo />
            {total}
          </Link>
          <button type="button" aria-label="Filtros" className="boton-redondo" style={{ borderRadius: 12, background: 'var(--fondo-2)', border: 'none' }} onClick={() => setVerFiltros(true)}>
            <IconoFiltros />
          </button>
        </div>
        <div className="chips-scroll">
          <button type="button" aria-pressed={filtros.categorias.size === CATEGORIAS.length} onClick={() => elegirChip(null)}>
            Todos
          </button>
          {CATEGORIAS.map((c) => (
            <button key={c} type="button" aria-pressed={unaCategoria === c} onClick={() => elegirChip(c)}>
              {NOMBRE_CATEGORIA[c]}
            </button>
          ))}
        </div>
        {avisoNuevo && (
          <Link to={`/aviso/${avisoNuevo.id}`} className="tarjeta flotante" style={{ textDecoration: 'none', color: 'var(--verde)', fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
            <IconoCheck />
            {avisoNuevo.tipo === 'reparado' ? 'Repararon un daño que reportaste' : 'La municipalidad programó un daño que reportaste'}
          </Link>
        )}
        {error && <div className="error">No pudimos cargar los reportes: {error}</div>}
      </div>

      <div className="mapa-abajo">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div className="leyenda flotante">
            <span><span className="punto-gravedad" style={{ width: 12, height: 12, background: 'var(--leve)', border: '1px solid #8a6d00' }} />Leve</span>
            <span><span className="punto-gravedad" style={{ width: 15, height: 15, background: 'var(--moderado)' }} />Moderado</span>
            <span><span className="punto-gravedad" style={{ width: 18, height: 18, background: 'var(--peligroso)' }} />Peligroso</span>
          </div>
          <button type="button" aria-label="Centrar en mi ubicación" className="boton-redondo flotante" style={{ width: 48, height: 48, border: 'none', color: 'var(--azul)' }} onClick={centrarEnMi}>
            <IconoUbicarme />
          </button>
        </div>
        <Link to="/reportar" className="boton" style={{ minHeight: 60, fontSize: 19, borderRadius: 16, boxShadow: '0 4px 14px rgba(11,79,138,.35)' }}>
          <IconoCamara />
          Reportar un daño
        </Link>
        <TramoSinDanos />
      </div>

      {verFiltros && (
        <FiltrosHoja
          inicial={filtros}
          reportes={reportes ?? []}
          onCerrar={() => setVerFiltros(false)}
          onAplicar={(f) => {
            setFiltros(f)
            setVerFiltros(false)
          }}
        />
      )}
    </div>
  )
}

// "Todo bien aquí": el vecino camina un tramo y lo marca sin daños. Así se
// mide qué porcentaje de calles ya se revisó.
function TramoSinDanos() {
  const api = useApi()
  const [puntos, setPuntos] = useState<[number, number][] | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const vigilancia = useRef<number | null>(null)

  useEffect(() => () => {
    if (vigilancia.current !== null) navigator.geolocation.clearWatch(vigilancia.current)
  }, [])

  const empezar = () => {
    if (!navigator.geolocation) return setMensaje('Tu navegador no permite usar el GPS.')
    setMensaje(null)
    setPuntos([])
    vigilancia.current = navigator.geolocation.watchPosition(
      (p) => setPuntos((prev) => [...(prev ?? []), [p.coords.latitude, p.coords.longitude]]),
      () => {
        setMensaje('No pudimos obtener tu ubicación. Revisa los permisos del navegador.')
        setPuntos(null)
      },
      { enableHighAccuracy: true },
    )
  }

  const terminar = async () => {
    if (vigilancia.current !== null) navigator.geolocation.clearWatch(vigilancia.current)
    vigilancia.current = null
    const tramo = puntos ?? []
    setPuntos(null)
    let largo = 0
    for (let i = 1; i < tramo.length; i++) largo += distanciaMetros(...tramo[i - 1], ...tramo[i])
    if (tramo.length < 2 || largo < 10) return setMensaje('El tramo es muy corto. Camina al menos una cuadra antes de terminar.')
    try {
      await api.marcarTramoSinDanos(tramo)
      setMensaje(`Gracias: marcaste ${Math.round(largo)} metros sin daños.`)
    } catch {
      setMensaje('No pudimos guardar el tramo. Inténtalo de nuevo.')
    }
  }

  return (
    <>
      {mensaje && (
        <div className="tarjeta flotante" role="status" style={{ fontSize: 14 }}>
          {mensaje}
        </div>
      )}
      {puntos === null ? (
        <button type="button" className="boton secundario flotante" style={{ minHeight: 48, fontSize: 16, color: 'var(--verde)', borderColor: '#c9cec6', borderWidth: 1 }} onClick={empezar}>
          <IconoCheck />
          Todo bien aquí: tramo sin daños
        </button>
      ) : (
        <button type="button" className="boton flotante" style={{ minHeight: 48, fontSize: 16, background: 'var(--verde-fuerte)', borderColor: 'var(--verde-fuerte)' }} onClick={terminar}>
          Caminando el tramo… tocar al terminar
        </button>
      )}
    </>
  )
}
