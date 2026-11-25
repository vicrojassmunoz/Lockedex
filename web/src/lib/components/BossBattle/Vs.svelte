<script>
  // Insignia «VS» a píxeles, como la de las presentaciones de combate
</script>

<div class="relative z-50 inline-block {$$restProps.containerClass || ''}">
  <span class="lx-vs-insignia">VS</span>
</div>

<style>
  .lx-vs-insignia {
    display: inline-block;
    padding: 2px 6px 4px;
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 24px;
    line-height: 20px;
    color: #f8d030;
    text-shadow: 2px 0 0 #a01828, -2px 0 0 #a01828, 0 2px 0 #a01828, 0 -2px 0 #a01828, 3px 3px 0 #283850;
    background: #283850;
    clip-path: polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px);
    box-shadow: inset 0 0 0 2px #f8f8f8;
  }
</style>
