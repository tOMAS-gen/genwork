#!/usr/bin/env bash
# Capturas y navegación Android de la comparativa (spec 066), sin Marionette: adb + uiautomator.
# Coordenadas en dp (el emulador usa 390×844 dp a 3x).
#   ui [filtro]      lista textos/descripciones visibles con su centro en dp
#   tap X Y          toca en dp
#   text "..."       escribe en el campo con foco
#   key CODIGO       keyevent (4 atrás, 66 enter)
#   theme light|dark modo oscuro del sistema (la app sigue al sistema)
#   cap Pxx-slug-rol captura la pantalla actual en claro y oscuro en .context/paridad-visual/antes
#   demo             barra de estado fija (9:30, batería llena, sin notificaciones)
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
      "${adb[@]}" exec-out screencap -p > "$out/$2-$t-390-android.png"
      echo "$out/$2-$t-390-android.png"
    done
    "$0" theme light ;;
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
  *) echo 'Uso: scripts/paridad-android.sh ui|tap|text|key|theme|cap|demo|vista' >&2; exit 2 ;;
esac
