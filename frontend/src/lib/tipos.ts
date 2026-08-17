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

/** Venta de tienda registrada en el CRM (clave TXNS_DATA). */
export interface Transaccion {
  canal: string
  mes: string
  fecha: string
  tipo_doc?: string
  serie?: string
  correlativo?: string
  modelo: string
  marca: string
  qty: number
  venta: number
  costo: number
  margen?: number
  medio_pago?: string
}

/** Comprobante facturado en BILLIA (clave VENTAS_BILLIA_DATA). */
export interface VentaBillia {
  fecha: string | null
  mes: string | null
  tipo_doc: string
  serie: string
  numero: number
  doc: string
  estado: string
  cliente: string
  ruc_cliente: string
  canal: string
  total: number
  /** null cuando el comprobante no trae detalle de producto: sin líneas no
   *  se conoce el costo, y un cero se sumaría como margen del 100%. */
  costo: number | null
  margen: number | null
  es_devolucion: boolean
  condicion: string
  cobrado: boolean
}

/** Venta a cliente corporativo (clave CORP_VENTAS_DATA). */
export interface VentaCorp {
  cliente: string
  fecha: string
  mes: string
  doc: string
  desc: string
  marca: string
  qty: number
  total: number
  estado: string
  condicion: string
  cobrado: boolean
  costo: number
}

/** Venta por plataforma de ecommerce (clave ECOMMERCE_DATA). */
export interface Ecommerce {
  fecha: string
  mes: string
  plataforma: string
  vendedor?: string
  qty: number
  modelo: string
  marca: string
  precio_unit: number
  total: number
  costo: number
}

/** Compra mayorista (clave COMPRAS_DATA). El costo es UNITARIO. */
export interface Compra {
  prov: string
  fecha: string
  desc: string
  marca: string
  cant: number
  usd: number
  sol: number
  mon: string
}

/** Gasto de operación (clave GASTOS_DATA). */
export interface Gasto {
  id?: string | number
  fecha: string
  mes: string
  cat: string
  canal?: string
  desc: string
  resp?: string
  monto: number
  tipo_doc?: string
}

/** Fila de planilla (clave PLANILLA_DATA). */
export interface Planilla {
  n?: number
  nombre: string
  fecha_ingreso?: string
  dias?: number
  remuneracion: number
  bono?: number
  gratif?: number
  adelantos?: number
  vacaciones?: number
  liquidacion?: number
  essalud?: number
}

/** Alquiler o pago fijo mensual (ALQUILERES_DATA / PAGOS_FIJOS_DATA). */
export interface Fijo {
  concepto: string
  tipo?: string
  monto_mensual?: number
  monto?: number
  moneda?: string
  cuenta?: string
  estado?: string
}

/** Respuesta de /api/seed-all: cada clave es un bloque de datos del servidor. */
export interface SeedCompleto {
  INVENTARIO_DATA?: LineaInventario[]
  INVENTARIO_META?: MetaInventario
  [clave: string]: unknown
}
