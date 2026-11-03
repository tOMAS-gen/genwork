import '../../core/network/api_client.dart';
import '../models/json.dart';
import '../models/material.dart';

/// Materiales de los proyectos (catálogo de Genstock), con los mismos
/// endpoints que la web.
class MaterialsRepository {
  MaterialsRepository(this._api);

  final ApiClient _api;

  Future<List<WorkMaterial>> forWork(String workId) async => parseList(
    await _api.get<List<dynamic>>('/api/works/$workId/materials'),
    WorkMaterial.fromJson,
  );

  Future<void> add(
    String workId, {
    required String productId,
    required String quantityRequired,
    String? notes,
  }) => _api.post<Object?>(
    '/api/works/$workId/materials',
    body: {
      'productId': productId,
      'quantityRequired': quantityRequired,
      'notes': notes == null || notes.trim().isEmpty ? null : notes.trim(),
    },
  );

  Future<void> update(
    String workId,
    String materialId, {
    required String quantityRequired,
    required String notes,
  }) => _api.patch<Object?>(
    '/api/works/$workId/materials/$materialId',
    body: {'quantityRequired': quantityRequired, 'notes': notes},
  );

  Future<void> remove(String workId, String materialId) =>
      _api.delete<Object?>('/api/works/$workId/materials/$materialId');

  /// Búsqueda en Genstock. Con [supplyOnly], solo insumos (si no hay, la API
  /// busca en todo el catálogo y lo avisa con `fallback`).
  Future<GenstockSearch> search(String query, {required bool supplyOnly}) async {
    final json = await _api.get<Json>(
      '/api/genstock/search',
      query: {'q': query, 'supply': supplyOnly ? '1' : '0'},
    );
    return (
      items: parseList(
        json['items'],
        (item) => GenstockProduct.fromJson(asJson(item['product']) ?? {}),
      ),
      fallback: json['supplyFallback'] == true,
    );
  }

  /// Totales consolidados de los proyectos activos visibles (`/materials`).
  Future<List<MaterialTotal>> totals() async => parseList(
    await _api.get<List<dynamic>>('/api/materials'),
    MaterialTotal.fromJson,
  );
}
