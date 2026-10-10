import 'json.dart';

enum GlobalRole { superadmin, member, reader, client, unknown }

GlobalRole parseRole(Object? value) => switch (value) {
      'SUPERADMIN' => GlobalRole.superadmin,
      'MEMBER' => GlobalRole.member,
      'READER' => GlobalRole.reader,
      'CLIENT' => GlobalRole.client,
      _ => GlobalRole.unknown,
    };

/// Usuario autenticado (respuesta de `/api/auth/mobile/token` y `/api/me`).
class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.roleRaw,
    this.image,
  });

  final String id;
  final String email;
  final String name;
  final GlobalRole role;
  final String roleRaw;
  final String? image;

  bool get isSuperAdmin => role == GlobalRole.superadmin;

  factory AppUser.fromJson(Json json) => AppUser(
        id: json['id'] as String,
        email: json['email'] as String? ?? '',
        name: json['name'] as String? ?? '',
        role: parseRole(json['globalRole']),
        roleRaw: json['globalRole'] as String? ?? '',
        image: json['image'] as String?,
      );

  Json toJson() => {'id': id, 'email': email, 'name': name, 'globalRole': roleRaw, 'image': image};
}
