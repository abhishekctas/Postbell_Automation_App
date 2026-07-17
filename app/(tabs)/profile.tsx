import React, { useState, useEffect } from "react";
import {
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Platform,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { fetchWithAuth, API_ENDPOINTS } from "@/services/api";
import { Feather } from "@expo/vector-icons";

interface ProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  contact_no?: string;
  address?: string;
  role_name?: string;
}

function InfoRow({ label, value, editing, onChangeText, keyboardType, multiline }: {
  label: string; value: string; editing: boolean;
  onChangeText?: (v: string) => void; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <VStack space="xs" style={{ marginBottom: 12 }}>
      <Text style={styles.formLabel}>{label}</Text>
      {editing && onChangeText ? (
        <TextInput
          style={[styles.input, multiline && { minHeight: 72, textAlignVertical: "top" }]}
          value={value} onChangeText={onChangeText}
          keyboardType={keyboardType} multiline={multiline}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#94a3b8"
        />
      ) : (
        <Text style={styles.formValue}>{value || "—"}</Text>
      )}
    </VStack>
  );
}

export default function ProfileScreen() {
  const { user, signOut, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const uid = user?._id || user?.id;
        if (!uid) { setLoading(false); return; }
        const BASE = API_ENDPOINTS.profile.replace("/users", "");
        const res = await fetchWithAuth(`${BASE}/users/get-user/${uid}`);
        const data = res?.data || res;
        setFirstName(data?.first_name ?? user?.first_name ?? "");
        setLastName(data?.last_name ?? user?.last_name ?? "");
        setContactNo(String(data?.contact_no ?? user?.contact_no ?? ""));
        setAddress(data?.address ?? "");
      } catch {
        setFirstName(user?.first_name ?? "");
        setLastName(user?.last_name ?? "");
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const uid = user?._id || user?.id;
      if (!uid) return;
      const BASE = API_ENDPOINTS.profile.replace("/users", "");
      await fetchWithAuth(`${BASE}/users/update-user/${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ first_name: firstName, last_name: lastName, contact_no: contactNo, address }),
      });
      await updateUser({ first_name: firstName, last_name: lastName });
      setEditing(false);
      Alert.alert("Success", "Profile updated!");
    } catch { Alert.alert("Error", "Failed to update profile."); }
    finally { setSaving(false); }
  };

  const initials = `${firstName?.[0] ?? user?.first_name?.[0] ?? ""}${lastName?.[0] ?? user?.last_name?.[0] ?? ""}`.toUpperCase() || "KC";

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <Box style={styles.header}>
        <HStack className="justify-between items-center px-5 pt-14 pb-4">
          <Heading size="xl" style={{ color: "#fff", fontWeight: "700" }}>
            Profile
          </Heading>
          <TouchableOpacity onPress={() => Alert.alert("Settings", "App Settings coming soon")}>
            <Feather name="settings" size={22} color="#fff" />
          </TouchableOpacity>
        </HStack>
      </Box>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0052d4" />
        </Box>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Profile card */}
          <Box style={styles.profileCard}>
            <HStack space="md" className="items-center">
              {/* Initials Avatar with overlay badge */}
              <Box style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
                <TouchableOpacity style={styles.avatarBadge} activeOpacity={0.8}>
                  <Feather name="camera" size={12} color="#fff" />
                </TouchableOpacity>
              </Box>

              <VStack space="xs" style={{ flex: 1 }}>
                <Heading size="md" style={styles.nameText}>
                  {firstName} {lastName}
                </Heading>
                <Text style={styles.emailText}>{user?.email}</Text>
                <TouchableOpacity style={styles.viewProfileBtn} onPress={() => setEditing((e) => !e)}>
                  <Text style={styles.viewProfileText}>{editing ? "Hide Details" : "View Profile"}</Text>
                </TouchableOpacity>
              </VStack>
            </HStack>
          </Box>

          {/* Stats Box */}
          <Box style={styles.statsCard}>
            <HStack className="justify-around items-center">
              <VStack style={styles.statColumn} className="items-center">
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>Total Posts</Text>
              </VStack>
              <Box style={styles.statDivider} />
              <VStack style={styles.statColumn} className="items-center">
                <Text style={styles.statNumber}>8</Text>
                <Text style={styles.statLabel}>Scheduled</Text>
              </VStack>
              <Box style={styles.statDivider} />
              <VStack style={styles.statColumn} className="items-center">
                <Text style={styles.statNumber}>15.4K</Text>
                <Text style={styles.statLabel}>Reach</Text>
              </VStack>
            </HStack>
          </Box>

          {/* Settings Options List */}
          <VStack space="sm" style={{ marginBottom: 16 }}>
            {/* Social Accounts */}
            <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => Alert.alert("Social Accounts", "Manage connected platforms")}>
              <HStack space="md" className="items-center" style={{ flex: 1 }}>
                <Box style={[styles.menuIconBg, { backgroundColor: "#eff6ff" }]}>
                  <Feather name="globe" size={18} color="#0052d4" />
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>Social Accounts</Text>
                  <Text style={styles.menuSubtitle}>Manage connected platforms</Text>
                </VStack>
                <HStack className="items-center">
                  <Text style={styles.countText}>3</Text>
                  <Feather name="chevron-right" size={16} color="#94a3b8" style={{ marginLeft: 4 }} />
                </HStack>
              </HStack>
            </TouchableOpacity>

            {/* Notification Settings */}
            <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => Alert.alert("Notification Settings", "Manage notifications settings")}>
              <HStack space="md" className="items-center" style={{ flex: 1 }}>
                <Box style={[styles.menuIconBg, { backgroundColor: "#fef2f2" }]}>
                  <Feather name="bell" size={18} color="#ef4444" />
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>Notification Settings</Text>
                  <Text style={styles.menuSubtitle}>Manage your notifications</Text>
                </VStack>
                <Feather name="chevron-right" size={16} color="#94a3b8" />
              </HStack>
            </TouchableOpacity>

            {/* Account Settings */}
            <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => setEditing((e) => !e)}>
              <HStack space="md" className="items-center" style={{ flex: 1 }}>
                <Box style={[styles.menuIconBg, { backgroundColor: "#f0fdf4" }]}>
                  <Feather name="settings" size={18} color="#22c55e" />
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>Account Settings</Text>
                  <Text style={styles.menuSubtitle}>Update your profile and preferences</Text>
                </VStack>
                <Feather name="chevron-right" size={16} color="#94a3b8" />
              </HStack>
            </TouchableOpacity>

            {/* Subscription Plan */}
            <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => Alert.alert("Subscription Plan", "Subscription details screen")}>
              <HStack space="md" className="items-center" style={{ flex: 1 }}>
                <Box style={[styles.menuIconBg, { backgroundColor: "#faf5ff" }]}>
                  <Feather name="credit-card" size={18} color="#a855f7" />
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>Subscription Plan</Text>
                  <Text style={styles.menuSubtitle}>Manage your subscription</Text>
                </VStack>
                <Feather name="chevron-right" size={16} color="#94a3b8" />
              </HStack>
            </TouchableOpacity>

            {/* Help & Support */}
            <TouchableOpacity style={styles.menuRow} activeOpacity={0.7} onPress={() => Alert.alert("Help & Support", "Support contact details")}>
              <HStack space="md" className="items-center" style={{ flex: 1 }}>
                <Box style={[styles.menuIconBg, { backgroundColor: "#f6ffed" }]}>
                  <Feather name="help-circle" size={18} color="#52c41a" />
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.menuTitle}>Help & Support</Text>
                  <Text style={styles.menuSubtitle}>Get help and contact support</Text>
                </VStack>
                <Feather name="chevron-right" size={16} color="#94a3b8" />
              </HStack>
            </TouchableOpacity>

            {/* Log Out */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() => Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: signOut },
              ])}
            >
              <HStack space="md" className="items-center" style={{ flex: 1 }}>
                <Box style={[styles.menuIconBg, { backgroundColor: "#fff5f5" }]}>
                  <Feather name="log-out" size={18} color="#dc2626" />
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Text style={[styles.menuTitle, { color: "#dc2626" }]}>Log Out</Text>
                  <Text style={styles.menuSubtitle}>Sign out from your account</Text>
                </VStack>
              </HStack>
            </TouchableOpacity>
          </VStack>

          {/* Inline Editable Form Details */}
          {editing && (
            <Box style={styles.editCard}>
              <Heading size="sm" style={styles.editCardTitle}>Edit Personal Details</Heading>
              <VStack space="md">
                <InfoRow label="First Name" value={firstName} editing={editing} onChangeText={setFirstName} />
                <InfoRow label="Last Name" value={lastName} editing={editing} onChangeText={setLastName} />
                <InfoRow label="Email" value={user?.email ?? ""} editing={false} />
                <InfoRow label="Phone" value={contactNo} editing={editing} onChangeText={setContactNo} keyboardType="phone-pad" />
                <InfoRow label="Address" value={address} editing={editing} onChangeText={setAddress} multiline />
              </VStack>
              <Button size="lg" onPress={handleSave} isDisabled={saving} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#fff" /> : <ButtonText style={{ fontWeight: "700" }}>Save Changes</ButtonText>}
              </Button>
            </Box>
          )}

          {/* Footer version */}
          <Text style={styles.footerVersion}>PostBell v1.0.0</Text>
        </ScrollView>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0052d4",
    paddingBottom: 4,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0369a1",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0052d4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  nameText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  emailText: {
    fontSize: 12,
    color: "#64748b",
  },
  viewProfileBtn: {
    backgroundColor: "#0052d4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  viewProfileText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  statsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statColumn: {
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#e2e8f0",
  },
  menuRow: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  menuSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  countText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  editCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  editCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
    paddingVertical: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  saveBtn: {
    backgroundColor: "#0052d4",
    borderRadius: 12,
    marginTop: 12,
  },
  footerVersion: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "500",
  },
});
