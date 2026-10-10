import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

/// Par PKCE (RFC 7636, método S256) para el login móvil.
class Pkce {
  Pkce._(this.verifier, this.challenge);

  factory Pkce.generate([Random? random]) {
    final verifier = randomUrlSafe(32, random);
    return Pkce._(verifier, challengeFor(verifier));
  }

  final String verifier;
  final String challenge;

  static String challengeFor(String verifier) =>
      _base64UrlNoPad(sha256.convert(ascii.encode(verifier)).bytes);
}

/// `bytes` aleatorios en base64url sin padding (32 bytes → 43 caracteres).
String randomUrlSafe(int bytes, [Random? random]) {
  final rng = random ?? Random.secure();
  return _base64UrlNoPad(List<int>.generate(bytes, (_) => rng.nextInt(256)));
}

String _base64UrlNoPad(List<int> bytes) => base64Url.encode(bytes).replaceAll('=', '');
