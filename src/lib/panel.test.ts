import { describe, expect, it } from 'vitest'
import type { ReportePublico } from './api'
import { aCsv, calcularIndicadores, ordenarPorPrioridad } from './panel'

const base: ReportePublico = {
  id: 'aaaaaaaa-0000', categoria: 'calzada', gravedad_propuesta: 1, gravedad_municipal: null, descripcion: null,
  fotos: [], lat: -33.0246, lng: -71.5518, estado: 'nuevo', creado_en: '2026-10-01T12:00:00Z', gravedades_confirmadas: [],
  programado_en: null, reparado_en: null, foto_reparacion: null, sector_id: null, verificado_en: null,
}
const r = (extra: Partial<ReportePublico>): ReportePublico => ({ ...base, ...extra })

describe('ordenarPorPrioridad', () => {
  it('ordena por gravedad, luego confirmaciones y luego antigüedad', () => {
    const lista = [
      r({ id: 'leve' }),
      r({ id: 'grave-nuevo', gravedad_propuesta: 3, creado_en: '2026-10-20T00:00:00Z' }),
      r({ id: 'grave-viejo', gravedad_propuesta: 3, creado_en: '2026-10-02T00:00:00Z' }),
      r({ id: 'grave-confirmado', gravedad_propuesta: 3, gravedades_confirmadas: [3], creado_en: '2026-10-25T00:00:00Z' }),
    ]
    expect(ordenarPorPrioridad(lista).map((x) => x.id)).toEqual(['grave-confirmado', 'grave-viejo', 'grave-nuevo', 'leve'])
  })
})

describe('calcularIndicadores', () => {
  it('promedia tiempos y cuenta por mes, sin descartados', () => {
    const lista = [
      r({ creado_en: '2026-10-01T00:00:00Z', verificado_en: '2026-10-03T00:00:00Z', reparado_en: '2026-10-11T00:00:00Z', estado: 'reparado' }),
      r({ creado_en: '2026-10-05T00:00:00Z', verificado_en: '2026-10-06T00:00:00Z' }),
      r({ creado_en: '2026-09-10T00:00:00Z', gravedad_propuesta: 3, reparado_en: '2026-09-14T00:00:00Z', estado: 'reparado' }),
      r({ creado_en: '2026-10-07T00:00:00Z', estado: 'descartado' }),
    ]
    const ind = calcularIndicadores(lista, new Date('2026-10-28T12:00:00Z'))
    expect(ind.diasAVerificar).toBe(1.5)
    expect(ind.diasAReparar).toBe(7)
    expect(ind.diasARepararPeligrosos).toBe(4)
    expect(ind.porMes.map((m) => [m.recibidos, m.reparados])).toEqual([[0, 0], [0, 0], [1, 1], [2, 1]])
  })
})

describe('aCsv', () => {
  it('usa punto y coma y escapa comillas', () => {
    const csv = aCsv([r({ descripcion: 'Dice "peligro"; ojo' })])
    const [cabecera, fila] = csv.replace('﻿', '').split('\r\n')
    expect(cabecera.split(';')[0]).toBe('codigo')
    expect(fila).toContain('"Dice ""peligro""; ojo"')
    expect(fila.startsWith('AAAAAAAA;Calzada;Leve;Leve;;0;Nuevo')).toBe(true)
  })
})
