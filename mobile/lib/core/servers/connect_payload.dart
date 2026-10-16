import '../config/server_url.dart';

/// Lee el payload del QR de la web (`genwork://connect?server=…`) o, como respaldo,
/// una URL plana, y devuelve la URL del servidor. El QR solo aporta la dirección:
/// el nombre visible lo da el servidor en `/api/auth/mobile/info`. Devuelve null
/// si no es algo que pueda ser un genwork. La verificación real la hace después
/// `addServer`.
Uri? parseConnectPayload(String raw) {
  final text = raw.trim();
  if (text.isEmpty) return null;

  if (text.contains('://') && !text.startsWith('http://') && !text.startsWith('https://')) {
    final uri = Uri.tryParse(text);
    if (uri == null || uri.scheme != 'genwork' || uri.host != 'connect') return null;
    final server = uri.queryParameters['server'];
    if (server == null) return null;
    return normalizeServerUrl(server);
  }

  return normalizeServerUrl(text);
}
