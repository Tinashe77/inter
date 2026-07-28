import 'package:flutter/material.dart';

import '../theme/interpath_theme.dart';

class InterpathShell extends StatelessWidget {
  const InterpathShell({
    required this.title,
    required this.child,
    this.actions,
    super.key,
  });

  final String title;
  final Widget child;
  final List<Widget>? actions;

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
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [child],
        ),
      ),
    );
  }
}
