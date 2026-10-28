import type { Map as LeafletMap } from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { useMapEvents } from 'react-leaflet'
import { Link, useNavigate } from 'react-router-dom'
import { Direccion } from '../components/Direccion'
import { IconoCerrar, IconoCheck, IconoVolver } from '../components/Iconos'
import { ICONO_CATEGORIA } from '../lib/iconos'
import { MapaBase } from '../components/MapaBase'
import { SelectorGravedad } from '../components/SelectorGravedad'
import type { ReportePublico } from '../lib/api'
import { useApi } from '../lib/contexto'
import { prepararFoto } from '../lib/fotos'
import { CENTRO_VINA, distanciaMetros } from '../lib/geo'
import { gravedadDe } from '../lib/reporte'
import { haceCuanto, NOMBRE_CATEGORIA, NOMBRE_ESTADO, NOMBRE_GRAVEDAD } from '../lib/textos'
import { CATEGORIAS, type Categoria, type Gravedad } from '../lib/tipos'

type Paso = 'foto' | 'ubicacion' | 'categoria' | 'duplicado' | 'enviado'

interface Borrador {
  fotos: { blob: Blob; url: string }[]
  lat: number
  lng: number
  precision: number | null
  categoria: Categoria | null
  gravedad: Gravedad | null
  descripcion: string
}

export function ReportarPage() {
  const api = useApi()
  const [paso, setPaso] = useState<Paso>('foto')
  const [b, setB] = useState<Borrador>({ fotos: [], lat: CENTRO_VINA[0], lng: CENTRO_VINA[1], precision: null, categoria: null, gravedad: null, descripcion: '' })
  const [duplicado, setDuplicado] = useState<ReportePublico | null>(null)
  const [resultado, setResultado] = useState<{ id: string; confirmacion: boolean } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  // Pedimos el GPS al entrar, para que el paso 2 ya parta en el lugar.
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setB((x) => ({ ...x, lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy })),
      () => {},
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }, [])

  const crear = async () => {
    setEnviando(true)
    setFallo(null)
    try {
      const id = await api.crearReporte({ categoria: b.categoria!, gravedad: b.gravedad!, descripcion: b.descripcion.trim() || null, fotos: b.fotos.map((f) => f.blob), lat: b.lat, lng: b.lng })
      setResultado({ id, confirmacion: false })
      setPaso('enviado')
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No pudimos enviar el reporte.')
    } finally {
      setEnviando(false)
    }
  }

  const enviar = async () => {
    setEnviando(true)
    setFallo(null)
    try {
      const cercanos = await api.cercanos(b.lat, b.lng, b.categoria!)
      if (cercanos.length > 0) {
        setDuplicado(cercanos[0])
        setPaso('duplicado')
        setEnviando(false)
        return
      }
    } catch {
      // Si la búsqueda falla, enviamos igual: un duplicado es mejor que perder el reporte.
    }
    await crear()
  }

  const confirmarExistente = async () => {
    if (!duplicado) return
    setEnviando(true)
    setFallo(null)
    try {
      await api.confirmar(duplicado.id, b.gravedad!, { foto: b.fotos[0]?.blob })
      setResultado({ id: duplicado.id, confirmacion: true })
      setPaso('enviado')
    } catch (e) {
      setFallo(e instanceof Error ? e.message : 'No pudimos guardar tu confirmación.')
    } finally {
      setEnviando(false)
    }
  }

  if (paso === 'foto') return <PasoFoto b={b} setB={setB} onSiguiente={() => setPaso('ubicacion')} />
  if (paso === 'ubicacion') return <PasoUbicacion b={b} setB={setB} onVolver={() => setPaso('foto')} onSiguiente={() => setPaso('categoria')} />
  if (paso === 'categoria')
    return <PasoCategoria b={b} setB={setB} enviando={enviando} fallo={fallo} onVolver={() => setPaso('ubicacion')} onEnviar={enviar} />
  if (paso === 'duplicado' && duplicado)
    return <PasoDuplicado r={duplicado} b={b} enviando={enviando} fallo={fallo} onConfirmar={confirmarExistente} onEsOtro={crear} />
  return <PasoEnviado b={b} resultado={resultado!} />
}

type PropsPaso = { b: Borrador; setB: (f: (b: Borrador) => Borrador) => void }

function Progreso({ n, texto, oscuro }: { n: number; texto: string; oscuro?: boolean }) {
  return (
    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 14, color: oscuro ? '#d3d9d5' : 'var(--gris)' }}>Paso {n} de 3 · {texto}</span>
      <div className="pasos" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={i <= n ? 'hecho' : ''} style={oscuro ? { background: i <= n ? '#fff' : 'rgba(255,255,255,.25)' } : undefined} />
        ))}
      </div>
    </div>
  )
}

