import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_controller.dart';
import '../features/auth/login_page.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/pdf/pdf_preview_page.dart';
import '../features/results/result_detail_page.dart';
import '../features/visits/branch_selection_page.dart';
import '../features/visits/visit.dart';
import '../features/visits/visit_detail_page.dart';
import '../features/visits/visits_page.dart';
import '../shared/services/session_lifecycle.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);
  final sessionExpired = ref.watch(sessionLifecycleProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggedIn = authState.asData?.value != null && !sessionExpired;
      final isLogin = state.matchedLocation == '/login';

      if (!isLoggedIn && !isLogin) {
        return '/login';
      }

      if (isLoggedIn && isLogin) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const DashboardPage(),
      ),
      GoRoute(
        path: '/branch-selection',
        builder: (context, state) => const BranchSelectionPage(),
      ),
      GoRoute(
        path: '/visits',
        builder: (context, state) => const VisitsPage(),
      ),
      GoRoute(
        path: '/visits/:labNumber',
        builder: (context, state) {
          final labNumber = state.pathParameters['labNumber'] ?? '';
          return VisitDetailPage(
            labNumber: labNumber,
            visit: state.extra is Visit ? state.extra! as Visit : null,
          );
        },
      ),
      GoRoute(
        path: '/results/:labNumber',
        builder: (context, state) {
          final labNumber = state.pathParameters['labNumber'] ?? '';
          return ResultDetailPage(labNumber: labNumber);
        },
      ),
      GoRoute(
        path: '/results/:labNumber/pdf',
        builder: (context, state) {
          final labNumber = state.pathParameters['labNumber'] ?? '';
          return PdfPreviewPage(labNumber: labNumber);
        },
      ),
    ],
  );
});
