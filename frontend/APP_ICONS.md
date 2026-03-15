# App Icons Configuration

## 📱 Adding App Icons

### For Android:
1. Create icons in these sizes and place in `android/app/src/main/res/`:
   - `mipmap-hdpi/ic_launcher.png` (72x72)
   - `mipmap-mdpi/ic_launcher.png` (48x48)
   - `mipmap-xhdpi/ic_launcher.png` (96x96)
   - `mipmap-xxhdpi/ic_launcher.png` (144x144)
   - `mipmap-xxxhdpi/ic_launcher.png` (192x192)

2. For adaptive icons (Android 8.0+), also create:
   - `mipmap-hdpi/ic_launcher_foreground.png`
   - `mipmap-hdpi/ic_launcher_background.png`
   - (repeat for all density folders)

### For iOS:
1. Open the iOS project in Xcode:
   ```bash
   pnpm run ios:open
   ```

2. In Xcode:
   - Navigate to `App/App/Assets.xcassets/AppIcon.appiconset`
   - Drag and drop your icon files for each required size
   - Xcode will show you exactly which sizes are needed

### Automated Icon Generation:
You can use online tools like:
- [App Icon Generator](https://appicon.co/)
- [Icon.kitchen](https://icon.kitchen/)

Just upload your 1024x1024 master icon and download the complete icon set.

## 🎨 Icon Guidelines:
- Use a 1024x1024px master icon
- Keep design simple and recognizable at small sizes
- Use MavenPay brand colors (green and blue gradient)
- Avoid text in icons
- Test on both light and dark backgrounds