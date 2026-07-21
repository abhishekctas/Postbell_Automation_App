import React, { useState } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import UsersManagementScreen from "./users-management";
import RolesManagementScreen from "../roleList/roles-management";

export default function UserAccessScreen() {
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <HStack className="justify-between items-center mb-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-white text-sm font-medium">← Back</Text>
            </TouchableOpacity>
          </HStack>
          <Heading size="xl" style={{ color: "#fff" }}>
            Users & Access
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            Manage staff members and assign permission roles
          </Text>
        </Box>
      </LinearGradient>

      <Box style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === "users" && styles.tabActive]} onPress={() => setActiveTab("users")}>
          <Text style={[styles.tabText, activeTab === "users" && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === "roles" && styles.tabActive]} onPress={() => setActiveTab("roles")}>
          <Text style={[styles.tabText, activeTab === "roles" && styles.tabTextActive]}>Roles</Text>
        </TouchableOpacity>
      </Box>

      {activeTab === "users" ? <UsersManagementScreen /> : <RolesManagementScreen />}
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: "#fff",
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  tabActive: { backgroundColor: "#193867", borderColor: "#193867" },
  tabText: { color: "#475569", fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
});
