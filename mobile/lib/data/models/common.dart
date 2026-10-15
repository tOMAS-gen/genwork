import 'json.dart';

/// Referencia mínima `{ id, name }` (proyecto, sector, grupo, usuario).
class NamedRef {
  const NamedRef({required this.id, required this.name});

  final String id;
  final String name;

  factory NamedRef.fromJson(Json json) => NamedRef(
    id: json['id'] as String,
    name: (json['name'] ?? json['title'] ?? '') as String,
  );

  static NamedRef? maybe(Object? value) {
    final json = asJson(value);
    return json == null ? null : NamedRef.fromJson(json);
  }
}

/// Etiqueta asignada (`TaskLabel` / labels de proyecto). Color hex `#rrggbb`.
class LabelChip {
  const LabelChip({
    required this.keyName,
    required this.valueName,
    required this.color,
    this.isPrimary = false,
    this.keyId,
    this.valueId,
  });

  final String keyName;
  final String valueName;
  final String color;
  final bool isPrimary;
  final String? keyId;
  final String? valueId;

  factory LabelChip.fromJson(Json json) => LabelChip(
    keyName: json['keyName'] as String? ?? '',
    valueName: json['valueName'] as String? ?? '',
    color: json['color'] as String? ?? '#94a3b8',
    isPrimary: json['isPrimary'] == true,
    keyId: json['keyId'] as String?,
    valueId: json['valueId'] as String?,
  );
}

/// Progreso `{ done, total }`.
class Progress {
  const Progress({required this.done, required this.total});

  final int done;
  final int total;

  int get pending => total - done;
  double get ratio => total == 0 ? 0 : done / total;

  factory Progress.fromJson(Json? json) =>
      Progress(done: asInt(json?['done']), total: asInt(json?['total']));
}
