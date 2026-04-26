import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/materials_provider.dart';
import 'providers/notifications_provider.dart';
import 'providers/planning_provider.dart';
import 'providers/session_provider.dart';
import 'providers/transport_provider.dart';
import 'providers/users_provider.dart';
import 'screens/home_screen.dart';
import 'screens/driver_portal_screen.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';
import 'services/cache_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final cacheService = CacheService();
  await cacheService.initialize();
  final apiService = ApiService();

  final sessionProvider = SessionProvider(apiService: apiService, cacheService: cacheService);
  await sessionProvider.restore();

  final materialsProvider = MaterialsProvider(apiService: apiService, cacheService: cacheService);
  await materialsProvider.restoreCache();

  final notificationsProvider = NotificationsProvider(apiService: apiService);
  final planningProvider = PlanningProvider(apiService: apiService);

  final transportProvider = TransportProvider(apiService: apiService, cacheService: cacheService);
  await transportProvider.restoreCache();

  final usersProvider = UsersProvider(apiService: apiService);

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: sessionProvider),
        ChangeNotifierProvider.value(value: materialsProvider),
        ChangeNotifierProvider.value(value: notificationsProvider),
        ChangeNotifierProvider.value(value: planningProvider),
        ChangeNotifierProvider.value(value: transportProvider),
        ChangeNotifierProvider.value(value: usersProvider),
      ],
      child: BauFlowApp(apiService: apiService),
    ),
  );
}

class BauFlowApp extends StatelessWidget {
  const BauFlowApp({super.key, required this.apiService});

  final ApiService apiService;

  @override
  Widget build(BuildContext context) {
    const bg = Color(0xFF0A0E14);
    const surface = Color(0xFF131A24);
    const surfaceAlt = Color(0xFF1A2230);
    const dark = Color(0xFFE8EDF4);
    const darkMuted = Color(0xFF91A0B8);
    const accent = Color(0xFFF5BF18);

    return MaterialApp(
      title: 'BauFlow',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        colorScheme: const ColorScheme.dark(
          primary: accent,
          secondary: accent,
          surface: surface,
          onSurface: dark,
          onPrimary: Color(0xFF111111),
          outline: Color(0xFF253042),
        ),
        scaffoldBackgroundColor: bg,
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0A0E14),
          foregroundColor: Color(0xFFE8EDF4),
          elevation: 0,
          centerTitle: false,
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: const Color(0xFF101722),
          indicatorColor: accent.withValues(alpha: 0.24),
          labelTextStyle: WidgetStateProperty.resolveWith(
            (states) => TextStyle(
              color: states.contains(WidgetState.selected) ? accent : const Color(0xFF70839E),
              fontWeight: FontWeight.w600,
            ),
          ),
          iconTheme: WidgetStateProperty.resolveWith(
            (states) => IconThemeData(
              color: states.contains(WidgetState.selected) ? accent : const Color(0xFF70839E),
            ),
          ),
        ),
        cardTheme: CardThemeData(
          color: surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFF253042)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: surfaceAlt,
          hintStyle: const TextStyle(color: darkMuted),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Color(0xFF253042)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Color(0xFF253042)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: accent, width: 1.4),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: accent,
            foregroundColor: const Color(0xFF111111),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            textStyle: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        chipTheme: ChipThemeData(
          side: const BorderSide(color: Color(0xFF253042)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          backgroundColor: surfaceAlt,
          selectedColor: accent.withValues(alpha: 0.24),
          labelStyle: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFE8EDF4)),
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: accent,
          foregroundColor: Color(0xFF111111),
        ),
      ),
      home: Consumer<SessionProvider>(
        builder: (context, sessionProvider, _) {
          if (sessionProvider.isAuthenticated) {
            return const HomeScreen();
          }

          return LoginScreen(
            isLoading: sessionProvider.isLoading,
            onLogin: (email, password) => sessionProvider.login(email: email, password: password),
            onOpenDriverPortal: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => DriverPortalScreen(apiService: apiService)),
              );
            },
          );
        },
      ),
    );
  }
}
