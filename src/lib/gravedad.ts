import type { Categoria, Gravedad } from './tipos'

// Gravedad mínima por categoría: un problema de accesibilidad o una obra
// inconclusa nunca se trata como leve, aunque el vecino lo marque así.
const MINIMO_POR_CATEGORIA: Partial<Record<Categoria, Gravedad>> = {
  accesibilidad: 2,
  obra_inconclusa: 2,
}

export interface EntradaGravedad {
  categoria: Categoria
  propuesta: Gravedad
  // Gravedad que indicó cada vecino al confirmar el reporte.
  confirmaciones: Gravedad[]
  // Si la municipalidad ya fijó la gravedad, esa manda.
  municipal?: Gravedad | null
}

function mediana(valores: Gravedad[]): Gravedad {
  const orden = [...valores].sort((a, b) => a - b)
  return orden[Math.floor((orden.length - 1) / 2)]
}

// La gravedad del vecino es solo una propuesta: se combina con las
// confirmaciones de otros vecinos (mediana, para que una sola opinión
// extrema no domine) y se aplica el mínimo de la categoría.
export function gravedadAjustada(e: EntradaGravedad): Gravedad {
  if (e.municipal) return e.municipal
  const votada = mediana([e.propuesta, ...e.confirmaciones])
  const minimo = MINIMO_POR_CATEGORIA[e.categoria] ?? 1
  return Math.max(votada, minimo) as Gravedad
}
