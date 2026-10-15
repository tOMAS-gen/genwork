import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/config/server_url.dart';

void main() {
  test('sin esquema asume https y quita barra final', () {
    expect(normalizeServerUrl(' work.gen.net.ar/ ').toString(), 'https://work.gen.net.ar');
  });

  test('conserva http, puerto y path base', () {
    expect(normalizeServerUrl('http://192.168.0.10:3010/genwork/').toString(), 'http://192.168.0.10:3010/genwork');
  });

  test('rechaza vacío y esquemas no http', () {
    expect(normalizeServerUrl(''), isNull);
    expect(normalizeServerUrl('ftp://x.com'), isNull);
    expect(normalizeServerUrl('https://'), isNull);
  });
}
