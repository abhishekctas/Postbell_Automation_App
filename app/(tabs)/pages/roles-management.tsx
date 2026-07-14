import React, { useEffect, useState } from "react";
import {
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { getRoles, createRole, updateRole, deleteRole, Role } from "./user-access.api";

export default function RolesManagementScreen() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await getRoles();
      setRoles(data);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenAdd = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setModalVisible(true);
  };

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name || "");
    setRoleDescription((role as any).description || "");
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!roleName.trim()) {
      Alert.alert("Validation Error", "Role name is required.");
      return;
    }

    try {
      const payload: Partial<Role> & { description?: string } = {
        name: roleName.trim(),
        description: roleDescription.trim(),
      };

      if (editingRole) {
        const roleId = editingRole._id || editingRole.id || "";
        await updateRole(roleId, payload);
        Alert.alert("Success", "Role updated successfully.");
      } else {
        await createRole(payload);
        Alert.alert("Success", "Role created successfully.");
      }

      setModalVisible(false);
      fetchRoles();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save role.");
    }
  };

  const handleDelete = (role: Role) => {
    Alert.alert("Delete Role", `Delete the role “${role.name}”?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const roleId = role._id || role.id || "";
            await deleteRole(roleId);
            Alert.alert("Success", "Role deleted successfully.");
            setRoles((prev) => prev.filter((item) => (item._id || item.id || "") !== roleId));
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete role.");
          }
        },
      },
    ]);
  };

  return (
    <Box className="flex-1 bg-background-50">
      <Box style={styles.headerWrap}>
        <Text style={styles.headerText}>Manage roles and permission groups for your staff.</Text>
      </Box>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <FlatList
          data={roles}
          keyExtractor={(item) => item._id || item.id || `role-${Math.random()}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">No roles found</Text>
            </Box>
          }
          renderItem={({ item }) => (
            <Box style={styles.card}>
              <HStack className="justify-between items-start">
                <VStack space="xs" style={{ flex: 1, marginRight: 8 }}>
                  <Text className="text-typography-900 font-bold text-base">{item.name}</Text>
                  <Text className="text-typography-500 text-sm">{(item as any).description || "No description provided."}</Text>
                </VStack>
              </HStack>
              <HStack space="sm" className="mt-4 justify-end">
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
                  <Text style={styles.actionBtnText}>✏ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item)}>
                  <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>🗑 Delete</Text>
                </TouchableOpacity>
              </HStack>
            </Box>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Heading size="md" className="mb-4">
              {editingRole ? "Edit Role" : "Add Role"}
            </Heading>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Role Name *</Text>
                  <TextInput style={styles.input} value={roleName} onChangeText={setRoleName} placeholder="e.g. Admin" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 80 }]}
                    value={roleDescription}
                    onChangeText={setRoleDescription}
                    multiline
                    placeholder="Short description of the role"
                  />
                </VStack>
              </VStack>
            </ScrollView>

            <HStack space="sm" className="mt-6">
              <Button style={{ flex: 1 }} className="bg-primary-700 rounded-xl" onPress={handleSave}>
                <ButtonText>Save</ButtonText>
              </Button>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </HStack>
          </Box>
        </Box>
      </Modal>

      <Box style={styles.fabWrap}>
        <TouchableOpacity style={styles.fab} onPress={handleOpenAdd}>
          <Text style={styles.fabText}>+ Add Role</Text>
        </TouchableOpacity>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerText: { color: "#64748b", fontSize: 13 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
  },
  actionBtnDanger: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  actionBtnText: { color: "#334155", fontSize: 12, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  label: { fontSize: 11, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { color: "#475569", fontWeight: "700" },
  fabWrap: { position: "absolute", right: 16, bottom: 16 },
  fab: { backgroundColor: "#193867", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  fabText: { color: "#fff", fontWeight: "700" },
});
