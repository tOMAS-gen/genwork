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

  test('sin sesión → lista de servidores (no hay pantalla de login nativa)', () {
    expect(authRedirect(SignedOut(server), Routes.works), Routes.servers);
    expect(authRedirect(SignedOut(server), Routes.splash), Routes.servers);
    expect(authRedirect(SignedOut(server), Routes.setup), Routes.servers);
    expect(authRedirect(SignedOut(server), '/login'), Routes.servers);
    expect(authRedirect(SignedOut(server), Routes.servers), isNull);
  });

  test('rol desconocido con sesión → lista de servidores', () {
    const unknown = AppUser(id: 'x', email: 'x@b.c', name: 'X', role: GlobalRole.unknown, roleRaw: 'RARO');
    final s = SignedIn(serverUrl: server, token: 't', user: unknown);
    expect(authRedirect(s, Routes.myDay), Routes.servers);
    expect(authRedirect(s, Routes.servers), isNull);
  });

  test('con sesión sale de las pantallas públicas y no toca el resto', () {
    expect(authRedirect(signedIn, Routes.setup), Routes.myDay);
    expect(authRedirect(signedIn, Routes.splash), Routes.myDay);
    expect(authRedirect(signedIn, Routes.work('w1')), isNull);
  });

  test('las rutas de servidores están disponibles con y sin sesión', () {
    for (final location in [Routes.servers, Routes.addServer]) {
      expect(authRedirect(SignedOut(server), location), isNull);
      expect(authRedirect(signedIn, location), isNull);
    }
  });

  test('clientes y lectores también pueden cambiar de servidor', () {
    const client = AppUser(id: 'c', email: 'c@b.c', name: 'C', role: GlobalRole.client, roleRaw: 'CLIENT');
    const reader = AppUser(id: 'r', email: 'r@b.c', name: 'R', role: GlobalRole.reader, roleRaw: 'READER');
    for (final u in [client, reader]) {
      final s = SignedIn(serverUrl: server, token: 't', user: u);
      expect(authRedirect(s, Routes.servers), isNull);
      expect(authRedirect(s, Routes.addServer), isNull);
    }
  });

  test('sin servidores, /servers/add redirige a setup', () {
    expect(authRedirect(const NeedsServer(), Routes.addServer), Routes.setup);
    expect(authRedirect(const NeedsServer(), Routes.servers), Routes.setup);
  });

  test('links web de notificaciones → rutas de la app', () {
    expect(Routes.fromWebPath('/works/abc'), '/works/abc');
    expect(Routes.fromWebPath('/sectors/s1'), '/sectors/s1');
    expect(Routes.fromWebPath('/admin'), Routes.settings);
    expect(Routes.fromWebPath(null), isNull);
  });
}
