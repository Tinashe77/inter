import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/theme/interpath_theme.dart';
import '../../shared/widgets/interpath_shell.dart';
import '../auth/auth_controller.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value;
    final firstName =
        (user?.name ?? user?.username ?? '').trim().split(' ').first;

    return InterpathShell(
      title: 'Workspace',
      actions: [
        IconButton.filledTonal(
          tooltip: 'Sign out',
          onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          icon: const Icon(Icons.logout_rounded, size: 20),
        ),
        const SizedBox(width: 8),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: InterpathColors.brandGradient,
              borderRadius: BorderRadius.circular(26),
              boxShadow: [
                BoxShadow(
                  color: InterpathColors.primaryBlue.withValues(alpha: 0.22),
                  blurRadius: 25,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Stack(
              children: [
                const Positioned(
                  right: -22,
                  top: -30,
                  child: _HeroOrb(size: 115),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.13),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'CLINICAL WORKSPACE',
                        style: TextStyle(
                          color: Color(0xFFDDE1FF),
                          fontSize: 11,
                          letterSpacing: 0.8,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      firstName.isEmpty ? 'Good day' : 'Good day, $firstName',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 7),
                    const SizedBox(
                      width: 260,
                      child: Text(
                        'Review visits, open verified results, and share reports securely.',
                        style: TextStyle(
                          color: Color(0xFFDDE1FF),
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 26),
          Row(
            children: [
              Text(
                'Quick actions',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const Spacer(),
              const Text(
                'Secure access',
                style: TextStyle(
                  color: InterpathColors.successGreen,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          _DashboardAction(
            color: InterpathColors.primaryBlue,
            background: InterpathColors.softBlue,
            icon: Icons.biotech_rounded,
            title: 'Patient visits',
            subtitle: 'Find visits by branch, date, patient, or lab number',
            onTap: () => context.push('/visits'),
          ),
          const SizedBox(height: 12),
          _DashboardAction(
            color: InterpathColors.accentRed,
            background: InterpathColors.softRed,
            icon: Icons.picture_as_pdf_rounded,
            title: 'Verified reports',
            subtitle: 'Preview and save official laboratory PDFs',
            onTap: () => context.push('/visits'),
          ),
          const SizedBox(height: 12),
          _DashboardAction(
            color: InterpathColors.successGreen,
            background: const Color(0xFFE5F5EF),
            icon: Icons.lock_person_outlined,
            title: 'Secure sharing',
            subtitle: 'Create audited, time-limited result links',
            onTap: () => context.push('/visits'),
          ),
        ],
      ),
    );
  }
}

class _HeroOrb extends StatelessWidget {
  const _HeroOrb({required this.size});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.08),
      ),
    );
  }
}

class _DashboardAction extends StatelessWidget {
  const _DashboardAction({
    required this.color,
    required this.background,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final Color color;
  final Color background;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: background,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 34,
                height: 34,
                decoration: const BoxDecoration(
                  color: InterpathColors.background,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.arrow_forward_rounded, size: 18),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
