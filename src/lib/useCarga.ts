import { useCallback, useEffect, useState } from 'react'

// Carga datos asíncronos y permite recargarlos.
export function useCarga<T>(cargar: () => Promise<T>, deps: unknown[]) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(cargar, deps)
  useEffect(() => {
    let vigente = true
    fn().then(
      (d) => vigente && (setDatos(d), setError(null)),
      (e) => vigente && setError(e instanceof Error ? e.message : String(e)),
    )
    return () => {
      vigente = false
    }
  }, [fn, version])
  return { datos, error, recargar: () => setVersion((v) => v + 1) }
}
