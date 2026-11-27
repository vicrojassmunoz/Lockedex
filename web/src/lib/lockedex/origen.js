// De dónde viene un Pokémon de la run, en una frase («Capturado en Ruta 3», «Salió de un huevo»…)
import { t, traducirNombre } from './idioma.js'

export const origenDe = (p) => {
  const sitio = p.customName || p.location
  if (p.location === 'Starter') return t('Tu Pokémon inicial', 'Your starter Pokémon')
  if (p.cambio?.tipo === 'huevo') return t('Salió de un huevo', 'Hatched from an egg') + (sitio ? t(' (captura de ', ' (catch from ') + traducirNombre(sitio) + ')' : '')
  if (p.cambio?.tipo === 'prodigioso') return t('Llegó por Intercambio Prodigioso', 'Came via Wonder Trade') + (sitio ? t(' (captura de ', ' (catch from ') + traducirNombre(sitio) + ')' : '')
  if (!sitio || (p.customId && !p.customName)) return t('Lugar desconocido', 'Unknown place')
  if (p.status === 2) return t('Regalo en ', 'Gift at ') + traducirNombre(sitio)
  if (p.status === 3) return t('Intercambio en ', 'Traded at ') + traducirNombre(sitio)
  return t('Capturado en ', 'Met at ') + traducirNombre(sitio)
}
