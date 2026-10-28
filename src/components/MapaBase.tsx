import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap } from 'leaflet'
import type { ReactNode, Ref } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'

interface Props {
  centro: [number, number]
  zoom?: number
  children?: ReactNode
  mapaRef?: Ref<LeafletMap>
  interactivo?: boolean
  etiqueta: string
}

// Mapa de OpenStreetMap con la atribución que exige su licencia.
export function MapaBase({ centro, zoom = 16, children, mapaRef, interactivo = true, etiqueta }: Props) {
  return (
    <div role="region" aria-label={etiqueta} style={{ position: 'absolute', inset: 0 }}>
      <MapContainer
        center={centro}
        zoom={zoom}
        ref={mapaRef}
        zoomControl={false}
        dragging={interactivo}
        scrollWheelZoom={interactivo}
        doubleClickZoom={interactivo}
        touchZoom={interactivo}
        style={{ position: 'absolute', inset: 0 }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        {children}
      </MapContainer>
    </div>
  )
}
