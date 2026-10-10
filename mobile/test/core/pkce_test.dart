import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/auth/pkce.dart';

void main() {
  test('challenge S256 del ejemplo de RFC 7636 (igual que el servidor)', () {
    expect(
      Pkce.challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  test('verifier de 43 caracteres base64url y challenge de 43', () {
    final pkce = Pkce.generate();
    expect(pkce.verifier, matches(RegExp(r'^[A-Za-z0-9_-]{43}$')));
    expect(pkce.challenge, matches(RegExp(r'^[A-Za-z0-9_-]{43}$')));
  });
}
