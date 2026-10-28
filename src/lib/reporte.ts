import type { ReportePublico } from './api'
import { gravedadAjustada } from './gravedad'
import type { Gravedad } from './tipos'

// Gravedad que se muestra en el mapa: la ajustada, no la que propuso el vecino.
export function gravedadDe(r: ReportePublico): Gravedad {
  return gravedadAjustada({
    categoria: r.categoria,
    propuesta: r.gravedad_propuesta,
    confirmaciones: r.gravedades_confirmadas,
    municipal: r.gravedad_municipal,
  })
}
