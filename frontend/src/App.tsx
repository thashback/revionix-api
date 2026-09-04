import { useState } from 'react'
import { Layout, type ClavePagina } from '@/componentes/Layout'
import { Dashboard } from '@/paginas/Dashboard'
import { Stock } from '@/paginas/Stock'
import { Ventas } from '@/paginas/Ventas'
import { Compras } from '@/paginas/Compras'
import { Gastos } from '@/paginas/Gastos'
import { Ebitda } from '@/paginas/Ebitda'
import { Marcas } from '@/paginas/Marcas'
import { Corporativo } from '@/paginas/Corporativo'
import { Ecommerce } from '@/paginas/Ecommerce'
import { MesAMes } from '@/paginas/MesAMes'
import { Proyectos } from '@/paginas/Proyectos'
import { Canales } from '@/paginas/Canales'
import { Detalle } from '@/paginas/Detalle'
import { Inversion } from '@/paginas/Inversion'
import { GastosFijos } from '@/paginas/GastosFijos'
import { PagosPendientes } from '@/paginas/PagosPendientes'
import { Planilla } from '@/paginas/Planilla'
import { CargaVentas } from '@/paginas/CargaVentas'
import { Usuarios } from '@/paginas/Usuarios'
import { Solicitudes } from '@/paginas/Solicitudes'
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
      {pagina === 'ebitda' && <Ebitda />}
      {pagina === 'marcas' && <Marcas />}
      {pagina === 'corporativo' && <Corporativo />}
      {pagina === 'ecommerce' && <Ecommerce />}
      {pagina === 'meses' && <MesAMes />}
      {pagina === 'proyectos' && <Proyectos />}
      {pagina === 'canales' && <Canales />}
      {pagina === 'detalle' && <Detalle />}
      {pagina === 'inversion' && <Inversion />}
      {pagina === 'gastos-fijos' && <GastosFijos />}
      {pagina === 'pagos-pendientes' && <PagosPendientes />}
      {pagina === 'planilla' && <Planilla />}
      {pagina === 'carga' && <CargaVentas />}
      {pagina === 'usuarios' && <Usuarios />}
      {pagina === 'solicitudes' && <Solicitudes />}
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
