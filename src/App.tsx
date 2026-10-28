import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { crearApiDemo } from './lib/apiDemo'
import { crearApiSupabase } from './lib/apiSupabase'
import { ApiContext } from './lib/contexto'
import { supabase } from './lib/supabase'
import { AvisoPage } from './pages/AvisoPage'
import { BarrioPage } from './pages/BarrioPage'
import { DetallePage } from './pages/DetallePage'
import { MapaPage } from './pages/MapaPage'
import { PanelIndicadores } from './pages/panel/PanelIndicadores'
import { PanelLayout } from './pages/panel/PanelLayout'
import { PanelMapa } from './pages/panel/PanelMapa'
import { PanelReportes } from './pages/panel/PanelReportes'
import { PerfilPage } from './pages/PerfilPage'
import { ReportarPage } from './pages/ReportarPage'

// Sin Supabase configurado la app corre en modo demo, con datos de ejemplo.
export default function App() {
  const api = useMemo(() => (supabase ? crearApiSupabase(supabase) : crearApiDemo()), [])
  const [lista, setLista] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    // El panel usa su propio ingreso: no creamos una sesión anónima de vecino.
    if (location.pathname.startsWith(import.meta.env.BASE_URL + 'panel')) return setLista(true)
    api.iniciarSesion().then(
      () => setLista(true),
      (e) => setFallo(e instanceof Error ? e.message : String(e)),
    )
  }, [api])

  if (fallo) return <div className="pantalla"><div className="error">No pudimos conectarnos: {fallo}</div></div>
  if (!lista) return <div className="pantalla"><p className="suave">Cargando…</p></div>

  return (
    <ApiContext.Provider value={api}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        {api.modo === 'demo' && <AvisoDemo />}
        <Rutas />
      </BrowserRouter>
    </ApiContext.Provider>
  )
}

function Rutas() {
  const location = useLocation()
  return (
    <Routes>
      <Route path="/" element={<MapaPage />} />
      <Route path="/reporte/:id" element={<DetallePage />} />
      {/* La key reinicia el flujo al tocar "Reportar otro daño". */}
      <Route path="/reportar" element={<ReportarPage key={location.key} />} />
      <Route path="/perfil" element={<PerfilPage />} />
      <Route path="/barrio" element={<BarrioPage />} />
      <Route path="/aviso/:id" element={<AvisoPage />} />
      <Route path="/panel" element={<PanelLayout />}>
        <Route index element={<PanelReportes />} />
        <Route path="mapa" element={<PanelMapa />} />
        <Route path="indicadores" element={<PanelIndicadores />} />
      </Route>
    </Routes>
  )
}

function AvisoDemo() {
  useEffect(() => {
    document.documentElement.style.setProperty('--pie', '22px')
  }, [])
  return (
    <div role="note" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 2000, background: 'var(--tinta)', color: '#fff', fontSize: 12, textAlign: 'center', padding: '3px 8px' }}>
      Modo demo: datos de ejemplo, nada se guarda.
    </div>
  )
}
