import { useEffect, useState } from 'react'
import { direccionDe } from '../lib/geo'

export function Direccion({ lat, lng }: { lat: number; lng: number }) {
  const [texto, setTexto] = useState<string | null>(null)
  useEffect(() => {
    let vigente = true
    setTexto(null)
    direccionDe(lat, lng).then((d) => vigente && setTexto(d))
    return () => {
      vigente = false
    }
  }, [lat, lng])
  return <>{texto ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</>
}
