# Interpath Results mobile release

## Application identity

- Display name: `Interpath Results`
- Android application ID: `com.interpath.results`
- iOS bundle ID: `com.interpath.results`
- Current version: `0.2.0+2`

Confirm that both identifiers are available in the Interpath Apple Developer and
Google Play Console accounts before creating store records.

## Environments

Every non-development build must provide both compile-time values:

```bash
--dart-define=APP_ENV=staging
--dart-define=API_BASE_URL=https://staging-api.example.com
```

Production builds reject a non-HTTPS API URL at startup.

## Internal builds

Run the repeatable build script from this directory:

```bash
chmod +x tool/build_internal.sh
./tool/build_internal.sh staging https://staging-api.example.com
```

The Android artifact is written under `build/app/outputs/bundle/release/`.
The unsigned iOS archive is written under `build/ios/archive/`.

## Signing required before distribution

1. Replace Android's temporary debug signing configuration with the Interpath
   Play upload keystore and keep all keystore values outside source control.
2. Open `ios/Runner.xcworkspace` in Xcode, select the Interpath development team,
   and create an App Store distribution archive.
3. Upload Android through the Play Console internal-testing track.
4. Upload iOS through Xcode Organizer or Transporter and assign it to TestFlight
   internal testers.

## Acceptance checklist

- Sign in as an employee and verify automatic handling of an expired session.
- Select every supported branch and load both current and historical dates.
- Search a large visit list and use **Load more**.
- Open normal, abnormal, partial, and unavailable results.
- Preview and save/share an authenticated PDF.
- Confirm a WhatsApp recipient and verify the 24-hour audited share link.
- Repeat on a physical iPhone and Android phone using staging.
- Verify app icon, splash screen, text scaling, VoiceOver/TalkBack, and dark-room
  readability.
- Confirm privacy policy, support URL, screenshots, age rating, and medical-data
  disclosures in both store consoles.
