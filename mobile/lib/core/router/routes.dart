import '../../features/works/works_filter.dart';

/// Rutas de la app. Centralizadas para que UI y navegación no repitan strings.
abstract final class Routes {
  static const splash = '/splash';
  static const setup = '/setup';
  static const login = '/login';

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
    final segments = Uri.parse(path).pathSegments;
    if (segments.length == 1 && segments[0] == 'templates') return templates;
    if (segments.length == 1 && segments[0] == 'board') return board;
    if (segments.length == 1 && segments[0] == 'references') return myDay;
    if (segments.length == 2 && segments[0] == 'works') {
      return work(segments[1]);
    }
    if (segments.length == 2 && segments[0] == 'groups') {
      return group(segments[1]);
    }
    if (segments.length == 2 && segments[0] == 'sectors') {
      return sector(segments[1]);
    }
    if (segments.length == 2 && segments[0] == 'notes') {
      return note(segments[1]);
    }
    return null;
  }
}
