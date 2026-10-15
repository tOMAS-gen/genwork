import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genwork_mobile/core/network/api_exception.dart';
import 'package:genwork_mobile/core/theme/app_theme.dart';
import 'package:genwork_mobile/shared/widgets/async_value_view.dart';

void main() {
  for (final status in [401, 403, 404, 503]) {
    testWidgets('QA10 datos previos después de HTTP $status', (t) async {
      var fail = false;
      final resource = FutureProvider<String>((ref) async {
        if (fail) {
          throw ApiException(
            code: 'ERROR',
            message: 'Recurso no disponible',
            status: status,
          );
        }
        return 'Recurso anterior';
      });
      final container = ProviderContainer(retry: (_, _) => null);
      addTearDown(container.dispose);
      await t.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.light(),
            home: Scaffold(
              body: Consumer(
                builder: (context, ref, _) => AsyncValueView(
                  value: ref.watch(resource),
                  data: (text) =>
                      TextField(decoration: InputDecoration(labelText: text)),
                  onRetry: () => ref.invalidate(resource),
                ),
              ),
            ),
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.enterText(find.byType(TextField), 'Borrador sin guardar');
      fail = true;
      container.invalidate(resource);
      await t.pumpAndSettle();
      expect(container.read(resource).hasValue, isTrue);
      expect(container.read(resource).hasError, isTrue);
      if (status == 503) {
        expect(find.text('Borrador sin guardar'), findsOneWidget);
      } else {
        expect(find.byType(TextField), findsNothing);
        expect(find.text('Recurso no disponible'), findsOneWidget);
        expect(find.text('Reintentar'), findsOneWidget);
      }
    });
  }
}
