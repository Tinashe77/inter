import 'package:url_launcher/url_launcher.dart';

class WhatsAppService {
  const WhatsAppService._();

  static String normalizeZimbabweNumber(String value) {
    final cleaned = value.replaceAll(RegExp(r'[^0-9+]'), '');

    if (cleaned.startsWith('+263')) {
      return cleaned;
    }

    if (cleaned.startsWith('263')) {
      return '+$cleaned';
    }

    if (cleaned.startsWith('0') && cleaned.length > 1) {
      return '+263${cleaned.substring(1)}';
    }

    return cleaned;
  }

  static bool isValidZimbabweNumber(String value) {
    return RegExp(r'^\+263\d{9}$').hasMatch(normalizeZimbabweNumber(value));
  }

  static Future<bool> shareResultLink({
    required String phoneNumber,
    required String patientName,
    required String labNumber,
    required String pdfUrl,
  }) async {
    final normalized = normalizeZimbabweNumber(phoneNumber);
    final waNumber = normalized.replaceAll(RegExp(r'[^0-9]'), '');
    final message = Uri.encodeComponent(
      'Good day $patientName, your Interpath lab results for visit $labNumber '
      'are now available. Please find your result report here: $pdfUrl. '
      'Kindly consult your doctor for interpretation of the results.',
    );

    final uri = Uri.parse('https://wa.me/$waNumber?text=$message');
    return launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
