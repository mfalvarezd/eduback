import 'dotenv/config'

export const etiquetaPrices = {
  emprendedor: {
    mensual: process.env.ETIQUETA_EMPRENDEDOR_MENSUAL,
    anual: process.env.ETIQUETA_EMPRENDEDOR_ANUAL,
  },
  pro: {
    mensual: process.env.ETIQUETA_PRO_MENSUAL,
    anual: process.env.ETIQUETA_PRO_ANUAL,
  },
  corporativo: {
    mensual: process.env.ETIQUETA_CORPORATIVO_MENSUAL,
    anual: process.env.ETIQUETA_CORPORATIVO_ANUAL,
  },
}
