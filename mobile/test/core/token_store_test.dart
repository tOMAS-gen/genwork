import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/auth/token_store.dart';
import 'package:genwork_mobile/data/models/app_user.dart';

AppUser _user(String id) => AppUser.fromJson({
      'id': id, 'email': '$id@test', 'name': id, 'globalRole': 'MEMBER',
    });

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('cada perfil guarda su propio token', () async {
    FlutterSecureStorage.setMockInitialValues({});
    final store = SecureTokenStore();
    await store.write('a', StoredSession(token: 'ta', user: _user('ua')));
    await store.write('b', StoredSession(token: 'tb', user: _user('ub')));
    expect((await store.read('a'))!.token, 'ta');
    expect((await store.read('b'))!.user.id, 'ub');
    await store.clear('a');
    expect(await store.read('a'), isNull);
    expect((await store.read('b'))!.token, 'tb');
  });

  test('adoptLegacy mueve el token único al perfil y borra el viejo', () async {
    FlutterSecureStorage.setMockInitialValues({
      'auth_token': 'viejo',
      'auth_user': '{"id":"u","email":"u@test","name":"U","globalRole":"MEMBER"}',
    });
    final store = SecureTokenStore();
    await store.adoptLegacy('p1');
    expect((await store.read('p1'))!.token, 'viejo');
    await store.adoptLegacy('p2'); // ya no queda nada que adoptar
    expect(await store.read('p2'), isNull);
  });
}
