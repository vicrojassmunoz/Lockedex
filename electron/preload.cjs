// Puente seguro entre la ventana de Lockedex y el programa (proceso principal)
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('lockedex', {
  version: process.argv.find((a) => a.startsWith('--lx-version='))?.split('=')[1] || '',
  compacto: process.argv.includes('--lx-compacto'),

  // Acciones del menú: copia, restaurar, carpeta, acerca, compacto, ...
  accion: (nombre, datos) => ipcRenderer.invoke('lx:accion', nombre, datos),

  // Partida del emulador (.sav)
  elegirSav: () => ipcRenderer.invoke('lx:elegir-sav'),
  leerSav: (ruta) => ipcRenderer.invoke('lx:leer-sav', ruta),
  vigilarSav: (ruta) => ipcRenderer.invoke('lx:vigilar-sav', ruta),
  alCambiarSav: (cb) => {
    const f = (_e, ruta) => cb(ruta)
    ipcRenderer.on('lx:sav-cambiado', f)
    return () => ipcRenderer.removeListener('lx:sav-cambiado', f)
  },

  // Actualizaciones
  alActualizar: (cb) => {
    const f = (_e, estado) => cb(estado)
    ipcRenderer.on('lx:actualizacion', f)
    ipcRenderer.invoke('lx:estado-actualizacion').then((e) => e && cb(e))
    return () => ipcRenderer.removeListener('lx:actualizacion', f)
  }
})
