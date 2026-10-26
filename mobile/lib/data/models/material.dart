import 'package:intl/intl.dart';

import 'json.dart';

/// Cantidad como la muestra la web: decimales con coma y la unidad.
String formatQuantity(String raw, String? unit) {
  final value = num.tryParse(raw);
  final number = value == null
      ? raw
      : NumberFormat.decimalPattern('es').format(value);
  return unit == null || unit.isEmpty ? number : '$number $unit';
}

/// Material asignado a un proyecto (`toMaterialDto` de la web).
class WorkMaterial {
  WorkMaterial.fromJson(Json json)
    : id = json['id'] as String,
      productId = json['genstockProductId'] as String? ?? '',
      productName = json['productName'] as String? ?? '',
      productCode = json['productCode'] as String? ?? '',
      humanCode = json['humanCode'] as String? ?? '',
      unit =
          (json['unitAbbreviation'] as String?) ?? (json['unitName'] as String?),
      allowsDecimal = json['unitAllowsDecimal'] as bool? ?? true,
      quantityRequired = '${json['quantityRequired'] ?? '0'}',
      notes = json['notes'] as String?;

  final String id, productId, productName, productCode, humanCode;
  final String? unit, notes;
  final bool allowsDecimal;

  /// Cantidad en texto de la API (escala de Genstock), sin redondear.
  final String quantityRequired;

  /// El código que muestra la web: el humano o, si no hay, el de producto.
  String get code => humanCode.isNotEmpty ? humanCode : productCode;

  String get quantityLabel => formatQuantity(quantityRequired, unit);
}

/// Producto de Genstock en la búsqueda para asignar materiales.
class GenstockProduct {
  GenstockProduct.fromJson(Json json)
    : id = json['id'] as String,
      name = json['name'] as String? ?? '',
      productCode = json['product_code'] as String? ?? '',
      humanCode = json['human_code'] as String? ?? '';

  final String id, name, productCode, humanCode;
  String get code => humanCode.isNotEmpty ? humanCode : productCode;
}

typedef GenstockSearch = ({List<GenstockProduct> items, bool fallback});

/// Proyecto que pide un material, dentro de los totales.
class MaterialProject {
  MaterialProject.fromJson(Json json)
    : workId = json['workId'] as String? ?? '',
      workName = json['workName'] as String? ?? '',
      groupName = json['groupName'] as String?,
      quantityRequired = '${json['quantityRequired'] ?? '0'}';

  final String workId, workName, quantityRequired;
  final String? groupName;
}

/// Total consolidado de un material en los proyectos activos visibles
/// (`buildMaterialTotals` de la web).
class MaterialTotal {
  MaterialTotal.fromJson(Json json)
    : productId = json['genstockProductId'] as String? ?? '',
      productName = json['productName'] as String? ?? '',
      productCode = json['productCode'] as String? ?? '',
      humanCode = json['humanCode'] as String? ?? '',
      unit =
          (json['unitAbbreviation'] as String?) ?? (json['unitName'] as String?),
      totalQuantity = '${json['totalQuantityRequired'] ?? '0'}',
      projects = parseList(json['projects'], MaterialProject.fromJson);

  final String productId, productName, productCode, humanCode, totalQuantity;
  final String? unit;
  final List<MaterialProject> projects;

  String get code => humanCode.isNotEmpty ? humanCode : productCode;
  String get totalLabel => formatQuantity(totalQuantity, unit);
}
