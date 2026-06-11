import 'package:flutter/material.dart';

// ── Brand Colors ─────────────────────────────────────────────────────────────
const kAccent = Color(0xFF35A7E6);
const kAccentDark = Color(0xFF1D8FCC);
const kBgDark = Color(0xFF0F1117);
const kPanelDark = Color(0xFF1A1D2E);
const kPanelDark2 = Color(0xFF222538);
const kBorderColor = Color(0xFF2A2D3E);
const kTextPrimary = Color(0xFFE8EAF6);
const kTextSecondary = Color(0xFF8892A4);
const kSurface = Color(0xFF1E2236);

// Status colors
const kStatusPending = Color(0xFFBF616A);
const kStatusInProgress = Color(0xFF35A7E6);
const kStatusReady = Color(0xFF8FBCBB);
const kStatusDelivered = Color(0xFFA3BE8C);
const kStatusIntaken = Color(0xFFB48EAD);
const kStatusOther = Color(0xFFEBCB8B);

Color statusColor(String status) {
  switch (status) {
    case 'Pending': return kStatusPending;
    case 'In Progress': return kStatusInProgress;
    case 'Ready':
    case 'Ready for Delivery': return kStatusReady;
    case 'Delivered':
    case 'Completed':
    case 'Returned': return kStatusDelivered;
    case 'Intaken': return kStatusIntaken;
    case 'Waiting for Spare':
    case 'Replaced':
    case 'Send to Service Center':
    case 'Return':
    case 'Warranty': return kStatusOther;
    default: return kStatusOther;
  }
}

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: kBgDark,
    colorScheme: const ColorScheme.dark(
      primary: kAccent,
      secondary: kAccent,
      surface: kPanelDark,
      onPrimary: Colors.white,
      onSurface: kTextPrimary,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: kPanelDark,
      foregroundColor: kTextPrimary,
      elevation: 0,
      titleTextStyle: TextStyle(
        color: kTextPrimary,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        fontFamily: 'Inter',
      ),
    ),
    drawerTheme: const DrawerThemeData(
      backgroundColor: kPanelDark,
    ),
    cardTheme: CardTheme(
      color: kPanelDark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: kBorderColor),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kPanelDark2,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kBorderColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kBorderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kAccent, width: 1.5),
      ),
      labelStyle: const TextStyle(color: kTextSecondary),
      hintStyle: const TextStyle(color: kTextSecondary),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: kAccent,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: kAccent),
    ),
    dividerColor: kBorderColor,
    textTheme: const TextTheme(
      bodyLarge: TextStyle(color: kTextPrimary),
      bodyMedium: TextStyle(color: kTextPrimary),
      bodySmall: TextStyle(color: kTextSecondary),
      titleLarge: TextStyle(color: kTextPrimary, fontWeight: FontWeight.bold),
      titleMedium: TextStyle(color: kTextPrimary),
      labelSmall: TextStyle(color: kTextSecondary),
    ),
    listTileTheme: const ListTileThemeData(
      iconColor: kAccent,
      textColor: kTextPrimary,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: kPanelDark2,
      selectedColor: kAccent.withValues(alpha: 0.2),
      side: const BorderSide(color: kBorderColor),
      labelStyle: const TextStyle(color: kTextPrimary, fontSize: 12),
    ),
  );
}
