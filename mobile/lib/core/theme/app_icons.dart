// Íconos de genwork móvil, centralizados. Material outlined cuando existe la
// variante. Ningún archivo de `features/` ni `shared/` usa `Icons.*` directo.
import 'package:flutter/material.dart';

/// Tamaños canónicos de iconografía funcional.
abstract final class AppIconSizes {
  /// Ícono de aviso inline y de chip.
  static const notice = 16.0;

  /// Ítems del drawer.
  static const drawer = 16.0;

  /// Campos y rail.
  static const field = 18.0;

  /// Acciones.
  static const action = 20.0;

  /// Encabezado de página.
  static const header = 22.0;

  /// Estado vacío.
  static const state = 48.0;
}

abstract final class AppIcons {
  /// Reintentar / recargar
  static const retry = Icons.refresh_outlined;
  static const themeSystem = Icons.computer_outlined;
  static const themeLight = Icons.wb_sunny_outlined;
  static const themeDark = Icons.dark_mode_outlined;
  static const add = Icons.add_outlined;
  static const check = Icons.check_outlined;
  static const close = Icons.close_outlined;
  static const search = Icons.search_outlined;
  static const chevronRight = Icons.chevron_right_outlined;
  static const chevronLeft = Icons.chevron_left_outlined;
  static const expandMore = Icons.expand_more_outlined;
  static const expandLess = Icons.expand_less_outlined;
  static const menu = Icons.menu_outlined;
  static const edit = Icons.edit_outlined;
  static const delete = Icons.delete_outline;
  static const copy = Icons.copy_outlined;
  static const undo = Icons.undo_outlined;
  static const send = Icons.send_outlined;
  static const link = Icons.link_outlined;
  static const unlink = Icons.link_off_outlined;
  static const upload = Icons.upload_file_outlined;

  /// Reordenar
  static const reorder = Icons.swap_vert_outlined;
  static const sortAsc = Icons.arrow_upward_outlined;
  static const sortDesc = Icons.arrow_downward_outlined;
  static const filter = Icons.filter_list_outlined;
  static const filterActive = Icons.filter_alt_outlined;
  static const list = Icons.list_outlined;

  /// Vista de grilla / todos
  static const gridView = Icons.grid_view_outlined;
  static const view = Icons.visibility_outlined;
  static const lock = Icons.lock_outline;
  static const mention = Icons.alternate_email_outlined;
  static const error = Icons.error_outline;
  static const success = Icons.check_circle_outline;
  static const warning = Icons.warning_amber_outlined;
  static const info = Icons.info_outline;
  static const offline = Icons.wifi_off_outlined;
  static const server = Icons.dns_outlined;
  static const login = Icons.login_outlined;
  static const logout = Icons.logout_outlined;
  static const person = Icons.person_outline;
  static const personAdd = Icons.person_add_outlined;
  static const personRemove = Icons.person_remove_outlined;

  /// Grupos
  static const groups = Icons.groups_outlined;

  /// Mi día
  static const myDay = Icons.wb_sunny_outlined;

  /// Mi día (marcado)
  static const myDayFilled = Icons.wb_sunny;

  /// Proyectos
  static const projects = Icons.folder_outlined;
  static const projectOpen = Icons.folder_open_outlined;
  static const newFolder = Icons.create_new_folder_outlined;

  /// Sectores
  static const sectors = Icons.layers_outlined;

  /// Vista de tareas (tablero)
  static const taskView = Icons.view_column_outlined;

  /// Notas
  static const notes = Icons.sticky_note_2_outlined;

  /// Plantillas
  static const templates = Icons.library_books_outlined;

  /// Archivados
  static const archived = Icons.archive_outlined;

  /// Favorito
  static const favorite = Icons.star_border;

  /// Favorito (marcado)
  static const favoriteFilled = Icons.star;

  /// Configuración
  static const settings = Icons.settings_outlined;
  static const dashboard = Icons.dashboard_outlined;

  /// Recordatorios
  static const reminders = Icons.event_outlined;
  static const reminderAdd = Icons.add_alarm_outlined;
  static const alarm = Icons.alarm_outlined;

  /// Campana
  static const bell = Icons.notifications_outlined;
  static const bellActive = Icons.notifications_active_outlined;

  /// Fecha
  static const date = Icons.event_outlined;
  static const calendarToday = Icons.calendar_today_outlined;
  static const calendarMonth = Icons.calendar_month_outlined;
  static const schedule = Icons.schedule_outlined;
  static const document = Icons.description_outlined;
  static const article = Icons.article_outlined;
  static const file = Icons.insert_drive_file_outlined;

  /// Etiqueta
  static const label = Icons.label_outline;
  static const inbox = Icons.inbox_outlined;
  static const addToList = Icons.playlist_add_outlined;
  static const radioOff = Icons.circle_outlined;
  static const radioOn = Icons.circle;
}
