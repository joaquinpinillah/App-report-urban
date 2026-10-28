import type { ReportePublico } from './api'
import { gravedadDe } from './reporte'
import { NOMBRE_CATEGORIA, NOMBRE_ESTADO, NOMBRE_GRAVEDAD } from './textos'

const DIA = 86_400_000
export const ABIERTOS = ['nuevo', 'verificado', 'programado'] as const

// Orden del panel: primero lo más grave, luego lo más confirmado y, a
// igualdad, lo más antiguo (lleva más tiempo esperando).
export function ordenarPorPrioridad(reportes: ReportePublico[]): ReportePublico[] {
  return [...reportes].sort(
    (a, b) =>
      gravedadDe(b) - gravedadDe(a) ||
      b.gravedades_confirmadas.length - a.gravedades_confirmadas.length ||
      a.creado_en.localeCompare(b.creado_en),
  )
}

export function codigo(r: { id: string }): string {
  return r.id.slice(0, 8).toUpperCase()
}

function dias(desde: string, hasta: string): number {
  return (new Date(hasta).getTime() - new Date(desde).getTime()) / DIA
}

function promedio(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

export interface Indicadores {
  diasAVerificar: number | null
  diasAReparar: number | null
  diasARepararPeligrosos: number | null
  porMes: { mes: string; recibidos: number; reparados: number }[]
}

// Indicadores de respuesta de los últimos `meses` meses (incluido el actual).
export function calcularIndicadores(reportes: ReportePublico[], hoy = new Date(), meses = 4): Indicadores {
  const validos = reportes.filter((r) => r.estado !== 'descartado')
  const reparados = validos.filter((r) => r.reparado_en)
  const porMes = Array.from({ length: meses }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1 - i), 1)
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return {
      mes: d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''),
      recibidos: validos.filter((r) => r.creado_en.startsWith(clave)).length,
      reparados: reparados.filter((r) => r.reparado_en!.startsWith(clave)).length,
    }
  })
  return {
    diasAVerificar: promedio(validos.filter((r) => r.verificado_en).map((r) => dias(r.creado_en, r.verificado_en!))),
    diasAReparar: promedio(reparados.map((r) => dias(r.creado_en, r.reparado_en!))),
    diasARepararPeligrosos: promedio(reparados.filter((r) => gravedadDe(r) === 3).map((r) => dias(r.creado_en, r.reparado_en!))),
    porMes,
  }
}

function celda(v: string | number | null): string {
  const s = v === null ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// CSV separado por punto y coma, que es lo que espera Excel en español.
// El BOM inicial hace que Excel lea bien las tildes.
export function aCsv(reportes: ReportePublico[]): string {
  const cabecera = ['codigo', 'categoria', 'gravedad_ajustada', 'gravedad_propuesta', 'gravedad_final', 'confirmaciones', 'estado', 'latitud', 'longitud', 'creado', 'verificado', 'programado', 'reparado', 'descripcion', 'foto']
  const filas = reportes.map((r) => [
    codigo(r),
    NOMBRE_CATEGORIA[r.categoria],
    NOMBRE_GRAVEDAD[gravedadDe(r)],
    NOMBRE_GRAVEDAD[r.gravedad_propuesta],
    r.gravedad_municipal ? NOMBRE_GRAVEDAD[r.gravedad_municipal] : '',
    r.gravedades_confirmadas.length,
    NOMBRE_ESTADO[r.estado],
    r.lat.toFixed(6),
    r.lng.toFixed(6),
    r.creado_en,
    r.verificado_en,
    r.programado_en,
    r.reparado_en,
    r.descripcion,
    r.fotos[0] ?? '',
  ])
  return '﻿' + [cabecera, ...filas].map((f) => f.map(celda).join(';')).join('\r\n')
}

export function descargar(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}
