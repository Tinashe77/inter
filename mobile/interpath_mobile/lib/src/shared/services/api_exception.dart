import 'package:dio/dio.dart';

class ApiException implements Exception {
  const ApiException({required this.message, this.code, this.statusCode});

  final String message;
  final String? code;
  final int? statusCode;

  bool get isSessionExpired => statusCode == 401;

  factory ApiException.fromDio(DioException error) {
    final body = error.response?.data;
    final json = body is Map ? body : const {};
    final status = error.response?.statusCode;
    final serverMessage = json['message']?.toString().trim();

    if (serverMessage != null && serverMessage.isNotEmpty) {
      return ApiException(
        message: serverMessage,
        code: json['code']?.toString(),
        statusCode: status,
      );
    }

    final message = switch (error.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        'The laboratory system took too long to respond. Please retry.',
      DioExceptionType.connectionError =>
        'No network connection is available. Check your connection and retry.',
      DioExceptionType.cancel => 'The request was cancelled.',
      _ => 'The request could not be completed. Please try again.',
    };
    return ApiException(
      message: message,
      code: json['code']?.toString(),
      statusCode: status,
    );
  }

  @override
  String toString() => message;
}

String apiErrorMessage(Object error) {
  if (error is ApiException) return error.message;
  if (error is DioException && error.error is ApiException) {
    return (error.error! as ApiException).message;
  }
  return 'Something went wrong. Please try again.';
}
