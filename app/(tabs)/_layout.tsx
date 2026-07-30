import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ActivityIndicator } from 'react-native';
import { Box } from '@/components/ui/box';
import GlobalTabBar from '@/components/GlobalTabBar';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <Box className="flex-1 items-center justify-center bg-background-0">
        <ActivityIndicator size="large" color="#193867" />
      </Box>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
          }}
        />
        <Tabs.Screen
          name="posts"
          options={{
            title: 'Posts',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
          }}
        />
        <Tabs.Screen
          name="pages"
          options={{
            href: null,
          }}
        />
      </Tabs>
      <GlobalTabBar />
    </>
  );
}
