import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { getRoles, updateRole, deleteRole, Role } from './roles-management.api';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import HtmlTable, { HtmlTableColumn } from '@/components/HtmlTable';
import StatusConfirmDialog from '@/components/common/StatusConfirmDialog';

const ROLE_ROW_ACTIONS = [
  { label: 'Edit', action: 'edit' },
  { label: 'Delete', action: 'delete', style: 'danger' },
];

export default function RolesManagementScreen() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Status confirm dialog state
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [selectedRoleForStatus, setSelectedRoleForStatus] = useState<Role | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const handleOpenStatusConfirm = (role: Role) => {
    setSelectedRoleForStatus(role);
    setStatusConfirmOpen(true);
  };

  const handleConfirmStatusToggle = async () => {
    if (!selectedRoleForStatus) return;
    const role = selectedRoleForStatus;
    const roleId = role._id || role.id || '';
    const nextStatus = role.status === 0 ? 1 : 0;
    setStatusLoading(true);
    try {
      await updateRole(roleId, { status: nextStatus });
      setRoles((prev) =>
        prev.map((r) => ((r._id || r.id) === roleId ? { ...r, status: nextStatus } : r))
      );
      setStatusConfirmOpen(false);
      setSelectedRoleForStatus(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update role status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const ROLE_TABLE_COLUMNS: HtmlTableColumn<Role>[] = [
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
            <Text style={styles.tableCellText}>{date.toLocaleDateString('en-IN')}</Text>
            <Text style={styles.tableMetaText}>
              {date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </VStack>
        );
      },
    },
    {
      key: 'name',
      label: 'Role Name',
      width: '200px',
      render: (_v, row) => {
        const roleName = row.name || row.role_name || 'Untitled Role';
        const permsCount = row.sectionMatrix?.length || row.section_list?.length || 0;
        return (
          <VStack style={{ justifyContent: 'center' }}>
            <Text style={styles.roleNameText}>{roleName}</Text>
            {permsCount > 0 ? (
              <Box style={styles.permsBadge}>
                <Text style={styles.permsBadgeText}>{permsCount} Modules</Text>
              </Box>
            ) : null}
          </VStack>
        );
      },
    },
    {
      key: 'section_list',
      label: 'Sections',
      width: '280px',
      render: (v, row) => {
        const sections = Array.isArray(v) ? v : [];
        const accessibleSections = sections.filter((section: any) => section?.isAccessable);
        const rowId = String(row._id || row.id || '');
        const expanded = !!expandedSections[rowId];
        const visibleSections = expanded ? accessibleSections : accessibleSections.slice(0, 3);

        if (!accessibleSections.length)
          return <Text style={styles.tableMetaText}>No accessible sections</Text>;

        return (
          <VStack style={{ gap: 6 }}>
            <HStack style={{ flexWrap: 'wrap' }}>
              {visibleSections.map((section: any, index: number) => (
                <Box key={`${section?.id || section?.title || index}`} style={styles.sectionChip}>
                  <Text style={styles.sectionChipText}>{section?.title || 'Section'}</Text>
                </Box>
              ))}
            </HStack>
            {accessibleSections.length > 3 ? (
              <TouchableOpacity
                onPress={() =>
                  setExpandedSections((prev) => ({
                    ...prev,
                    [rowId]: !prev[rowId],
                  }))
                }
              >
                <Text style={styles.sectionToggleText}>
                  {expanded ? 'Show less' : `+${accessibleSections.length - 3} more`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </VStack>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (v, row) => {
        const isActive = v !== 0;
        return (
          <TouchableOpacity onPress={() => handleOpenStatusConfirm(row)}>
            <Box style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.statusText, isActive ? styles.textActive : styles.textInactive]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </Box>
          </TouchableOpacity>
        );
      },
    },
    {
      key: 'created_by_name',
      label: 'Created By',
      width: '150px',
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
            <Text style={styles.tableCellText}>{date.toLocaleDateString('en-IN')}</Text>
            <Text style={styles.tableMetaText}>
              {date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </VStack>
        );
      },
    },
  ];

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
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
          }
        >
          <HtmlTable
            columns={ROLE_TABLE_COLUMNS}
            data={filteredRoles}
            rowActions={ROLE_ROW_ACTIONS}
            onRowAction={(action, rowId) => {
              const role = filteredRoles.find(
                (item: any) =>
                  String(item._id || item.id) === String(rowId) ||
                  String(rowId).startsWith(String(item._id || item.id))
              );
              if (!role) return;
              if (action === 'edit') handleOpenEdit(role);
              if (action === 'toggle-status' || action === 'status') handleOpenStatusConfirm(role);
              if (action === 'delete') handleDelete(role);
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
        </ScrollView>
      )}

      <StatusConfirmDialog
        open={statusConfirmOpen}
        onClose={() => {
          if (!statusLoading) {
            setStatusConfirmOpen(false);
            setSelectedRoleForStatus(null);
          }
        }}
        onConfirm={handleConfirmStatusToggle}
        loading={statusLoading}
        itemName={selectedRoleForStatus?.name || selectedRoleForStatus?.role_name}
        targetStatus={selectedRoleForStatus?.status === 0 ? 1 : 0}
        title={selectedRoleForStatus?.status === 0 ? 'Activate Role' : 'Deactivate Role'}
        message={`Are you sure you want to ${selectedRoleForStatus?.status === 0 ? 'activate' : 'deactivate'} role "${selectedRoleForStatus?.name || selectedRoleForStatus?.role_name}"?`}
        confirmText={selectedRoleForStatus?.status === 0 ? 'Activate' : 'Deactivate'}
      />
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
  tableCellText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  tableMetaText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  sectionChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  sectionChipText: { fontSize: 10, fontWeight: '700', color: '#2563EB' },
  sectionToggleText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  tableHeaderCell: { paddingVertical: 12, borderBottomColor: '#e2e8f0' },
  tableRowEven: { backgroundColor: '#ffffff' },
  tableRowOdd: { backgroundColor: '#fcfbff' },
  tableCell: { paddingVertical: 12 },
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  badgeInactive: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  statusText: { fontSize: 11, fontWeight: '700' },
  textActive: { color: '#2563eb' },
  textInactive: { color: '#64748b' },
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
