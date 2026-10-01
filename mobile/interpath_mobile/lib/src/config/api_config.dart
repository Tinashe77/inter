class ApiConfig {
  const ApiConfig._();

  static const environment = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'development',
  );

  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://inter-8puh.onrender.com',
  );

  static bool get isProduction => environment == 'production';
}
