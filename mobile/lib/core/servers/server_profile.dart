import 'dart:convert';

import 'package:crypto/crypto.dart';

/// Un servidor genwork guardado en el teléfono. El `id` sale del origen, así
/// que el mismo servidor escrito distinto (mayúsculas, barra final, `:443`)
/// es siempre el mismo perfil.
class ServerProfile {
  const ServerProfile({required this.id, required this.url, required this.name});

  factory ServerProfile.forUrl(Uri url, {String? name}) {
    final clean = name?.trim();
    return ServerProfile(
      id: idFor(url),
      url: url,
      name: (clean == null || clean.isEmpty) ? url.host : clean,
    );
  }

  final String id;
  final Uri url;
  final String name;

  /// Primeros 16 hex de SHA-256 del origen normalizado.
  static String idFor(Uri url) =>
      sha256.convert(utf8.encode(url.toString())).toString().substring(0, 16);

  Map<String, Object?> toJson() => {'id': id, 'url': url.toString(), 'name': name};

  static ServerProfile? tryFromJson(Object? json) {
    if (json is! Map) return null;
    final url = Uri.tryParse('${json['url']}');
    if (url == null || url.host.isEmpty) return null;
    final name = json['name'];
    return ServerProfile.forUrl(url, name: name is String ? name : null);
  }

  ServerProfile withName(String newName) =>
      ServerProfile(id: id, url: url, name: newName);
}
