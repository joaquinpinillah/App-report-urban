import type { Categoria, Estado, Gravedad } from './tipos'

export interface ReportePublico {
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
  gravedades_confirmadas: Gravedad[]
  programado_en: string | null
  reparado_en: string | null
  foto_reparacion: string | null
}

export interface NuevoReporte {
  categoria: Categoria
  gravedad: Gravedad
  descripcion: string | null
  fotos: Blob[]
  lat: number
  lng: number
}

export type MotivoPuntos = 'reporte_verificado' | 'confirmacion_acertada' | 'reporte_reparado'

export interface MovimientoPuntos {
  motivo: MotivoPuntos
  puntos: number
  reporte_id: string
  creado_en: string
}

export interface Aviso {
  id: string
  reporte_id: string
  tipo: 'programado' | 'reparado'
  leido: boolean
  creado_en: string
}

export interface ProgresoSector {
  id: number
  nombre: string
  pct_revisado: number
  pct_reparado: number
  reparados: number
  total_reportes: number
  dias_respuesta_promedio: number | null
}

// Lo que las pantallas necesitan del backend. Hay dos implementaciones:
// Supabase (real) y demo (en memoria, para probar sin configurar nada).
export interface Api {
  modo: 'supabase' | 'demo'
  iniciarSesion(): Promise<void>
  listarReportes(): Promise<ReportePublico[]>
  obtenerReporte(id: string): Promise<ReportePublico | null>
  cercanos(lat: number, lng: number, categoria: Categoria): Promise<ReportePublico[]>
  crearReporte(r: NuevoReporte): Promise<string>
  confirmar(reporteId: string, gravedad: Gravedad, opciones?: { sigueRoto?: boolean; foto?: Blob }): Promise<void>
  yaConfirme(reporteId: string): Promise<boolean>
  misReportes(): Promise<ReportePublico[]>
  misPuntos(): Promise<MovimientoPuntos[]>
  misAvisos(): Promise<Aviso[]>
  marcarAvisoLeido(id: string): Promise<void>
  progresoSectores(): Promise<ProgresoSector[]>
  marcarTramoSinDanos(puntos: [number, number][]): Promise<void>
  // Asocia un correo a la sesión anónima para no perder el progreso.
  vincularCorreo(correo: string): Promise<void>
}
