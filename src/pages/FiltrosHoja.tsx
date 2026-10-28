import { useState } from 'react'
import type { ReportePublico } from '../lib/api'
import { gravedadDe } from '../lib/reporte'
import { NOMBRE_CATEGORIA, NOMBRE_GRAVEDAD } from '../lib/textos'
import { filtrosIniciales, pasaFiltros, type FiltroEstado, type Filtros } from '../lib/filtros'
import { CATEGORIAS, type Categoria, type Gravedad } from '../lib/tipos'

const NOMBRE_LARGO: Record<Categoria, string> = {
  ...NOMBRE_CATEGORIA,
  obra_inconclusa: 'Obra inconclusa o mal hecha',
  senaletica_alumbrado: 'Señalética y alumbrado',
}

interface Props {
  inicial: Filtros
  reportes: ReportePublico[]
  onAplicar: (f: Filtros) => void
  onCerrar: () => void
}

export function FiltrosHoja({ inicial, reportes, onAplicar, onCerrar }: Props) {
  const [f, setF] = useState<Filtros>(inicial)
  const alternar = <T,>(s: Set<T>, v: T) => {
    const n = new Set(s)
    if (n.has(v)) n.delete(v)
    else n.add(v)
    return n
  }
  const porCategoria = (c: Categoria) => reportes.filter((r) => r.categoria === c && r.estado !== 'descartado').length

  return (
    <div className="hoja-fondo" onClick={onCerrar}>
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="titulo-filtros" onClick={(e) => e.stopPropagation()}>
        <span className="asa" aria-hidden="true" />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 id="titulo-filtros" style={{ fontSize: 21, flexGrow: 1 }}>Filtrar el mapa</h1>
          <button type="button" className="enlace" onClick={() => setF(filtrosIniciales)}>Limpiar</button>
        </div>

        <fieldset>
          <legend>Categoría</legend>
          {CATEGORIAS.map((c) => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, fontSize: 16, borderBottom: '1px solid var(--fondo-2)' }}>
              <input type="checkbox" checked={f.categorias.has(c)} onChange={() => setF({ ...f, categorias: alternar(f.categorias, c) })} />
              <span style={{ flexGrow: 1 }}>{NOMBRE_LARGO[c]}</span>
              <span className="suave">{porCategoria(c)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Gravedad</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {([1, 2, 3] as Gravedad[]).map((g) => (
              <label key={g} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 12, border: '1px solid var(--borde-2)', fontSize: 15 }}>
                <input type="checkbox" checked={f.gravedades.has(g)} onChange={() => setF({ ...f, gravedades: alternar(f.gravedades, g) })} />
                {NOMBRE_GRAVEDAD[g]}
              </label>
            ))}
          </div>
        </fieldset>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gris)' }}>Estado</span>
          <div className="segmentado">
            {(['abiertos', 'reparados', 'todos'] as FiltroEstado[]).map((e) => (
              <button key={e} type="button" aria-pressed={f.estado === e} onClick={() => setF({ ...f, estado: e })}>
                {e[0].toUpperCase() + e.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="boton" onClick={() => onAplicar(f)}>
          Ver {reportes.filter((r) => pasaFiltros(r, f, gravedadDe(r))).length} reportes
        </button>
      </div>
    </div>
  )
}
