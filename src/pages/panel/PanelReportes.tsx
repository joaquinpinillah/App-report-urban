import { useEffect, useMemo, useState } from 'react'
import { Direccion } from '../../components/Direccion'
import type { ReportePublico } from '../../lib/api'
import { useApi } from '../../lib/contexto'
import { prepararFoto } from '../../lib/fotos'
import { ABIERTOS, aCsv, codigo, descargar, ordenarPorPrioridad } from '../../lib/panel'
import { gravedadDe } from '../../lib/reporte'
import { fechaCorta, haceCuanto, NOMBRE_CATEGORIA, NOMBRE_ESTADO, NOMBRE_GRAVEDAD } from '../../lib/textos'
import { CATEGORIAS, ESTADOS, type Categoria, type Estado, type Gravedad } from '../../lib/tipos'
import { useCarga } from '../../lib/useCarga'

const DIA = 86_400_000

interface FiltrosPanel {
  sector: string
  categoria: Categoria | ''
  gravedad: string
  estado: Estado | 'abiertos' | ''
  desde: string
  hasta: string
  buscar: string
}

export function PanelReportes() {
  const api = useApi()
  const { datos, error, recargar } = useCarga(() => api.listarReportes(), [api])
  const { datos: sectores } = useCarga(() => api.progresoSectores(), [api])
  const [f, setF] = useState<FiltrosPanel>({ sector: '', categoria: '', gravedad: '', estado: 'abiertos', desde: '', hasta: '', buscar: '' })
  const [elegido, setElegido] = useState<string | null>(null)

  const todos = useMemo(() => datos ?? [], [datos])
  const nombreSector = (id: number | null) => sectores?.find((s) => s.id === id)?.nombre ?? ''
  const filtrados = useMemo(() => {
    const q = f.buscar.trim().toLowerCase()
    return ordenarPorPrioridad(
      todos.filter(
        (r) =>
          (!f.sector || String(r.sector_id) === f.sector) &&
          (!f.categoria || r.categoria === f.categoria) &&
          (!f.gravedad || String(gravedadDe(r)) === f.gravedad) &&
          (f.estado === '' ? true : f.estado === 'abiertos' ? (ABIERTOS as readonly string[]).includes(r.estado) : r.estado === f.estado) &&
          (!f.desde || r.creado_en.slice(0, 10) >= f.desde) &&
          (!f.hasta || r.creado_en.slice(0, 10) <= f.hasta) &&
          (!q || codigo(r).toLowerCase().includes(q) || (r.descripcion ?? '').toLowerCase().includes(q)),
      ),
    )
  }, [todos, f])

  const seleccionado = filtrados.find((r) => r.id === elegido) ?? filtrados[0] ?? null
  const hace30 = Date.now() - 30 * DIA
  const kpis = [
    ['Nuevos sin revisar', todos.filter((r) => r.estado === 'nuevo').length, undefined],
    ['Peligrosos abiertos', todos.filter((r) => (ABIERTOS as readonly string[]).includes(r.estado) && gravedadDe(r) === 3).length, 'var(--peligroso)'],
    ['Programados', todos.filter((r) => r.estado === 'programado').length, undefined],
    ['Reparados en 30 días', todos.filter((r) => r.reparado_en && new Date(r.reparado_en).getTime() >= hace30).length, 'var(--verde)'],
  ] as const

  const campo = <K extends keyof FiltrosPanel>(k: K) => ({ value: f[k], onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }) })

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Reportes</h1>
          <span className="suave" style={{ fontSize: 14 }}>Centro de Viña del Mar · ordenados por prioridad</span>
        </div>
        <button type="button" className="boton" onClick={() => descargar(`veredaviva-reportes-${new Date().toISOString().slice(0, 10)}.csv`, aCsv(filtrados))}>
          Exportar planilla (CSV)
        </button>
      </div>

      <div className="kpis">
        {kpis.map(([t, n, c]) => (
          <div key={t} className="kpi"><span>{t}</span><strong style={{ color: c }}>{n}</strong></div>
        ))}
      </div>

      <div className="filtros-panel">
        <label>Sector
          <select {...campo('sector')}>
            <option value="">Todos</option>
            {(sectores ?? []).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </label>
        <label>Categoría
          <select {...campo('categoria')}>
            <option value="">Todas</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{NOMBRE_CATEGORIA[c]}</option>)}
          </select>
        </label>
        <label>Gravedad
          <select {...campo('gravedad')}>
            <option value="">Todas</option>
            <option value="3">Peligroso</option>
            <option value="2">Moderado</option>
            <option value="1">Leve</option>
          </select>
        </label>
        <label>Estado
          <select {...campo('estado')}>
            <option value="abiertos">Abiertos</option>
            <option value="">Todos</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{NOMBRE_ESTADO[e]}</option>)}
          </select>
        </label>
        <label>Desde<input type="date" {...campo('desde')} /></label>
        <label>Hasta<input type="date" {...campo('hasta')} /></label>
        <label style={{ flex: '1 1 180px' }}>Buscar<input type="search" placeholder="Código o descripción" {...campo('buscar')} /></label>
      </div>

      {error && <div className="error">No pudimos cargar los reportes: {error}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div className="caja" style={{ flex: '999 1 560px', minWidth: 0, overflowX: 'auto' }}>
          <table className="tabla" style={{ minWidth: 720 }}>
            <thead>
              <tr><th>Código</th><th>Daño</th><th>Gravedad ajustada</th><th>Confirm.</th><th>Sector</th><th>Antigüedad</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {filtrados.map((r) => {
                const g = gravedadDe(r)
                return (
                  <tr key={r.id} aria-selected={seleccionado?.id === r.id} tabIndex={0} onClick={() => setElegido(r.id)} onKeyDown={(e) => e.key === 'Enter' && setElegido(r.id)}>
                    <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{codigo(r)}</td>
                    <td>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 700 }}>{NOMBRE_CATEGORIA[r.categoria]}</span>
                        <span className="suave" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion}</span>
                      </span>
                    </td>
                    <td><span className={`chip p${g}`}>{NOMBRE_GRAVEDAD[g]}</span></td>
                    <td>{r.gravedades_confirmadas.length}</td>
                    <td>{nombreSector(r.sector_id)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{haceCuanto(r.creado_en)}</td>
                    <td><span className={`chip e-${r.estado}`}>{NOMBRE_ESTADO[r.estado]}</span></td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="suave" style={{ cursor: 'default' }}>No hay reportes con estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {seleccionado && <DetallePanel key={seleccionado.id} r={seleccionado} onGuardado={recargar} />}
      </div>
    </>
  )
}

function DetallePanel({ r, onGuardado }: { r: ReportePublico; onGuardado: () => void }) {
  const api = useApi()
  const { datos: notas, recargar: recargarNotas } = useCarga(() => api.notas(r.id), [api, r.id])
  const { datos: historial, recargar: recargarHistorial } = useCarga(() => api.historial(r.id), [api, r.id])
  const [gravedad, setGravedad] = useState<string>(r.gravedad_municipal ? String(r.gravedad_municipal) : '')
  const [estado, setEstado] = useState<Estado>(r.estado)
  const [nota, setNota] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(() => setMensaje(null), [r.id])

  const g = gravedadDe(r)
  const conteo = ([3, 2, 1] as Gravedad[]).map((x) => [x, r.gravedades_confirmadas.filter((c) => c === x).length] as const).filter(([, n]) => n > 0)
  const regla = r.categoria === 'accesibilidad' || r.categoria === 'obra_inconclusa'

  const guardar = async (cambios?: { estado: Estado }) => {
    setGuardando(true)
    setMensaje(null)
    try {
      const nuevoEstado = cambios?.estado ?? estado
      await api.actualizarReporte(r.id, {
        estado: nuevoEstado !== r.estado ? nuevoEstado : undefined,
        gravedad_municipal: gravedad ? (Number(gravedad) as Gravedad) : null,
        fotoReparacion: foto ? await prepararFoto(foto) : undefined,
      })
      if (nota.trim()) await api.agregarNota(r.id, nota.trim())
      setNota('')
      setFoto(null)
      setMensaje({ ok: true, texto: 'Cambios guardados.' })
      recargarNotas()
      recargarHistorial()
      onGuardado()
    } catch (e) {
      setMensaje({ ok: false, texto: e instanceof Error ? e.message : 'No pudimos guardar.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <aside aria-label={`Detalle del reporte ${codigo(r)}`} className="caja" style={{ flex: '1 1 340px', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={{ fontSize: 13, color: 'var(--gris)' }}>
        <b>{codigo(r)}</b> · reportado el {fechaCorta(r.creado_en)}, {new Date(r.creado_en).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
      </span>
      {r.fotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          {r.fotos.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt={`Foto ${i + 1} del reporte`} style={{ width: '100%', height: 84, objectFit: 'cover', borderRadius: 8, display: 'block' }} /></a>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 19, fontWeight: 700 }}>{NOMBRE_CATEGORIA[r.categoria]}</span>
        <span className="suave" style={{ fontSize: 14 }}><Direccion lat={r.lat} lng={r.lng} /> · <a href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=19/${r.lat}/${r.lng}`} target="_blank" rel="noreferrer">ver en mapa</a></span>
        {r.descripcion && <p style={{ fontSize: 14, lineHeight: 1.4, marginTop: 4 }}>{r.descripcion}</p>}
      </div>
      <div className="nota" style={{ fontSize: 14, lineHeight: 1.45, display: 'flex', flexDirection: 'column', gap: 2, color: 'var(--tinta)' }}>
        <span>Propuesta del vecino: <b>{NOMBRE_GRAVEDAD[r.gravedad_propuesta]}</b></span>
        <span>
          {r.gravedades_confirmadas.length} confirmaciones
          {conteo.length > 0 && `: ${conteo.map(([x, n]) => `${n} ${NOMBRE_GRAVEDAD[x].toLowerCase()}`).join(', ')}`}
        </span>
        {regla && <span>Regla de {NOMBRE_CATEGORIA[r.categoria].toLowerCase()}: mínimo moderado</span>}
        <span>Gravedad ajustada: <b style={{ color: g === 3 ? 'var(--peligroso)' : undefined }}>{NOMBRE_GRAVEDAD[g]}</b></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <label className="campo">Gravedad final
          <select value={gravedad} onChange={(e) => setGravedad(e.target.value)}>
            <option value="">Sin fijar</option>
            <option value="3">Peligroso</option>
            <option value="2">Moderado</option>
            <option value="1">Leve</option>
          </select>
        </label>
        <label className="campo">Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value as Estado)}>
            {ESTADOS.map((e) => <option key={e} value={e}>{NOMBRE_ESTADO[e]}</option>)}
          </select>
        </label>
      </div>
      {(estado === 'reparado' || r.estado === 'reparado') && (
        <label className="campo">Foto de la reparación (se muestra al vecino)
          <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} style={{ height: 'auto', padding: 8 }} />
          {r.foto_reparacion && !foto && <span>Ya hay una foto cargada.</span>}
        </label>
      )}
      <label className="campo">Nota interna
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: derivado a Dirección de Obras" maxLength={1000} />
      </label>
      {mensaje && <div className={mensaje.ok ? 'nota' : 'error'} role="status">{mensaje.texto}</div>}
      <button type="button" className="boton" disabled={guardando} onClick={() => guardar()}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
      {r.estado !== 'descartado' && (
        <button type="button" className="boton secundario" style={{ color: '#8a1616', borderColor: '#c9cec6' }} disabled={guardando} onClick={() => guardar({ estado: 'descartado' })}>
          Ocultar reporte (falso u ofensivo)
        </button>
      )}
      <div style={{ borderTop: '1px solid var(--fondo-2)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--gris)' }}>
        <span style={{ fontWeight: 700, color: 'var(--tinta)' }}>Historial</span>
        {(notas ?? []).map((n, i) => <span key={`n${i}`}>{fechaCorta(n.creado_en)} · Nota: {n.texto}</span>)}
        {(historial ?? []).map((h, i) => <span key={`h${i}`}>{fechaCorta(h.creado_en)} · {h.detalle}</span>)}
        {r.verificado_en && <span>{fechaCorta(r.verificado_en)} · Verificado</span>}
        <span>{fechaCorta(r.creado_en)} · Creado por un vecino</span>
      </div>
    </aside>
  )
}
