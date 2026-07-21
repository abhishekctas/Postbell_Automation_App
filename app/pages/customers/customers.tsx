import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  ScrollView,
  View
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { LinearGradient } from "expo-linear-gradient";
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, type Customer } from "./customers.api";
import { router } from "expo-router";
import HtmlTable, { type HtmlTableColumn } from "@/components/HtmlTable";
import { Feather } from "@expo/vector-icons";

const CUSTOMER_TABLE_COLUMNS: HtmlTableColumn[] = [
  {
    key: "first_name",
    label: "Name",
    width: "180px",
    render: (_v, row) => `${row.first_name || ""} ${row.last_name || ""}`.trim(),
  },
  {
    key: "email",
    label: "Email",
    width: "180px",
  },
  {
    key: "contact_no",
    label: "Contact",
    width: "120px",
    render: (v) => (v ? String(v) : "—"),
  },
  {
    key: "gender",
    label: "Gender",
    width: "80px",
    render: (v) => (v === 1 ? "Male" : v === 2 ? "Female" : "Other"),
  },
  {
    key: "status",
    label: "Status",
    width: "100px",
    render: (v) => {
      const isAct = v === 1;
      const bg = isAct ? "#dcfce7" : "#fee2e2";
      const color = isAct ? "#15803d" : "#dc2626";
      return `<span style="display:inline-block;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:700;background:${bg};color:${color};">${isAct ? "Active" : "Inactive"}</span>`;
    },
  },
];

const CUSTOMER_ROW_ACTIONS = [
  { label: "Edit", action: "edit" },
  { label: "Delete", action: "delete", style: "danger" },
];

const AVATAR_COLORS = [
  { bg: "#dbeafe", text: "#1d4ed8" },
  { bg: "#ede9fe", text: "#6d28d9" },
  { bg: "#ffedd5", text: "#c2410c" },
  { bg: "#f3e8ff", text: "#7e22ce" },
  { bg: "#ccfbf1", text: "#0f766e" },
  { bg: "#fef9c3", text: "#a16207" },
];

const getAvatarColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < (seed || "").length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const getGenderLabelStatic = (g?: number) => {
  if (g === 1) return "Male";
  if (g === 2) return "Female";
  return "Other";
};

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
  const [showPassword, setShowPassword] = useState(false);

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
          setCustomers((prev: any) => [...prev, ...items]);
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

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
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
    setShowPassword(false);
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
            setCustomers((prev: any) => prev.filter((c: any) => (c._id || c.id) !== id));
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

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-6">
          <HStack className="justify-between items-center mb-3">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-white text-sm font-medium">← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Text style={styles.addBtnText}>+ Add Customer</Text>
            </TouchableOpacity>
          </HStack>
          <HStack className="justify-between items-start">
            <VStack style={{ flex: 1 }}>
              <Heading size="xl" style={{ color: "#fff" }}>
                Customer
              </Heading>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 }}>
                Manage client accounts, registrations, and demographic records
              </Text>
            </VStack>
            <Box style={styles.headerIconBox}>
              <Feather name="users" size={26} color="#fff" />
            </Box>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Search Input */}
      <Box style={styles.filterSection}>
        <HStack space="sm" className="items-center">
          <Box style={{ flex: 1, position: "relative", justifyContent: "center" }}>
            <View pointerEvents="none" style={styles.searchIcon}>
              <Feather
                name="search"
                size={16}
                color="#94a3b8"
              />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search customers..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </Box>
          <TouchableOpacity style={styles.filterBtn}>
            <Feather name="sliders" size={16} color="#2563EB" />
          </TouchableOpacity>
        </HStack>
      </Box>
      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#193867" />
          }
        >
          {customers.length === 0 ? (
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">No customers found</Text>
            </Box>
          ) : (
            // Horizontal scroll so all 6 columns fit on mobile without squeezing
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginHorizontal: -16 }}>
              <Box style={[styles.tableCard, { width: 780, marginHorizontal: 16 }]}>
                {/* Header row — one column per field, screenshot-style caps labels */}
                <HStack style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderText, { width: 190 }]}>CUSTOMER</Text>
                  <Text style={[styles.tableHeaderText, { width: 190 }]}>EMAIL</Text>
                  <Text style={[styles.tableHeaderText, { width: 120 }]}>CONTACT</Text>
                  <Text style={[styles.tableHeaderText, { width: 90 }]}>GENDER</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>STATUS</Text>
                  <Text style={[styles.tableHeaderText, { textAlign: "center" }]}>
                    ACTIONS
                  </Text>
                </HStack>

                {customers.map((c) => {
                  const id = c._id || c.id || "";
                  const initials = `${(c.first_name || "").charAt(0)}${(c.last_name || "").charAt(
                    0,
                  )}`.toUpperCase();
                  const isActive = c.status === 1;
                  const avatarColor = getAvatarColor(id || c.email || c.first_name || "x");

                  return (
                    <HStack key={id} style={styles.customerRow}>
                      {/* Column 1: Avatar + Name */}
                      <HStack space="sm" className="items-center" style={{ width: 190 }}>
                        <Box style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
                          <Text style={[styles.avatarText, { color: avatarColor.text }]}>
                            {initials}
                          </Text>
                        </Box>
                        <Text style={styles.customerName} numberOfLines={1}>
                          {c.first_name} {c.last_name}
                        </Text>
                      </HStack>

                      {/* Column 2: Email */}
                      <Text style={[styles.cellText, { width: 190 }]} numberOfLines={1}>
                        {c.email}
                      </Text>

                      {/* Column 3: Contact */}
                      <Text style={[styles.cellText, { width: 120 }]} numberOfLines={1}>
                        {c.contact_no ? String(c.contact_no) : "—"}
                      </Text>

                      {/* Column 4: Gender */}
                      <Text style={[styles.cellText, { width: 90 }]} numberOfLines={1}>
                        {getGenderLabel(c.gender)}
                      </Text>

                      {/* Column 5: Status pill — screenshot style */}
                      <Box style={{ width: 100 }}>
                        <HStack
                          style={[
                            styles.statusPill,
                            { backgroundColor: isActive ? "#dcfce7" : "#fee2e2" },
                          ]}
                        >
                          <Box
                            style={[
                              styles.statusDot,
                              { backgroundColor: isActive ? "#16a34a" : "#dc2626" },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusPillText,
                              { color: isActive ? "#15803d" : "#dc2626" },
                            ]}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </Text>
                        </HStack>
                      </Box>

                      {/* Column 6: Actions — rounded icon buttons */}
                      <HStack space="xs" style={{ justifyContent: "center" }}>
                        <TouchableOpacity
                          style={styles.iconBtnEdit}
                          onPress={() => handleOpenEdit(c)}
                        >
                          <Feather name="edit-2" size={14} color="#2563EB" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconBtnDelete}
                          onPress={() => handleDelete(c)}
                        >
                          <Feather name="trash-2" size={14} color="#dc2626" />
                        </TouchableOpacity>
                      </HStack>
                    </HStack>
                  );
                })}
              </Box>
            </ScrollView>
          )}
          {loadingMore && (
            <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} />
          )}

          {customers.length > 0 && (
            <HStack style={styles.paginationBar} space="xs">
              <TouchableOpacity
                style={[styles.pageArrowBtn, page <= 1 && styles.pageBtnDisabled]}
                disabled={page <= 1}
                onPress={() => fetchCustomersList(page - 1, true)}
              >
                <Feather name="chevron-left" size={16} color={page <= 1 ? "#cbd5e1" : "#2563EB"} />
              </TouchableOpacity>

              {/* {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.pageNumBtn, page === p && styles.pageNumBtnActive]}
                    onPress={() => fetchCustomersList(p, true)}
                  >
                    <Text style={[styles.pageNumText, page === p && styles.pageNumTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })} */}

              <TouchableOpacity
                style={[styles.pageArrowBtn, !hasMore && styles.pageBtnDisabled]}
                disabled={!hasMore}
                onPress={() => fetchCustomersList(page + 1, true)}
              >
                <Feather name="chevron-right" size={16} color={!hasMore ? "#cbd5e1" : "#2563EB"} />
              </TouchableOpacity>
            </HStack>
          )}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            {/* Modal header, blue accent like screenshot */}
            <HStack className="items-center mb-1" space="sm">
              <Box style={styles.modalHeaderIcon}>
                <Feather name={editingCustomer ? "edit-2" : "user-plus"} size={16} color="#fff" />
              </Box>
              <VStack>
                <Heading size="md" style={{ color: "#1e3a8a" }}>
                  {editingCustomer ? "Edit Customer" : "Add Customer"}
                </Heading>
                <Text style={{ fontSize: 12, color: "#64748b" }}>
                  {editingCustomer
                    ? "Update customer account details"
                    : "Create a new customer account and add details"}
                </Text>
              </VStack>
            </HStack>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420, marginTop: 12 }}>
              <VStack space="md">
                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>First Name *</Text>
                    <HStack style={styles.inputWrap}>
                      <View pointerEvents="none" style={styles.inputIcon}>
                        <Feather name="user" size={15} color="#2563EB" />
                      </View>
                      <TextInput
                        style={styles.modalInput}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="First Name"
                        placeholderTextColor="#94a3b8"
                      />
                    </HStack>
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Last Name *</Text>
                    <HStack style={styles.inputWrap}>
                      <View pointerEvents="none" style={styles.inputIcon}>
                        <Feather name="user" size={15} color="#2563EB" />
                      </View>
                      <TextInput
                        style={styles.modalInput}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Last Name"
                        placeholderTextColor="#94a3b8"
                      />
                    </HStack>
                  </VStack>
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Email *</Text>
                  <HStack style={styles.inputWrap}>
                    <View pointerEvents="none" style={styles.inputIcon}>
                      <Feather name="mail" size={15} color="#2563EB" />
                    </View>
                    <TextInput
                      style={styles.modalInput}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="Email Address"
                      placeholderTextColor="#94a3b8"
                      editable={!editingCustomer}
                    />
                  </HStack>
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>{editingCustomer ? "Reset Password" : "Password *"}</Text>
                  <HStack style={styles.inputWrap}>
                    <View pointerEvents="none" style={styles.inputIcon}>
                      <Feather name="lock" size={15} color="#2563EB" />
                    </View>
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }]}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholder={editingCustomer ? "Leave blank to keep same" : "Account Password"}
                      placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((s: any) => !s)}
                      style={{ paddingHorizontal: 10 }}
                    >
                      <Feather name={showPassword ? "eye-off" : "eye"} size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </HStack>
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Contact Number</Text>
                  <HStack style={styles.inputWrap}>
                    <View pointerEvents="none" style={styles.inputIcon}>
                      <Feather name="phone" size={15} color="#2563EB" />
                    </View>
                    <TextInput
                      style={styles.modalInput}
                      value={contactNo}
                      onChangeText={setContactNo}
                      keyboardType="phone-pad"
                      placeholder="Phone number"
                      placeholderTextColor="#94a3b8"
                    />
                  </HStack>
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
                            {g === 1 ? "Male" : g === 2 ? "Female" : "Other"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </HStack>
                  </VStack>
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>DOB (YYYY-MM-DD)</Text>
                  <HStack style={styles.inputWrap}>
                    <View pointerEvents="none" style={styles.inputIcon}>
                      <Feather name="calendar" size={15} color="#2563EB" />
                    </View>
                    <TextInput
                      style={styles.modalInput}
                      value={dob}
                      onChangeText={setDob}
                      placeholder="e.g. 1995-10-24"
                      placeholderTextColor="#94a3b8"
                    />
                  </HStack>
                </VStack>

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

                <HStack style={styles.infoBox} space="sm">
                  <Feather name="info" size={14} color="#2563EB" />
                  <Text style={{ fontSize: 12, color: "#1e40af", flex: 1 }}>
                    All fields marked with * are required.
                  </Text>
                </HStack>
              </VStack>
            </ScrollView>

            <HStack space="sm" className="mt-6">
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <View pointerEvents="none" style={{ marginRight: 8 }}>
                  <Feather name="save" size={15} color="#fff" />
                </View>
                <Text style={styles.saveBtnText}>
                  {editingCustomer ? "Save Changes" : "Save Customer"}
                </Text>
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
  headerIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  filterSection: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  searchIcon: { position: "absolute", left: 12, zIndex: 1 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingLeft: 36,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  listContent: { padding: 16, paddingBottom: 40 },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  tableHeaderRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableHeaderText: { fontSize: 11, fontWeight: "700", color: "#64748b", letterSpacing: 0.5 },
  customerRow: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "700" },
  customerName: { fontSize: 13, fontWeight: "700", color: "#1e293b", flexShrink: 1 },
  cellText: { fontSize: 13, color: "#475569" },
  statusPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusPillText: { fontSize: 12, fontWeight: "700" },
  iconBtnEdit: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  iconBtnDelete: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  paginationBar: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  pageArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageNumBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  pageNumBtnActive: { backgroundColor: "#2563EB" },
  pageNumText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  pageNumTextActive: { color: "#fff" },
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
  modalHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 11, fontWeight: "700", color: "#2563EB", textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  inputIcon: { marginRight: 6 },
  modalInput: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
  },
  genderBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  genderBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  genderText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  genderTextActive: { color: "#fff" },
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
  infoBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 12,
  },
  cancelBtnText: { color: "#475569", fontWeight: "700", fontSize: 14 },
  saveBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});