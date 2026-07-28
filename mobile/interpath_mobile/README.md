# Interpath Mobile

Native Flutter mobile application for Interpath Results.

This folder is intentionally separate from the existing PWA:

- PWA/frontend: `client/`
- Backend/API proxy: `server/`
- Flutter mobile app: `mobile/interpath_mobile/`

## Prerequisites

Install Flutter first:

```bash
flutter --version
flutter doctor
```

If this folder was created before Flutter was installed, run:

```bash
cd mobile/interpath_mobile
flutter create .
flutter pub get
```

`flutter create .` will generate the native `android/` and `ios/` folders around the existing `lib/`, `assets/`, and `pubspec.yaml` files.

## Run

Development API:

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:5001
```

Production API:

```bash
flutter run --dart-define=API_BASE_URL=https://inter-8puh.onrender.com
```

## Package Stack

- `dio` for HTTP/API calls
- `flutter_secure_storage` for secure session storage
- `go_router` for navigation and protected routes
- `flutter_riverpod` for app state
- `url_launcher` for WhatsApp/deep links
- `share_plus` for native sharing
- `pdfrx` for PDF preview
- `permission_handler` for runtime permissions
- `flutter_native_splash` and `flutter_launcher_icons` for branding

## First Build Targets

1. Login with role selector
2. Secure session storage and forced login
3. Visits list
4. Visit details/results
5. PDF preview/download
6. WhatsApp share with Zimbabwe phone formatting

