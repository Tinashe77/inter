import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_router.dart';
import '../shared/theme/interpath_theme.dart';
import '../features/devices/device_registration_service.dart';

class InterpathApp extends ConsumerWidget {
  const InterpathApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    ref.watch(deviceRegistrationCheckProvider);

    return MaterialApp.router(
      title: 'Interpath Results',
      debugShowCheckedModeBanner: false,
      theme: InterpathTheme.light,
      routerConfig: router,
    );
  }
}
