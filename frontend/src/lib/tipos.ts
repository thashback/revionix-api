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
  /**
   * Solo en ventas de ecommerce cargadas desde su propia pantalla. Las que
   * entran por "Carga de ventas" no la traen: esa plantilla no tiene columna
   * de plataforma.
   */
  plataforma?: string
  /**
   * Venta de servicio (mano de obra, instalación, mantenimiento). Su costo es
   * cero A PROPÓSITO: la mano de obra ya está en planilla y gastos, y ponerle
   * costo a la línea contaría el mismo desembolso dos veces. Se distingue de
   * una venta a la que simplemente le falta el costo.
   */
  es_servicio?: boolean
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
  /** Serie y número del comprobante, vacíos mientras está "Por emitir".
   *  Sirven para no contar dos veces las ventas que ya están en TXNS_DATA. */
  serie?: string
  numero?: string | number
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
  /** Ruta del comprobante en PDF, si se subió uno. */
  pdf?: string | null
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

/**
 * Planilla mensual por trabajador (rv_planilla en el almacén compartido).
 *
 * No es lo mismo que `Planilla`: aquella es PLANILLA_DATA, una foto de un solo
 * mes sin campo de periodo. Esta lleva año y mes, que es lo que permite ver
 * la planilla de cada mes por separado.
 */
export interface PlanillaMes {
  id?: string
  ano: number
  mes: number
  trabajador: string
  cargo?: string
  fecha_ingreso?: string
  dias?: number
  remuneracion: number
  bono?: number
  adelantos?: number
  vacaciones?: number
  liquidacion?: number
  gratif?: number
  total?: number
  sistema?: string
  desc_pension?: number
  desc_otros?: number
  total_descuentos?: number
  neto?: number
  essalud?: number
  n_cuenta?: string
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
