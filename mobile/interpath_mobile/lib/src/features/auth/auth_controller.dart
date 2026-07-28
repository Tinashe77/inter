import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/services/api_client.dart';
import '../../shared/services/session_lifecycle.dart';
import 'app_user.dart';
import 'secure_session_store.dart';

final authControllerProvider =
    AsyncNotifierProvider<AuthController, AppUser?>(AuthController.new);

class AuthController extends AsyncNotifier<AppUser?> {
  @override
  Future<AppUser?> build() async {
    final store = ref.watch(secureSessionStoreProvider);
    final token = await store.readToken();
    final userType = await store.readUserType();

    if (token == null || userType == null) {
      return null;
    }

    return AppUser(
      id: '',
      username: '',
      userType: userType,
      token: token,
    );
  }

  Future<void> login({
    required String userType,
    required String username,
    required String password,
  }) async {
    state = const AsyncLoading();

    state = await AsyncValue.guard(() async {
      final dio = ref.read(dioProvider);
      final response = await dio.post<Map<String, dynamic>>(
        '/api/auth/login',
        data: {
          'usertype': userType,
          'username': username,
          'password': password,
        },
        options: Options(extra: {'skipAuth': true}),
      );

      final data = response.data ?? {};
      final userJson = Map<String, dynamic>.from(data['user'] as Map);
      final user = AppUser.fromJson(userJson);

      final sessionToken = data['sessionToken']?.toString();
      if (sessionToken != null && sessionToken.isNotEmpty) {
        await ref.read(secureSessionStoreProvider).saveSession(
              token: sessionToken,
              userType: user.userType,
            );
      }

      ref.read(sessionLifecycleProvider.notifier).markActive();

      return user;
    });
  }

  Future<void> logout() async {
    await ref.read(secureSessionStoreProvider).clear();
    state = const AsyncData(null);
  }

  void expireSession() {
    state = const AsyncData(null);
  }
}
