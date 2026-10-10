import 'dart:async';
import 'package:flutter/foundation.dart';

/// Serial saves capture a revision. A late response never replaces newer typing.
class DocumentDraft extends ChangeNotifier {
  DocumentDraft({
    required this.title,
    required this.content,
    required this.persist,
  });
  String title;
  Object? content;
  final Future<void> Function(String title, Object? content) persist;
  int _revision = 0, _saved = 0;
  Timer? _timer;
  Future<void>? _flight;
  Object? error;
  bool _disposed = false;
  bool get dirty => _revision != _saved;
  bool get saving => _flight != null;
  String get status => error != null
      ? 'No se pudo guardar'
      : saving
      ? 'Guardando…'
      : dirty
      ? 'Sin guardar'
      : 'Guardado';

  void change({String? title, Object? content}) {
    if (title != null) this.title = title;
    if (content != null) this.content = content;
    _revision++;
    error = null;
    _timer?.cancel();
    _timer = Timer(const Duration(milliseconds: 800), save);
    notifyListeners();
  }

  Future<void> save() async {
    _timer?.cancel();
    if (_flight != null) {
      await _flight;
      return;
    }
    if (!dirty || _disposed) return;
    final done = Completer<void>();
    _flight = done.future;
    error = null;
    notifyListeners();
    try {
      // Catch up while typing; only one request can be in flight.
      while (dirty && !_disposed) {
        final revision = _revision;
        await persist(title, content);
        _saved = revision;
      }
    } catch (e) {
      error = e;
    } finally {
      _flight = null;
      done.complete();
      if (!_disposed) notifyListeners();
    }
  }

  void acceptRemote(String title, Object? content) {
    if (dirty || saving) return;
    this.title = title;
    this.content = content;
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    super.dispose();
  }
}
