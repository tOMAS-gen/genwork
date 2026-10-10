import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/auth/session.dart';
import 'package:genwork_mobile/core/router/auth_redirect.dart';
import 'package:genwork_mobile/core/router/routes.dart';
import 'package:genwork_mobile/data/models/app_user.dart';

void main() {
  final server = Uri.parse('https://work.test');
  const user = AppUser(id: 'u', email: 'a@b.c', name: 'Ana', role: GlobalRole.member, roleRaw: 'MEMBER');
  final signedIn = SignedIn(serverUrl: server, token: 't', user: user);

  test('cargando → splash', () {
    expect(authRedirect(null, Routes.myDay), Routes.splash);
    expect(authRedirect(null, Routes.splash), isNull);
  });

  test('primer inicio → setup', () {
    expect(authRedirect(const NeedsServer(), Routes.splash), Routes.setup);
    expect(authRedirect(const NeedsServer(), Routes.setup), isNull);
  });

  test('sin sesión → login', () {
    expect(authRedirect(SignedOut(server), Routes.works), Routes.login);
    expect(authRedirect(SignedOut(server), Routes.login), isNull);
  });

  test('con sesión sale de las pantallas públicas y no toca el resto', () {
    expect(authRedirect(signedIn, Routes.login), Routes.myDay);
    expect(authRedirect(signedIn, Routes.splash), Routes.myDay);
    expect(authRedirect(signedIn, Routes.work('w1')), isNull);
  });

  test('links web de notificaciones → rutas de la app', () {
    expect(Routes.fromWebPath('/works/abc'), '/works/abc');
    expect(Routes.fromWebPath('/sectors/s1'), '/sectors/s1');
    expect(Routes.fromWebPath('/admin'), isNull);
    expect(Routes.fromWebPath(null), isNull);
  });
}
