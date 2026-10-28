import { describe, expect, it } from 'vitest'
import { distanciaMetros } from './geo'

describe('distanciaMetros', () => {
  it('es cero para el mismo punto', () => {
    expect(distanciaMetros(-33.0246, -71.5518, -33.0246, -71.5518)).toBe(0)
  })

  it('una diezmilésima de grado de latitud son unos 11 metros', () => {
    expect(distanciaMetros(-33.0246, -71.5518, -33.0247, -71.5518)).toBeCloseTo(11.1, 0)
  })
})
