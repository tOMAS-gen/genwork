import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/config/server_url.dart';
import 'package:genwork_mobile/core/servers/server_profile.dart';
import 'package:genwork_mobile/core/servers/server_registry.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<ServerRegistry> _registry([Map<String, Object> initial = const {}]) async {
  SharedPreferences.setMockInitialValues(initial);
  return ServerRegistry(await SharedPreferences.getInstance());
}

void main() {
  final a = Uri.parse('https://a.test');
  final b = Uri.parse('https://b.test');

  test('arranca vacío', () async {
    final r = await _registry();
    expect(r.profiles(), isEmpty);
    expect(r.active(), isNull);
  });

  test('upsert agrega y el nombre por defecto es el host', () async {
    final r = await _registry();
    final p = await r.upsert(a);
    expect(p.name, 'a.test');
    expect(r.profiles().single.url, a);
  });

  test('upsert del mismo servidor no duplica y actualiza el nombre', () async {
    final r = await _registry();
    await r.upsert(a);
    await r.upsert(normalizeServerUrl('HTTPS://A.test/')!, name: 'Taller A');
    expect(r.profiles(), hasLength(1));
    expect(r.profiles().single.name, 'Taller A');
  });

  test('el puerto estándar no genera otro perfil', () async {
    expect(
      ServerProfile.idFor(Uri.parse('https://a.test:443')),
      ServerProfile.idFor(Uri.parse('https://a.test')),
    );
  });

  test('setActive/active y fallback al primero si falta el activo', () async {
    final r = await _registry();
    final pa = await r.upsert(a);
    final pb = await r.upsert(b);
    await r.setActive(pb.id);
    expect(r.active()!.id, pb.id);
    await r.remove(pb.id);
    expect(r.active()!.id, pa.id);
  });

  test('remove del último deja NeedsServer (active null)', () async {
    final r = await _registry();
    final pa = await r.upsert(a);
    await r.setActive(pa.id);
    await r.remove(pa.id);
    expect(r.profiles(), isEmpty);
    expect(r.active(), isNull);
  });

  test('migrateLegacy convierte server_url en el primer perfil activo', () async {
    final r = await _registry({'server_url': 'https://old.test'});
    final p = await r.migrateLegacy();
    expect(p!.url, Uri.parse('https://old.test'));
    expect(r.active()!.id, p.id);
    expect(await r.migrateLegacy(), isNull); // idempotente: la clave vieja ya no está
  });

  test('datos corruptos no rompen la app', () async {
    final r = await _registry({'server_profiles': '{no es json'});
    expect(r.profiles(), isEmpty);
  });
}
