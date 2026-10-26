import 'features/notifications/push_listener.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_preference.dart';
import 'features/setup/connect_link_listener.dart';

class GenworkApp extends ConsumerWidget {
  const GenworkApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'genwork',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ref.watch(themePreferenceProvider),
      routerConfig: ref.watch(routerProvider),
      builder: (context, child) => PushListener(
        child: ConnectLinkListener(child: child ?? const SizedBox.shrink()),
      ),
      locale: const Locale('es', 'AR'),
      supportedLocales: const [Locale('es', 'AR'), Locale('es')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
    );
  }
}
