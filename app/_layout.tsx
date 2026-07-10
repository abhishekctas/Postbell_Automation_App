import "@/global.css";
import { useContext } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { StatusBar } from "expo-status-bar";
import { ThemeContext, ThemeProvider } from "@/contexts/theme-context";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthProvider from "@/auth/AuthProvider";

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
  const [fontsLoaded] = useFonts({
    "dm-sans-regular": DMSans_400Regular,
    "dm-sans-medium": DMSans_500Medium,
    "dm-sans-bold": DMSans_700Bold,
  });

  if (!fontsLoaded) {
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
