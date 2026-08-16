import { useState } from 'react'
import { Layout, type ClavePagina } from '@/componentes/Layout'
import { Dashboard } from '@/paginas/Dashboard'
import { Stock } from '@/paginas/Stock'
import { Login } from '@/paginas/Login'
import { ProveedorSesion, usarSesion } from '@/lib/sesion'

function AppInterna() {
  const { usuario } = usarSesion()
  const [pagina, setPagina] = useState<ClavePagina>('dashboard')

  if (!usuario) return <Login />

  return (
    <Layout pagina={pagina} alCambiarPagina={setPagina}>
      {pagina === 'dashboard' ? <Dashboard /> : <Stock />}
    </Layout>
  )
}

export default function App() {
  return (
    <ProveedorSesion>
      <AppInterna />
    </ProveedorSesion>
  )
}
