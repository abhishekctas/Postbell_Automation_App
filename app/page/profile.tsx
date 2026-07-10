import React, { useState, useEffect } from "react";
import {
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import { fetchWithAuth, API_ENDPOINTS } from "@/utils/api";
import { LinearGradient } from "expo-linear-gradient";

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
    <VStack space="xs">
      <Text style={styles.label}>{label}</Text>
      {editing && onChangeText ? (
        <TextInput
          style={[styles.input, multiline && { minHeight: 72, textAlignVertical: "top" }]}
          value={value} onChangeText={onChangeText}
          keyboardType={keyboardType} multiline={multiline}
        />
      ) : (
        <Text className="text-typography-800 text-sm font-medium">{value || "—"}</Text>
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

  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() || "U";

  return (
    <Box className="flex-1 bg-background-50">
      <LinearGradient colors={["#0f2444", "#193867"]} style={styles.header}>
        <VStack className="items-center px-5 pt-14 pb-8" space="sm">
          <Box style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </Box>
          <Heading size="lg" style={{ color: "#fff", marginTop: 8 }}>
            {user?.first_name} {user?.last_name}
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{user?.email}</Text>
          {user?.role_name && (
            <Box style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role_name}</Text>
            </Box>
          )}
          {user?.isSuperAdmin && (
            <Box style={[styles.roleBadge, { backgroundColor: "rgba(253,224,71,0.25)" }]}>
              <Text style={[styles.roleText, { color: "#fde047" }]}>⭐ Super Admin</Text>
            </Box>
          )}
        </VStack>
      </LinearGradient>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Box style={styles.card}>
            <HStack className="justify-between items-center mb-4">
              <Heading size="sm" className="text-typography-800">Personal Details</Heading>
              <TouchableOpacity onPress={() => setEditing((e) => !e)}>
                <Text className="text-primary-700 font-semibold text-sm">{editing ? "Cancel" : "✏ Edit"}</Text>
              </TouchableOpacity>
            </HStack>
            <VStack space="md">
              <InfoRow label="First Name" value={firstName} editing={editing} onChangeText={setFirstName} />
              <InfoRow label="Last Name" value={lastName} editing={editing} onChangeText={setLastName} />
              <InfoRow label="Email" value={user?.email ?? ""} editing={false} />
              <InfoRow label="Phone" value={contactNo} editing={editing} onChangeText={setContactNo} keyboardType="phone-pad" />
              <InfoRow label="Address" value={address} editing={editing} onChangeText={setAddress} multiline />
            </VStack>
            {editing && (
              <Button size="lg" onPress={handleSave} isDisabled={saving} className="bg-primary-700 rounded-xl mt-5">
                {saving ? <ActivityIndicator color="#fff" /> : <ButtonText>Save Changes</ButtonText>}
              </Button>
            )}
          </Box>

          <TouchableOpacity style={styles.signOutBtn}
            onPress={() => Alert.alert("Sign Out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: signOut },
            ])}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  avatarCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  roleBadge: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#1e293b", backgroundColor: "#f8fafc" },
  signOutBtn: { backgroundColor: "#fee2e2", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#fca5a5" },
  signOutText: { color: "#dc2626", fontWeight: "700", fontSize: 15 },
});
