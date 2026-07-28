import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/api_config.dart';
import '../../features/auth/secure_session_store.dart';
import 'api_exception.dart';
import 'session_lifecycle.dart';

final dioProvider = Provider<Dio>((ref) {
  final sessionStore = ref.watch(secureSessionStoreProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 20),
      // SLIS list queries can legitimately take longer than 30 seconds.
      receiveTimeout: const Duration(seconds: 70),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Interpath-Client': 'mobile',
      },
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final sessionToken = await sessionStore.readToken();
        if (sessionToken != null && sessionToken.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $sessionToken';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final apiError = ApiException.fromDio(error);
        if (apiError.isSessionExpired) {
          await sessionStore.clear();
          ref.read(sessionLifecycleProvider.notifier).markExpired();
        }
        handler.reject(
          DioException(
            requestOptions: error.requestOptions,
            response: error.response,
            type: error.type,
            error: apiError,
            message: apiError.message,
          ),
        );
      },
    ),
  );

  return dio;
});
