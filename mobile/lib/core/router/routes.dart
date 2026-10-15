import '../../features/works/works_filter.dart';

/// Rutas de la app. Centralizadas para que UI y navegación no repitan strings.
abstract final class Routes {
  static const splash = '/splash';
  static const setup = '/setup';
  static const login = '/login';

  /// Servidores guardados (cambiar/quitar) y alta de uno nuevo por QR.
  static const servers = '/servers';
  static const addServer = '/servers/add';

  static const portal = '/portal';
  static const tv = '/tv';
  static String portalWork(String id) => '$portal/works/$id';

  static const myDay = '/my-day';
  static const board = '/board';
  static const templates = '/templates';
  static const dueToday = '/more/due-today';
  static const works = '/works';
  static const sectors = '/sectors';
  static const groups = '/groups';
  static String group(String id) => '$groups/$id';
  static const notes = '/notes';
  static const more = '/more';
  static const reminders = '/more/reminders';
  static const newReminder = '/more/reminders/new';
  static const account = '/more/account';
  static const settings = '/more/settings';
  static String setting(String section) => '$settings/module/$section';
  static String catalog(String kind) => '$settings/catalog/$kind';
  static String settingsError(String id) => '$settings/errors/$id';

  static String worksList([WorksView view = WorksView.all]) =>
      _workLocation(works, view);
  static String work(String id, {WorksView view = WorksView.all}) =>
      _workLocation('$works/$id', view);

  static String _workLocation(String path, WorksView view) => Uri(
    path: path,
    queryParameters: view.queryParameters.isEmpty ? null : view.queryParameters,
  ).toString();
  static String sector(String id) => '$sectors/$id';
  static String note(String id) => '$notes/$id';
  static String reminder(String id) => '$reminders/$id';

  /// Traduce un link web del servidor (ej. `linkPath` de notificaciones) a una ruta
  /// de la app. Null si la app no tiene esa pantalla.
  static String? fromWebPath(String? path) {
    if (path == null) return null;
    final uri = Uri.tryParse(path);
    if (uri == null ||
        uri.hasScheme ||
        uri.hasAuthority ||
        !path.startsWith('/')) {
      return null;
    }
    final segments = uri.pathSegments;
    String location(String target) => Uri(
      path: target,
      queryParameters: uri.queryParameters.isEmpty ? null : uri.queryParameters,
    ).toString();
    if (segments.isEmpty) {
      if (uri.queryParameters['filter'] == 'templates') return templates;
      return location(works);
    }
    if (segments.length == 1) {
      final target = switch (segments.first) {
        'templates' => templates,
        'board' => board,
        'references' => myDay,
        'sectors' => sectors,
        'groups' => groups,
        'notes' => notes,
        'reminders' => reminders,
        'settings' || 'admin' => settings,
        'portal' => portal,
        'tv' => tv,
        _ => null,
      };
      return target == null ? null : location(target);
    }
    if (segments.first == 'portal' &&
        segments.length == 3 &&
        segments[1] == 'works') {
      return portalWork(segments[2]);
    }
    if (segments.first == 'admin') {
      if (segments.length == 3 && segments[1] == 'errors') {
        return settingsError(segments[2]);
      }
      if (segments.length != 2) return null;
      return switch (segments[1]) {
        'labels' => catalog('labels'),
        'stages' => catalog('stages'),
        'task-statuses' => catalog('statuses'),
        'access' ||
        'users' ||
        'clients' ||
        'storage' ||
        'reminders' ||
        'errors' ||
        'mcp' => setting(segments[1]),
        _ => null,
      };
    }
    if (segments.length == 2) {
      final target = switch (segments.first) {
        'works' => work(segments[1]),
        'groups' => group(segments[1]),
        'sectors' => sector(segments[1]),
        'notes' => note(segments[1]),
        'reminders' =>
          segments[1] == 'new' ? newReminder : reminder(segments[1]),
        _ => null,
      };
      if (target == null) return null;
      final objective = uri.fragment.startsWith('objetivo-')
          ? uri.fragment.substring(9)
          : null;
      return Uri(
        path: target,
        queryParameters:
            {
              ...uri.queryParameters,
              if (objective != null && objective.isNotEmpty)
                'objectiveId': objective,
            }.isEmpty
            ? null
            : {
                ...uri.queryParameters,
                if (objective != null && objective.isNotEmpty)
                  'objectiveId': objective,
              },
      ).toString();
    }
    if (segments.length == 3 &&
        segments.first == 'works' &&
        ['document', 'files', 'activity', 'clients'].contains(segments[2])) {
      return location('/works/${segments[1]}/${segments[2]}');
    }
    if (segments.length == 3 &&
        segments.first == 'groups' &&
        ['clients', 'labels'].contains(segments[2])) {
      return location('/groups/${segments[1]}/${segments[2]}');
    }
    return null;
  }
}
