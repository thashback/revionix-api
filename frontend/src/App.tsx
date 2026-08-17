import { useState } from 'react'
import { Layout, type ClavePagina } from '@/componentes/Layout'
import { Dashboard } from '@/paginas/Dashboard'
import { Stock } from '@/paginas/Stock'
import { Ventas } from '@/paginas/Ventas'
import { Compras } from '@/paginas/Compras'
import { Gastos } from '@/paginas/Gastos'
import { Login } from '@/paginas/Login'
import { ProveedorSesion, usarSesion } from '@/lib/sesion'
import { ProveedorTema } from '@/lib/tema'

function AppInterna() {
  const { usuario } = usarSesion()
  const [pagina, setPagina] = useState<ClavePagina>('dashboard')

  if (!usuario) return <Login />

  return (
    <Layout pagina={pagina} alCambiarPagina={setPagina}>
      {pagina === 'dashboard' && <Dashboard />}
      {pagina === 'ventas' && <Ventas />}
      {pagina === 'stock' && <Stock />}
      {pagina === 'compras' && <Compras />}
      {pagina === 'gastos' && <Gastos />}
    </Layout>
  )
}

export default function App() {
  return (
    <ProveedorTema>
      <ProveedorSesion>
        <AppInterna />
      </ProveedorSesion>
    </ProveedorTema>
  )
}
