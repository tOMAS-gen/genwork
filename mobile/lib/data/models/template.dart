import 'json.dart';

class ObjectiveTemplate {
  const ObjectiveTemplate({
    required this.id,
    required this.name,
    this.description,
    this.groupId,
    this.groupName,
    this.copyableTaskCount = 0,
  });
  final String id, name;
  final String? description, groupId, groupName;
  final int copyableTaskCount;
  factory ObjectiveTemplate.fromJson(Json j) => ObjectiveTemplate(
    id: j['id'] as String,
    name: j['name'] as String,
    description: j['description'] as String?,
    groupId: j['groupId'] as String?,
    groupName: j['groupName'] as String?,
    copyableTaskCount: asInt(j['copyableTaskCount']),
  );
}
