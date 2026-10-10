import 'common.dart';
import 'json.dart';
import 'task.dart';

enum ScopeKind { personal, group, global }

class SectorScope {
  const SectorScope({
    required this.kind,
    this.groupId,
    this.groupName,
    this.ownerId,
  });
  final ScopeKind kind;
  final String? groupId;
  final String? groupName;
  final String? ownerId;

  String get label => switch (kind) {
    ScopeKind.global => 'Global',
    ScopeKind.group => groupName ?? 'Grupo',
    ScopeKind.personal => 'Personal',
  };

  factory SectorScope.fromJson(Json? json) => SectorScope(
    kind: switch (json?['type']) {
      'GROUP' => ScopeKind.group,
      'GLOBAL' => ScopeKind.global,
      _ => ScopeKind.personal,
    },
    groupId: json?['groupId'] as String?,
    groupName: json?['groupName'] as String?,
    ownerId: json?['ownerId'] as String?,
  );
}

/// Sector en el listado (`GET /api/sectors`).
class SectorSummary {
  const SectorSummary({
    required this.id,
    required this.name,
    required this.scope,
    required this.total,
    required this.done,
    required this.pending,
    this.color,
  });

  final String id;
  final String name;
  final String? color;

  /// "Global", nombre del grupo o "Personal".
  final SectorScope scope;
  String get scopeLabel => scope.label;
  final int total;
  final int done;
  final int pending;

  factory SectorSummary.fromJson(Json json) {
    final metrics = asJson(json['metrics']);
    return SectorSummary(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      color: json['color'] as String?,
      scope: SectorScope.fromJson(asJson(json['scope'])),
      total: asInt(metrics?['total']),
      done: asInt(metrics?['done']),
      pending: asInt(metrics?['pending']),
    );
  }
}

String scopeLabelOf(Json? scope) => switch (scope?['type']) {
  'GLOBAL' => 'Global',
  'GROUP' => (scope?['groupName'] as String?) ?? 'Grupo',
  _ => 'Personal',
};

/// Tablero de un sector (`GET /api/sectors/[id]/tasks`).
class SectorBoard {
  const SectorBoard({
    required this.id,
    required this.name,
    required this.scopeLabel,
    required this.canOperate,
    required this.loose,
    required this.byWork,
    required this.refs,
    required this.progress,
    this.color,
  });

  final String id;
  final String name;
  final String? color;
  final String scopeLabel;
  final bool canOperate;

  /// Tareas sueltas del sector (sin proyecto).
  final List<Task> loose;
  final List<SectorWorkGroup> byWork;

  /// Menciones `@sector`: completables según permisos de contexto y tarea.
  final List<Task> refs;
  final Progress progress;

  factory SectorBoard.fromJson(Json json) {
    final sector = asJson(json['sector']) ?? const {};
    return SectorBoard(
      id: sector['id'] as String? ?? '',
      name: sector['name'] as String? ?? '',
      color: sector['color'] as String?,
      scopeLabel: scopeLabelOf(asJson(sector['scope'])),
      canOperate: json['level'] == 'operate',
      loose: parseList(json['loose'], Task.fromJson),
      byWork: parseList(json['byWork'], SectorWorkGroup.fromJson),
      refs: parseList(json['refs'], Task.fromJson),
      progress: Progress.fromJson(asJson(json['metrics'])),
    );
  }
}

class SectorWorkGroup {
  const SectorWorkGroup({required this.work, required this.tasks});

  final NamedRef work;
  final List<Task> tasks;

  factory SectorWorkGroup.fromJson(Json json) => SectorWorkGroup(
    work: NamedRef.fromJson(
      asJson(json['work']) ?? const {'id': '', 'name': ''},
    ),
    tasks: parseList(json['tasks'], Task.fromJson),
  );
}
