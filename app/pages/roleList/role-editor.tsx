import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getRole,
  createRole,
  updateRole,
  listAllSectionsForRole,
  SectionItem,
} from './roles-management.api';

type PermKey = 'view' | 'create' | 'update' | 'delete' | 'download';
const PERMS: { key: PermKey; label: string; color: string }[] = [
  { key: 'view', label: 'View', color: '#2563EB' },
  { key: 'create', label: 'Create', color: '#16a34a' },
  { key: 'update', label: 'Update', color: '#d97706' },
  { key: 'delete', label: 'Delete', color: '#dc2626' },
  { key: 'download', label: 'Download', color: '#9333ea' },
];

export default function RoleEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Basic Info
  const [roleName, setRoleName] = useState('');
  const [status, setStatus] = useState<number>(1);

  // Validation State & Scroll Ref
  const [errors, setErrors] = useState<Record<string, string>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleRoleNameChange = (val: string) => {
    setRoleName(val);
    if (errors.role_name && val.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.role_name;
        return next;
      });
    }
  };

  // Sections & Matrix
  const [sections, setSections] = useState<SectionItem[]>([]);
  // map: sectionId -> Set<PermKey>
  const [matrixMap, setMatrixMap] = useState<Map<string, Set<PermKey>>>(new Map());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const secList = await listAllSectionsForRole();
      setSections(secList);

      if (isEditMode && id) {
        const role = await getRole(id);
        setRoleName(role.role_name || role.name || '');
        setStatus(role.status !== undefined ? Number(role.status) : 1);

        const map = new Map<string, Set<PermKey>>();
        if (role.sectionMatrix && role.sectionMatrix.length > 0) {
          role.sectionMatrix.forEach((item) => {
            const set = new Set<PermKey>();
            item.permissions.forEach((p) => {
              const norm = p === 'add' ? 'create' : (p as PermKey);
              if (['view', 'create', 'update', 'delete', 'download'].includes(norm)) {
                set.add(norm as PermKey);
              }
            });
            map.set(String(item.sectionId), set);
          });
        } else if (role.section_list && role.section_list.length > 0) {
          role.section_list.forEach((sec) => {
            if (sec.isAccessable) {
              const set = new Set<PermKey>();
              Object.entries(sec.permissions || {}).forEach(([p, val]) => {
                if (val) {
                  const norm = p === 'add' ? 'create' : (p as PermKey);
                  if (['view', 'create', 'update', 'delete', 'download'].includes(norm)) {
                    set.add(norm as PermKey);
                  }
                }
              });
              const secKey = String(sec.id || (sec as any)._id || sec.name);
              map.set(secKey, set);
            }
          });
        }
        setMatrixMap(map);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load role editor data.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, isEditMode, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const togglePermission = (sectionId: string, perm: PermKey) => {
    setMatrixMap((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(sectionId) || []);
      if (set.has(perm)) {
        set.delete(perm);
      } else {
        set.add(perm);
      }

      if (set.size === 0) {
        next.delete(sectionId);
      } else {
        next.set(sectionId, set);
      }
      return next;
    });
  };

  const toggleSectionAll = (sectionId: string) => {
    setMatrixMap((prev) => {
      const next = new Map(prev);
      const set = next.get(sectionId);
      if (set && set.size === PERMS.length) {
        next.delete(sectionId);
      } else {
        next.set(sectionId, new Set(PERMS.map((p) => p.key)));
      }
      return next;
    });
  };

  const handleSelectAllGlobal = () => {
    const next = new Map<string, Set<PermKey>>();
    sections.forEach((sec) => {
      next.set(sec.id, new Set(PERMS.map((p) => p.key)));
    });
    setMatrixMap(next);
  };

  const handleDeselectAllGlobal = () => {
    setMatrixMap(new Map());
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!roleName.trim()) {
      errs.role_name = 'Role name is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      scrollToTop();
      return;
    }
    if (saving) return;

    try {
      setSaving(true);

      const section_list = sections.map((sec) => {
        const sid = String(sec.id || (sec as any)._id || sec.name);
        const permsSet =
          matrixMap.get(sid) ||
          matrixMap.get(String(sec.id)) ||
          matrixMap.get(sec.name) ||
          new Set();
        return {
          name: sec.name,
          title: sec.title,
          status: sec.status || 1,
          permissions: {
            add: permsSet.has('create'),
            delete: permsSet.has('delete'),
            update: permsSet.has('update'),
            view: permsSet.has('view'),
            download: permsSet.has('download'),
          },
          id: sec.id || (sec as any)._id || sid,
          isAccessable: permsSet.size > 0,
        };
      });

      const payload = {
        role_name: roleName.trim(),
        name: roleName.trim(),
        status,
        section_list,
      };

      if (isEditMode && id) {
        await updateRole(id, payload);
        Alert.alert('Success', 'Role updated successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await createRole(payload);
        Alert.alert('Success', 'Role created successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-sm text-slate-500">Loading role details...</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <Box className="px-5 pb-2 pt-12">
          <HStack className="mb-2 items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
              <HStack className="items-center space-x-1">
                <Feather name="arrow-left" size={16} color="#fff" />
                <Text style={styles.headerBackText}>Back</Text>
              </HStack>
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerSaveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#1D4ED8" />
              ) : (
                <Text style={styles.headerSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </HStack>

          <Heading size="xl" style={{ color: '#fff' }}>
            {isEditMode ? 'Edit Role' : 'Create Role'}
          </Heading>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            Configure role details and module section permissions
          </Text>
        </Box>
      </LinearGradient>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: Role Basic Details */}
        <Box style={styles.card}>
          <HStack className="mb-4 items-center space-x-2">
            <Feather name="shield" size={18} color="#2563EB" />
            <Text style={styles.cardTitle}>Role Details</Text>
          </HStack>

          <VStack space="md">
            <VStack space="xs">
              <Text style={styles.label}>Role Name *</Text>
              <TextInput
                style={[styles.textInput, errors.role_name ? { borderColor: '#dc2626' } : {}]}
                value={roleName}
                onChangeText={handleRoleNameChange}
                placeholder="e.g. Sales Manager"
                placeholderTextColor="#94a3b8"
              />
              {errors.role_name ? (
                <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                  {errors.role_name}
                </Text>
              ) : null}
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Status</Text>
              <HStack space="xs" className="mt-0.5">
                <TouchableOpacity
                  style={[styles.statusToggleBtn, status === 1 && styles.statusToggleBtnActive]}
                  onPress={() => setStatus(1)}
                >
                  <Text
                    style={[styles.statusToggleText, status === 1 && styles.statusToggleTextActive]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusToggleBtn, status === 0 && styles.statusToggleBtnInactive]}
                  onPress={() => setStatus(0)}
                >
                  <Text
                    style={[
                      styles.statusToggleText,
                      status === 0 && styles.statusToggleTextInactive,
                    ]}
                  >
                    Deactive
                  </Text>
                </TouchableOpacity>
              </HStack>
            </VStack>
          </VStack>
        </Box>

        {/* Card 2: Section Permissions Matrix */}
        <Box style={styles.card}>
          <HStack className="mb-4 items-center justify-between">
            <HStack className="items-center space-x-2">
              <Feather name="lock" size={18} color="#2563EB" />
              <Text style={styles.cardTitle}>Section Permissions</Text>
            </HStack>

            <HStack space="xs">
              <TouchableOpacity style={styles.matrixQuickBtn} onPress={handleSelectAllGlobal}>
                <Text style={styles.matrixQuickText}>Select All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.matrixQuickBtn,
                  { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
                ]}
                onPress={handleDeselectAllGlobal}
              >
                <Text style={[styles.matrixQuickText, { color: '#dc2626' }]}>Clear</Text>
              </TouchableOpacity>
            </HStack>
          </HStack>

          <VStack space="md">
            {sections.map((sec) => {
              const secPerms = matrixMap.get(sec.id) || new Set();
              const isAllSec = secPerms.size === PERMS.length;

              return (
                <Box key={sec.id} style={styles.sectionCard}>
                  <HStack style={styles.sectionCardHeader}>
                    <VStack style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>{sec.title || sec.name}</Text>
                      <Text style={styles.sectionSubtext}>Module ID: {sec.name}</Text>
                    </VStack>

                    <TouchableOpacity
                      style={[
                        styles.sectionToggleAllBtn,
                        isAllSec && styles.sectionToggleAllBtnActive,
                      ]}
                      onPress={() => toggleSectionAll(sec.id)}
                    >
                      <Text
                        style={[
                          styles.sectionToggleAllText,
                          isAllSec && styles.sectionToggleAllTextActive,
                        ]}
                      >
                        {isAllSec ? 'Full Access' : 'Grant All'}
                      </Text>
                    </TouchableOpacity>
                  </HStack>

                  {/* Permissions Chips / Grid */}
                  <HStack style={styles.permChipGrid}>
                    {PERMS.map((p) => {
                      const hasPerm = secPerms.has(p.key);
                      return (
                        <TouchableOpacity
                          key={p.key}
                          activeOpacity={0.8}
                          style={[
                            styles.permChip,
                            hasPerm && {
                              backgroundColor: `${p.color}15`,
                              borderColor: p.color,
                            },
                          ]}
                          onPress={() => togglePermission(sec.id, p.key)}
                        >
                          <HStack className="items-center space-x-1">
                            <Feather
                              name={hasPerm ? 'check-circle' : 'circle'}
                              size={12}
                              color={hasPerm ? p.color : '#94a3b8'}
                            />
                            <Text
                              style={[
                                styles.permChipText,
                                hasPerm
                                  ? { color: p.color, fontWeight: '700' }
                                  : { color: '#64748b' },
                              ]}
                            >
                              {p.label}
                            </Text>
                          </HStack>
                        </TouchableOpacity>
                      );
                    })}
                  </HStack>
                </Box>
              );
            })}
          </VStack>
        </Box>

        {/* Save & Cancel Footer */}
        <VStack space="sm" className="mb-6 mt-2">
          <Button style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ButtonText style={styles.saveBtnText}>
                {isEditMode ? 'Update Role' : 'Create Role'}
              </ButtonText>
            )}
          </Button>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 6 },
  headerBackBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerBackText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  headerSaveBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerSaveText: { color: '#1D4ED8', fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 10 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  multilineInput: { minHeight: 80 },
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
  statusToggleBtnActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  statusToggleBtnInactive: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  statusToggleText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  statusToggleTextActive: { color: '#15803d' },
  statusToggleTextInactive: { color: '#dc2626' },
  matrixQuickBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  matrixQuickText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  sectionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  sectionCardHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  sectionSubtext: { fontSize: 10, color: '#94a3b8' },
  sectionToggleAllBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  sectionToggleAllBtnActive: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  sectionToggleAllText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  sectionToggleAllTextActive: { color: '#15803d', fontWeight: '700' },
  permChipGrid: { flexWrap: 'wrap', gap: 6 },
  permChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  permChipText: { fontSize: 11 },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#475569', fontSize: 14, fontWeight: '700' },
});
