import React from "react";
import { Stack, usePathname, Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import GlobalTabBar from "@/components/GlobalTabBar";

export default function PagesLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // If user is a customer, restrict their access to allowed pages
  if (user?.loginType === "customer") {
    const customerAllowedPages = [
      "/pages/festival-auto-post",
      "/pages/general-settings",
    ];
    // Check if the current pathname is allowed
    const isAllowed = customerAllowedPages.some(
      (allowed) => pathname === allowed || pathname.startsWith(allowed + "/")
    );
    if (!isAllowed) {
      return <Redirect href="/(tabs)" />;
    }
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalTabBar />
    </>
  );
}
