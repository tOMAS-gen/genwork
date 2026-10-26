// Materiales del proyecto y totales, contra las respuestas de la API web
// (`/api/works/[id]/materials`, `/api/materials`, `/api/genstock/search`).
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/network/api_client.dart';
import 'package:genwork_mobile/data/repositories/materials_repository.dart';

Map<String, Object?> _material({String id = 'm1', String? notes}) => {
  'id': id,
  'workId': 'w',
  'genstockProductId': 'p1',
  'productName': 'Vinilo blanco',
  'productCode': 'VIN-001',
  'humanCode': 'V1',
  'unitId': 'u',
  'unitName': 'Metro',
  'unitAbbreviation': 'm',
  'unitAllowsDecimal': true,
  'quantityRequired': '12.5',
  'notes': notes,
};

({MaterialsRepository repo, List<RequestOptions> requests}) _repo(
  Object? Function(RequestOptions r) respond,
) {
  final requests = <RequestOptions>[];
  final dio = Dio(BaseOptions(baseUrl: 'https://test.invalid'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (r, h) {
        requests.add(r);
        h.resolve(Response(requestOptions: r, statusCode: 200, data: respond(r)));
      },
    ),
  );
  return (
    repo: MaterialsRepository(
      ApiClient(baseUrl: Uri.parse('https://test.invalid'), dio: dio),
    ),
    requests: requests,
  );
}

void main() {
  test('lista los materiales del proyecto con cantidad y unidad', () async {
    final f = _repo((_) => [_material(notes: 'Para la vidriera')]);
    final list = await f.repo.forWork('w');
    expect(f.requests.single.path, '/api/works/w/materials');
    final m = list.single;
    expect(m.productName, 'Vinilo blanco');
    expect(m.code, 'V1');
    expect(m.quantityLabel, '12,5 m');
    expect(m.notes, 'Para la vidriera');
  });

  test('agrega, actualiza y quita con los cuerpos de la web', () async {
    final f = _repo((r) => r.method == 'DELETE' ? null : _material());
    await f.repo.add('w', productId: 'p1', quantityRequired: '3', notes: '');
    await f.repo.update('w', 'm1', quantityRequired: '4', notes: 'x');
    await f.repo.remove('w', 'm1');
    expect(f.requests[0].method, 'POST');
    expect(f.requests[0].data, {
      'productId': 'p1',
      'quantityRequired': '3',
      'notes': null,
    });
    expect(f.requests[1].path, '/api/works/w/materials/m1');
    expect(f.requests[1].data, {'quantityRequired': '4', 'notes': 'x'});
    expect(f.requests[2].method, 'DELETE');
  });

  test('busca en Genstock con "Solo insumos"', () async {
    final f = _repo(
      (_) => {
        'items': [
          {
            'product': {
              'id': 'p1',
              'name': 'Vinilo blanco',
              'product_code': 'VIN-001',
              'human_code': 'V1',
              'unit_id': 'u',
            },
          },
        ],
        'supplyFallback': true,
      },
    );
    final result = await f.repo.search('vin', supplyOnly: true);
    expect(f.requests.single.path, '/api/genstock/search');
    expect(f.requests.single.queryParameters, {'q': 'vin', 'supply': '1'});
    expect(result.items.single.name, 'Vinilo blanco');
    expect(result.fallback, isTrue);
  });

  test('totales consolidados de /api/materials', () async {
    final f = _repo(
      (_) => [
        {
          'genstockProductId': 'p1',
          'productName': 'Vinilo blanco',
          'productCode': 'VIN-001',
          'humanCode': 'V1',
          'unitName': 'Metro',
          'unitAbbreviation': 'm',
          'totalQuantityRequired': '20',
          'projects': [
            {
              'workId': 'w',
              'workName': 'Cartelería',
              'groupName': 'QA produccion',
              'quantityRequired': '12.5',
            },
          ],
        },
      ],
    );
    final totals = await f.repo.totals();
    expect(f.requests.single.path, '/api/materials');
    expect(totals.single.productName, 'Vinilo blanco');
    expect(totals.single.totalLabel, '20 m');
    expect(totals.single.projects.single.workName, 'Cartelería');
  });
}
