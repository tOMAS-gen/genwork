import 'json.dart';

class WorkStage {
  const WorkStage({required this.id, required this.name, this.color});
  final String id;
  final String name;
  final String? color;
  factory WorkStage.fromJson(Json json) => WorkStage(
    id: json['id'] as String,
    name: json['name'] as String,
    color: json['color'] as String?,
  );
}

class LabelOption {
  const LabelOption({
    required this.keyId,
    required this.keyName,
    required this.valueId,
    required this.valueName,
    required this.scope,
    this.color,
  });
  final String keyId, keyName, valueId, valueName, scope;
  final String? color;
  String get scopeLabel => switch (scope) {
    'global' => 'Global',
    'group' => 'Del grupo',
    _ => 'Personal',
  };
}
