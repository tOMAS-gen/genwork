import 'json.dart';

/// Nota personal. `content` es un documento TipTap/ProseMirror (o null).
class Note {
  const Note({
    required this.id,
    required this.title,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String title;
  final Object? content;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Note.fromJson(Json json) => Note(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        content: json['content'],
        createdAt: parseDate(json['createdAt']) ?? DateTime.now(),
        updatedAt: parseDate(json['updatedAt']) ?? DateTime.now(),
      );
}
