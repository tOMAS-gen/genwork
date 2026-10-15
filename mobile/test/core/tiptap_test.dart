import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/util/tiptap.dart';

void main() {
  final plain = {
    'type': 'doc',
    'content': [
      {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Hola'}]},
      {'type': 'paragraph'},
      {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'mundo'}]},
    ],
  };

  test('texto plano ida y vuelta', () {
    expect(docToPlainText(plain), 'Hola\n\nmundo');
    expect(docToPlainText(plainTextToDoc('Hola\n\nmundo')), 'Hola\n\nmundo');
    expect(isPlainDoc(plainTextToDoc('a\nb')), isTrue);
    expect(isPlainDoc(null), isTrue);
  });

  test('con formato no es editable como texto plano', () {
    final bold = {
      'type': 'doc',
      'content': [
        {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'x', 'marks': [{'type': 'bold'}]}]},
      ],
    };
    final list = {
      'type': 'doc',
      'content': [
        {'type': 'bulletList', 'content': [
          {'type': 'listItem', 'content': [{'type': 'paragraph', 'content': [{'type': 'text', 'text': 'item'}]}]},
        ]},
      ],
    };
    expect(isPlainDoc(bold), isFalse);
    expect(isPlainDoc(list), isFalse);
    expect(docToPlainText(list), 'item');
  });
}
