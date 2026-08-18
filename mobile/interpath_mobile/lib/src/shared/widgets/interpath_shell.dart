import 'package:flutter/material.dart';

import '../theme/interpath_theme.dart';

class InterpathShell extends StatelessWidget {
  const InterpathShell({
    required this.title,
    required this.child,
    this.actions,
    this.overlay,
    super.key,
  });

  final String title;
  final Widget child;
  final List<Widget>? actions;
  final Widget? overlay;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: InterpathColors.surfaceRaised,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: InterpathColors.glassBorder),
              ),
              child: Image.asset('assets/images/interpathmed_logo.png'),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(title, overflow: TextOverflow.ellipsis)),
          ],
        ),
        actions: actions,
        centerTitle: false,
      ),
      body: SafeArea(
        child: Stack(
          children: [
            ListView(
              padding: EdgeInsets.fromLTRB(
                18,
                8,
                18,
                overlay == null ? 28 : 148,
              ),
              children: [child],
            ),
            if (overlay != null)
              Positioned(
                left: 14,
                right: 14,
                bottom: 14,
                child: IgnorePointer(child: overlay),
              ),
          ],
        ),
      ),
    );
  }
}
