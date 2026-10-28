import { Link } from 'react-router-dom'
import { IconoVolver } from '../components/Iconos'
import { useApi } from '../lib/contexto'
import { useCarga } from '../lib/useCarga'

const META_REVISADO = 80

export function BarrioPage() {
  const api = useApi()
  const { datos: sectores, error } = useCarga(() => api.progresoSectores(), [api])
  const lista = sectores ?? []
  const revisado = lista.length ? Math.round(lista.reduce((s, x) => s + x.pct_revisado, 0) / lista.length) : 0
  const reparados = lista.reduce((s, x) => s + x.reparados, 0)
  const total = lista.reduce((s, x) => s + x.total_reportes, 0)
  const dias = lista.map((x) => x.dias_respuesta_promedio).filter((d): d is number => d !== null)
  const diasPromedio = dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : null

  return (
    <div className="pantalla">
      <div className="cabecera">
        <Link to="/perfil" aria-label="Volver" className="boton-redondo"><IconoVolver /></Link>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 style={{ fontSize: 22 }}>Centro de Viña</h1>
          <span className="suave">Meta del piloto: revisar el {META_REVISADO} % de las calles</span>
        </div>
      </div>
      {error && <div className="error">No pudimos cargar el progreso: {error}</div>}
      {sectores && lista.length === 0 && <p className="suave">Todavía no hay sectores configurados para el piloto.</p>}

      {lista.length > 0 && (
        <>
          <div className="tarjeta" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ flexGrow: 1, fontSize: 15 }}>Calles revisadas por vecinos</span>
                <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--azul)' }}>{revisado} %</span>
              </div>
              <div className="barra" style={{ height: 12, overflow: 'visible' }} aria-hidden="true">
                <span style={{ width: `${revisado}%`, background: 'var(--azul)' }} />
                <span style={{ position: 'absolute', left: `${META_REVISADO}%`, top: -4, bottom: -4, width: 2, background: 'var(--tinta)' }} />
              </div>
              <span className="suave">La línea marca la meta del {META_REVISADO} %</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ flexGrow: 1, fontSize: 15 }}>Daños reparados</span>
                <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--verde)' }}>{total ? Math.round((reparados * 100) / total) : 0} %</span>
              </div>
              <div className="barra" style={{ height: 12 }} aria-hidden="true">
                <span style={{ width: `${total ? (reparados * 100) / total : 0}%`, background: 'var(--verde-fuerte)' }} />
              </div>
              <span className="suave">
                {reparados} de {total}
                {diasPromedio !== null && ` · la municipalidad responde en ${diasPromedio} días promedio`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 style={{ fontSize: 17, marginBottom: 4 }}>Por sector</h2>
            {lista.map((z) => (
              <div key={z.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', borderBottom: '1px solid var(--borde)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ flexGrow: 1, fontSize: 15, fontWeight: 700 }}>{z.nombre}</span>
                  <span className="suave">{z.pct_revisado} % revisado · {z.pct_reparado} % reparado</span>
                </div>
                <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
                  <div className="barra" style={{ height: 8 }}><span style={{ width: `${z.pct_revisado}%`, background: 'var(--azul)' }} /></div>
                  <div className="barra" style={{ height: 8 }}><span style={{ width: `${z.pct_reparado}%`, background: 'var(--verde-fuerte)' }} /></div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--gris)', paddingTop: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--azul)' }} />Revisadas</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--verde-fuerte)' }} />Reparadas</span>
            </div>
          </div>
        </>
      )}

      <Link to="/" className="boton" style={{ marginTop: 'auto' }}>Salir a revisar calles</Link>
    </div>
  )
}
