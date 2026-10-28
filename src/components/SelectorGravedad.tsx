import { AYUDA_GRAVEDAD, COLOR_GRAVEDAD, NOMBRE_GRAVEDAD } from '../lib/textos'
import type { Gravedad } from '../lib/tipos'

const TAMANO: Record<Gravedad, number> = { 1: 14, 2: 18, 3: 22 }

export function SelectorGravedad({ valor, onCambio }: { valor: Gravedad | null; onCambio: (g: Gravedad) => void }) {
  return (
    <div role="group" aria-label="Gravedad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {([1, 2, 3] as Gravedad[]).map((g) => (
        <button key={g} type="button" className="opcion" aria-pressed={valor === g} onClick={() => onCambio(g)}>
          <span className="punto-gravedad" style={{ width: TAMANO[g], height: TAMANO[g], background: COLOR_GRAVEDAD[g], margin: `0 ${(24 - TAMANO[g]) / 2}px` }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{NOMBRE_GRAVEDAD[g]}</span>
            <span className="suave" style={{ fontWeight: 400 }}>{AYUDA_GRAVEDAD[g]}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
