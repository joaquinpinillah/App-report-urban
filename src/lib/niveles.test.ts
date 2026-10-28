import { describe, expect, it } from 'vitest'
import { progresoDeNivel } from './niveles'

describe('progresoDeNivel', () => {
  it('un vecino nuevo parte como Vecino', () => {
    const p = progresoDeNivel(0)
    expect(p.nivel.nombre).toBe('Vecino')
    expect(p.faltan).toBe(100)
    expect(p.avance).toBe(0)
  })

  it('128 puntos es Vigía y faltan 172 para Guardián', () => {
    const p = progresoDeNivel(128)
    expect(p.nivel.nombre).toBe('Vigía')
    expect(p.siguiente?.nombre).toBe('Guardián de barrio')
    expect(p.faltan).toBe(172)
    expect(p.avance).toBeCloseTo(0.14)
  })

  it('el umbral exacto ya cuenta para el nivel', () => {
    expect(progresoDeNivel(300).nivel.nombre).toBe('Guardián de barrio')
  })

  it('en el último nivel no falta nada', () => {
    const p = progresoDeNivel(450)
    expect(p.siguiente).toBeNull()
    expect(p.faltan).toBe(0)
    expect(p.avance).toBe(1)
  })
})
