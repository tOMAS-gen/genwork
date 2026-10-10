import '../../features/settings/settings_screen.dart';
import '../../features/settings/catalog_settings_screen.dart';
import '../../data/repositories/settings_repository.dart';
import '../../data/repositories/catalogs_repository.dart';
import '../../features/documents/document_screen.dart';
import '../../features/files/files_screen.dart';
import '../../features/objectives/templates_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/account_screen.dart';
import '../../features/board/board_screen.dart';
import '../../features/groups/groups_list_screen.dart';
import '../../features/groups/group_detail_screen.dart';
import '../../features/groups/group_clients_screen.dart';
import '../../features/groups/group_labels_screen.dart';
import '../../features/account/more_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/my_day/my_day_screen.dart';
import '../../features/notes/note_detail_screen.dart';
import '../../features/notes/notes_list_screen.dart';
import '../../features/reminders/reminder_form_screen.dart';
import '../../features/reminders/reminders_screen.dart';
import '../../features/sectors/sector_detail_screen.dart';
import '../../features/sectors/sectors_list_screen.dart';
import '../../features/setup/server_setup_screen.dart';
import '../../features/shell/home_shell.dart';
import '../../features/shell/splash_screen.dart';
import '../../features/works/work_detail_screen.dart';
import '../../features/works/works_list_screen.dart';
import '../../features/works/works_filter.dart';
import '../providers.dart';
import 'auth_redirect.dart';
import 'routes.dart';

final routerProvider = Provider<GoRouter>((ref) {
  // El router vive toda la app; los cambios de sesión solo disparan redirect.
  final sessionChanges = ValueNotifier<int>(0);
  ref.listen(sessionProvider, (_, _) => sessionChanges.value++);
  ref.onDispose(sessionChanges.dispose);

  return GoRouter(
    initialLocation: Routes.splash,
    refreshListenable: sessionChanges,
    redirect: (context, state) =>
        authRedirect(ref.read(sessionProvider).value, state.matchedLocation),
    routes: [
      GoRoute(path: Routes.splash, builder: (_, _) => const SplashScreen()),
      GoRoute(path: Routes.setup, builder: (_, _) => const ServerSetupScreen()),
      GoRoute(path: Routes.login, builder: (_, _) => const LoginScreen()),
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => HomeShell(navigationShell: shell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.myDay,
                builder: (_, _) => const MyDayScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.works,
                builder: (_, state) =>
                    WorksListScreen(view: WorksView.fromUri(state.uri)),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (_, state) =>
                        WorkDetailScreen(workId: state.pathParameters['id']!),
                    routes: [
                      GoRoute(
                        path: 'document',
                        builder: (_, state) => WorkDocumentScreen(
                          workId: state.pathParameters['id']!,
                        ),
                      ),
                      GoRoute(
                        path: 'files',
                        builder: (_, state) =>
                            FilesScreen(workId: state.pathParameters['id']!),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.sectors,
                builder: (_, _) => const SectorsListScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (_, state) => SectorDetailScreen(
                      sectorId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.notes,
                builder: (_, _) => const NotesListScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (_, state) =>
                        NoteDetailScreen(noteId: state.pathParameters['id']!),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.more,
                builder: (_, _) => const MoreScreen(),
                routes: [
                  GoRoute(
                    path: 'reminders',
                    builder: (_, _) => const RemindersScreen(),
                    routes: [
                      GoRoute(
                        path: 'new',
                        builder: (_, state) => ReminderFormScreen(
                          initialDate: DateTime.tryParse(
                            state.uri.queryParameters['date'] ?? '',
                          ),
                        ),
                      ),
                      GoRoute(
                        path: ':id',
                        builder: (_, state) => ReminderFormScreen(
                          reminderId: state.pathParameters['id'],
                        ),
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'due-today',
                    builder: (_, _) =>
                        const RemindersScreen(deliveriesOnly: true),
                  ),
                  GoRoute(
                    path: 'settings',
                    builder: (_, _) => const SettingsHomeScreen(),
                    routes: [
                      GoRoute(
                        path: 'module/:section',
                        builder: (_, state) => SettingsScreen(
                          section: SettingsSection.values.firstWhere(
                            (v) => v.name == state.pathParameters['section'],
                            orElse: () => SettingsSection.system,
                          ),
                        ),
                      ),
                      GoRoute(
                        path: 'catalog/:kind',
                        builder: (_, state) => CatalogSettingsScreen(
                          kind: CatalogKind.values.firstWhere(
                            (v) => v.name == state.pathParameters['kind'],
                            orElse: () => CatalogKind.labels,
                          ),
                        ),
                      ),
                      GoRoute(
                        path: 'errors/:id',
                        builder: (_, state) => SettingsErrorScreen(
                          id: state.pathParameters['id']!,
                        ),
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'account',
                    builder: (_, _) => const AccountScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.groups,
                builder: (_, _) => const GroupsListScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (_, state) =>
                        GroupDetailScreen(groupId: state.pathParameters['id']!),
                    routes: [
                      GoRoute(
                        path: 'clients',
                        builder: (_, state) => GroupClientsScreen(
                          groupId: state.pathParameters['id']!,
                        ),
                      ),
                      GoRoute(
                        path: 'labels',
                        builder: (_, state) => GroupLabelsScreen(
                          groupId: state.pathParameters['id']!,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.board,
                builder: (_, _) => const BoardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: Routes.templates,
                builder: (_, _) => const TemplatesScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
