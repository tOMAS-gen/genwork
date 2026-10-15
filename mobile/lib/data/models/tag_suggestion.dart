import 'json.dart';

class TagSuggestion {
  const TagSuggestion({
    required this.id,
    required this.name,
    required this.type,
    required this.insertText,
    this.keyName,
  });
  final String id, name, type, insertText;
  final String? keyName;
  factory TagSuggestion.fromJson(Json j) => TagSuggestion(
    id: j['id'] as String,
    name: j['name'] as String,
    type: j['type'] as String,
    insertText: (j['insertText'] ?? j['name']) as String,
    keyName: j['keyName'] as String?,
  );
}
