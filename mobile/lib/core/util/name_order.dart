/// Comparación española sin distinguir mayúsculas ni acentos; la ñ conserva
/// su lugar después de la n. También admite los acentos descompuestos.
int compareNamesEs(String a, String b) {
  String key(String value) {
    var text = value.toLowerCase().replaceAll('n\u0303', 'ñ');
    const folds = {
      'á': 'a',
      'à': 'a',
      'ä': 'a',
      'â': 'a',
      'é': 'e',
      'è': 'e',
      'ë': 'e',
      'ê': 'e',
      'í': 'i',
      'ì': 'i',
      'ï': 'i',
      'î': 'i',
      'ó': 'o',
      'ò': 'o',
      'ö': 'o',
      'ô': 'o',
      'ú': 'u',
      'ù': 'u',
      'ü': 'u',
      'û': 'u',
    };
    for (final entry in folds.entries) {
      text = text.replaceAll(entry.key, entry.value);
    }
    return text
        .replaceAll(RegExp('[\u0300-\u0302\u0308]'), '')
        .replaceAll('ñ', 'n\uffff');
  }

  return key(a).compareTo(key(b));
}
