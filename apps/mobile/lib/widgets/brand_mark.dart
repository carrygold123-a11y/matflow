import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    if (compact) {
      return SvgPicture.asset('assets/logo.svg', width: 34, height: 34);
    }

    return Row(
      mainAxisSize: MainAxisSize.max,
      children: [
        SvgPicture.asset('assets/logo.svg', width: 72, height: 72),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'MATERIAL ORCHESTRATION',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(letterSpacing: 1.8, color: const Color(0xFF91A0B8)),
            ),
            Text(
              'BauFlow',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFFE8EDF4),
                  ),
            ),
          ],
        ),
      ],
    );
  }
}
