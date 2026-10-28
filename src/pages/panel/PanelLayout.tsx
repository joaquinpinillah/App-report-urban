import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApi } from '../../lib/contexto'
import { useCarga } from '../../lib/useCarga'

// Marco del panel: exige una sesión de funcionario municipal.
export function PanelLayout() {
  const api = useApi()
  const navigate = useNavigate()
  const { datos: autorizado, recargar } = useCarga(() => api.esFuncionario(), [api])

  if (autorizado === null) return <div className="pantalla"><p className="suave">Cargando…</p></div>
  if (!autorizado) return <Ingreso onListo={recargar} />

  const salir = async () => {
    await api.salir()
    navigate('/')
  }

  return (
    <div className="panel">
      <nav aria-label="Panel municipal">
        <span style={{ fontSize: 19, fontWeight: 700, padding: '0 10px' }}>VeredaViva</span>
        <span style={{ fontSize: 13, color: '#b9c2bd', padding: '0 10px 18px' }}>Panel municipal</span>
        <NavLink to="/panel" end>Reportes</NavLink>
        <NavLink to="/panel/mapa">Mapa</NavLink>
        <NavLink to="/panel/indicadores">Indicadores</NavLink>
        <button type="button" className="salir" onClick={salir}>Cerrar sesión</button>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}

function Ingreso({ onListo }: { onListo: () => void }) {
  const api = useApi()
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [estado, setEstado] = useState<'listo' | 'entrando' | 'error' | 'sin-permiso'>('listo')

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEstado('entrando')
    try {
      await api.entrarComoFuncionario(correo, clave)
      if (await api.esFuncionario()) onListo()
      else setEstado('sin-permiso')
    } catch {
      setEstado('error')
    }
  }

  return (
    <div className="pantalla" style={{ justifyContent: 'center', maxWidth: 400 }}>
      <form onSubmit={entrar} className="tarjeta" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 24 }}>
        <div>
          <h1 style={{ fontSize: 24 }}>Panel municipal</h1>
          <span className="suave">VeredaViva · Viña del Mar</span>
        </div>
        {api.modo === 'demo' && <div className="nota">Modo demo: cualquier correo y clave sirven.</div>}
        <label className="campo">
          Correo
          <input type="email" required autoComplete="username" value={correo} onChange={(e) => setCorreo(e.target.value)} style={{ font: 'inherit', fontSize: 16, height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid #c9cec6' }} />
        </label>
        <label className="campo">
          Clave
          <input type="password" required autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} style={{ font: 'inherit', fontSize: 16, height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid #c9cec6' }} />
        </label>
        {estado === 'error' && <div className="error">Correo o clave incorrectos.</div>}
        {estado === 'sin-permiso' && <div className="error">Esta cuenta no está registrada como funcionario municipal.</div>}
        <button type="submit" className="boton" disabled={estado === 'entrando'}>{estado === 'entrando' ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
