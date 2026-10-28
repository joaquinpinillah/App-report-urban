import type { ReportePublico } from './api'
import { CATEGORIAS, type Categoria, type Gravedad } from './tipos'

export type FiltroEstado = 'abiertos' | 'reparados' | 'todos'

export interface Filtros {
  categorias: Set<Categoria>
  gravedades: Set<Gravedad>
  estado: FiltroEstado
}

export const filtrosIniciales: Filtros = {
  categorias: new Set(CATEGORIAS),
  gravedades: new Set<Gravedad>([1, 2, 3]),
  estado: 'abiertos',
}

export function pasaFiltros(r: ReportePublico, f: Filtros, gravedad: Gravedad): boolean {
  if (r.estado === 'descartado') return false
  if (f.estado === 'abiertos' && r.estado === 'reparado') return false
  if (f.estado === 'reparados' && r.estado !== 'reparado') return false
  return f.categorias.has(r.categoria) && f.gravedades.has(gravedad)
}
