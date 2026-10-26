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
