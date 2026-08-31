import 'react-native-gesture-handler';
import '@/global.css';
import { useContext, useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { StatusBar } from 'expo-status-bar';
import { ThemeContext, ThemeProvider } from '@/context/ThemeContext';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthProvider from '@/context/AuthProvider';
import * as SplashScreen from 'expo-splash-screen';

// Prevent auto-hiding the splash screen before assets and fonts are loaded
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore error if already prevented or in dev reload */
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const MainLayout = () => {
  const { colorMode }: any = useContext(ThemeContext);
  const [fontsLoaded, fontError] = useFonts({
    'dm-sans-regular': DMSans_400Regular,
    'dm-sans-medium': DMSans_500Medium,
    'dm-sans-bold': DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore error if already hidden */
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GluestackUIProvider mode={colorMode}>
      <StatusBar translucent />
      <Stack screenOptions={{ headerShown: false }} />
    </GluestackUIProvider>
  );
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <MainLayout />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
