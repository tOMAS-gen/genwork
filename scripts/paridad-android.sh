#!/usr/bin/env bash
# Capturas y navegación Android de la comparativa (spec 066), sin Marionette: adb + uiautomator.
# Coordenadas en dp (el emulador usa 390×844 dp a 3x).
#   ui [filtro]      lista textos/descripciones visibles con su centro en dp
#   tap X Y          toca en dp
#   text "..."       escribe en el campo con foco
#   key CODIGO       keyevent (4 atrás, 66 enter)
#   theme light|dark modo oscuro del sistema (la app sigue al sistema)
#   cap Pxx-slug-rol [-sN]  captura la pantalla actual en claro y oscuro en .context/paridad-visual/antes
#   scroll DP        desplaza el contenido DP hacia abajo (gesto lento, sin inercia)
#   demo             barra de estado fija (9:30, batería llena, sin notificaciones)
#   nav "Texto"      abre el menú lateral y toca el ítem con ese texto
#   adb ...          adb contra el mismo dispositivo
#   vista            captura reducida a .context/paridad-visual/vista.png para mirar
set -euo pipefail
cd "$(dirname "$0")/.."
adb=("${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb" -s "${ANDROID_DEVICE:-emulator-5554}")
out="${PARIDAD_DIR:-.context/paridad-visual/antes}"
demo() { "${adb[@]}" shell am broadcast -a com.android.systemui.demo -e command "$@" >/dev/null; }

case "${1:-}" in
  ui)
    "${adb[@]}" shell uiautomator dump /sdcard/ui.xml >/dev/null
    "${adb[@]}" exec-out cat /sdcard/ui.xml \
      | grep -oE '(text|content-desc)="[^"]+"[^>]*bounds="[^"]+"' \
      | sed -E 's/(text|content-desc)="([^"]+)".*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]"/\2 @ \3 \4 \5 \6/' \
      | awk -F' @ ' '{split($2,b," "); printf "%s @ %d %d\n", $1, (b[1]+b[3])/6, (b[2]+b[4])/6}' \
      | grep -i -- "${2:-.}" || true ;;
  tap) "${adb[@]}" shell input tap $(( $2 * 3 )) $(( $3 * 3 )) ;;
  text) "${adb[@]}" shell input text "$2" ;;
  key) "${adb[@]}" shell input keyevent "$2" ;;
  theme) "${adb[@]}" shell cmd uimode night "$([ "$2" = dark ] && echo yes || echo no)" >/dev/null; sleep 1.5 ;;
  cap)
    mkdir -p "$out"
    for t in light dark; do
      "$0" theme "$t"
      # El teclado no es parte de la pantalla web: si quedó abierto, se oculta.
      if "${adb[@]}" shell dumpsys input_method | grep -q 'mInputShown=true'; then
        "${adb[@]}" shell input keyevent 4; sleep 0.8
      fi
      "${adb[@]}" exec-out screencap -p > "$out/$2-$t-390${3:-}-android.png"
      echo "$out/$2-$t-390${3:-}-android.png"
    done
    "$0" theme light ;;
  scroll) # en tramos de hasta 500 dp desde la mitad de la pantalla (abajo suele haber barras fijas)
    left=$2
    while [ "$left" -gt 0 ]; do
      step=$(( left > 500 ? 500 : left ))
      "${adb[@]}" shell input swipe 585 1650 585 $(( 1650 - step * 3 )) 1500
      left=$(( left - step ))
    done ;;
  demo)
    "${adb[@]}" shell settings put global sysui_demo_allowed 1
    demo enter
    demo clock -e hhmm 0930
    demo battery -e level 100 -e plugged false
    demo network -e wifi show -e level 4
    demo notifications -e visible false ;;
  vista)
    "${adb[@]}" exec-out screencap -p > .context/paridad-visual/vista-full.png
    sips -Z 1000 .context/paridad-visual/vista-full.png --out .context/paridad-visual/vista.png >/dev/null
    echo .context/paridad-visual/vista.png ;;
  nav) # nav "Texto": abre el menú lateral y toca el ítem que empieza con ese texto
    find_item() { "$0" ui | grep -E "^$1(&#10;| @)" | head -1 | grep -oE '[0-9]+ [0-9]+$' || true; }
    for _ in 1 2 3; do   # desde una pantalla de detalle, volver hasta la que tiene menú
      [ -n "$(find_item 'Abrir menú')" ] && break
      "${adb[@]}" shell input keyevent 4; sleep 1.5
    done
    if [ -n "$(find_item 'Abrir menú')" ]; then "$0" tap 28 76; sleep 1; fi
    for _ in 1 2 3; do
      xy=$(find_item "$2")
      if [ -n "$xy" ]; then "$0" tap $xy; sleep 2.5; exit 0; fi
      "${adb[@]}" shell input swipe 400 2000 400 900 800; sleep 1
    done
    echo "No encontré \"$2\" en el menú" >&2; exit 1 ;;
  adb) shift; "${adb[@]}" "$@" ;;
  *) echo 'Uso: scripts/paridad-android.sh ui|tap|text|key|theme|cap|scroll|demo|vista|adb' >&2; exit 2 ;;
esac
