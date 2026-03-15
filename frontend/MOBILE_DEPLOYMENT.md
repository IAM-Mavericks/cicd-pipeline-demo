# MavenPay Mobile Deployment Guide

MavenPay is now available for iOS and Android platforms using Capacitor. This guide will help you build and deploy the mobile versions of the app.

## 🚀 Quick Start

### Prerequisites

#### For iOS Development:
- macOS (required for iOS development)
- Xcode 12.0 or later
- iOS 13.0 or later for target devices
- CocoaPods (`sudo gem install cocoapods`)
- Apple Developer Account (for App Store deployment)

#### For Android Development:
- Android Studio 4.2 or later
- Android SDK (API level 22 or higher)
- Java Development Kit (JDK) 11 or 17
- Gradle (included with Android Studio)

## 📱 Theme Support

The app now includes full light/dark mode support:
- **Light Mode**: Clean, bright interface
- **Dark Mode**: Eye-friendly dark theme
- **System Mode**: Automatically follows device theme preference

Theme toggle is available in the navigation bar on all platforms.

## 🛠 Development Scripts

### Build Commands
```bash
# Build web version
pnpm build

# Build and copy to all mobile platforms
pnpm run mobile:build

# Sync native dependencies
pnpm run mobile:sync
```

### Android Commands
```bash
# Build for Android
pnpm run android:build

# Build and run on Android device/emulator
pnpm run android:run

# Open Android project in Android Studio
pnpm run android:open

# Add Android platform (if not already added)
pnpm run cap:add:android
```

### iOS Commands
```bash
# Build for iOS
pnpm run ios:build

# Build and run on iOS device/simulator
pnpm run ios:run

# Open iOS project in Xcode
pnpm run ios:open

# Add iOS platform (if not already added)
pnpm run cap:add:ios
```

## 📦 Building for Production

### Android Production Build

1. **Prepare the build:**
   ```bash
   pnpm run android:build
   ```

2. **Open in Android Studio:**
   ```bash
   pnpm run android:open
   ```

3. **Generate signed APK/AAB:**
   - In Android Studio: Build > Generate Signed Bundle / APK
   - Follow the signing wizard
   - Choose "Android App Bundle" for Play Store distribution

4. **Deploy to Google Play Store:**
   - Upload the AAB file to Google Play Console
   - Complete store listing information
   - Submit for review

### iOS Production Build

1. **Prepare the build:**
   ```bash
   pnpm run ios:build
   ```

2. **Open in Xcode:**
   ```bash
   pnpm run ios:open
   ```

3. **Archive and upload:**
   - In Xcode: Product > Archive
   - Use Xcode Organizer to upload to App Store Connect
   - Complete App Store listing information
   - Submit for review

## 🔧 Configuration

### Capacitor Configuration
The app is configured in `capacitor.config.ts` with:
- App ID: `com.mavenpay.app`
- App Name: `MavenPay`
- Optimized plugins for mobile experience

### Mobile Features Included
- ✅ **Status Bar**: Dark style with custom background
- ✅ **Splash Screen**: Custom splash with MavenPay branding
- ✅ **Keyboard**: Smart keyboard handling and resizing
- ✅ **App State**: Proper background/foreground handling
- ✅ **Back Button**: Android hardware back button support
- ✅ **Biometric Auth**: Ready for fingerprint/face ID integration
- ✅ **Theme Support**: System-aware light/dark mode

## 📋 Testing

### Testing on Devices

#### Android Testing:
```bash
# Run on connected Android device
pnpm run android:run

# Or manually:
# 1. Enable Developer Options and USB Debugging
# 2. Connect device via USB
# 3. Run: adb devices (to verify connection)
# 4. Run the android:run command
```

#### iOS Testing:
```bash
# Run on connected iOS device or simulator
pnpm run ios:run

# Or manually:
# 1. Open Xcode project
# 2. Select target device/simulator
# 3. Click Run button
```

## 🐛 Troubleshooting

### Common Issues

#### iOS Build Issues:
- **CocoaPods not installed**: Run `sudo gem install cocoapods`
- **Xcode not found**: Install Xcode from App Store
- **Pod install fails**: Run `cd ios && pod install`

#### Android Build Issues:
- **Android Studio not found**: Make sure Android Studio is installed and in PATH
- **SDK not found**: Open Android Studio and install required SDK components
- **Gradle issues**: Try cleaning project in Android Studio

#### General Issues:
- **Build fails**: Try cleaning and rebuilding:
  ```bash
  pnpm run mobile:build
  ```
- **Changes not reflecting**: Ensure you rebuild after code changes:
  ```bash
  pnpm build && cap copy
  ```

### Debug Mode
To debug on device, use Chrome DevTools:
1. For Android: `chrome://inspect` in Chrome
2. For iOS: Use Safari Web Inspector with connected device

## 🔒 Security Considerations

- App uses HTTPS scheme for secure communication
- Biometric authentication ready for implementation
- Secure storage capabilities available through Capacitor plugins
- SSL certificate pinning recommended for production

## 📖 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Deployment Guide](https://capacitorjs.com/docs/ios/deploying-to-app-store)
- [Android Deployment Guide](https://capacitorjs.com/docs/android/deploying-to-google-play)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)

## 🎯 Next Steps

1. **Test thoroughly** on real devices
2. **Add app icons** for both platforms
3. **Configure push notifications** if needed
4. **Implement biometric authentication**
5. **Add offline capabilities**
6. **Submit to app stores**

Happy deploying! 🚀