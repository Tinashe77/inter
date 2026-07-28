import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final secureSessionStoreProvider = Provider<SecureSessionStore>((ref) {
  return const SecureSessionStore();
});

class SecureSessionStore {
  const SecureSessionStore();

  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'interpath_token';
  static const _userTypeKey = 'interpath_user_type';
  static const _employeeBranchKey = 'interpath_employee_branch';

  Future<void> saveSession({
    required String token,
    required String userType,
  }) async {
    await _storage.write(key: _tokenKey, value: token);
    await _storage.write(key: _userTypeKey, value: userType);
  }

  Future<String?> readToken() {
    return _storage.read(key: _tokenKey);
  }

  Future<String?> readUserType() {
    return _storage.read(key: _userTypeKey);
  }

  Future<void> saveEmployeeBranch(String branch) {
    return _storage.write(key: _employeeBranchKey, value: branch);
  }

  Future<String?> readEmployeeBranch() {
    return _storage.read(key: _employeeBranchKey);
  }

  Future<void> clear() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userTypeKey);
  }
}
