import 'dotenv/config'
import { etiquetaPrices } from './apps/etiqueta'

const PRICE_IDS = {
  individual: {
    etiqueta: etiquetaPrices,
  },
  empresas: {},
  estudiantes_profesores: {},
  universidades_institutos: {},
}

export const productToPriceID = {
  'etiqueta-emprendedor': etiquetaPrices.emprendedor.mensual,
  'etiqueta-pro': etiquetaPrices.pro.mensual,
  'etiqueta-corporativo': etiquetaPrices.corporativo.mensual,
}

export const productToPriceIDAnnually = {
  'etiqueta-emprendedor': etiquetaPrices.emprendedor.anual,
  'etiqueta-pro': etiquetaPrices.pro.anual,
  'etiqueta-corporativo': etiquetaPrices.corporativo.anual,
}

export const STRIPE_PRODUCT_MAPPING = {
  [process.env.EMPRENDEDOR_PRODUCT as string]: 'Emprendedor',
  [process.env.PRO_PRODUCT as string]: 'Pro',
  [process.env.CORPORATIVO_PRODUCT as string]: 'Corporativo',

  'etiqueta-emprendedor': 'Emprendedor',
  'etiqueta-pro': 'Pro',
  'etiqueta-corporativo': 'Corporativo',
}
export default PRICE_IDS
