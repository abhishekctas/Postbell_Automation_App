import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
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
import { listUsers, createUser, updateUser, deleteUser, getRoles, User, Role } from "./user-access.api";

export default function UsersManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [status, setStatus] = useState<number>(1);

  const fetchRolesList = async () => {
    try {
      const r = await getRoles();
      setRoles(r);
    } catch (e) {
      console.log("Failed to fetch roles:", e);
    }
  };

  const fetchUsersList = useCallback(
    async (pg = 1, reset = true) => {
      if (reset) setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: "10",
        });
        if (search.trim()) {
          queryParams.append("search", search.trim());
        }

        const res = await listUsers(queryParams.toString());
        const items = res?.results || [];

        if (reset) {
          setUsers(items);
        } else {
          setUsers((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load users.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search],
  );

  useEffect(() => {
    fetchRolesList();
    fetchUsersList(1, true);
  }, [fetchUsersList]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsersList(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchUsersList(page + 1, false);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setContactNo("");
    setSelectedRole(roles[0] || null);
    setStatus(1);
    setModalVisible(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFirstName(user.first_name || "");
    setLastName(user.last_name || "");
    setEmail(user.email || "");
    setPassword("");
    setContactNo(user.contact_no ? String(user.contact_no) : "");
    const matchingRole = roles.find((r) => r.name === user.role_name || r._id === user.role_id);
    setSelectedRole(matchingRole || null);
    setStatus(user.status ?? 1);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Validation Error", "First and last names are required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Validation Error", "Please enter a valid email address.");
      return;
    }
    if (!editingUser && !password.trim()) {
      Alert.alert("Validation Error", "Password is required for new users.");
      return;
    }

    try {
      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        contact_no: contactNo.trim(),
        status,
        role_id: selectedRole?._id,
      };

      if (password.trim()) {
        payload.password = password;
      }

      if (editingUser) {
        await updateUser(editingUser._id || editingUser.id || "", payload);
        Alert.alert("Success", "User updated successfully!");
      } else {
        await createUser(payload);
        Alert.alert("Success", "User created successfully!");
      }

      setModalVisible(false);
      fetchUsersList(1, true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save user.");
    }
  };

  const handleDelete = (user: User) => {
    const id = user._id || user.id || "";
    Alert.alert("Delete User", `Are you sure you want to delete ${user.first_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteUser(id);
            Alert.alert("Success", "User deleted successfully.");
            setUsers((prev) => prev.filter((u) => (u._id || u.id) !== id));
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete user.");
          }
        },
      },
    ]);
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <Box style={styles.userCard}>
      <HStack className="justify-between items-start">
        <VStack space="xs" style={{ flex: 1, marginRight: 8 }}>
          <Text className="text-typography-800 font-bold text-base">
            {item.first_name} {item.last_name}
          </Text>
          <Text className="text-typography-500 text-sm">{item.email}</Text>
          {item.contact_no ? <Text className="text-typography-400 text-xs">📞 {item.contact_no}</Text> : null}
          <Box style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{item.role_name || "No Role"}</Text>
          </Box>
        </VStack>
        <Box style={[styles.statusBadge, { backgroundColor: item.status === 1 ? "#dcfce7" : "#fee2e2" }]}>
          <Text style={{ color: item.status === 1 ? "#15803d" : "#dc2626", fontSize: 10, fontWeight: "700" }}>
            {item.status === 1 ? "Active" : "Inactive"}
          </Text>
        </Box>
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
  );

  return (
    <Box className="flex-1 bg-background-50">
      <Box style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </Box>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#193867" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">No users found</Text>
            </Box>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} /> : null}
          renderItem={renderUserItem}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Heading size="md" className="mb-4">
              {editingUser ? "Edit User" : "Add User"}
            </Heading>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput style={styles.modalInput} value={firstName} onChangeText={setFirstName} placeholder="First Name" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Last Name *</Text>
                  <TextInput style={styles.modalInput} value={lastName} onChangeText={setLastName} placeholder="Last Name" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Email address"
                    editable={!editingUser}
                  />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>{editingUser ? "Reset Password" : "Password *"}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder={editingUser ? "Leave blank to keep same" : "Account password"}
                  />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={contactNo}
                    onChangeText={setContactNo}
                    keyboardType="phone-pad"
                    placeholder="Contact number"
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Role *</Text>
                  <TouchableOpacity style={styles.roleSelectBtn} onPress={() => setShowRoleSelect(true)}>
                    <Text style={styles.roleSelectText}>{selectedRole ? selectedRole.name : "Select Role"}</Text>
                  </TouchableOpacity>
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Status *</Text>
                  <HStack space="sm">
                    <TouchableOpacity style={[styles.statusToggleBtn, status === 1 && styles.statusToggleBtnActive]} onPress={() => setStatus(1)}>
                      <Text style={[styles.statusToggleText, status === 1 && styles.statusToggleTextActive]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statusToggleBtn, status === 0 && styles.statusToggleBtnActiveDanger]} onPress={() => setStatus(0)}>
                      <Text style={[styles.statusToggleText, status === 0 && styles.statusToggleTextActiveDanger]}>Inactive</Text>
                    </TouchableOpacity>
                  </HStack>
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

      <Modal visible={showRoleSelect} transparent animationType="fade" onRequestClose={() => setShowRoleSelect(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={[styles.modalContainer, { maxWidth: 300 }]}> 
            <Heading size="sm" className="mb-4">
              Select Role
            </Heading>
            <FlatList
              data={roles}
              keyExtractor={(r) => r._id || r.id || `role-${Math.random()}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.roleSelectItem}
                  onPress={() => {
                    setSelectedRole(item);
                    setShowRoleSelect(false);
                  }}
                >
                  <Text style={styles.roleSelectText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeSelectBtn} onPress={() => setShowRoleSelect(false)}>
              <Text style={{ fontWeight: "700", color: "#64748b" }}>Close</Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </Modal>

      <Box style={styles.fabWrap}>
        <TouchableOpacity style={styles.fab} onPress={handleOpenAdd}>
          <Text style={styles.fabText}>+ Add User</Text>
        </TouchableOpacity>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  filterSection: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  listContent: { padding: 16, paddingBottom: 100 },
  userCard: {
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
  roleBadge: { alignSelf: "flex-start", backgroundColor: "#eff6ff", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  roleBadgeText: { color: "#1d4ed8", fontWeight: "700", fontSize: 11 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
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
  modalInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  roleSelectBtn: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
  },
  roleSelectText: { color: "#1e293b", fontWeight: "600" },
  statusToggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  statusToggleBtnActive: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  statusToggleBtnActiveDanger: { backgroundColor: "#fee2e2", borderColor: "#fda4af" },
  statusToggleText: { color: "#64748b", fontWeight: "700" },
  statusToggleTextActive: { color: "#15803d" },
  statusToggleTextActiveDanger: { color: "#dc2626" },
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
  roleSelectItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  closeSelectBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  fabWrap: { position: "absolute", right: 16, bottom: 16 },
  fab: { backgroundColor: "#193867", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  fabText: { color: "#fff", fontWeight: "700" },
});
