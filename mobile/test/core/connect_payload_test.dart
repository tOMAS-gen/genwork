import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/servers/connect_payload.dart';

void main() {
  test('lee el payload del QR de la web', () {
    final url = parseConnectPayload(
      'genwork://connect?server=https%3A%2F%2Fwork.test',
    )!;
    expect(url.toString(), 'https://work.test');
  });

  test('ignora parámetros extra: el QR solo aporta la URL', () {
    final url = parseConnectPayload(
      'genwork://connect?server=https%3A%2F%2Fwork.test&name=Otro',
    )!;
    expect(url.toString(), 'https://work.test');
  });

  test('acepta una URL plana como respaldo', () {
    expect(parseConnectPayload('https://work.test/')!.toString(), 'https://work.test');
    expect(parseConnectPayload('work.test')!.toString(), 'https://work.test');
  });

  test('conserva el puerto y el path base', () {
    final url = parseConnectPayload(
      'genwork://connect?server=http%3A%2F%2F192.168.0.10%3A3010%2Fbase',
    )!;
    expect(url.toString(), 'http://192.168.0.10:3010/base');
  });

  test('rechaza lo que no es de genwork', () {
    expect(parseConnectPayload(''), isNull);
    expect(parseConnectPayload('genwork://connect'), isNull);
    expect(parseConnectPayload('genwork://connect?server='), isNull);
    expect(parseConnectPayload('genwork://auth?code=abc'), isNull);
    expect(parseConnectPayload('otraapp://connect?server=https%3A%2F%2Fx.test'), isNull);
    expect(parseConnectPayload('genwork://connect?server=ftp%3A%2F%2Fx.test'), isNull);
  });
}
