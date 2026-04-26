import 'package:flutter/material.dart';

import '../widgets/brand_mark.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLogin, required this.isLoading, required this.onOpenDriverPortal});

  final Future<void> Function(String email, String password) onLogin;
  final bool isLoading;
  final VoidCallback onOpenDriverPortal;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'mara@matflow.local');
  final _passwordController = TextEditingController(text: 'matflow123');
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    setState(() {
      _errorMessage = null;
    });

    try {
      await widget.onLogin(_emailController.text.trim(), _passwordController.text.trim());
    } catch (error) {
      setState(() {
        _errorMessage = error.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0F172A), Color(0xFF111827)],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 12),
                const BrandMark(),
                const SizedBox(height: 22),
                Text(
                  'Baustellen-Material in Echtzeit teilen, planen und transportieren.',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: const Color(0xFFE2E8F0),
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 20),
                Expanded(
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF131A24),
                      border: Border.all(color: const Color(0xFF253042)),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Login',
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFFE8EDF4),
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _emailController,
                            decoration: const InputDecoration(labelText: 'E-Mail'),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _passwordController,
                            obscureText: true,
                            decoration: const InputDecoration(labelText: 'Passwort'),
                          ),
                          const SizedBox(height: 12),
                          if (_errorMessage != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(color: Color(0xFFB91C1C), fontWeight: FontWeight.w600),
                              ),
                            ),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: widget.isLoading ? null : _handleSubmit,
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                child: Text(widget.isLoading ? 'Anmelden...' : 'In BauFlow starten'),
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: widget.onOpenDriverPortal,
                              icon: const Icon(Icons.local_shipping_outlined),
                              label: const Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: Text('Fahrer Login offnen'),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0D131D),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'Demo: mara@matflow.local / matflow123',
                              style: TextStyle(fontSize: 12.5, color: Color(0xFF91A0B8)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
