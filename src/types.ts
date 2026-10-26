export type Foto = { id: number; url: string; sm: string; ancho: number; alto: number }

export type Variante = { id?: number; tipo: string; precio: number; sku: string | null; agotado: boolean }

export type Opcion = { id?: number; nombre: string; valores: string[]; agotados: string[]; requerida: boolean }

export type Producto = {
  id: number
  slug: string
  nombre: string
  categoriaId: number
  categoria: string
  seccion: string
  material: string
  descripcion: string
  agotado: boolean
  oculto: boolean
  destacado: boolean
  nuevo: boolean
  escogeDiseno: boolean
  orden: number
  variantes: Variante[]
  opciones: Opcion[]
  fotos: Foto[]
  colecciones: number[]
}

export type ProductoFila = {
  id: number
  slug: string
  nombre: string
  categoria: string
  categoriaNombre: string
  seccion: string
  agotado: boolean
  oculto: boolean
  destacado: boolean
  nuevo: boolean
  orden: number
  variantes: number
  sinStock: string[]
  precioDesde: number
  foto: string | null
}

export type Categoria = { id: number; slug: string; nombre: string; descripcion: string; orden: number; activa: boolean; productos: number }

export type Coleccion = { id: number; slug: string; nombre: string; descripcion: string; foto: string | null; orden: number; activa: boolean; productoIds: number[] }

export type Color = { id: number; nombre: string; hex: string }

export type Faq = { id: number; pregunta: string; respuesta: string; orden: number; activa: boolean }

export type HeroVideo = { indice: number; video: string; poster: string | null }

export type Ajustes = {
  contacto: { whatsapp: string; instagram: string; tiktok: string; email: string }
  evento: { minimo: number; diasAnticipacion: number }
  descuentos: { desde: number; porcentaje: number }[]
  envios: { motorizadoLima: number; shalom: number; dias: string; separar: number; mesesSeparar: number; horasCambio: number }
  hero: HeroVideo[]
}

export type Resumen = {
  pedidos: { nuevos: number; porEnviar: number; enCamino: number; conSaldo: number }
  productos: number
  agotados: number
  ocultos: number
  destacados: number
  sinFoto: number
  categorias: number
  colecciones: number
  porCategoria: { nombre: string; total: number }[]
}

export type Sesion = { id: number; email: string; nombre: string }

export type EstadoPedido = 'recibido' | 'pagado' | 'preparando' | 'enviado' | 'entregado'

export type PedidoFila = {
  id: number
  codigo: string
  origen: 'manual' | 'tienda'
  estado: EstadoPedido
  cancelado: boolean
  cliente: string
  ciudad: string
  piezas: number
  resumen: string
  total: number
  pagado: number
  saldo: number
  creado: string
  actualizado: string
}

export type PedidoItem = {
  id?: number
  productoId: number | null
  nombre: string
  detalle: string
  sku: string | null
  foto: string | null
  precio: number
  cantidad: number
}

export type Pago = { id: number; monto: number; metodo: string; nota: string; fecha: string; tieneCaptura: boolean }

export type EventoPedido = { id: number; estado: string; nota: string; fecha: string }

export type MetodoEnvio = '' | 'motorizado' | 'shalom' | 'otro'

export type Pedido = PedidoFila & {
  token: string
  whatsapp: string
  nota: string
  metodoEnvio: MetodoEnvio
  agencia: string
  seguimiento: string
  envioCosto: number
  descuento: number
  subtotal: number
  items: PedidoItem[]
  pagos: Pago[]
  eventos: EventoPedido[]
}

export type ListaPedidos = { pedidos: PedidoFila[]; conteos: Record<string, number> }

export type ProductoCatalogo = {
  id: number
  nombre: string
  categoria: string
  oculto: boolean
  agotado: boolean
  escogeDiseno: boolean
  foto: string | null
  variantes: { id: number; tipo: string; precio: number; sku: string | null; agotado: boolean }[]
  opciones: { nombre: string; valores: string[]; agotados: string[]; requerida: boolean }[]
}
