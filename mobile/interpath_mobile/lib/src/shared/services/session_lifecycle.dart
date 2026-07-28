import 'package:flutter_riverpod/flutter_riverpod.dart';

final sessionLifecycleProvider =
    NotifierProvider<SessionLifecycleController, bool>(
  SessionLifecycleController.new,
);

class SessionLifecycleController extends Notifier<bool> {
  @override
  bool build() => false;

  void markExpired() => state = true;
  void markActive() => state = false;
}
