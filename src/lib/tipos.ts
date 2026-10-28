export const CATEGORIAS = [
  'calzada',
  'vereda',
  'accesibilidad',
  'obra_inconclusa',
  'senaletica_alumbrado',
  'otro',
] as const
export type Categoria = (typeof CATEGORIAS)[number]

// 1 = leve (molesta), 2 = moderado (obliga a desviarse), 3 = peligroso
export type Gravedad = 1 | 2 | 3

export const ESTADOS = ['nuevo', 'verificado', 'programado', 'reparado', 'descartado'] as const
export type Estado = (typeof ESTADOS)[number]

export interface Reporte {
  id: string
  categoria: Categoria
  gravedad_propuesta: Gravedad
  gravedad_municipal: Gravedad | null
  descripcion: string | null
  fotos: string[]
  lat: number
  lng: number
  estado: Estado
  creado_en: string
}
