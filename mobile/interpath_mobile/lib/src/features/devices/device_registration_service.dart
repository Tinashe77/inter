import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/services/api_client.dart';
import '../auth/secure_session_store.dart';

final deviceRegistrationServiceProvider =
    Provider<DeviceRegistrationService>((ref) {
  return DeviceRegistrationService(
    ref.read(dioProvider),
    ref.read(secureSessionStoreProvider),
  );
});

final deviceRegistrationCheckProvider = FutureProvider<void>((ref) async {
  await ref.read(deviceRegistrationServiceProvider).checkStoredRegistration();
});

class DeviceRegistrationService {
  DeviceRegistrationService(this._dio, this._store);

  final Dio _dio;
  final SecureSessionStore _store;

  Future<String> platformDeviceId() async {
    final info = DeviceInfoPlugin();
    if (Platform.isAndroid) return (await info.androidInfo).id;
    if (Platform.isIOS) return (await info.iosInfo).identifierForVendor ?? '';
    return Platform.localHostname;
  }

  Future<String> register({
    required String phoneNumber,
    required String countryCode,
    required String userType,
  }) async {
    final deviceId = await platformDeviceId();
    if (deviceId.isEmpty) {
      throw StateError(
        'This device does not expose a registration identifier.',
      );
    }
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/devices',
      data: {
        'deviceId': deviceId,
        'type': Platform.isAndroid
            ? 'Android'
            : Platform.isIOS
                ? 'IOS'
                : Platform.operatingSystem,
        'phoneNumber': phoneNumber,
        'countryCode': countryCode,
        'defaultUserType': userType,
      },
      options: Options(extra: {'skipAuth': true}),
    );
    final regNumber = response.data?['regNumber']?.toString() ?? '';
    if (regNumber.isEmpty) {
      throw StateError('SLIS did not return a device registration number.');
    }
    await _store.saveDeviceRegistration(
      regNumber: regNumber,
      deviceId: deviceId,
    );
    return regNumber;
  }

  Future<void> checkStoredRegistration() async {
    final regNumber = await _store.readDeviceRegNumber();
    if (regNumber == null || regNumber.isEmpty) return;
    await _dio.get(
      '/api/devices/check/RegNumber',
      queryParameters: {'device': regNumber},
      options: Options(extra: {'skipAuth': true}),
    );
  }
}
