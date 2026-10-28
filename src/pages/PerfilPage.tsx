import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconoOjo, IconoVolver } from '../components/Iconos'
import type { MotivoPuntos } from '../lib/api'
import { useApi } from '../lib/contexto'
import { progresoDeNivel, NIVELES } from '../lib/niveles'
import { haceCuanto, NOMBRE_CATEGORIA, NOMBRE_ESTADO } from '../lib/textos'
import { useCarga } from '../lib/useCarga'

const MOTIVO: Record<MotivoPuntos, string> = {
  reporte_verificado: 'Reporte verificado',
  confirmacion_acertada: 'Confirmación acertada',
  reporte_reparado: 'Bono por reparación',
}

export function PerfilPage() {
  const api = useApi()
  const { datos: reportes } = useCarga(() => api.misReportes(), [api])
  const { datos: puntos } = useCarga(() => api.misPuntos(), [api])
  const { datos: avisos } = useCarga(() => api.misAvisos(), [api])
  const [pestana, setPestana] = useState<'reportes' | 'puntos'>('reportes')

  const total = (puntos ?? []).reduce((s, p) => s + p.puntos, 0)
  const nivel = progresoDeNivel(total)
  const mis = reportes ?? []
  const verificados = mis.filter((r) => ['verificado', 'programado', 'reparado'].includes(r.estado)).length
  const reparados = mis.filter((r) => r.estado === 'reparado').length
  const avisoDe = (reporteId: string) => (avisos ?? []).find((a) => a.reporte_id === reporteId)
  const categoriaDe = (reporteId: string) => {
    const r = mis.find((x) => x.id === reporteId)
    return r ? NOMBRE_CATEGORIA[r.categoria] : 'Reporte'
  }

  return (
    <div className="pantalla">
      <div className="cabecera">
        <Link to="/" aria-label="Volver al mapa" className="boton-redondo"><IconoVolver /></Link>
        <h1>Mi aporte</h1>
        <Link to="/barrio" style={{ fontSize: 15, fontWeight: 700, padding: '10px 4px' }}>Mi barrio</Link>
      </div>

      <div style={{ background: 'var(--tinta)', color: '#fff', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--dorado)', color: 'var(--tinta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconoOjo size={30} />
          </span>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: '#c9d1cc' }}>Tu nivel</span>
            <span style={{ fontSize: 24, fontWeight: 700 }}>{nivel.nivel.nombre}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>{total}</span>
            <span style={{ fontSize: 13, color: '#c9d1cc' }}>puntos</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="barra" role="progressbar" aria-label="Avance al siguiente nivel" aria-valuenow={Math.round(nivel.avance * 100)} aria-valuemin={0} aria-valuemax={100} style={{ background: 'rgba(255,255,255,.18)' }}>
            <span style={{ width: `${nivel.avance * 100}%`, background: 'var(--dorado)' }} />
          </div>
          <span style={{ fontSize: 13, color: '#c9d1cc' }}>
            {nivel.siguiente ? `Faltan ${nivel.faltan} puntos para ${nivel.siguiente.nombre}` : 'Llegaste al nivel más alto. ¡Gracias!'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, fontSize: 12, textAlign: 'center' }}>
          {NIVELES.map((n) => (
            <span key={n.id} style={n.id === nivel.nivel.id ? { padding: '6px 4px', borderRadius: 8, background: 'var(--dorado)', color: 'var(--tinta)', fontWeight: 700 } : { padding: '6px 4px', borderRadius: 8, background: 'rgba(255,255,255,.1)', color: '#c9d1cc' }}>
              {n.id === 'guardian' ? 'Guardián' : n.nombre} · {n.desde}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {[
          [mis.length, 'reportes', 'var(--tinta)'],
          [verificados, 'verificados', 'var(--tinta)'],
          [reparados, 'reparados', 'var(--verde)'],
        ].map(([n, t, c]) => (
          <div key={t} className="tarjeta" style={{ padding: 10, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: c as string }}>{n}</span>
            <span style={{ fontSize: 13, color: 'var(--gris)' }}>{t}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="segmentado">
          <button type="button" aria-pressed={pestana === 'reportes'} onClick={() => setPestana('reportes')}>Mis reportes</button>
          <button type="button" aria-pressed={pestana === 'puntos'} onClick={() => setPestana('puntos')}>Puntos</button>
        </div>
        {pestana === 'reportes' ? (
          mis.length === 0 ? (
            <p className="suave" style={{ padding: 8 }}>Todavía no reportas daños. Cuando lo hagas, aquí verás cómo avanzan.</p>
          ) : (
            mis.map((r) => {
              const aviso = avisoDe(r.id)
              return (
                <Fila key={r.id} href={aviso && r.estado === 'reparado' ? `/aviso/${aviso.id}` : `/reporte/${r.id}`} foto={r.fotos[0]} titulo={NOMBRE_CATEGORIA[r.categoria]} meta={haceCuanto(r.creado_en)} chip={<span className={`chip e-${r.estado}`}>{NOMBRE_ESTADO[r.estado]}</span>} />
              )
            })
          )
        ) : (puntos ?? []).length === 0 ? (
          <p className="suave" style={{ padding: 8 }}>Ganas 10 puntos cuando verifican un reporte tuyo, 3 cuando tu confirmación coincide con la revisión y 5 cuando reparan lo que reportaste.</p>
        ) : (
          (puntos ?? []).map((p, i) => (
            <Fila key={i} href={`/reporte/${p.reporte_id}`} titulo={categoriaDe(p.reporte_id)} meta={`${MOTIVO[p.motivo]} · ${haceCuanto(p.creado_en)}`} chip={<span className="chip puntos">+{p.puntos}</span>} />
          ))
        )}
      </div>

      <GuardarConCorreo />
    </div>
  )
}

function Fila({ href, foto, titulo, meta, chip }: { href: string; foto?: string; titulo: string; meta: string; chip: React.ReactNode }) {
  return (
    <Link to={href} className="tarjeta" style={{ padding: '10px 12px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'var(--tinta)', minHeight: 44 }}>
      {foto ? <img src={foto} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} /> : <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--borde-2)', flexShrink: 0 }} />}
      <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{titulo}</span>
        <span className="suave">{meta}</span>
      </span>
      {chip}
    </Link>
  )
}

function GuardarConCorreo() {
  const api = useApi()
  const [abierto, setAbierto] = useState(false)
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'enviado' | 'error'>('listo')

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEstado('enviando')
    try {
      await api.vincularCorreo(correo)
      setEstado('enviado')
    } catch {
      setEstado('error')
    }
  }

  return (
    <div style={{ marginTop: 'auto', background: 'var(--azul-suave)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: 1.35, color: 'var(--azul-texto)' }}>
      <span>Tu progreso vive en este teléfono.</span>
      {estado === 'enviado' ? (
        <span role="status" style={{ fontWeight: 700 }}>Te enviamos un correo para confirmarlo.</span>
      ) : abierto ? (
        <form onSubmit={enviar} style={{ display: 'flex', gap: 8 }}>
          <label className="visually-hidden" htmlFor="correo">Correo</label>
          <input id="correo" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.cl" style={{ flexGrow: 1, minWidth: 0, font: 'inherit', fontSize: 16, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--borde-2)' }} />
          <button type="submit" className="boton" style={{ minHeight: 44, fontSize: 15 }} disabled={estado === 'enviando'}>Guardar</button>
        </form>
      ) : (
        <button type="button" className="enlace" style={{ alignSelf: 'flex-start', padding: 0, minHeight: 24 }} onClick={() => setAbierto(true)}>Guardarlo con tu correo (opcional)</button>
      )}
      {estado === 'error' && <span className="error">No pudimos guardar el correo. Inténtalo de nuevo.</span>}
    </div>
  )
}
