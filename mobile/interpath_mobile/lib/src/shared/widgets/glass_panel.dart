import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/interpath_theme.dart';

class GlassPanel extends StatelessWidget {
  const GlassPanel({
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.radius = 26,
    this.opacity = 0.72,
    this.blur = 18,
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final double opacity;
  final double blur;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: InterpathColors.surface.withValues(alpha: opacity),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: InterpathColors.glassBorder),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.28),
                blurRadius: 30,
                offset: const Offset(0, 18),
              ),
              BoxShadow(
                color: InterpathColors.royalBlue.withValues(alpha: 0.08),
                blurRadius: 26,
                offset: const Offset(-8, -8),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }
}
