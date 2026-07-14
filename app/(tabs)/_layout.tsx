import React, { useEffect, useState } from "react";
import { Tabs, router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import {
  ActivityIndicator,
  StyleSheet,
  Platform,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Box } from "@/components/ui/box";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ opacity: focused ? 1 : 0.5 }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, isLoading]);

  const handleNavigate = (path: string) => {
    setDrawerOpen(false);
    router.push(path as any);
  };

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
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#e2e8f0",
            paddingBottom: Platform.OS === "ios" ? insets.bottom : 8,
            paddingTop: 8,
            height: Platform.OS === "ios" ? 80 + insets.bottom : 65,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 8,
          },
          tabBarActiveTintColor: "#193867",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ focused }) => (
              <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
                <TabIcon emoji="📊" focused={focused} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="posts"
          options={{
            title: "Posts",
            tabBarIcon: ({ focused }) => (
              <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
                <TabIcon emoji="📝" focused={focused} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
                <TabIcon emoji="👤" focused={focused} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: "Menu",
            tabBarIcon: ({ focused }) => (
              <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
                <TabIcon emoji="☰" focused={focused} />
              </View>
            ),
            tabBarButton: (props) => (
              <TouchableOpacity
                style={props.style}
                onPress={() => setDrawerOpen(true)}
              >
                {props.children}
              </TouchableOpacity>
            ),
          }}
        />
        <Tabs.Screen
          name="pages"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Slide-Up Drawer Modal */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <Box style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdropTouch} onPress={() => setDrawerOpen(false)} />
          <Box style={[styles.drawerContainer, { paddingBottom: 16, marginBottom: Platform.OS === "ios" ? 85 + insets.bottom : 75 }]}>
            <Box style={styles.drawerHeader}>
              {/* <Box>
                <Text style={styles.drawerTitle}>Settings & Administration</Text>
                <Text style={styles.drawerSubtitle}>Quickly configure panels and services</Text>
              </Box> */}
              <TouchableOpacity
                onPress={() => setDrawerOpen(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </Box>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.drawerList}>
              <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/festival-auto-post")}>
                <Text style={styles.drawerItemText}>📅  Festival Auto Posts</Text>
              </TouchableOpacity>
              {user?.loginType !== "customer" && (
                <>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/blogs")}>
                    <Text style={styles.drawerItemText}>✍️  Blog Management</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/features")}>
                    <Text style={styles.drawerItemText}>⚡  Features CMS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/subscription-plans")}>
                    <Text style={styles.drawerItemText}>💳  Subscription Plans</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/customers")}>
                    <Text style={styles.drawerItemText}>👥  Customer Directory</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/customer-subscriptions")}>
                    <Text style={styles.drawerItemText}>🧾  Customer Subscriptions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/contact-us")}>
                    <Text style={styles.drawerItemText}>📥  Contact Inquiries</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/user-access")}>
                    <Text style={styles.drawerItemText}>🔒  Users & Access</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/general-settings")}>
                <Text style={styles.drawerItemText}>⚙️  General Settings</Text>
              </TouchableOpacity>
              {user?.loginType !== "customer" && (
                <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/system-logs")}>
                  <Text style={styles.drawerItemText}>📊  System Logs</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Box>
        </Box>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconBoxActive: {
    backgroundColor: "#eff6ff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalBackdropTouch: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginHorizontal: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
    maxHeight: "85%",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 4,
  },
  drawerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  drawerList: {
    marginBottom: 16,
  },
  drawerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  drawerItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  drawerItemArrow: {
    fontSize: 16,
    color: "#94a3b8",
    fontWeight: "700",
  },
  closeButton: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  closeButtonText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "700",
  },
});
