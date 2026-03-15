import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

export async function initializeMobileApp() {
  if (Capacitor.isNativePlatform()) {
    // Status Bar Configuration
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#000000' });
    } catch (error) {
      console.warn('Failed to configure status bar:', error);
    }

    // Hide Splash Screen after app is ready
    try {
      await SplashScreen.hide();
    } catch (error) {
      console.warn('Failed to hide splash screen:', error);
    }

    // Keyboard Configuration
    try {
      Keyboard.addListener('keyboardWillShow', (info) => {
        // TODO: Handle keyboard show (e.g., adjust layout)
        console.log('Keyboard will show:', info);
      });

      Keyboard.addListener('keyboardDidShow', (info) => {
        // TODO: Handle keyboard shown (e.g., resize content)
        console.log('Keyboard did show:', info);
      });

      Keyboard.addListener('keyboardWillHide', () => {
        // TODO: Handle keyboard hide (e.g., restore layout)
        console.log('Keyboard will hide');
      });

      Keyboard.addListener('keyboardDidHide', () => {
        // TODO: Handle keyboard hidden (e.g., reset resize)
        console.log('Keyboard did hide');
      });
    } catch (error) {
      console.warn('Failed to set up keyboard listeners:', error);
    }

    // App State Listeners
    try {
      App.addListener('appStateChange', ({ isActive }) => {
        // TODO: Handle app state changes (e.g., pause/resume)
        console.log('App state changed:', isActive ? 'active' : 'inactive');
      });

      App.addListener('appUrlOpen', (data) => {
        // TODO: Handle deep links/URL opens
        console.log('App URL opened:', data);
      });

      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });
    } catch (error) {
      console.warn('Failed to set up app listeners:', error);
    }
  }
}

export function isMobile(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): string {
  return Capacitor.getPlatform();
}