import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'state_views.dart';
import '../../core/network/api_exception.dart';

/// Loading / error con reintento / datos para un [AsyncValue]. Mientras recarga
/// con datos previos, sigue mostrando los datos (sin parpadeo).
class AsyncValueView<T> extends StatelessWidget {
  const AsyncValueView({
    super.key,
    required this.value,
    required this.data,
    this.onRetry,
    this.errorTitle,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback? onRetry;

  /// Título del estado de error (el de la web para esa pantalla).
  final String? errorTitle;

  @override
  Widget build(BuildContext context) {
    final error = value.error;
    // Un recurso borrado o sin permiso no puede conservar controles operativos.
    // Los fallos transitorios mantienen el árbol para no perder borradores.
    if (value.hasError &&
        error is ApiException &&
        [401, 403, 404].contains(error.status)) {
      return ErrorView(error: error, onRetry: onRetry, title: errorTitle);
    }
    if (value.hasValue) return data(value.requireValue);
    if (value.hasError) {
      return ErrorView(
        error: value.error!,
        onRetry: onRetry,
        title: errorTitle,
      );
    }
    return const LoadingView();
  }
}
