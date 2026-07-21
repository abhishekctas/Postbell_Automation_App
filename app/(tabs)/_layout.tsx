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
  DeviceEventEmitter,
} from "react-native";
import { Box } from "@/components/ui/box";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";

function TabIcon({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  return (
    <View style={{ opacity: focused ? 1 : 0.5 }}>
      <Text style={{ fontSize: 22 }}>{children}</Text>
    </View>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  const handleTabPress = (tabIndex: number) => {
    if (tabIndex === 0) {
      navigation.navigate("index");
    } else if (tabIndex === 1) {
      navigation.navigate("posts");
    } else if (tabIndex === 2) {
      // Navigate to posts tab with search parameter to add post
      router.push("/posts?action=add");
    } else if (tabIndex === 3) {
      navigation.navigate("profile");
    } else if (tabIndex === 4) {
      // Open drawer menu
      DeviceEventEmitter.emit("toggleDrawer");
    }
  };

  const getIsActive = (tabIndex: number) => {
    if (tabIndex === 0) return state.index === 0;
    if (tabIndex === 1) return state.index === 1;
    if (tabIndex === 3) return state.index === 2; // profile is route index 2 in state.routes
    return false;
  };

  const activeColor = "#0b53f8";
  const inactiveColor = "#80889B";

  return (
    <View style={[
      styles.tabBarContainer,
      {
        bottom: Platform.OS === "ios" ? insets.bottom / 2 + 8 : 4,
        paddingBottom: Platform.OS === "ios" ? insets.bottom / 2 : 0,
      }
    ]}>
      {/* Tab 0: Dashboard */}
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => handleTabPress(0)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={getIsActive(0) ? "home" : "home-outline"}
          size={22}
          color={getIsActive(0) ? activeColor : inactiveColor}
        />
        <Text style={[styles.tabLabel, { color: getIsActive(0) ? activeColor : inactiveColor }]}>
          Dashboard
        </Text>
      </TouchableOpacity>

      {/* Tab 1: Posts */}
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => handleTabPress(1)}
        activeOpacity={0.7}
      >
        <Feather
          name="file-text"
          size={21}
          color={getIsActive(1) ? activeColor : inactiveColor}
        />
        <Text style={[styles.tabLabel, { color: getIsActive(1) ? activeColor : inactiveColor }]}>
          Posts
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Floating Plus Button */}
      <View style={styles.plusButtonOuter}>
        <TouchableOpacity
          style={styles.plusButton}
          onPress={() => handleTabPress(2)}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Tab 3: Profile */}
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => handleTabPress(3)}
        activeOpacity={0.7}
      >
        <Feather
          name="user"
          size={21}
          color={getIsActive(3) ? activeColor : inactiveColor}
        />
        <Text style={[styles.tabLabel, { color: getIsActive(3) ? activeColor : inactiveColor }]}>
          Profile
        </Text>
      </TouchableOpacity>

      {/* Tab 4: Menu */}
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => handleTabPress(4)}
        activeOpacity={0.7}
      >
        <Feather
          name="menu"
          size={22}
          color={inactiveColor}
        />
        <Text style={[styles.tabLabel, { color: inactiveColor }]}>
          Menu
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("toggleDrawer", () => {
      setDrawerOpen(true);
    });
    return () => sub.remove();
  }, []);

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
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
          }}
        />
        <Tabs.Screen
          name="posts"
          options={{
            title: "Posts",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: "Menu",
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
              <TouchableOpacity
                onPress={() => setDrawerOpen(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </Box>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.drawerList}>
              <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/festivalAutoPost/festival-auto-post")}>
                <Text style={styles.drawerItemText}>📅  Festival Auto Posts</Text>
              </TouchableOpacity>
              {user?.loginType !== "customer" && (
                <>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/blogs/blogs")}>
                    <Text style={styles.drawerItemText}>✍️  Blog Management</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/features/features")}>
                    <Text style={styles.drawerItemText}>⚡  Features</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/subscriptionPlans/subscription-plans")}>
                    <Text style={styles.drawerItemText}>💳  Subscription Plans</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/customers/customers")}>
                    <Text style={styles.drawerItemText}>👥  Customers</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/customerSubscription/customer-subscriptions")}>
                    <Text style={styles.drawerItemText}>🧾  Customer Subscriptions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/contactUs/contact-us")}>
                    <Text style={styles.drawerItemText}>📥  Contact </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/userList/user-access")}>
                    <Text style={styles.drawerItemText}>🔒  Users & Access</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/generalSetting/general-settings")}>
                <Text style={styles.drawerItemText}>⚙️  General Settings</Text>
              </TouchableOpacity>
              {user?.loginType !== "customer" && (
                <TouchableOpacity style={styles.drawerItem} onPress={() => handleNavigate("/pages/systemLogs/system-logs")}>
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
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    height: 70,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    position: "absolute",
    left: 12,
    right: 12,
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    zIndex: 9999,
    elevation: 12,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  plusButtonOuter: {
    width: 68,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -5,
  },
  plusButton: {
    width: 48,
    height: 48,
    borderRadius: 27,
    backgroundColor: "#0b53f8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0b53f8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
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
