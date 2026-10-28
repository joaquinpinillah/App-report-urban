import type { Categoria, Estado, Gravedad } from './tipos'

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  calzada: 'Calzada',
  vereda: 'Vereda',
  accesibilidad: 'Accesibilidad',
  obra_inconclusa: 'Obra inconclusa',
  senaletica_alumbrado: 'Señalética y luz',
  otro: 'Otro',
}

export const NOMBRE_GRAVEDAD: Record<Gravedad, string> = { 1: 'Leve', 2: 'Moderado', 3: 'Peligroso' }

export const AYUDA_GRAVEDAD: Record<Gravedad, string> = {
  1: 'Molesta, pero se puede pasar',
  2: 'Obliga a desviarse',
  3: 'Riesgo de caída o deja a alguien varado',
}

export const COLOR_GRAVEDAD: Record<Gravedad, string> = { 1: '#F2C230', 2: '#E07B1F', 3: '#A61B1B' }

export const NOMBRE_ESTADO: Record<Estado, string> = {
  nuevo: 'Nuevo',
  verificado: 'Verificado',
  programado: 'Programado',
  reparado: 'Reparado',
  descartado: 'Descartado',
}

export function haceCuanto(fecha: string): string {
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}

export function fechaCorta(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}