function PasoFoto({ b, setB, onSiguiente }: PropsPaso & { onSiguiente: () => void }) {
  const camara = useRef<HTMLInputElement>(null)
  const galeria = useRef<HTMLInputElement>(null)
  const [procesando, setProcesando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  const agregar = async (archivos: FileList | null) => {
    if (!archivos?.length) return
    setProcesando(true)
    setFallo(null)
    try {
      const nuevas = await Promise.all([...archivos].slice(0, 3 - b.fotos.length).map((f) => prepararFoto(f)))
      setB((x) => ({ ...x, fotos: [...x.fotos, ...nuevas.map((blob) => ({ blob, url: URL.createObjectURL(blob) }))] }))
    } catch {
      setFallo('No pudimos leer esa foto. Prueba con otra.')
    } finally {
      setProcesando(false)
    }
  }
  const quitar = (i: number) => setB((x) => ({ ...x, fotos: x.fotos.filter((_, j) => j !== i) }))
  const ultima = b.fotos[b.fotos.length - 1]

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: '#101614', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 8px' }}>
        <Link to="/" aria-label="Cancelar reporte" className="boton-redondo" style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff' }}>
          <IconoCerrar />
        </Link>
        <Progreso n={1} texto="Foto" oscuro />
      </div>

      <div style={{ margin: '8px 16px 0', flexGrow: 1, minHeight: 300, borderRadius: 18, background: '#2a3330', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aeb7b2', fontSize: 14 }}>
        {ultima ? <img src={ultima.url} alt="Última foto tomada" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Toca el botón blanco para abrir la cámara'}
        <span style={{ position: 'absolute', left: 16, right: 16, bottom: 16, background: 'rgba(16,22,20,.75)', borderRadius: 12, padding: '10px 12px', fontSize: 14, lineHeight: 1.35, color: '#fff', textAlign: 'center' }}>
          Acércate al daño y deja algo de contexto: la esquina, un poste o la fachada.
        </span>
      </div>

      <div style={{ padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[0, 1, 2].map((i) =>
            b.fotos[i] ? (
              <button key={i} type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => quitar(i)} style={{ width: 52, height: 52, padding: 0, borderRadius: 10, border: '2px solid #fff', overflow: 'hidden', background: 'none' }}>
                <img src={b.fotos[i].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ) : (
              <span key={i} aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 10, border: '2px dashed rgba(255,255,255,.35)' }} />
            ),
          )}
          <span style={{ marginLeft: 6, fontSize: 14, color: '#d3d9d5' }}>{procesando ? 'Procesando…' : `${b.fotos.length} de 3 fotos`}</span>
        </div>
        {fallo && <div className="error">{fallo}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', alignItems: 'center' }}>
          <button type="button" onClick={() => galeria.current?.click()} disabled={b.fotos.length >= 3} style={{ justifySelf: 'start', height: 44, padding: '0 14px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: 15 }}>
            Galería
          </button>
          <button type="button" aria-label="Tomar foto" onClick={() => camara.current?.click()} disabled={b.fotos.length >= 3} style={{ justifySelf: 'center', width: 76, height: 76, borderRadius: '50%', border: '5px solid #fff', background: '#fff', boxShadow: 'inset 0 0 0 4px #101614' }} />
          <button type="button" onClick={onSiguiente} disabled={b.fotos.length === 0} style={{ justifySelf: 'end', height: 44, padding: '0 16px', borderRadius: 12, border: 'none', background: '#fff', color: '#101614', fontSize: 15, fontWeight: 700, opacity: b.fotos.length ? 1 : 0.45 }}>
            Siguiente
          </button>
        </div>
        <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={(e) => agregar(e.target.files)} />
        <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={(e) => agregar(e.target.files)} />
      </div>
    </div>
  )
}

function SeguirCentro({ onMover }: { onMover: (lat: number, lng: number) => void }) {
  useMapEvents({ moveend: (e) => {
    const c = e.target.getCenter()
    onMover(c.lat, c.lng)
  } })
  return null
}

function PasoUbicacion({ b, setB, onVolver, onSiguiente }: PropsPaso & { onVolver: () => void; onSiguiente: () => void }) {
  const mapa = useRef<LeafletMap>(null)
  const inicial = useRef<[number, number]>([b.lat, b.lng])
  // Si el GPS llega después de abrir este paso, movemos el mapa una vez.
  useEffect(() => {
    if (b.precision !== null && distanciaMetros(b.lat, b.lng, ...inicial.current) > 30 && mapa.current) {
      inicial.current = [b.lat, b.lng]
      mapa.current.setView([b.lat, b.lng])
    }
  }, [b.lat, b.lng, b.precision])

  return (
    <div className="mapa-pantalla">
      <MapaBase centro={[b.lat, b.lng]} zoom={18} mapaRef={mapa} etiqueta="Mapa para ajustar la ubicación del daño">
        <SeguirCentro onMover={(lat, lng) => setB((x) => ({ ...x, lat, lng }))} />
      </MapaBase>
      <div className="flotante" style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 500, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" aria-label="Volver a la foto" className="boton-redondo" style={{ background: 'var(--fondo-2)', border: 'none' }} onClick={onVolver}>
          <IconoVolver />
        </button>
        <Progreso n={2} texto="Ubicación" />
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', zIndex: 500, pointerEvents: 'none', transform: 'translate(-50%, -100%)' }}>
        <span style={{ position: 'absolute', left: '50%', bottom: 62, transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: 'var(--tinta)', color: '#fff', fontSize: 13, padding: '6px 10px', borderRadius: 8 }}>Mueve el mapa, no el pin</span>
        <svg width="44" height="56" viewBox="0 0 44 56"><path d="M22 2C11 2 3 10 3 21c0 14 19 33 19 33s19-19 19-33C41 10 33 2 22 2z" fill="#0B4F8A" stroke="#FFFFFF" strokeWidth="3" /><circle cx="22" cy="21" r="7" fill="#FFFFFF" /></svg>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 500, background: '#fff', borderRadius: '22px 22px 0 0', padding: '18px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 -4px 18px rgba(20,32,27,.14)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 14, color: 'var(--gris)' }}>El daño está en</span>
          <span style={{ fontSize: 19, fontWeight: 700 }}><Direccion lat={Number(b.lat.toFixed(5))} lng={Number(b.lng.toFixed(5))} /></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: b.precision !== null && b.precision <= 30 ? 'var(--verde)' : 'var(--gris)' }}>
          {b.precision !== null && b.precision <= 30 && <IconoCheck size={18} />}
          {b.precision === null ? 'Sin GPS: ubica el daño moviendo el mapa' : `GPS con margen de ${Math.round(b.precision)} metros`}
        </div>
        <button type="button" className="boton" onClick={onSiguiente}>Confirmar ubicación</button>
      </div>
    </div>
  )
}

function PasoCategoria({ b, setB, enviando, fallo, onVolver, onEnviar }: PropsPaso & { enviando: boolean; fallo: string | null; onVolver: () => void; onEnviar: () => void }) {
  const [conDetalle, setConDetalle] = useState(b.descripcion !== '')
  return (
    <div className="pantalla" style={{ padding: 0, gap: 0 }}>
      <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--borde)' }}>
        <button type="button" aria-label="Volver a la ubicación" className="boton-redondo" style={{ background: 'var(--fondo-2)', border: 'none' }} onClick={onVolver}>
          <IconoVolver />
        </button>
        <Progreso n={3} texto="Qué y qué tan grave" />
      </div>
      <div style={{ flexGrow: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ fontSize: 21 }}>¿Qué encontraste?</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {CATEGORIAS.map((c) => (
            <button key={c} type="button" className="opcion" aria-pressed={b.categoria === c} onClick={() => setB((x) => ({ ...x, categoria: c }))} style={{ minHeight: 72, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 6, padding: '10px 12px', fontSize: 15 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONO_CATEGORIA[c]} /></svg>
              {NOMBRE_CATEGORIA[c]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 17 }}>¿Qué tan grave te parece?</h2>
          <SelectorGravedad valor={b.gravedad} onCambio={(g) => setB((x) => ({ ...x, gravedad: g }))} />
          <span className="suave" style={{ lineHeight: 1.35 }}>Es tu opinión. Las confirmaciones de otros vecinos y la municipalidad la ajustan después.</span>
        </div>
        {conDetalle ? (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, fontWeight: 700 }}>
            Detalle (opcional)
            <textarea rows={3} maxLength={280} value={b.descripcion} onChange={(e) => setB((x) => ({ ...x, descripcion: e.target.value }))} placeholder="Por ejemplo: la rampa está tapada por un poste de faena" />
            <span className="suave" style={{ fontWeight: 400, alignSelf: 'flex-end' }}>{b.descripcion.length}/280</span>
          </label>
        ) : (
          <button type="button" className="enlace" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => setConDetalle(true)}>+ Agregar un detalle (opcional)</button>
        )}
        {fallo && <div className="error">{fallo}</div>}
        <button type="button" className="boton" style={{ marginTop: 'auto' }} disabled={!b.categoria || !b.gravedad || enviando} onClick={onEnviar}>
          {enviando ? 'Enviando…' : 'Enviar reporte'}
        </button>
      </div>
    </div>
  )
}

function PasoDuplicado({ r, b, enviando, fallo, onConfirmar, onEsOtro }: { r: ReportePublico; b: Borrador; enviando: boolean; fallo: string | null; onConfirmar: () => void; onEsOtro: () => void }) {
  const g = gravedadDe(r)
  const n = r.gravedades_confirmadas.length
  return (
    <div className="hoja-fondo" style={{ position: 'fixed' }}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="titulo-duplicado" style={{ minHeight: '80dvh', gap: 16 }}>
        <span className="asa" aria-hidden="true" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 id="titulo-duplicado" style={{ fontSize: 22, lineHeight: 1.2 }}>Alguien ya reportó algo parecido aquí</h1>
          <span style={{ fontSize: 15, color: 'var(--gris)' }}>A {Math.round(distanciaMetros(b.lat, b.lng, r.lat, r.lng))} metros, en la misma categoría</span>
        </div>
        <div style={{ border: '1px solid var(--borde)', borderRadius: 16, overflow: 'hidden' }}>
          {r.fotos[0] ? <img src={r.fotos[0]} alt="Foto del reporte existente" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} /> : <div className="foto-vacia" style={{ height: 120, borderRadius: 0 }}>Sin foto</div>}
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="chip categoria">{NOMBRE_CATEGORIA[r.categoria]}</span>
              <span className={`chip g${g}`}>{NOMBRE_GRAVEDAD[g]}</span>
            </div>
            {r.descripcion && <span style={{ fontSize: 16 }}>{r.descripcion}</span>}
            <span style={{ fontSize: 14, color: 'var(--gris)' }}>
              {n} {n === 1 ? 'vecino lo vio' : 'vecinos lo vieron'} · reportado {haceCuanto(r.creado_en)} · {NOMBRE_ESTADO[r.estado]}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 17, fontWeight: 700 }}>¿Es el mismo daño?</span>
        {fallo && <div className="error">{fallo}</div>}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" className="boton" disabled={enviando} onClick={onConfirmar}>Sí, es el mismo: confirmarlo</button>
          <button type="button" className="boton secundario" disabled={enviando} onClick={onEsOtro}>No, es otro: enviar el mío</button>
          <span className="suave" style={{ textAlign: 'center', lineHeight: 1.35 }}>Si confirmas, tu foto y tu gravedad se suman al reporte que ya existe.</span>
        </div>
      </div>
    </div>
  )
}

