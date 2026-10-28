// Distancia aproximada entre dos puntos (haversine), en metros.
export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Plaza Vergara, centro del piloto.
export const CENTRO_VINA: [number, number] = [-33.0246, -71.5518]

// Dirección legible a partir de coordenadas (OpenStreetMap Nominatim).
// Si falla, la pantalla muestra las coordenadas.
export async function direccionDe(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}&accept-language=es`
    const r = await fetch(url)
    if (!r.ok) return null
    const j = await r.json()
    const a = j.address ?? {}
    const calle = a.road ?? a.pedestrian ?? a.footway
    if (!calle) return j.display_name ?? null
    return a.house_number ? `${calle} ${a.house_number}` : calle
  } catch {
    return null
  }
}
