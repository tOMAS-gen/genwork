/// Normalización de la URL del sistema que el usuario escribe en el primer inicio.
///
/// Acepta "work.gen.net.ar", "https://work.gen.net.ar/" o "http://192.168.0.10:3010"
/// y devuelve el origen (más un path base opcional) sin barra final. Sin esquema se
/// asume https. Devuelve null si no es una URL http(s) válida.
Uri? normalizeServerUrl(String input) {
  var text = input.trim();
  if (text.isEmpty) return null;
  if (!text.contains('://')) text = 'https://$text';

  final uri = Uri.tryParse(text);
  if (uri == null || uri.host.isEmpty) return null;
  if (uri.scheme != 'https' && uri.scheme != 'http') return null;

  var path = uri.path;
  while (path.endsWith('/')) {
    path = path.substring(0, path.length - 1);
  }
  return Uri(scheme: uri.scheme, host: uri.host, port: uri.hasPort ? uri.port : null, path: path);
}
