import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../shared/theme/interpath_theme.dart';
import '../../shared/widgets/glass_panel.dart';
import 'auth_controller.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  String _userType = 'Employee';
  bool _obscurePassword = true;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      body: Stack(
        children: [
          const Positioned.fill(child: _LoginBackground()),
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(22, 20, 22, 32),
              children: [
                const _LoginBrand(),
                const SizedBox(height: 28),
                GlassPanel(
                  radius: 30,
                  opacity: 0.78,
                  padding: const EdgeInsets.all(22),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Welcome back',
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Sign in to securely access laboratory visits and results.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: 22),
                        DropdownButtonFormField<String>(
                          initialValue: _userType,
                          decoration: const InputDecoration(
                            labelText: 'Account type',
                            prefixIcon: Icon(Icons.badge_outlined),
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'Patient',
                              child: Text('Patient'),
                            ),
                            DropdownMenuItem(
                              value: 'Clinic_Doctor',
                              child: Text('Clinic / Doctor'),
                            ),
                            DropdownMenuItem(
                              value: 'Employee',
                              child: Text('Employee'),
                            ),
                          ],
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => _userType = value);
                            }
                          },
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _usernameController,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.username],
                          decoration: const InputDecoration(
                            labelText: 'Username',
                            prefixIcon: Icon(Icons.person_outline_rounded),
                          ),
                          validator: (value) =>
                              value == null || value.trim().isEmpty
                                  ? 'Enter your username'
                                  : null,
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          autofillHints: const [AutofillHints.password],
                          onFieldSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline_rounded),
                            suffixIcon: IconButton(
                              tooltip: _obscurePassword
                                  ? 'Show password'
                                  : 'Hide password',
                              onPressed: () => setState(
                                () => _obscurePassword = !_obscurePassword,
                              ),
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                              ),
                            ),
                          ),
                          validator: (value) => value == null || value.isEmpty
                              ? 'Enter your password'
                              : null,
                        ),
                        if (authState.hasError) ...[
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: InterpathColors.softRed,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: const Row(
                              children: [
                                Icon(
                                  Icons.error_outline_rounded,
                                  color: InterpathColors.accentRed,
                                ),
                                SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Sign-in failed. Check your details and try again.',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 22),
                        ElevatedButton.icon(
                          onPressed: authState.isLoading ? null : _submit,
                          icon: authState.isLoading
                              ? const SizedBox.square(
                                  dimension: 19,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.arrow_forward_rounded),
                          label: Text(
                            authState.isLoading
                                ? 'Signing in…'
                                : 'Sign in securely',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.verified_user_outlined,
                      size: 16,
                      color: InterpathColors.textMuted,
                    ),
                    SizedBox(width: 7),
                    Text(
                      'Protected clinical access',
                      style: TextStyle(
                        color: InterpathColors.textMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(authControllerProvider.notifier).login(
          userType: _userType,
          username: _usernameController.text.trim(),
          password: _passwordController.text,
        );
    if (mounted &&
        ref.read(authControllerProvider).value?.userType == 'Employee') {
      context.go('/branch-selection');
    }
  }
}

class _LoginBrand extends StatelessWidget {
  const _LoginBrand();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 72,
          height: 72,
          padding: const EdgeInsets.all(9),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: InterpathColors.darkBlue.withValues(alpha: 0.12),
                blurRadius: 22,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Image.asset('assets/images/interpathmed_logo.png'),
        ),
        const SizedBox(width: 15),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'INTERPATH',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
              SizedBox(height: 3),
              Text(
                'Results workspace',
                style: TextStyle(color: Color(0xFFD8DCFF), fontSize: 13),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LoginBackground extends StatelessWidget {
  const _LoginBackground();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(
          child: ColoredBox(color: InterpathColors.background),
        ),
        Positioned(
          left: -110,
          top: -80,
          child: Container(
            width: 330,
            height: 330,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: InterpathColors.royalBlue.withValues(alpha: 0.42),
              boxShadow: [
                BoxShadow(
                  color: InterpathColors.royalBlue.withValues(alpha: 0.38),
                  blurRadius: 110,
                  spreadRadius: 24,
                ),
              ],
            ),
          ),
        ),
        Positioned(
          right: -120,
          top: 160,
          child: Container(
            width: 270,
            height: 270,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: InterpathColors.accentRed.withValues(alpha: 0.18),
              boxShadow: [
                BoxShadow(
                  color: InterpathColors.accentRed.withValues(alpha: 0.2),
                  blurRadius: 100,
                  spreadRadius: 20,
                ),
              ],
            ),
          ),
        ),
        Container(
          height: 245,
          decoration: const BoxDecoration(
            gradient: InterpathColors.brandGradient,
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(42)),
          ),
        ),
      ],
    );
  }
}
