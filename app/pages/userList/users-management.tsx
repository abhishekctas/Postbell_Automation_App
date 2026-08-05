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
  Image,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { listUsers, createUser, updateUser, deleteUser, User } from './user-access.api';
import { getRoles, Role } from '../roleList/roles-management.api';
import { Feather } from '@expo/vector-icons';
import HtmlTable, { HtmlTableColumn } from '@/components/HtmlTable';
import { API_BASE_URL } from '@/services/api';

const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#ffedd5', text: '#c2410c' },
  { bg: '#f3e8ff', text: '#7e22ce' },
  { bg: '#ccfbf1', text: '#0f766e' },
  { bg: '#fef9c3', text: '#a16207' },
];

const getAvatarColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < (seed || '').length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const getUserAvatarUrl = (avatar?: string) => {
  if (!avatar) return '';
  if (
    /^https?:\/\//i.test(avatar) ||
    avatar.startsWith('file://') ||
    avatar.startsWith('content://')
  ) {
    return avatar;
  }

  const baseUrl = API_BASE_URL.replace(/\/v1\/?$/, '');
  const normalizedAvatar = avatar.startsWith('/') ? avatar : `/profile/${avatar}`;

  return `${baseUrl}${normalizedAvatar}`;
};

const USER_TABLE_COLUMNS: HtmlTableColumn<User>[] = [
  {
    key: 'createdAt',
    label: 'Created At',
    width: '120px',
    render: (v) => {
      if (!v) return '—';
      const date = new Date(v);
      if (Number.isNaN(date.getTime())) return String(v);
      return (
        <VStack style={{ justifyContent: 'center' }}>
          <Text style={styles.tableCellText}>
            {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
          <Text style={styles.tableMetaText}>
            {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
        </VStack>
      );
    },
  },
  {
    key: 'name',
    label: 'Profile',
    width: '100px',
    render: (_v, row) => {
      const userId = row._id || row.id || '';
      const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'User';
      const initials =
        `${(row.first_name || '').charAt(0)}${(row.last_name || '').charAt(0)}`.toUpperCase() ||
        'U';
      const avatarColor = getAvatarColor(userId || row.email || fullName);
      const avatarField = (row as any).avatar || (row as any).image || (row as any).profile_image;
      const avatarUrl = getUserAvatarUrl(avatarField);

      return (
        <HStack space="sm" className="items-center">
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Box style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
              <Text style={[styles.avatarText, { color: avatarColor.text }]}>{initials}</Text>
            </Box>
          )}
        </HStack>
      );
    },
  },
  {
    key: 'email',
    label: 'Email',
    width: '200px',
    render: (v) => <Text style={styles.userEmailText}>{v || '—'}</Text>,
  },
  {
    key: 'first_name',
    label: 'First Name',
    width: '150px',
    render: (v) => <Text style={styles.tableCellText}>{v || '—'}</Text>,
  },
  {
    key: 'last_name',
    label: 'Last Name',
    width: '150px',
    render: (v) => <Text style={styles.tableCellText}>{v || '—'}</Text>,
  },
  {
    key: 'role_name',
    label: 'Role',
    width: '100px',
    render: (v, row) => {
      const roleName = v || row.role_name || 'No Role Assigned';
      return (
        <Box style={styles.roleChip}>
          <Text style={styles.roleChipText}>{roleName}</Text>
        </Box>
      );
    },
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    render: (v) => {
      const isActive = Number(v) === 1;
      return (
        <Box style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={[styles.statusText, isActive ? styles.textActive : styles.textInactive]}>
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </Box>
      );
    },
  },
  {
    key: 'created_by_name',
    label: 'Created By',
    width: '160px',
    render: (v) => <Text style={styles.tableCellText}>{v || '—'}</Text>,
  },
  {
    key: 'updatedAt',
    label: 'Updated At',
    width: '120px',
    render: (v) => {
      if (!v) return '—';
      const date = new Date(v);
      if (Number.isNaN(date.getTime())) return String(v);
      return (
        <VStack style={{ justifyContent: 'center' }}>
          <Text style={styles.tableCellText}>
            {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
          <Text style={styles.tableMetaText}>
            {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
        </VStack>
      );
    },
  },
  {
    key: 'updated_by_name',
    label: 'Updated By',
    width: '140px',
    render: (v) => <Text style={styles.tableCellText}>{v || '—'}</Text>,
  },
];

const USER_ROW_ACTIONS = [
  { label: 'Edit', action: 'edit' },
  { label: 'Delete', action: 'delete', style: 'danger' },
];

export default function UsersManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [status, setStatus] = useState<number>(1);

  // Validation Errors State & Modal Scroll Ref
  const [errors, setErrors] = useState<Record<string, string>>({});
  const modalScrollRef = useRef<ScrollView>(null);

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

  const fetchRolesList = useCallback(async () => {
    try {
      const r = await getRoles();
      setRoles(r);
    } catch (e) {
      console.log('Failed to fetch roles:', e);
    }
  }, []);

  const fetchUsersList = useCallback(
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

        const res = (await listUsers(queryParams.toString())) as any;
        const items = res?.results || res?.data || (Array.isArray(res) ? res : []);

        if (reset) {
          setUsers(items);
        } else {
          setUsers((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load users.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search]
  );

  const loadInitialData = useCallback(async () => {
    await Promise.all([fetchRolesList(), fetchUsersList(1, true)]);
  }, [fetchRolesList, fetchUsersList]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

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
    setFirstName('');
    setLastName('');
    setEmail('');
    setSelectedRole(roles[0] || null);
    setStatus(1);
    setErrors({});
    setModalVisible(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setEmail(user.email || '');

    const userRoleId = (user as any).role_id || (user as any).roleId;
    const foundRole =
      roles.find(
        (r) =>
          (r._id || r.id) === userRoleId ||
          (r.name || r.role_name || '').toLowerCase() === (user.role_name || '').toLowerCase()
      ) || null;

    setSelectedRole(
      foundRole || (user.role_name ? ({ name: user.role_name } as any) : roles[0] || null)
    );
    setStatus(user.status !== undefined ? Number(user.status) : 1);
    setErrors({});
    setModalVisible(true);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) {
      errs.first_name = 'First name is required.';
    }
    if (!lastName.trim()) {
      errs.last_name = 'Last name is required.';
    }
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!email.includes('@')) {
      errs.email = 'Please enter a valid email address.';
    }
    // if (contactNo && contactNo.trim() && isNaN(Number(contactNo.trim()))) {
    //   errs.contact_no = 'Contact number must be a valid number.';
    // }
    if (
      !selectedRole ||
      (!selectedRole._id && !selectedRole.id && !selectedRole.name && !selectedRole.role_name)
    ) {
      errs.role_id = 'Role is required.';
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
      const role_id = selectedRole?._id || selectedRole?.id || '';
      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        // contact_no: contactNo.trim(),
        status,
        role_id,
      };

      if (editingUser) {
        const userId = editingUser._id || editingUser.id || '';
        await updateUser(userId, payload);
        Alert.alert('Success', 'User updated successfully.');
      } else {
        await createUser(payload);
        Alert.alert('Success', 'User created successfully.');
      }

      setModalVisible(false);
      fetchUsersList(1, true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save user.');
    }
  };

  const handleDelete = (user: User) => {
    const userId = user._id || user.id || '';
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';

    Alert.alert('Delete User', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUser(userId);
            Alert.alert('Success', 'User deleted successfully.');
            setUsers((prev) => prev.filter((u) => (u._id || u.id) !== userId));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete user.');
          }
        },
      },
    ]);
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Top Search & Filter Bar */}
      <Box style={styles.filterSection}>
        <HStack className="mb-3 items-center justify-between">
          <Text style={styles.sectionHeaderTitle}>Users Management</Text>
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
            <Text style={styles.addBtnText}>+ Add User</Text>
          </TouchableOpacity>
        </HStack>

        <HStack style={styles.searchBoxContainer}>
          <Feather name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff users..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </HStack>
      </Box>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </Box>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
          }
        >
          <HtmlTable
            columns={USER_TABLE_COLUMNS}
            data={users}
            rowActions={USER_ROW_ACTIONS}
            onRowAction={(action, rowId) => {
              const user = users.find((item) => String(item._id || item.id) === String(rowId));
              if (!user) return;
              if (action === 'edit') handleOpenEdit(user);
              if (action === 'delete') handleDelete(user);
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
            headerCellStyle={styles.tableHeaderCell}
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
            rowEvenStyle={styles.tableRowEven}
            rowOddStyle={styles.tableRowOdd}
            cellStyle={styles.tableCell}
          />
          {loadingMore ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
          ) : null}
          {hasMore && !loadingMore ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
              <Text style={styles.loadMoreBtnText}>Load More</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Heading size="md" className="mb-4">
              {editingUser ? 'Edit User' : 'Add User'}
            </Heading>
            <ScrollView
              ref={modalScrollRef}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 420 }}
            >
              <VStack space="md">
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
                    placeholder="john@company.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.email ? (
                    <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                      {errors.email}
                    </Text>
                  ) : null}
                </VStack>

                {/* <VStack space="xs">
                  <Text style={styles.label}>
                    {editingUser ? "Password (Leave blank to keep)" : "Password *"}
                  </Text>
                  <HStack style={{ position: "relative", alignItems: "center" }}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, paddingRight: 40 }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={{ position: "absolute", right: 12 }}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Feather name={showPassword ? "eye-off" : "eye"} size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </HStack>
                </VStack> */}
                {/* 
                <VStack space="xs">
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput
                    style={[styles.modalInput, errors.contact_no ? { borderColor: '#dc2626' } : {}]}
                    value={contactNo}
                    onChangeText={handleContactNoChange}
                    placeholder="+1234567890"
                    keyboardType="phone-pad"
                  />
                  {errors.contact_no ? (
                    <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>{errors.contact_no}</Text>
                  ) : null}
                </VStack> */}

                {/* Role Dropdown */}
                <VStack space="xs">
                  <Text style={styles.label}>Assign Role *</Text>
                  <TouchableOpacity
                    style={[styles.roleSelectBtn, errors.role_id ? { borderColor: '#dc2626' } : {}]}
                    onPress={() => setShowRoleSelect(!showRoleSelect)}
                  >
                    <Text style={styles.roleSelectBtnText}>
                      {selectedRole?.name || selectedRole?.role_name || 'Select Role'}
                    </Text>
                    <Feather
                      name={showRoleSelect ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#64748b"
                    />
                  </TouchableOpacity>

                  {showRoleSelect ? (
                    <Box style={styles.roleDropdownList}>
                      {roles.map((r) => {
                        const rName = r.name || r.role_name || '';
                        const isSel = (r._id || r.id) === (selectedRole?._id || selectedRole?.id);
                        return (
                          <TouchableOpacity
                            key={r._id || r.id}
                            style={[styles.roleItemOption, isSel && styles.roleItemOptionActive]}
                            onPress={() => {
                              setSelectedRole(r);
                              setShowRoleSelect(false);
                              if (errors.role_id) {
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.role_id;
                                  return next;
                                });
                              }
                            }}
                          >
                            <Text style={[styles.roleItemText, isSel && styles.roleItemTextActive]}>
                              {rName}
                            </Text>
                            {isSel ? <Feather name="check" size={14} color="#2563EB" /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </Box>
                  ) : null}
                  {errors.role_id ? (
                    <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                      {errors.role_id}
                    </Text>
                  ) : null}
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Status</Text>
                  <HStack space="xs">
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 1 && styles.statusToggleActive]}
                      onPress={() => setStatus(1)}
                    >
                      <Text
                        style={[styles.statusToggleText, status === 1 && styles.statusTextActive]}
                      >
                        Active
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 0 && styles.statusToggleInactive]}
                      onPress={() => setStatus(0)}
                    >
                      <Text
                        style={[styles.statusToggleText, status === 0 && styles.statusTextInactive]}
                      >
                        Inactive
                      </Text>
                    </TouchableOpacity>
                  </HStack>
                </VStack>
              </VStack>
            </ScrollView>

            <HStack space="sm" className="mt-6">
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
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
  filterSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  addBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', padding: 0 },
  listContent: { padding: 16, paddingBottom: 40 },
  tableHeaderCell: { paddingVertical: 12, borderBottomColor: '#e2e8f0' },
  tableRowEven: { backgroundColor: '#ffffff' },
  tableRowOdd: { backgroundColor: '#fcfbff' },
  tableCell: { paddingVertical: 12 },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  loadMoreBtnText: { color: '#2563EB', fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 62,
    height: 62,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  userNameText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  userEmailText: { fontSize: 12, color: '#64748b' },
  tableCellText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  tableMetaText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  userContactText: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  roleChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  roleChipText: { fontSize: 10, fontWeight: '700', color: '#2563EB' },
  noRoleText: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 10, fontWeight: '700' },
  textActive: { color: '#15803d' },
  textInactive: { color: '#dc2626' },
  actionBtn: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionBtnDanger: { backgroundColor: '#fff5f5', borderColor: '#fecaca' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
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
  roleSelectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  roleSelectBtnText: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  roleDropdownList: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    marginTop: 4,
    overflow: 'hidden',
  },
  roleItemOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  roleItemOptionActive: { backgroundColor: '#eff6ff' },
  roleItemText: { fontSize: 13, color: '#334155' },
  roleItemTextActive: { color: '#2563EB', fontWeight: '700' },
  statusToggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  statusToggleActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  statusToggleInactive: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  statusToggleText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
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
