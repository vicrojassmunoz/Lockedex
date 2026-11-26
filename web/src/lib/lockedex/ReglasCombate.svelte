<script>
  // Reglas de combate a la vista en la ventana de VS: quién de tu equipo pasa del nivel máximo (con «Nivel
  // máximo obligatorio» y el .sav importado o vinculado), modo Set y objetos en combate
  import { leerReglas, limiteObjetos, ajustarNivel } from './reglas.js'
  import { claveSav } from './equipo.js'
  import { t } from './idioma.js'

  export let id = ''
  export let pokemon = [] // equipo del jefe (para su nivel máximo)

  $: reglas = leerReglas(id)
  $: limite = limiteObjetos(reglas)
  $: cap = ajustarNivel(Math.max(0, ...(pokemon || []).map((p) => parseInt(p?.level, 10)).filter((n) => !isNaN(n))), reglas)
  $: pasados = (() => {
    if (!reglas.nivelMax || !cap || typeof localStorage === 'undefined') return []
    try {
      const sav = JSON.parse(localStorage.getItem(claveSav(id)) || 'null')
      return (sav?.equipo || []).filter((p) => +p.nivel > +cap)
    } catch {
      return []
    }
  })()
</script>

{#if pasados.length || reglas.set || limite !== null}
  <div class="lx-rc">
    {#if pasados.length}
      <p class="lx-rc-pasados">
        ⚠ {t('Nivel máximo', 'Level cap')} {cap}:
        {pasados.map((p) => `${p.mote} (${t('Nv.', 'Lv.')} ${p.nivel})`).join(', ')}
        {pasados.length > 1 ? t('lo superan', 'are over it') : t('lo supera', 'is over it')}
      </p>
    {/if}
    {#if reglas.set}<span class="lx-rc-chip">{t('Modo Set', 'Set mode')}</span>{/if}
    {#if limite === 0}<span class="lx-rc-chip">{t('Sin objetos en combate', 'No items in battle')}</span>{/if}
    {#if limite > 0}<span class="lx-rc-chip">{t(`Máx. ${limite} objeto${limite > 1 ? 's' : ''} por combate`, `Max ${limite} item${limite > 1 ? 's' : ''} per battle`)}</span>{/if}
  </div>
{/if}

<style>
  .lx-rc {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    width: 100%;
    margin-top: 10px;
  }
  .lx-rc-pasados {
    flex-basis: 100%;
    padding: 4px 8px;
    font-size: 13px;
    color: #fff;
    background: #c02838;
    box-shadow: inset 0 -2px 0 #801020;
  }
  .lx-rc-chip {
    padding: 0 6px;
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 12px;
    line-height: 18px;
    color: #f8f8f8;
    background: #283850;
    clip-path: polygon(2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px), 0 2px);
  }
</style>
