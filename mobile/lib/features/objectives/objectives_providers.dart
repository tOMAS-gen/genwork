import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../data/models/template.dart';

final templatesProvider = FutureProvider.autoDispose<List<ObjectiveTemplate>>(
  (ref) => ref.watch(objectivesRepositoryProvider).templates(),
);
