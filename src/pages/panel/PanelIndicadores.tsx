import { useApi } from '../../lib/contexto'
import { calcularIndicadores } from '../../lib/panel'
import { useCarga } from '../../lib/useCarga'

const fmt = (n: number | null, unidad = 'días') => (n === null ? 'Sin datos' : `${n.toLocaleString('es-CL', { maximumFractionDigits: 1 })} ${unidad}`)

export function PanelIndicadores() {
  const api = useApi()
  const { datos } = useCarga(() => api.listarReportes(), [api])
  const { datos: sectores } = useCarga(() => api.progresoSectores(), [api])
  const { datos: metros } = useCarga(() => api.metrosRevisados(), [api])
  const reportes = datos ?? []
  const ind = calcularIndicadores(reportes)
  const esteMes = ind.porMes[ind.porMes.length - 1]
  const maximo = Math.max(1, ...ind.porMes.flatMap((m) => [m.recibidos, m.reparados]))
  const obras = reportes.filter((r) => r.categoria === 'obra_inconclusa' && r.estado !== 'descartado' && r.estado !== 'reparado').length

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Indicadores de respuesta</h1>
          <span className="suave" style={{ fontSize: 14 }}>Centro de Viña del Mar · últimos 4 meses</span>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><span>Del reporte a la verificación</span><strong>{fmt(ind.diasAVerificar)}</strong></div>
        <div className="kpi"><span>Del reporte a la reparación</span><strong>{fmt(ind.diasAReparar)}</strong><span className="suave">Peligrosos: {fmt(ind.diasARepararPeligrosos)}</span></div>
        <div className="kpi"><span>Reparaciones este mes</span><strong style={{ color: 'var(--verde)' }}>{esteMes.reparados}</strong><span className="suave">de {esteMes.recibidos} reportes recibidos</span></div>
        <div className="kpi"><span>Calles revisadas por vecinos</span><strong>{metros === null ? '…' : fmt(metros / 1000, 'km')}</strong><span className="suave">sin salidas de inspección</span></div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>
        <section aria-labelledby="titulo-meses" className="caja" style={{ flex: '999 1 520px', minWidth: 0, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
            <h2 id="titulo-meses" style={{ fontSize: 18, flexGrow: 1 }}>Reportes recibidos y reparados por mes</h2>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#9db8d3' }} />Recibidos</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--verde-fuerte)' }} />Reparados</span>
          </div>
          <div role="img" aria-label={ind.porMes.map((m) => `${m.mes}: ${m.recibidos} recibidos, ${m.reparados} reparados`).join('; ')}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ind.porMes.length}, minmax(0, 1fr))`, gap: 24, alignItems: 'end', height: 260, borderBottom: '1px solid #c9cec6', padding: '0 12px' }}>
              {ind.porMes.map((m) => (
                <div key={m.mes} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, height: '100%' }}>
                  {[[m.recibidos, '#9db8d3', 'var(--tinta-2)'], [m.reparados, 'var(--verde-fuerte)', 'var(--verde)']].map(([n, fondo, texto], i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%', width: '40%' }}>
                      <span style={{ fontSize: 13, color: texto as string, fontWeight: i ? 700 : 400 }}>{n}</span>
                      <span style={{ display: 'block', width: '100%', borderRadius: '4px 4px 0 0', background: fondo as string, height: Math.round(((n as number) / maximo) * 220) }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ind.porMes.length}, minmax(0, 1fr))`, gap: 24, padding: '6px 12px 0', textAlign: 'center', fontSize: 14, color: 'var(--gris)' }}>
              {ind.porMes.map((m) => <span key={m.mes}>{m.mes}</span>)}
            </div>
          </div>
        </section>

        <section aria-labelledby="titulo-sectores" className="caja" style={{ flex: '1 1 360px', padding: 18, display: 'flex', flexDirection: 'column', gap: 10, overflowX: 'auto' }}>
          <h2 id="titulo-sectores" style={{ fontSize: 18 }}>Tiempo hasta reparar, por sector</h2>
          <table className="tabla">
            <thead><tr><th>Sector</th><th>Días</th><th>Reparados</th></tr></thead>
            <tbody>
              {[...(sectores ?? [])]
                .sort((a, b) => (a.dias_respuesta_promedio ?? Infinity) - (b.dias_respuesta_promedio ?? Infinity))
                .map((s) => (
                  <tr key={s.id} style={{ cursor: 'default' }}>
                    <td>{s.nombre}</td>
                    <td>{s.dias_respuesta_promedio === null ? '—' : Math.round(s.dias_respuesta_promedio)}</td>
                    <td>{s.reparados} de {s.total_reportes}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <span className="suave" style={{ lineHeight: 1.4 }}>Obras inconclusas abiertas con evidencia para el contratista: {obras}</span>
        </section>
      </div>
    </>
  )
}
