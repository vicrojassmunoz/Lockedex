// Lockedex · traducción de la interfaz al español.
// Se carga en <head> antes que la página: así el texto ya aparece traducido
// desde el primer momento, sin ver el inglés ni un instante.
;(function () {
  var idioma = 'es'
  try {
    idioma = localStorage.getItem('lockedex.idioma') || 'es'
  } catch (e) {}
  if (idioma !== 'es') return

  var cargar = function (url) {
    try {
      var x = new XMLHttpRequest()
      x.open('GET', url, false)
      x.send(null)
      return x.status === 200 ? JSON.parse(x.responseText) : {}
    } catch (e) {
      return {}
    }
  }

  var dicc = new Map()
  var nombres = cargar('/lx/nombres-es.json')
  var interfaz = cargar('/lx/interfaz-es.json')
  Object.keys(nombres).forEach(function (k) {
    dicc.set(k, nombres[k])
  })
  Object.keys(interfaz).forEach(function (k) {
    dicc.set(k, interfaz[k])
  })

  var MESES = {
    January: 'enero', February: 'febrero', March: 'marzo', April: 'abril', May: 'mayo', June: 'junio',
    July: 'julio', August: 'agosto', September: 'septiembre', October: 'octubre', November: 'noviembre', December: 'diciembre'
  }
  var fecha = function (d, m) {
    return d + ' de ' + (MESES[m] || m)
  }
  var PATRONES = [
    [/^(\d+)(?:st|nd|rd|th) of (\w+)$/, function (_, d, m) { return fecha(d, m) }],
    [/^(\d+)(?:st|nd|rd|th) of (\w+) - (\d+)(?:st|nd|rd|th) of (\w+)$/, function (_, d1, m1, d2, m2) { return fecha(d1, m1) + ' - ' + fecha(d2, m2) }],
    [/^Route (\d+)$/, 'Ruta $1'],
    [/^Route (\d+) \((.+)\)$/, 'Ruta $1 ($2)'],
    [/^Lvl (\d+)$/, 'Nv. $1'],
    [/^Level (\d+)$/, 'Nivel $1'],
    // «Cerulean City Gym» → «Gimnasio de Ciudad Celeste» (si se conoce el nombre del lugar)
    [/^(.+) Gym$/, function (_, lugar) { var l = dicc.get(lugar); return l ? 'Gimnasio de ' + l : _ }]
  ]

  var ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt']
  var SALTAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1, KBD: 1 }

  var traducir = function (texto) {
    var t = texto.replace(/\s+/g, ' ').trim()
    if (!t || t.length > 400) return null
    var es = dicc.get(t)
    if (!es) {
      for (var i = 0; i < PATRONES.length; i++) {
        if (PATRONES[i][0].test(t)) {
          es = t.replace(PATRONES[i][0], PATRONES[i][1])
          break
        }
      }
    }
    if (!es || es === t) return null
    return texto.match(/^\s*/)[0] + es + texto.match(/\s*$/)[0]
  }

  var protegido = function (el) {
    return !!(el && el.closest && el.closest('[data-lx-original],[contenteditable="true"]'))
  }

  var atributos = function (el) {
    for (var i = 0; i < ATRIBUTOS.length; i++) {
      var v = el.getAttribute(ATRIBUTOS[i])
      if (v) {
        var n = traducir(v)
        if (n) el.setAttribute(ATRIBUTOS[i], n)
      }
    }
  }

  var texto = function (nodo) {
    var p = nodo.parentElement
    if (!p || SALTAR[p.tagName] || protegido(p)) return
    var n = traducir(nodo.data)
    if (n) nodo.data = n
  }

  var nodo = function (n) {
    if (n.nodeType === 3) return texto(n)
    if (n.nodeType !== 1 || protegido(n)) return
    atributos(n)
    if (SALTAR[n.tagName]) return
    var w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
    var x = w.nextNode()
    while (x) {
      if (x.nodeType === 3) texto(x)
      else if (!protegido(x)) atributos(x)
      x = w.nextNode()
    }
  }

  var obs = new MutationObserver(function (cambios) {
    for (var i = 0; i < cambios.length; i++) {
      var c = cambios[i]
      if (c.type === 'childList') {
        for (var j = 0; j < c.addedNodes.length; j++) nodo(c.addedNodes[j])
      } else if (c.type === 'attributes') {
        if (!protegido(c.target)) atributos(c.target)
      } else texto(c.target)
    }
  })
  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATRIBUTOS
  })

  window.__lxTraductor = {
    traducir: function (t) {
      return traducir(t) || t
    },
    diccionario: dicc
  }
})()
