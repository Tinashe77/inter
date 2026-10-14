import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'device_registration_service.dart';

class DeviceRegistrationPage extends ConsumerStatefulWidget {
  const DeviceRegistrationPage({super.key});

  @override
  ConsumerState<DeviceRegistrationPage> createState() =>
      _DeviceRegistrationPageState();
}

class _DeviceRegistrationPageState
    extends ConsumerState<DeviceRegistrationPage> {
  final _formKey = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _countryCode = TextEditingController(text: '+263');
  String _userType = 'Patient';
  bool _loading = false;
  String? _message;

  @override
  void dispose() {
    _phone.dispose();
    _countryCode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Register this device')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              'Connect this phone to SLIS',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            const Text(
              'SLIS assigns a registration number to this device. It is stored securely and checked when the app opens.',
            ),
            const SizedBox(height: 24),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _countryCode,
                    decoration:
                        const InputDecoration(labelText: 'Country code'),
                    validator: _required,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration:
                        const InputDecoration(labelText: 'Owner phone number'),
                    validator: _required,
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: _userType,
                    decoration: const InputDecoration(
                      labelText: 'Default account type',
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
                    onChanged: (value) =>
                        setState(() => _userType = value ?? _userType),
                  ),
                  if (_message != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: Text(_message!, textAlign: TextAlign.center),
                    ),
                  const SizedBox(height: 22),
                  FilledButton.icon(
                    onPressed: _loading ? null : _register,
                    icon: _loading
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.phonelink_lock),
                    label: Text(_loading ? 'Registering…' : 'Register device'),
                  ),
                  TextButton(
                    onPressed: () => context.go('/login'),
                    child: const Text('Back to sign in'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty ? 'Required' : null;

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _message = null;
    });
    try {
      final reg = await ref.read(deviceRegistrationServiceProvider).register(
            phoneNumber: _phone.text.trim(),
            countryCode: _countryCode.text.trim(),
            userType: _userType,
          );
      if (mounted) {
        setState(() => _message = 'Device registered successfully: $reg');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _message = 'Device registration failed: $error');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}
