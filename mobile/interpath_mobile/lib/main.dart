import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdfrx/pdfrx.dart';

import 'src/app/interpath_app.dart';
import 'src/config/api_config.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  pdfrxFlutterInitialize();

  if (ApiConfig.isProduction &&
      Uri.tryParse(ApiConfig.baseUrl)?.scheme != 'https') {
    throw StateError('Production builds require an HTTPS API_BASE_URL.');
  }

  runApp(const ProviderScope(child: InterpathApp()));
}
