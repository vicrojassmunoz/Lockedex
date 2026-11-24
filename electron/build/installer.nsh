; Lockedex: al instalar, retira la versión anterior "Nuzlocke Tracker" y el
; instalador manual de Lockedex 1.1 (las partidas en Documentos no se tocan)
!macro customInstall
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NuzlockeTrackerEscritorio" "InstallLocation"
  StrCmp $0 "" lx_sin_antigua
    nsExec::Exec 'taskkill /F /IM "Nuzlocke Tracker.exe"'
    RMDir /r "$0\resources"
    RMDir /r "$0\locales"
    Delete "$0\Nuzlocke Tracker.exe"
    Delete "$0\*.dll"
    Delete "$0\*.pak"
    Delete "$0\*.bin"
    Delete "$0\icudtl.dat"
    Delete "$0\vk_swiftshader_icd.json"
    Delete "$0\LICENSE.electron.txt"
    Delete "$0\LICENSES.chromium.html"
    Delete "$0\Desinstalar.exe"
    RMDir "$0"
    Delete "$DESKTOP\Nuzlocke Tracker.lnk"
    RMDir /r "$SMPROGRAMS\Nuzlocke Tracker"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\NuzlockeTrackerEscritorio"
  lx_sin_antigua:
  ; Entrada del instalador manual de Lockedex 1.1 (los archivos ya se sustituyen)
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\LockedexEscritorio"
  Delete "$INSTDIR\Desinstalar.exe"
  RMDir /r "$SMPROGRAMS\Lockedex"
!macroend
