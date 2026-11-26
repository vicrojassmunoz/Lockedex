<script>
  // Efecto de campo permanente de un jefe (clima o campo) o combate doble. Cada efecto se enseña con el
  // objeto de los juegos que lo representa (las rocas que alargan cada clima, semillas y demás, de la 2.ª a
  // la 5.ª gen), en vez de los iconos de línea heredados.
  import { Icon, Tooltip } from '$c/core'
  import { Double } from '$icons'
  import { t } from '$lib/lockedex/idioma.js'

  export let effect

  const EFECTOS = {
    rain: { img: 'roca-lluvia', es: 'Lluvia', en: 'Rain', d: ['Los movimientos de tipo Agua hacen la mitad más de daño y los de tipo Fuego, la mitad menos. Trueno y Vendaval no fallan.', 'Water moves deal 50% more damage and Fire moves 50% less. Thunder and Hurricane never miss.'] },
    sunlight: { img: 'roca-calor', es: 'Sol', en: 'Sunlight', d: ['Los movimientos de tipo Fuego hacen la mitad más de daño y los de tipo Agua, la mitad menos. Trueno y Vendaval bajan su precisión al 50 %.', 'Fire moves deal 50% more damage and Water moves 50% less. Thunder and Hurricane drop to 50% accuracy.'] },
    sandstorm: { img: 'roca-suave', es: 'Tormenta de arena', en: 'Sandstorm', d: ['Al final de cada turno resta 1/16 de los PS a quien no sea de tipo Roca, Tierra o Acero. La Defensa Especial de los de tipo Roca sube la mitad.', 'At the end of each turn, non Rock, Ground or Steel Pokémon lose 1/16 of their HP. Rock types get 50% more Sp. Def.'] },
    hail: { img: 'roca-helada', es: 'Granizo', en: 'Hail', d: ['Al final de cada turno resta 1/16 de los PS a quien no sea de tipo Hielo. Ventisca no falla.', 'At the end of each turn, non Ice Pokémon lose 1/16 of their HP. Blizzard never misses.'] },
    fog: { img: 'polvo-brillo', es: 'Niebla', en: 'Fog', d: ['Baja la precisión de todos los movimientos. Despejar la quita.', 'Lowers the accuracy of every move. Defog clears it.'] },
    'electric-terrain': { img: 'pila', es: 'Campo Eléctrico', en: 'Electric Terrain', d: ['Potencia los movimientos de tipo Eléctrico y nadie en el suelo puede dormirse.', 'Boosts Electric moves and grounded Pokémon cannot fall asleep.'] },
    'psychic-terrain': { img: 'cuchara-torcida', es: 'Campo Psíquico', en: 'Psychic Terrain', d: ['Potencia los movimientos de tipo Psíquico y anula los de prioridad contra quien está en el suelo.', 'Boosts Psychic moves and blocks priority moves against grounded Pokémon.'] },
    'misty-terrain': { img: 'piedra-lunar', es: 'Campo de Niebla', en: 'Misty Terrain', d: ['Reduce a la mitad el daño de los movimientos de tipo Dragón y nadie en el suelo sufre problemas de estado.', 'Halves Dragon move damage and grounded Pokémon cannot get status conditions.'] },
    'grassy-terrain': { img: 'semilla-milagro', es: 'Campo de Hierba', en: 'Grassy Terrain', d: ['Potencia los movimientos de tipo Planta y cura 1/16 de los PS al final de cada turno.', 'Boosts Grass moves and heals 1/16 HP at the end of each turn.'] }
  }
  // «sunglight» viene así en algunos datos heredados
  $: datos = EFECTOS[effect === 'sunglight' ? 'sunlight' : effect]
</script>

{#if effect === 'double-battle'}
  <span class={$$restProps.class || ''}>
    <Tooltip>
      <b>{t('Combate doble', 'Double battle')}</b>
    </Tooltip>
    <Icon inline icon={Double} />
  </span>
{:else if datos}
  <div class="lx-efecto relative {$$restProps.class || ''}">
    <Tooltip>
      <b>{t(`${datos.es} permanente`, `Permanent ${datos.en.toLowerCase()}`)}</b>
      <p>{t(...datos.d)}</p>
    </Tooltip>
    <img src="/lx/objetos/{datos.img}.png" width="32" height="32" alt={t(datos.es, datos.en)} />
  </div>
{/if}

<style>
  .lx-efecto img {
    display: block;
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
    animation: lx-efecto-salto 1.2s steps(1, end) infinite;
  }
  @keyframes lx-efecto-salto {
    50% {
      transform: translateY(-2px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lx-efecto img {
      animation: none;
    }
  }
</style>
