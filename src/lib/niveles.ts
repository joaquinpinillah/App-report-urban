// Mismos umbrales que la vista puntaje_vecinos en supabase/migrations/0002_gamificacion.sql.
export const NIVELES = [
  { id: 'vecino', nombre: 'Vecino', desde: 0 },
  { id: 'vigia', nombre: 'Vigía', desde: 100 },
  { id: 'guardian', nombre: 'Guardián de barrio', desde: 300 },
] as const

export type Nivel = (typeof NIVELES)[number]

export interface Progreso {
  nivel: Nivel
  siguiente: Nivel | null
  // Puntos que faltan para el siguiente nivel (0 en el último).
  faltan: number
  // Avance dentro del nivel actual, de 0 a 1.
  avance: number
}

export function progresoDeNivel(total: number): Progreso {
  let i = 0
  while (i + 1 < NIVELES.length && total >= NIVELES[i + 1].desde) i++
  const nivel = NIVELES[i]
  const siguiente = NIVELES[i + 1] ?? null
  if (!siguiente) return { nivel, siguiente, faltan: 0, avance: 1 }
  return {
    nivel,
    siguiente,
    faltan: siguiente.desde - total,
    avance: (total - nivel.desde) / (siguiente.desde - nivel.desde),
  }
}
