import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isMobile = () => {
  return Capacitor.isNativePlatform();
};

export const getMobileConfig = () => {
  if (isMobile()) {
    return {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
      platform: Capacitor.getPlatform()
    };
  }
    return {
      apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
      platform: 'web'
    };
};

export const initializeMobile = async () => {
  if (isMobile()) {
    try {
      // Set status bar style
      await StatusBar.setStyle({ style: Style.Light });
      
      // Hide splash screen
      await SplashScreen.hide();
      
      // Mobile app initialized successfully
    } catch (error) {
      // Error handled silently
    }
  }
};

export const getMobileStyles = () => {
  if (isMobile()) {
    return {
      // Mobile-specific styles
      container: 'min-h-screen bg-gray-50 pb-safe',
      header: 'sticky top-0 z-50 bg-white shadow-sm',
      content: 'px-4 py-2',
      button: 'min-h-[44px] px-4 py-2', // iOS minimum touch target
      input: 'min-h-[44px] px-3 py-2'
    };
  }
  return {
    container: 'min-h-screen bg-gray-50',
    header: 'bg-white shadow-sm',
    content: 'px-4 py-6',
    button: 'px-4 py-2',
    input: 'px-3 py-2'
  };
};