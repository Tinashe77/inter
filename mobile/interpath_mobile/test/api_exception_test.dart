import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:interpath_mobile/src/shared/services/api_exception.dart';

void main() {
  test('only Interpath authentication codes expire the mobile session', () {
    const metaFailure = ApiException(
      message: 'WhatsApp authentication failed.',
      code: 'WHATSAPP_SEND_FAILED',
      statusCode: 401,
    );
    const expiredSession = ApiException(
      message: 'Please sign in again.',
      code: 'TOKEN_EXPIRED',
      statusCode: 401,
    );

    expect(metaFailure.isSessionExpired, isFalse);
    expect(expiredSession.isSessionExpired, isTrue);
  });

  test('uses safe server error messages and status codes', () {
    final exception = ApiException.fromDio(
      DioException(
        requestOptions: RequestOptions(path: '/api/visits'),
        response: Response<Map<String, dynamic>>(
          requestOptions: RequestOptions(path: '/api/visits'),
          statusCode: 401,
          data: {
            'code': 'TOKEN_EXPIRED',
            'message': 'Your session has expired. Please sign in again.',
          },
        ),
      ),
    );

    expect(exception.isSessionExpired, isTrue);
    expect(exception.code, 'TOKEN_EXPIRED');
    expect(exception.message, contains('expired'));
  });

  test('turns connection failures into an offline message', () {
    final exception = ApiException.fromDio(
      DioException(
        requestOptions: RequestOptions(path: '/api/visits'),
        type: DioExceptionType.connectionError,
      ),
    );

    expect(exception.message, contains('No network connection'));
  });
}
