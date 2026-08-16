/** Una línea de inventario tal como la envía BILLIA (clave INVENTARIO_DATA). */
export interface LineaInventario {
  sede: string
  marca: string
  producto: string
  sku: string
  cant: number
  precio: number
  costo: number
  valor_venta: number
  valor_costo: number
  req_serie?: boolean
  series?: number
}

/** Sello de origen del inventario (clave INVENTARIO_META). */
export interface MetaInventario {
  actualizado?: string
  unidades?: number
}

/** Respuesta de /api/seed-all: cada clave es un bloque de datos del servidor. */
export interface SeedCompleto {
  INVENTARIO_DATA?: LineaInventario[]
  INVENTARIO_META?: MetaInventario
  [clave: string]: unknown
}

export interface Venta {
  id: number
  fecha: string
  canal: string
  producto: string
  marca: string
  qty: number
  precio_venta: number
  costo: number
}
