/// Helpers de texto para previews y documentos simples.
/// El editor enriquecido usa TipTap local y conserva el JSON completo; estas
/// conversiones no se usan para guardar documentos con formato.
library;

const _plainNodes = {'doc', 'paragraph', 'text', 'hardBreak'};

/// Texto del documento: un párrafo/bloque por línea.
String docToPlainText(Object? doc) {
  final lines = <String>[];
  void block(Object? node) {
    if (node is! Map) return;
    final type = node['type'];
    final children = node['content'];
    if (type == 'text') return;
    final hasInline =
        children is List &&
        children.any(
          (c) => c is Map && (c['type'] == 'text' || c['type'] == 'hardBreak'),
        );
    if (hasInline || type == 'paragraph' || type == 'heading') {
      lines.add(_inlineText(children));
    } else if (children is List) {
      for (final child in children) {
        block(child);
      }
    }
  }

  block(doc);
  return lines.join('\n').trimRight();
}

String _inlineText(Object? children) {
  if (children is! List) return '';
  final buffer = StringBuffer();
  for (final child in children) {
    if (child is! Map) continue;
    if (child['type'] == 'text') buffer.write(child['text'] ?? '');
    if (child['type'] == 'hardBreak') buffer.write('\n');
  }
  return buffer.toString();
}

/// True si el documento es solo párrafos de texto sin marcas (seguro de editar).
bool isPlainDoc(Object? doc) {
  if (doc == null) return true;
  bool visit(Object? node) {
    if (node is! Map) return false;
    if (!_plainNodes.contains(node['type'])) return false;
    final marks = node['marks'];
    if (marks is List && marks.isNotEmpty) return false;
    final children = node['content'];
    return children is! List || children.every(visit);
  }

  return visit(doc);
}

/// Documento TipTap con un párrafo por línea.
Map<String, dynamic> plainTextToDoc(String text) => {
  'type': 'doc',
  'content': [
    for (final line in text.split('\n'))
      {
        'type': 'paragraph',
        if (line.isNotEmpty)
          'content': [
            {'type': 'text', 'text': line},
          ],
      },
  ],
};
