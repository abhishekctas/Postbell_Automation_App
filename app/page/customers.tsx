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
import { LinearGradient } from "expo-linear-gradient";
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, Customer } from "./customers.api";
import { router } from "expo-router";

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [gender, setGender] = useState<number>(1); // 1 = Male, 2 = Female, 3 = Other
  const [dob, setDob] = useState("");
  const [status, setStatus] = useState<number>(1); // 1 = Active, 0 = Inactive

  const fetchCustomersList = useCallback(
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

        const res = await listCustomers(queryParams.toString());
        // Backend returns either { results, totalCount } or { data, pagination }
        const items = res?.results || res?.data || [];

        if (reset) {
          setCustomers(items);
        } else {
          setCustomers((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load customers.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search],
  );

  useEffect(() => {
    fetchCustomersList(1, true);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomersList(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchCustomersList(page + 1, false);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setContactNo("");
    setGender(1);
    setDob("");
    setStatus(1);
    setModalVisible(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFirstName(customer.first_name || "");
    setLastName(customer.last_name || "");
    setEmail(customer.email || "");
    setPassword("");
    setContactNo(customer.contact_no ? String(customer.contact_no) : "");
    setGender(customer.gender || 1);
    setDob(customer.dob || "");
    setStatus(customer.status ?? 1);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Validation Error", "First and last names are required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Validation Error", "Please enter a valid email.");
      return;
    }
    if (!editingCustomer && !password.trim()) {
      Alert.alert("Validation Error", "Password is required for new customers.");
      return;
    }

    try {
      const payload: any = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        contact_no: contactNo,
        gender: gender,
        dob: dob,
        status: status,
      };

      if (password.trim()) {
        payload.password = password;
      }

      if (editingCustomer) {
        await updateCustomer(editingCustomer._id || editingCustomer.id || "", payload);
        Alert.alert("Success", "Customer updated successfully!");
      } else {
        await createCustomer(payload);
        Alert.alert("Success", "Customer created successfully!");
      }

      setModalVisible(false);
      fetchCustomersList(1, true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save customer details.");
    }
  };

  const handleDelete = (customer: Customer) => {
    const id = customer._id || customer.id || "";
    Alert.alert("Delete Customer", `Are you sure you want to delete ${customer.first_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCustomer(id);
            Alert.alert("Success", "Customer deleted successfully.");
            setCustomers((prev) => prev.filter((c) => (c._id || c.id) !== id));
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete customer.");
          }
        },
      },
    ]);
  };

  const getGenderLabel = (g?: number) => {
    if (g === 1) return "Male";
    if (g === 2) return "Female";
    return "Other";
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => {
    const isAct = item.status === 1;

    return (
      <Box style={styles.card}>
        <HStack className="justify-between items-start">
          <VStack space="xs" style={{ flex: 1, marginRight: 8 }}>
            <Text className="text-typography-800 font-bold text-base">
              {item.first_name} {item.last_name}
            </Text>
            <Text className="text-typography-500 text-sm">{item.email}</Text>
            {item.contact_no ? <Text className="text-typography-400 text-xs">📞 {item.contact_no}</Text> : null}
            <HStack space="sm" className="mt-1 items-center">
              <Box style={styles.badge}>
                <Text style={styles.badgeText}>{getGenderLabel(item.gender)}</Text>
              </Box>
              {item.dob ? (
                <Text className="text-typography-400 text-xs">🎂 {item.dob}</Text>
              ) : null}
            </HStack>
          </VStack>
          <Box style={[styles.statusBadge, { backgroundColor: isAct ? "#dcfce7" : "#fee2e2" }]}>
            <Text style={{ color: isAct ? "#15803d" : "#dc2626", fontSize: 10, fontWeight: "700" }}>
              {isAct ? "Active" : "Inactive"}
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
  };

  return (
    <Box className="flex-1 bg-background-50">
      <LinearGradient colors={["#0f2444", "#193867"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <HStack className="justify-between items-center mb-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-white text-sm font-medium">← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Text style={styles.addBtnText}>+ Add Customer</Text>
            </TouchableOpacity>
          </HStack>
          <Heading size="xl" style={{ color: "#fff" }}>
            Customer Directory
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            Manage client accounts, registrations, and demographic records
          </Text>
        </Box>
      </LinearGradient>

      {/* Search Input */}
      <Box style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
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
          data={customers}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#193867" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">No customers found</Text>
            </Box>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} /> : null
          }
          renderItem={renderCustomerItem}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Heading size="md" className="mb-4">
              {editingCustomer ? "Edit Customer" : "Add Customer"}
            </Heading>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <VStack space="md">
                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>First Name *</Text>
                    <TextInput style={styles.modalInput} value={firstName} onChangeText={setFirstName} placeholder="First Name" />
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Last Name *</Text>
                    <TextInput style={styles.modalInput} value={lastName} onChangeText={setLastName} placeholder="Last Name" />
                  </VStack>
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Email Address"
                    editable={!editingCustomer}
                  />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>{editingCustomer ? "Reset Password" : "Password *"}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder={editingCustomer ? "Leave blank to keep same" : "Account Password"}
                  />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={contactNo}
                    onChangeText={setContactNo}
                    keyboardType="phone-pad"
                    placeholder="Phone number"
                  />
                </VStack>
                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Gender</Text>
                    <HStack space="xs">
                      {([1, 2, 3] as const).map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                          onPress={() => setGender(g)}
                        >
                          <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                            {g === 1 ? "M" : g === 2 ? "F" : "O"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </HStack>
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>DOB (YYYY-MM-DD)</Text>
                    <TextInput style={styles.modalInput} value={dob} onChangeText={setDob} placeholder="e.g. 1995-10-24" />
                  </VStack>
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Status *</Text>
                  <HStack space="sm">
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 1 && styles.statusToggleBtnActive]}
                      onPress={() => setStatus(1)}
                    >
                      <Text style={[styles.statusToggleText, status === 1 && styles.statusToggleTextActive]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 0 && styles.statusToggleBtnActiveDanger]}
                      onPress={() => setStatus(0)}
                    >
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
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  filterSection: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  badge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 10, fontWeight: "600", color: "#475569" },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionBtn: {
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  actionBtnDanger: {
    backgroundColor: "#fff5f5",
    borderColor: "#fecaca",
  },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#193867" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  label: { fontSize: 11, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  genderBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  genderBtnActive: {
    backgroundColor: "#e0f2fe",
    borderColor: "#7dd3fc",
  },
  genderText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  genderTextActive: { color: "#0369a1" },
  statusToggleBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  statusToggleBtnActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  statusToggleBtnActiveDanger: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
  },
  statusToggleText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  statusToggleTextActive: { color: "#15803d" },
  statusToggleTextActiveDanger: { color: "#dc2626" },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
  },
  cancelBtnText: { color: "#475569", fontWeight: "700", fontSize: 14 },
});