function PasoEnviado({ b, resultado }: { b: Borrador; resultado: { id: string; confirmacion: boolean } }) {
  const navigate = useNavigate()
  return (
    <div className="pantalla" style={{ padding: '24px 20px', gap: 20 }}>
      <div role="status" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
        <span aria-hidden="true" style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--verde-fuerte)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <IconoCheck size={46} />
        </span>
        <h1 style={{ fontSize: 26, lineHeight: 1.2 }}>{resultado.confirmacion ? 'Gracias, sumaste tu confirmación' : 'Gracias, tu reporte ya está en el mapa'}</h1>
        <p style={{ fontSize: 16, lineHeight: 1.45, color: 'var(--tinta-2)', maxWidth: 320 }}>
          {resultado.confirmacion ? 'Cada confirmación sube la prioridad del daño para la municipalidad.' : 'Cuando otros vecinos lo confirmen, sube su prioridad para la municipalidad.'}
        </p>
        <span className="chip puntos" style={{ fontSize: 15, padding: '8px 14px' }}>
          {resultado.confirmacion ? '+3 puntos si tu gravedad coincide con la revisión' : '+10 puntos cuando lo verifiquen'}
        </span>
      </div>
      <div className="tarjeta" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {b.fotos[0] ? <img src={b.fotos[0].url} alt="Tu foto" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }} /> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{b.categoria ? NOMBRE_CATEGORIA[b.categoria] : ''}</span>
          <span style={{ fontSize: 14, color: 'var(--gris)' }}>Código {resultado.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>
      <p className="suave" style={{ fontSize: 14, lineHeight: 1.4, textAlign: 'center' }}>Guardamos tus reportes en este teléfono, sin cuenta, para que veas cómo avanzan en «Mi aporte».</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" className="boton" onClick={() => navigate(`/reporte/${resultado.id}`)}>Ver en el mapa</button>
        <button type="button" className="boton secundario" onClick={() => navigate('/reportar')}>Reportar otro daño</button>
      </div>
    </div>
  )
}
