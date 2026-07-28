import 'package:flutter_test/flutter_test.dart';
import 'package:interpath_mobile/src/features/whatsapp/whatsapp_service.dart';

void main() {
  group('WhatsAppService.normalizeZimbabweNumber', () {
    test('converts local 0 prefix to +263', () {
      expect(
        WhatsAppService.normalizeZimbabweNumber('0777214812'),
        '+263777214812',
      );
    });

    test('keeps +263 prefix', () {
      expect(
        WhatsAppService.normalizeZimbabweNumber('+263777214812'),
        '+263777214812',
      );
    });

    test('adds plus to 263 prefix', () {
      expect(
        WhatsAppService.normalizeZimbabweNumber('263777214812'),
        '+263777214812',
      );
    });
  });

  test('validates Zimbabwe mobile numbers after normalization', () {
    expect(WhatsAppService.isValidZimbabweNumber('0772 123 456'), isTrue);
    expect(WhatsAppService.isValidZimbabweNumber('+263772123456'), isTrue);
    expect(WhatsAppService.isValidZimbabweNumber('123'), isFalse);
  });
}
