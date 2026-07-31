import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  ScrollView,
  View,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  type Customer,
} from './customers.api';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import HtmlTable, { HtmlTableColumn } from '@/components/HtmlTable';

const CUSTOMER_TABLE_COLUMNS: HtmlTableColumn<Customer>[] = [
  {
    key: 'createdAt',
    label: 'Created At',
    width: '150px',
    render: (v, row) => {
      const val = v || row.updatedAt;
      if (!val) return '—';
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const dateStr = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return (
        <VStack style={{ justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>{dateStr}</Text>
          <Text style={{ fontSize: 11, color: '#64748b' }}>{timeStr}</Text>
        </VStack>
      );
    },
  },
  {
    key: 'first_name',
    label: 'Customer',
    width: '200px',
    render: (_v, row) => {
      const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown';
      const initials =
        name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w.charAt(0).toUpperCase())
          .join('') || 'CU';
      const bgColors = ['#dbeafe', '#e9d5ff', '#ffedd5', '#ccfbf1', '#fef3c7'];
      const textColors = ['#1e40af', '#6b21a8', '#c2410c', '#0f766e', '#b45309'];
      const charCode = name.charCodeAt(0) || 0;
      const colorIdx = charCode % bgColors.length;
      return (
        <HStack space="sm" className="items-center">
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: bgColors[colorIdx],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: textColors[colorIdx], fontWeight: '700', fontSize: 13 }}>
              {initials}
            </Text>
          </Box>
          <VStack style={{ justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>
              {name}
            </Text>
          </VStack>
        </HStack>
      );
    },
  },
  {
    key: 'email',
    label: 'Email',
    width: '180px',
    render: (v) => (
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#2563eb' }} numberOfLines={1}>
        {v || '—'}
      </Text>
    ),
  },
  {
    key: 'contact_no',
    label: 'Contact',
    width: '130px',
    render: (v) => (
      <Text style={{ fontSize: 13, color: '#475569' }} numberOfLines={1}>
        {v ? String(v) : '—'}
      </Text>
    ),
  },
  {
    key: 'gender',
    label: 'Gender',
    width: '100px',
    render: (v) => {
      const g = Number(v);
      const label = g === 1 ? 'Male' : g === 2 ? 'Female' : 'Other';
      return <Text style={{ fontSize: 13, color: '#475569' }}>{label}</Text>;
    },
  },
  {
    key: 'status',
    label: 'Status',
    width: '130px',
    render: (v) => {
      const isActive = Number(v) === 1;
      const label = isActive ? 'Active' : 'Inactive';
      const bg = isActive ? '#dcfce7' : '#fee2e2';
      const color = isActive ? '#15803d' : '#dc2626';
      const border = isActive ? '#bbf7d0' : '#fca5a5';
      return (
        <Box
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Text style={{ color: color, fontWeight: '700', fontSize: 11 }}>• {label}</Text>
        </Box>
      );
    },
  },
];

const CUSTOMER_ROW_ACTIONS = [
  { label: 'Details', action: 'details' },
  { label: 'Edit', action: 'edit' },
  { label: 'Delete', action: 'delete', style: 'danger' },
];

// const AVATAR_COLORS = [
//   { bg: "#dbeafe", text: "#1d4ed8" },
//   { bg: "#ede9fe", text: "#6d28d9" },
//   { bg: "#ffedd5", text: "#c2410c" },
//   { bg: "#f3e8ff", text: "#7e22ce" },
//   { bg: "#ccfbf1", text: "#0f766e" },
//   { bg: "#fef9c3", text: "#a16207" },
// ];

// const getAvatarColor = (seed: string) => {
//   let hash = 0;
//   for (let i = 0; i < (seed || "").length; i++) {
//     hash = seed.charCodeAt(i) + ((hash << 5) - hash);
//   }
//   const idx = Math.abs(hash) % AVATAR_COLORS.length;
//   return AVATAR_COLORS[idx];
// };

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [gender, setGender] = useState<number>(1); // 1 = Male, 2 = Female, 3 = Other
  const [dob, setDob] = useState('');
  const [status, setStatus] = useState<number>(1); // 1 = Active, 0 = Inactive
  const [showPassword, setShowPassword] = useState(false);

  const fetchCustomersList = useCallback(
    async (pg = 1, reset = true) => {
      if (reset) setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: '10',
        });

        if (search.trim()) {
          queryParams.append('search', search.trim());
        }

        const res = await listCustomers(queryParams.toString());
        const items = res?.results || res?.data || [];

        if (reset) {
          setCustomers(items);
        } else {
          setCustomers((prev: any) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load customers.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search]
  );

  useEffect(() => {
    fetchCustomersList(1, true);
  }, [fetchCustomersList]);

  useFocusEffect(
    useCallback(() => {
      fetchCustomersList(1, true);
    }, [fetchCustomersList])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomersList(1, true);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setContactNo('');
    setGender(1);
    setDob('');
    setStatus(1);
    setModalVisible(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFirstName(customer.first_name || '');
    setLastName(customer.last_name || '');
    setEmail(customer.email || '');
    setPassword('');
    setShowPassword(false);
    setContactNo(customer.contact_no ? String(customer.contact_no) : '');
    setGender(customer.gender || 1);
    setDob(customer.dob || '');
    setStatus(customer.status ?? 1);
    setModalVisible(true);
  };

  const handleOpenDetails = (customer: Customer) => {
    const id = customer._id || customer.id || '';
    router.push({
      pathname: '/pages/customers/customer-details',
      params: { id },
    });
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Validation Error', 'First and last names are required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email.');
      return;
    }
    if (!editingCustomer && !password.trim()) {
      Alert.alert('Validation Error', 'Password is required for new customers.');
      return;
    }

    try {
      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        gender: Number(gender) || 1,
        status: Number(status) ?? 1,
      };

      if (contactNo && contactNo.trim()) {
        const parsedContact = Number(contactNo.trim());
        if (isNaN(parsedContact)) {
          Alert.alert('Validation Error', 'Contact number must be a valid number.');
          return;
        }
        payload.contact_no = parsedContact;
      }

      if (dob && dob.trim()) {
        payload.dob = dob.trim();
      }

      if (password.trim()) {
        payload.password = password;
      }
      console.log(payload, "payload");

      if (editingCustomer) {
        await updateCustomer(editingCustomer._id || editingCustomer.id || '', payload);
        Alert.alert('Success', 'Customer updated successfully!');
      } else {
        await createCustomer(payload);
        Alert.alert('Success', 'Customer created successfully!');
      }

      setModalVisible(false);
      fetchCustomersList(1, true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save customer details.');
    }
  };

  const handleDelete = (customer: Customer) => {
    const id = customer._id || customer.id || '';
    Alert.alert('Delete Customer', `Are you sure you want to delete ${customer.first_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomer(id);
            Alert.alert('Success', 'Customer deleted successfully.');
            setCustomers((prev: any) => prev.filter((c: any) => (c._id || c.id) !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete customer.');
          }
        },
      },
    ]);
  };

  return (
    <Box className="flex-1 bg-[#fff]">
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <Box className="px-5 pb-2 pt-12">
          <HStack className="mb-3 items-center justify-between">
            {/* <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-white text-sm font-medium">← Back</Text>
            </TouchableOpacity> */}
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Text style={styles.addBtnText}>+ Add Customer</Text>
            </TouchableOpacity>
          </HStack>
          <HStack className="items-start justify-between">
            <VStack style={{ flex: 1 }}>
              <Heading size="xl" style={{ color: '#fff' }}>
                Customer
              </Heading>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 }}>
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
          <Box style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
            <View pointerEvents="none" style={styles.searchIcon}>
              <Feather name="search" size={16} color="#94a3b8" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search customers..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </Box>
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
              <Feather name="users" size={40} color="#cbd5e1" />
              <Text className="mt-2 text-base text-typography-400">No customers found</Text>
            </Box>
          ) : (
            <HtmlTable
              columns={CUSTOMER_TABLE_COLUMNS}
              data={customers}
              rowActions={CUSTOMER_ROW_ACTIONS}
              onRowAction={(action, rowId) => {
                const c = customers.find((x: any) => String(x._id || x.id) === String(rowId));
                if (!c) return;
                if (action === 'details') handleOpenDetails(c);
                else if (action === 'edit') handleOpenEdit(c);
                else if (action === 'delete') handleDelete(c);
              }}
              iconOnlyActions={true}
              tableContainerStyle={{
                borderWidth: 0,
                shadowColor: 'transparent',
                backgroundColor: 'transparent',
                elevation: 0,
                marginHorizontal: 0,
                marginVertical: 0,
              }}
              headerRowStyle={{
                backgroundColor: '#f8fafc',
                borderBottomWidth: 1.5,
                borderBottomColor: '#e2e8f0',
                paddingVertical: 4
              }}
              headerCellTextStyle={{
                color: '#1e3a8a',
                fontWeight: '700',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
              rowStyle={{
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
                backgroundColor: '#ffffff',
                paddingVertical: 0
              }}
            />
          )}

          {loadingMore && (
            <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} />
          )}
        </ScrollView>
      )}

      {/* Add / Edit Customer Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Heading size="md" className="mb-4">
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </Heading>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <VStack space="md">
                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>First Name *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="John"
                    />
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Last Name *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Doe"
                    />
                  </VStack>
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="john@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>
                    {editingCustomer ? 'New Password (Leave empty to keep current)' : 'Password *'}
                  </Text>
                  <HStack style={{ position: 'relative', alignItems: 'center' }}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, paddingRight: 40 }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={{ position: 'absolute', right: 12 }}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </HStack>
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={contactNo}
                    onChangeText={setContactNo}
                    placeholder="+1234567890"
                    keyboardType="phone-pad"
                  />
                </VStack>

                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Gender</Text>
                    <HStack space="xs">
                      <TouchableOpacity
                        style={[styles.genderBtn, gender === 1 && styles.genderBtnActive]}
                        onPress={() => setGender(1)}
                      >
                        <Text style={[styles.genderText, gender === 1 && styles.genderTextActive]}>
                          Male
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.genderBtn, gender === 2 && styles.genderBtnActive]}
                        onPress={() => setGender(2)}
                      >
                        <Text style={[styles.genderText, gender === 2 && styles.genderTextActive]}>
                          Female
                        </Text>
                      </TouchableOpacity>
                    </HStack>
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Status</Text>
                    <HStack space="xs">
                      <TouchableOpacity
                        style={[styles.genderBtn, status === 1 && styles.statusActive]}
                        onPress={() => setStatus(1)}
                      >
                        <Text style={[styles.genderText, status === 1 && styles.statusTextActive]}>
                          Active
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.genderBtn, status === 0 && styles.statusInactive]}
                        onPress={() => setStatus(0)}
                      >
                        <Text
                          style={[styles.genderText, status === 0 && styles.statusTextInactive]}
                        >
                          Inactive
                        </Text>
                      </TouchableOpacity>
                    </HStack>
                  </VStack>
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={dob}
                    onChangeText={setDob}
                    placeholder="1995-08-15"
                  />
                </VStack>
              </VStack>
            </ScrollView>

            <HStack space="sm" className="mt-6">
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editingCustomer ? 'Update' : 'Create'}</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingLeft: 36,
    paddingRight: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  listContent: { padding: 16, paddingBottom: 90 },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeaderRow: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  customerRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700' },
  customerName: { fontSize: 13, fontWeight: '600', color: '#1e293b', flex: 1 },
  cellText: { fontSize: 13, color: '#475569' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  iconBtnDetails: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnEdit: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDelete: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  genderBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  genderBtnActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  genderText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  genderTextActive: { color: '#2563EB' },
  statusActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  statusInactive: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  statusTextActive: { color: '#15803d' },
  statusTextInactive: { color: '#dc2626' },
  saveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  cancelBtnText: { color: '#475569', fontWeight: '700', fontSize: 14 },
});
