import { supabase } from './lib/supabase'

// Pantalla provisoria: las pantallas reales (reportar, mapa y panel
// municipal) se construyen a partir del diseño.
export default function App() {
  return (
    <main>
      <h1>VeredaViva</h1>
      <p>Reporta baches, veredas rotas, problemas de accesibilidad y obras inconclusas.</p>
      {!supabase && <p>Falta configurar Supabase: revisa .env.example.</p>}
    </main>
  )
}
