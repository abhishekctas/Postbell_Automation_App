import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { getRoles, deleteRole, Role } from './roles-management.api';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function RolesManagementScreen() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchRolesList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRoles();
      setRoles(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load roles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRolesList();
  }, [fetchRolesList]);

  useFocusEffect(
    useCallback(() => {
      fetchRolesList();
    }, [fetchRolesList])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRolesList();
  };

  const handleOpenAdd = () => {
    router.push('/pages/roleList/role-editor');
  };

  const handleOpenEdit = (role: Role) => {
    const roleId = role._id || role.id || '';
    router.push({
      pathname: '/pages/roleList/role-editor',
      params: { id: roleId },
    });
  };

  const handleDelete = (role: Role) => {
    const roleId = role._id || role.id || '';
    const roleName = role.name || role.role_name || 'Role';

    Alert.alert('Delete Role', `Are you sure you want to delete "${roleName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRole(roleId);
            Alert.alert('Success', 'Role deleted successfully.');
            setRoles((prev) => prev.filter((item) => (item._id || item.id) !== roleId));
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete role.');
          }
        },
      },
    ]);
  };

  const filteredRoles = roles.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const nameStr = (r.name || r.role_name || '').toLowerCase();
    const descStr = (r.description || '').toLowerCase();
    return nameStr.includes(q) || descStr.includes(q);
  });

  const renderItem = ({ item }: { item: Role }) => {
    const roleId = item._id || item.id || '';
    const roleName = item.name || item.role_name || 'Untitled Role';
    const isActive = item.status !== 0;
    const permsCount = item.sectionMatrix?.length || item.section_list?.length || 0;

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenEdit(item)}>
        <Box style={styles.card}>
          <HStack className="items-start justify-between">
            <VStack space="xs" style={{ flex: 1, marginRight: 8 }}>
              <HStack className="items-center space-x-2">
                <Text style={styles.roleNameText}>{roleName}</Text>
                {permsCount > 0 ? (
                  <Box style={styles.permsBadge}>
                    <Text style={styles.permsBadgeText}>{permsCount} Modules</Text>
                  </Box>
                ) : null}
              </HStack>

              <Text style={styles.roleDescText} numberOfLines={2}>
                {item.description || 'No description provided for this role.'}
              </Text>
            </VStack>

            <Box style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.statusText, isActive ? styles.textActive : styles.textInactive]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </Box>
          </HStack>

          <HStack space="sm" className="mt-4 justify-end">
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
              <HStack className="items-center space-x-1">
                <Feather name="edit-2" size={12} color="#2563EB" />
                <Text style={styles.actionBtnText}>Edit Role</Text>
              </HStack>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={() => handleDelete(item)}
            >
              <HStack className="items-center space-x-1">
                <Feather name="trash-2" size={12} color="#dc2626" />
                <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Delete</Text>
              </HStack>
            </TouchableOpacity>
          </HStack>
        </Box>
      </TouchableOpacity>
    );
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Top Search & Action Bar */}
      <Box style={styles.filterSection}>
        <HStack className="mb-2 items-center justify-between">
          <Text style={styles.sectionHeaderTitle}>Role Management</Text>
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
            <Text style={styles.addBtnText}>+ Add Role</Text>
          </TouchableOpacity>
        </HStack>

        <HStack style={styles.searchBoxContainer}>
          <Feather name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search roles by name..."
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
        <FlatList
          data={filteredRoles}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
          }
          ListEmptyComponent={
            <Box className="items-center justify-center py-16">
              <Feather name="shield" size={40} color="#cbd5e1" />
              <Text className="mt-2 text-base text-typography-400">No roles found</Text>
            </Box>
          }
          renderItem={renderItem}
        />
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  roleNameText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  permsBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  permsBadgeText: { fontSize: 10, fontWeight: '700', color: '#2563EB' },
  roleDescText: { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 18 },
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
});
