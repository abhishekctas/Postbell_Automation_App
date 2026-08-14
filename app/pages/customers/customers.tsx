import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Image,
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
  uploadCustomerProfileImage,
  getCustomerAvatarUrl,
  type Customer,
} from './customers.api';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import HtmlTable, { HtmlTableColumn } from '@/components/HtmlTable';
import StatusConfirmDialog from '@/components/common/StatusConfirmDialog';
import { Plus } from 'lucide-react-native';

const CUSTOMER_ROW_ACTIONS = [
  { label: 'Details', action: 'details' },
  { label: 'Edit', action: 'edit' },
  { label: 'Delete', action: 'delete', style: 'danger' },
];

function getPageNumbers(currentPage: number, lastPage: number) {
  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(lastPage, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  // const [password, setPassword] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [gender, setGender] = useState<number>(1); // 1 = Male, 2 = Female, 3 = Other
  const [dob, setDob] = useState('');
  const [status, setStatus] = useState<number>(1); // 1 = Active, 0 = Deactive
  const [imageUri, setImageUri] = useState<string>('');
  const [imageAsset, setImageAsset] = useState<any>(null);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageAsset(asset);
        setImageUri(asset.uri);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick image');
    }
  };

  // Validation State & Modal Scroll Ref
  const [errors, setErrors] = useState<Record<string, string>>({});
  const modalScrollRef = useRef<ScrollView>(null);

  // Status confirm dialog state
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [selectedCustomerForStatus, setSelectedCustomerForStatus] = useState<Customer | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const handleOpenStatusConfirm = (customer: Customer) => {
    setSelectedCustomerForStatus(customer);
    setStatusConfirmOpen(true);
  };

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
        const avatarUrl = getCustomerAvatarUrl(row.image);
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
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            ) : (
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
            )}
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
        const val = Number(v);
        const label = val === 1 ? 'Male' : val === 2 ? 'Female' : val === 3 ? 'Other' : '—';
        return <Text style={{ fontSize: 13, color: '#475569' }}>{label}</Text>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '130px',
      render: (v, row) => {
        const isActive = Number(v) === 1;
        const label = isActive ? 'Active' : 'Deactive';
        const bg = isActive ? '#eff6ff' : '#f8fafc';
        const color = isActive ? '#2563eb' : '#64748b';
        const border = isActive ? '#bfdbfe' : '#e2e8f0';
        return (
          <TouchableOpacity onPress={() => handleOpenStatusConfirm(row)}>
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
              <Text style={{ color, fontWeight: '700', fontSize: 11 }}>• {label}</Text>
            </Box>
          </TouchableOpacity>
        );
      },
    },
  ];

  const handleConfirmStatusToggle = async () => {
    if (!selectedCustomerForStatus) return;
    const customer = selectedCustomerForStatus;
    const id = customer._id || customer.id || '';
    const nextStatus = Number(customer.status) === 1 ? 0 : 1;
    setStatusLoading(true);
    try {
      await updateCustomer(id, { status: nextStatus });
      setCustomers((prev: any) =>
        prev.map((c: any) => ((c._id || c.id) === id ? { ...c, status: nextStatus } : c))
      );
      setStatusConfirmOpen(false);
      setSelectedCustomerForStatus(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update customer status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const scrollToTopModal = () => {
    modalScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (errors.first_name && val.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.first_name;
        return next;
      });
    }
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    if (errors.last_name && val.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.last_name;
        return next;
      });
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (errors.email && val.trim() && val.includes('@')) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
  };

  // const handlePasswordChange = (val: string) => {
  //   setPassword(val);
  //   if (errors.password && val.trim()) {
  //     setErrors((prev) => {
  //       const next = { ...prev };
  //       delete next.password;
  //       return next;
  //     });
  //   }
  // };

  const handleContactNoChange = (val: string) => {
    setContactNo(val);
    if (errors.contact_no && (!val.trim() || !isNaN(Number(val.trim())))) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.contact_no;
        return next;
      });
    }
  };

  const fetchCustomersList = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: '10',
        });

        if (search.trim()) {
          queryParams.append('search', search.trim());
        }

        const res = (await listCustomers(queryParams.toString())) as any;
        const items = res?.results || res?.data || (Array.isArray(res) ? res : []);
        let total =
          res?.totalPages ||
          res?.pagination?.totalPages ||
          (res?.totalResults || res?.totalCount || res?.total
            ? Math.ceil((res.totalResults || res.totalCount || res.total) / 10)
            : 0);

        if (!total) {
          if (items.length >= 10) {
            total = Math.max(pg + 1, totalPages || 1);
          } else {
            total = pg;
          }
        }

        setCustomers(items);
        setTotalPages(total);
        setPage(pg);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load customers.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchCustomersList(1);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchCustomersList]);

  useFocusEffect(
    useCallback(() => {
      fetchCustomersList(1);
    }, [fetchCustomersList])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomersList(1);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    // setPassword('');
    // setShowPassword(false);
    setContactNo('');
    setGender(1);
    setDob('');
    setStatus(1);
    setImageUri('');
    setImageAsset(null);
    setErrors({});
    setModalVisible(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFirstName(customer.first_name || '');
    setLastName(customer.last_name || '');
    setEmail(customer.email || '');
    // setPassword('');
    // setShowPassword(false);
    setContactNo(customer.contact_no ? String(customer.contact_no) : '');
    setGender(customer.gender || 1);
    setDob(customer.dob || '');
    setStatus(customer.status ?? 1);
    setImageUri(customer.image ? getCustomerAvatarUrl(customer.image) : '');
    setImageAsset(null);
    setErrors({});
    setModalVisible(true);
  };

  const handleOpenDetails = (customer: Customer) => {
    const id = customer._id || customer.id || '';
    router.push({
      pathname: '/pages/customers/customer-details',
      params: { id },
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) {
      errs.first_name = 'First name is required.';
    } else if (firstName.trim().length > 50) {
      errs.first_name = 'First name cannot exceed 50 characters.';
    }
    if (!lastName.trim()) {
      errs.last_name = 'Last name is required.';
    } else if (lastName.trim().length > 50) {
      errs.last_name = 'Last name cannot exceed 50 characters.';
    }
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!email.includes('@')) {
      errs.email = 'Please enter a valid email.';
    } else if (email.trim().length > 100) {
      errs.email = 'Email address cannot exceed 100 characters.';
    }
    // if (!editingCustomer && !password.trim()) {
    //   errs.password = 'Password is required for new customers.';
    // }
    if (contactNo && contactNo.trim()) {
      const parsedContact = Number(contactNo.trim());
      if (isNaN(parsedContact)) {
        errs.contact_no = 'Contact number must be a valid number.';
      } else if (contactNo.trim().length > 20) {
        errs.contact_no = 'Contact number cannot exceed 20 characters.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      scrollToTopModal();
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
        payload.contact_no = parsedContact;
      }

      if (dob && dob.trim()) {
        payload.dob = dob.trim();
      }

      // if (password.trim()) {
      //   payload.password = password;
      // }

      let savedCustomerId = editingCustomer?._id || editingCustomer?.id || '';
      if (editingCustomer) {
        await updateCustomer(savedCustomerId, payload);
        if (imageAsset) {
          await uploadCustomerProfileImage(savedCustomerId, imageAsset);
        }
        Alert.alert('Success', 'Customer updated successfully!');
      } else {
        const createRes = await createCustomer(payload);
        savedCustomerId =
          createRes?.data?._id || createRes?.data?.id || createRes?._id || createRes?.id || '';
        if (savedCustomerId && imageAsset) {
          await uploadCustomerProfileImage(savedCustomerId, imageAsset);
        }
        Alert.alert('Success', 'Customer created successfully!');
      }

      setModalVisible(false);
      fetchCustomersList(1);
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
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add Customer</Text>
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
            <React.Fragment>
              <HtmlTable
                columns={CUSTOMER_TABLE_COLUMNS}
                data={customers}
                rowActions={CUSTOMER_ROW_ACTIONS}
                onRowAction={(action, rowId) => {
                  const c = customers.find(
                    (x: any) =>
                      String(x._id || x.id) === String(rowId) ||
                      String(rowId).startsWith(String(x._id || x.id))
                  );
                  if (!c) return;
                  if (action === 'details' || action === 'view') handleOpenDetails(c);
                  else if (action === 'edit') handleOpenEdit(c);
                  else if (action === 'toggle-status' || action === 'status')
                    handleOpenStatusConfirm(c);
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
                  paddingVertical: 4,
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
                  paddingVertical: 0,
                }}
              />

              {totalPages > 0 && (
                <Box style={styles.paginationWrapper}>
                  <HStack space="xs" className="items-center justify-center">
                    <TouchableOpacity
                      style={[styles.pageNavBtn, page === 1 && styles.pageNavBtnDisabled]}
                      disabled={page === 1}
                      onPress={() => {
                        if (page > 1) fetchCustomersList(page - 1);
                      }}
                    >
                      <Text style={[styles.pageNavText, page === 1 && styles.pageNavTextDisabled]}>
                        ‹
                      </Text>
                    </TouchableOpacity>

                    {getPageNumbers(page, totalPages).map((p) => {
                      const isActive = p === page;
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.pageNumberBtn, isActive && styles.pageNumberBtnActive]}
                          onPress={() => fetchCustomersList(p)}
                        >
                          <Text
                            style={[styles.pageNumberText, isActive && styles.pageNumberTextActive]}
                          >
                            {p}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      style={[styles.pageNavBtn, page >= totalPages && styles.pageNavBtnDisabled]}
                      disabled={page >= totalPages}
                      onPress={() => {
                        if (page < totalPages) fetchCustomersList(page + 1);
                      }}
                    >
                      <Text
                        style={[
                          styles.pageNavText,
                          page >= totalPages && styles.pageNavTextDisabled,
                        ]}
                      >
                        ›
                      </Text>
                    </TouchableOpacity>
                  </HStack>
                </Box>
              )}
            </React.Fragment>
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
            <ScrollView
              ref={modalScrollRef}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 420 }}
            >
              <VStack space="md">
                {/* Profile Image / Avatar Picker Header */}
                <VStack className="mb-2 items-center justify-center">
                  <Box style={{ position: 'relative' }}>
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 22,
                          borderWidth: 0.4,
                        }}
                      />
                    ) : (
                      <Box
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 22,
                          backgroundColor: '#eff6ff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 0.4,
                          borderColor: '#bfdbfe',
                        }}
                      >
                        <Text style={{ fontSize: 24, fontWeight: '800', color: '#2563eb' }}>
                          {`${firstName.trim().charAt(0) || 'C'}${lastName.trim().charAt(0) || 'U'}`.toUpperCase()}
                        </Text>
                      </Box>
                    )}
                    <TouchableOpacity
                      onPress={handlePickImage}
                      style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#2563eb',
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: '#ffffff',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 3,
                        elevation: 3,
                      }}
                    >
                      <Feather name="camera" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </Box>
                  <TouchableOpacity onPress={handlePickImage} className="mt-2">
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>
                      {imageUri ? 'Change Profile Image' : 'Upload Profile Image'}
                    </Text>
                  </TouchableOpacity>
                </VStack>

                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>First Name *</Text>
                    <TextInput
                      style={[
                        styles.modalInput,
                        errors.first_name ? { borderColor: '#dc2626' } : {},
                      ]}
                      value={firstName}
                      onChangeText={handleFirstNameChange}
                      placeholder="John"
                      maxLength={50}
                    />
                    {errors.first_name ? (
                      <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                        {errors.first_name}
                      </Text>
                    ) : null}
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Last Name *</Text>
                    <TextInput
                      style={[
                        styles.modalInput,
                        errors.last_name ? { borderColor: '#dc2626' } : {},
                      ]}
                      value={lastName}
                      onChangeText={handleLastNameChange}
                      placeholder="Doe"
                      maxLength={50}
                    />
                    {errors.last_name ? (
                      <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                        {errors.last_name}
                      </Text>
                    ) : null}
                  </VStack>
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput
                    style={[styles.modalInput, errors.email ? { borderColor: '#dc2626' } : {}]}
                    value={email}
                    onChangeText={handleEmailChange}
                    placeholder="john@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    maxLength={100}
                  />
                  {errors.email ? (
                    <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                      {errors.email}
                    </Text>
                  ) : null}
                </VStack>
                {/* 
                <VStack space="xs">
                  <Text style={styles.label}>
                    {editingCustomer ? 'New Password (Leave empty to keep current)' : 'Password *'}
                  </Text>
                  <HStack style={{ position: 'relative', alignItems: 'center' }}>
                    <TextInput
                      style={[
                        styles.modalInput,
                        { flex: 1, paddingRight: 40 },
                        errors.password ? { borderColor: '#dc2626' } : {},
                      ]}
                      value={password}
                      onChangeText={handlePasswordChange}
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
                  {errors.password ? (
                    <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>{errors.password}</Text>
                  ) : null}
                </VStack> */}

                <VStack space="xs">
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput
                    style={[styles.modalInput, errors.contact_no ? { borderColor: '#dc2626' } : {}]}
                    value={contactNo}
                    onChangeText={handleContactNoChange}
                    placeholder="+1234567890"
                    keyboardType="phone-pad"
                    maxLength={20}
                  />
                  {errors.contact_no ? (
                    <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                      {errors.contact_no}
                    </Text>
                  ) : null}
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
                          Deactive
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
                    maxLength={10}
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

      <StatusConfirmDialog
        open={statusConfirmOpen}
        onClose={() => {
          if (!statusLoading) {
            setStatusConfirmOpen(false);
            setSelectedCustomerForStatus(null);
          }
        }}
        onConfirm={handleConfirmStatusToggle}
        loading={statusLoading}
        targetStatus={Number(selectedCustomerForStatus?.status) === 1 ? 0 : 1}
        title={
          Number(selectedCustomerForStatus?.status) === 1 ? 'Deactive Customer' : 'Active Customer'
        }
        message={`Are you sure you want to ${Number(selectedCustomerForStatus?.status) === 1 ? 'deactive' : 'active'} customer "${selectedCustomerForStatus?.first_name || ''} ${selectedCustomerForStatus?.last_name || ''}"?`}
        confirmText={Number(selectedCustomerForStatus?.status) === 1 ? 'Deactive' : 'Active'}
        customBrandColor={selectedCustomerForStatus?.status === 1 ? '#64748b' : '#2563EB'}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
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
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
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
  paginationWrapper: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pageNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  pageNavBtnDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.5,
  },
  pageNavText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  pageNavTextDisabled: {
    color: '#94a3b8',
  },
  pageNumberBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  pageNumberBtnActive: {
    backgroundColor: '#2563eb',
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pageNumberTextActive: {
    color: '#ffffff',
  },
});
