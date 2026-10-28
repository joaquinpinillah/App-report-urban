// Íconos de trazo, del mismo estilo que el diseño.
type P = { size?: number }
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const IconoVolver = ({ size = 22 }: P) => <svg {...base(size)}><path d="M15 5l-7 7 7 7" /></svg>
export const IconoCerrar = ({ size = 20 }: P) => <svg {...base(size)}><path d="M6 6l12 12M18 6L6 18" /></svg>
export const IconoCamara = ({ size = 24 }: P) => <svg {...base(size)}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
export const IconoOjo = ({ size = 20 }: P) => <svg {...base(size)}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
export const IconoFiltros = ({ size = 22 }: P) => <svg {...base(size)}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
export const IconoUbicarme = ({ size = 22 }: P) => <svg {...base(size)}><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
export const IconoCheck = ({ size = 20 }: P) => <svg {...base(size)} strokeWidth={2.2}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
