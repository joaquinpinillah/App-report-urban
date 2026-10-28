import { useMemo, useState } from 'react'
import { Circle, CircleMarker, Popup } from 'react-leaflet'
import { MapaBase } from '../../components/MapaBase'
import { useApi } from '../../lib/contexto'
import { CENTRO_VINA } from '../../lib/geo'
import { ABIERTOS, aCsv, codigo, descargar } from '../../lib/panel'
import { gravedadDe } from '../../lib/reporte'
import { COLOR_GRAVEDAD, NOMBRE_CATEGORIA, NOMBRE_ESTADO, NOMBRE_GRAVEDAD } from '../../lib/textos'
import { CATEGORIAS, type Categoria, type Gravedad } from '../../lib/tipos'
import { useCarga } from '../../lib/useCarga'

const RADIO: Record<Gravedad, number> = { 1: 8, 2: 11, 3: 14 }

export function PanelMapa() {
  const api = useApi()
  const { datos } = useCarga(() => api.listarReportes(), [api])
  const { datos: sectores } = useCarga(() => api.progresoSectores(), [api])
  const [modo, setModo] = useState<'puntos' | 'calor'>('puntos')
  const [categoria, setCategoria] = useState<Categoria | ''>('')
  const [estado, setEstado] = useState<'abiertos' | 'reparados'>('abiertos')

  const visibles = useMemo(
    () =>
      (datos ?? []).filter(
        (r) =>
          (!categoria || r.categoria === categoria) &&
          (estado === 'abiertos' ? (ABIERTOS as readonly string[]).includes(r.estado) : r.estado === 'reparado'),
      ),
    [datos, categoria, estado],
  )

  const zonas = useMemo(() => {
    return (sectores ?? [])
      .map((s) => {
        const rs = visibles.filter((r) => r.sector_id === s.id)
        const peligrosos = rs.filter((r) => gravedadDe(r) === 3).length
        const porCat = CATEGORIAS.map((c) => [c, rs.filter((r) => r.categoria === c).length] as const).sort((a, b) => b[1] - a[1])[0]
        return { id: s.id, nombre: s.nombre, n: rs.length, peligrosos, top: porCat && porCat[1] > 0 ? porCat : null }
      })
      .filter((z) => z.n > 0)
      .sort((a, b) => b.n - a.n)
  }, [sectores, visibles])
  const maxZona = Math.max(1, ...zonas.map((z) => z.n))

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Mapa de reportes</h1>
          <span className="suave" style={{ fontSize: 14 }}>Centro de Viña del Mar · {visibles.length} {estado}</span>
        </div>
        <div className="segmentado">
          <button type="button" aria-pressed={modo === 'puntos'} onClick={() => setModo('puntos')} style={{ padding: '0 16px' }}>Puntos</button>
          <button type="button" aria-pressed={modo === 'calor'} onClick={() => setModo('calor')} style={{ padding: '0 16px' }}>Calor</button>
        </div>
        <label className="campo">Categoría
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria | '')}>
            <option value="">Todas</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{NOMBRE_CATEGORIA[c]}</option>)}
          </select>
        </label>
        <label className="campo">Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value as 'abiertos' | 'reparados')}>
            <option value="abiertos">Abiertos</option>
            <option value="reparados">Reparados</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div className="caja" style={{ flex: '999 1 560px', minWidth: 0, position: 'relative', height: 560, overflow: 'hidden' }}>
          <MapaBase centro={CENTRO_VINA} zoom={16} etiqueta="Mapa de reportes del centro de Viña del Mar">
            {visibles.map((r) => {
              const g = gravedadDe(r)
              return modo === 'calor' ? (
                <Circle key={r.id} center={[r.lat, r.lng]} radius={40 + 25 * g} pathOptions={{ stroke: false, fillColor: COLOR_GRAVEDAD[g], fillOpacity: 0.22 }} />
              ) : (
                <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={RADIO[g]} pathOptions={{ color: '#fff', weight: 3, fillColor: COLOR_GRAVEDAD[g], fillOpacity: 1 }}>
                  <Popup>
                    <b>{codigo(r)}</b> · {NOMBRE_CATEGORIA[r.categoria]}
                    <br />
                    {NOMBRE_GRAVEDAD[g]} · {NOMBRE_ESTADO[r.estado]} · {r.gravedades_confirmadas.length} confirmaciones
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapaBase>
          <div className="leyenda flotante" style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 500 }}>
            <span><span className="punto-gravedad" style={{ width: 12, height: 12, background: 'var(--leve)', border: '1px solid #8a6d00' }} />Leve</span>
            <span><span className="punto-gravedad" style={{ width: 15, height: 15, background: 'var(--moderado)' }} />Moderado</span>
            <span><span className="punto-gravedad" style={{ width: 18, height: 18, background: 'var(--peligroso)' }} />Peligroso</span>
          </div>
        </div>

        <aside aria-label="Zonas con más reportes" className="caja" style={{ flex: '1 1 300px', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 18 }}>Zonas con más reportes</h2>
          {zonas.length === 0 && <p className="suave">No hay reportes asignados a sectores con estos filtros.</p>}
          {zonas.map((z) => (
            <div key={z.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 12, borderBottom: '1px solid var(--fondo-2)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ flexGrow: 1, fontWeight: 700, fontSize: 15 }}>{z.nombre}</span>
                <span className="suave" style={{ fontSize: 14 }}>{z.n} reportes</span>
              </div>
              <div aria-hidden="true" className="barra" style={{ height: 8, display: 'flex' }}>
                <span style={{ width: `${(z.peligrosos / maxZona) * 100}%`, background: 'var(--peligroso)', borderRadius: 0 }} />
                <span style={{ width: `${((z.n - z.peligrosos) / maxZona) * 100}%`, background: 'var(--moderado)', borderRadius: 0 }} />
              </div>
              <span className="suave">
                {z.peligrosos ? `${z.peligrosos} ${z.peligrosos === 1 ? 'peligroso' : 'peligrosos'}` : 'Sin peligrosos'}
                {z.top && `, ${z.top[1]} en ${NOMBRE_CATEGORIA[z.top[0]].toLowerCase()}`}
              </span>
            </div>
          ))}
          <button type="button" className="boton secundario" onClick={() => descargar(`veredaviva-mapa-${new Date().toISOString().slice(0, 10)}.csv`, aCsv(visibles))}>
            Exportar esta vista
          </button>
        </aside>
      </div>
    </>
  )
}
