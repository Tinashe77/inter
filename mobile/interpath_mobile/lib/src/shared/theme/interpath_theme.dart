import 'package:flutter/material.dart';

class InterpathColors {
  const InterpathColors._();

  static const primaryBlue = Color(0xFF6577FF);
  static const darkBlue = Color(0xFF171B55);
  static const royalBlue = Color(0xFF3548D4);
  static const accentRed = Color(0xFFFF4D5D);
  static const softRed = Color(0xFFFFF1F2);
  static const background = Color(0xFFF6F8FC);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceRaised = Color(0xFFF0F4FF);
  static const textDark = Color(0xFF172033);
  static const textMuted = Color(0xFF64748B);
  static const border = Color(0xFFE2E8F0);
  static const glassBorder = Color(0xFFDCE4F0);
  static const softBlue = Color(0xFFEEF2FF);
  static const successGreen = Color(0xFF15803D);
  static const warningAmber = Color(0xFFFFBD59);

  static const brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1C226A), royalBlue, Color(0xFF6B2D78)],
    stops: [0, 0.62, 1],
  );

  static const accentGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF5368FF), Color(0xFF9C55DE), accentRed],
  );
}

class InterpathTheme {
  const InterpathTheme._();

  static ThemeData get light {
    const scheme = ColorScheme.light(
      primary: InterpathColors.primaryBlue,
      secondary: InterpathColors.accentRed,
      surface: InterpathColors.surface,
      error: InterpathColors.accentRed,
      onPrimary: Colors.white,
      onSurface: InterpathColors.textDark,
    );

    const radius = 19.0;
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      brightness: Brightness.light,
      scaffoldBackgroundColor: InterpathColors.background,
      fontFamily: 'Roboto',
      dividerColor: InterpathColors.border,
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 35,
          height: 1.08,
          letterSpacing: -1,
          fontWeight: FontWeight.w700,
          color: InterpathColors.textDark,
        ),
        headlineMedium: TextStyle(
          fontSize: 28,
          height: 1.15,
          letterSpacing: -0.7,
          fontWeight: FontWeight.w700,
          color: InterpathColors.textDark,
        ),
        titleLarge: TextStyle(
          letterSpacing: -0.25,
          fontWeight: FontWeight.w700,
          color: InterpathColors.textDark,
        ),
        titleMedium: TextStyle(
          fontWeight: FontWeight.w600,
          color: InterpathColors.textDark,
        ),
        bodyLarge: TextStyle(height: 1.48, color: InterpathColors.textDark),
        bodyMedium: TextStyle(height: 1.45, color: InterpathColors.textMuted),
        bodySmall: TextStyle(height: 1.38, color: InterpathColors.textMuted),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: InterpathColors.background,
        foregroundColor: InterpathColors.textDark,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: InterpathColors.textDark,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
        ),
      ),
      cardTheme: CardThemeData(
        color: InterpathColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: InterpathColors.glassBorder),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: InterpathColors.surfaceRaised.withValues(alpha: 0.74),
        labelStyle: const TextStyle(color: InterpathColors.textMuted),
        hintStyle: const TextStyle(color: Color(0xFF77809C)),
        prefixIconColor: InterpathColors.primaryBlue,
        suffixIconColor: InterpathColors.textMuted,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: InterpathColors.glassBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: InterpathColors.glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(
            color: InterpathColors.primaryBlue,
            width: 1.7,
          ),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: InterpathColors.primaryBlue,
          foregroundColor: Colors.white,
          disabledBackgroundColor: InterpathColors.softBlue,
          elevation: 0,
          minimumSize: const Size.fromHeight(48),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: InterpathColors.primaryBlue,
          foregroundColor: Colors.white,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(17)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: InterpathColors.textDark,
          side: const BorderSide(color: InterpathColors.glassBorder),
          minimumSize: const Size(0, 46),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(17)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: InterpathColors.surfaceRaised,
        selectedColor: InterpathColors.primaryBlue,
        side: const BorderSide(color: InterpathColors.glassBorder),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: InterpathColors.surfaceRaised,
        contentTextStyle: const TextStyle(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
