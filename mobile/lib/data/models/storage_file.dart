import 'json.dart';

class StorageFile {
  const StorageFile({
    required this.name,
    required this.path,
    required this.isDirectory,
    this.size = 0,
  });
  final String name, path;
  final bool isDirectory;
  final int size;
  factory StorageFile.fromJson(Json j) => StorageFile(
    name: j['name'] as String,
    path: j['path'] as String,
    isDirectory: j['isDirectory'] == true,
    size: asInt(j['size']),
  );
  String get sizeLabel => size < 1024
      ? '$size B'
      : size < 1048576
      ? '${(size / 1024).toStringAsFixed(0)} KB'
      : '${(size / 1048576).toStringAsFixed(1)} MB';
}

class WorkFiles {
  WorkFiles.fromJson(Json j)
    : files = parseList(j['files'], StorageFile.fromJson),
      folderEnabled = j['folderEnabled'] as bool?,
      canEnable = j['canEnableFolder'] == true;
  final List<StorageFile> files;
  final bool? folderEnabled;
  final bool canEnable;
  bool get ready => folderEnabled == null;
}

class FileShare {
  FileShare.fromJson(Json j)
    : id = j['id'] as String,
      mode = j['mode'] as String,
      link = j['linkUrl'] as String?,
      recipient =
          (j['targetUserName'] ?? j['targetSectorName'] ?? j['targetUserId'])
              as String?,
      expires = parseDate(j['expiresAt']);
  final String id, mode;
  final String? link, recipient;
  final DateTime? expires;
}
