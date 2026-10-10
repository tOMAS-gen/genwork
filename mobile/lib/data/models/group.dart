import 'app_user.dart';
import 'common.dart';
import 'json.dart';

class GroupMember {
  const GroupMember({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });
  final String id, name, email, role;
  String get roleLabel => role == 'ADMIN' ? 'Administrador' : 'Miembro';
  factory GroupMember.fromJson(Json json) {
    final user = asJson(json['user']) ?? json;
    return GroupMember(
      id: (json['userId'] ?? user['id']) as String? ?? '',
      name: user['name'] as String? ?? '',
      email: user['email'] as String? ?? '',
      role: json['role'] as String? ?? 'MEMBER',
    );
  }
}

/// El detalle web también se obtiene de GET /api/groups; no hay GET /groups/:id.
class GroupSummary {
  const GroupSummary({
    required this.id,
    required this.name,
    this.color,
    this.adminUserIds = const {},
    this.ownerId,
    this.publicRead = false,
    this.members = const [],
    this.workCount = 0,
    this.pendingCount = 0,
  });
  final String id, name;
  final String? color, ownerId;
  final Set<String> adminUserIds;
  final bool publicRead;
  final List<GroupMember> members;
  final int workCount, pendingCount;
  bool canManage(AppUser? user) =>
      user != null &&
      (user.isSuperAdmin ||
          (user.role == GlobalRole.member && adminUserIds.contains(user.id)));

  /// Crear proyectos o recordatorios del grupo: SA o miembro. Un grupo con
  /// lectura pública aparece en la lista, pero el servidor rechaza escribir.
  bool canOperate(AppUser? user) =>
      user != null &&
      (user.isSuperAdmin || members.any((m) => m.id == user.id));
  factory GroupSummary.fromJson(Json json) {
    final members = parseList(json['memberships'], GroupMember.fromJson);
    return GroupSummary(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      color: json['color'] as String?,
      ownerId: json['ownerId'] as String?,
      publicRead: json['publicRead'] == true,
      members: members,
      adminUserIds: members
          .where((m) => m.role == 'ADMIN')
          .map((m) => m.id)
          .toSet(),
      workCount: asInt(asJson(json['_count'])?['works']),
      pendingCount: asInt(json['pendingCount']),
    );
  }
}

class GroupClient {
  const GroupClient({
    required this.id,
    required this.name,
    required this.email,
    required this.workIds,
    required this.hasLoggedIn,
  });
  final String id, name, email;
  final Set<String> workIds;
  final bool hasLoggedIn;
  factory GroupClient.fromJson(Json json) => GroupClient(
    id: json['id'] as String,
    name: json['name'] as String? ?? '',
    email: json['email'] as String? ?? '',
    workIds: (json['workIds'] as List? ?? []).cast<String>().toSet(),
    hasLoggedIn: json['firstLoginAt'] != null,
  );
}

class GroupClients {
  const GroupClients(this.works, this.clients);
  final List<NamedRef> works;
  final List<GroupClient> clients;
  factory GroupClients.fromJson(Json json) => GroupClients(
    parseList(json['works'], NamedRef.fromJson),
    parseList(json['clients'], GroupClient.fromJson),
  );
}

class GroupLabelValue {
  const GroupLabelValue({
    required this.id,
    required this.name,
    required this.color,
  });
  final String id, name, color;
  factory GroupLabelValue.fromJson(Json json) => GroupLabelValue(
    id: json['id'] as String,
    name: json['name'] as String,
    color: json['color'] as String,
  );
}

class GroupLabel {
  const GroupLabel({
    required this.id,
    required this.name,
    required this.values,
  });
  final String id, name;
  final List<GroupLabelValue> values;
  factory GroupLabel.fromJson(Json json) => GroupLabel(
    id: json['id'] as String,
    name: json['name'] as String,
    values: parseList(json['values'], GroupLabelValue.fromJson),
  );
}
