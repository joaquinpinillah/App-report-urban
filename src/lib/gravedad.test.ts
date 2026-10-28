import { describe, expect, it } from 'vitest'
import { gravedadAjustada } from './gravedad'

describe('gravedadAjustada', () => {
  it('usa la propuesta del vecino si no hay confirmaciones', () => {
    expect(gravedadAjustada({ categoria: 'calzada', propuesta: 3, confirmaciones: [] })).toBe(3)
  })

  it('las confirmaciones corrigen una propuesta exagerada', () => {
    expect(gravedadAjustada({ categoria: 'calzada', propuesta: 3, confirmaciones: [1, 1] })).toBe(1)
  })

  it('las confirmaciones corrigen una propuesta subestimada', () => {
    expect(gravedadAjustada({ categoria: 'vereda', propuesta: 1, confirmaciones: [3, 3, 2] })).toBe(2)
  })

  it('aplica el mínimo de la categoría', () => {
    expect(gravedadAjustada({ categoria: 'accesibilidad', propuesta: 1, confirmaciones: [] })).toBe(2)
  })

  it('la gravedad municipal manda sobre todo lo demás', () => {
    expect(
      gravedadAjustada({ categoria: 'accesibilidad', propuesta: 3, confirmaciones: [3], municipal: 1 }),
    ).toBe(1)
  })
})
