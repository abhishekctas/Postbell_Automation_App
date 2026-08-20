import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import {
  listFeatures,
  deleteFeature,
  updateFeatureStatus,
  Feature,
  FeaturePoint,
} from './features.api';
import { useRouter, useFocusEffect } from 'expo-router';
import StatusConfirmDialog from '@/components/common/StatusConfirmDialog';
import HtmlTable, { HtmlTableColumn } from '@/components/HtmlTable';
import { Plus, SlidersHorizontal, X } from 'lucide-react-native';

const FEATURE_ROW_ACTIONS = [
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

export default function FeaturesScreen() {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactive'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [selectedFeatureForStatus, setSelectedFeatureForStatus] = useState<Feature | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Points Modal State
  const [pointsModalVisible, setPointsModalVisible] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<FeaturePoint[]>([]);
  const [selectedPointsTitle, setSelectedPointsTitle] = useState('');

  const fetchFeaturesList = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: '10',
          sortBy: 'createdAt:desc',
        });

        if (search.trim()) {
          queryParams.append('search', search.trim());
        }

        const filterObj: Record<string, any> = {};
        if (statusFilter === 'active') {
          filterObj.status = 1;
        } else if (statusFilter === 'deactive') {
          filterObj.status = 0;
        }
        if (Object.keys(filterObj).length > 0) {
          queryParams.append('columnFilters', JSON.stringify(filterObj));
        }

        const res = (await listFeatures(queryParams.toString())) as any;
        let items = res?.data || res?.results || (Array.isArray(res) ? res : []);
        if (statusFilter !== 'all') {
          const targetStatus = statusFilter === 'active' ? 1 : 0;
          items = items.filter((item: Feature) => item.status === targetStatus);
        }
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

        setFeatures(items);
        setTotalPages(total);
        setPage(pg);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load features.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, totalPages, statusFilter]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchFeaturesList(1);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchFeaturesList]);

  useFocusEffect(
    useCallback(() => {
      fetchFeaturesList(1);
    }, [fetchFeaturesList])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeaturesList(1);
  };

  const handleOpenAdd = () => {
    router.push('/pages/features/feature-editor');
  };

  const handleOpenEdit = (feature: Feature) => {
    const featureId = feature._id || feature.id || '';
    router.push({
      pathname: '/pages/features/feature-editor',
      params: { id: featureId },
    });
  };

  const handleOpenDetails = (feature: Feature) => {
    const featureId = feature._id || feature.id || '';
    router.push({
      pathname: '/pages/features/feature-details',
      params: { id: featureId },
    });
  };

  const handleOpenStatusConfirm = (item: Feature) => {
    setSelectedFeatureForStatus(item);
    setStatusConfirmOpen(true);
  };

  const handleConfirmStatusToggle = async () => {
    if (!selectedFeatureForStatus) return;
    const item = selectedFeatureForStatus;
    const id = item._id || item.id || '';
    const nextStatusVal = item.status === 1 ? 0 : 1;
    setStatusLoading(true);
    try {
      await updateFeatureStatus(id, nextStatusVal === 1);
      setFeatures((prev) =>
        prev.map((f) => ((f._id || f.id) === id ? { ...f, status: nextStatusVal } : f))
      );
      setStatusConfirmOpen(false);
      setSelectedFeatureForStatus(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update feature status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = (item: Feature) => {
    const id = item._id || item.id || '';
    Alert.alert('Delete Feature', `Are you sure you want to delete the feature "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFeature(id);
            Alert.alert('Success', 'Feature deleted successfully.');
            setFeatures((prev) => prev.filter((f) => (f._id || f.id) !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete feature.');
          }
        },
      },
    ]);
  };

  const handleOpenPointsModal = (points: FeaturePoint[], title: string) => {
    setSelectedPoints(points || []);
    setSelectedPointsTitle(title || 'Feature Points');
    setPointsModalVisible(true);
  };

  const FEATURE_TABLE_COLUMNS: HtmlTableColumn<Feature>[] = [
    {
      key: 'createdAt',
      label: 'Created At',
      width: '140px',
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
      key: 'title',
      label: 'Title',
      width: '220px',
      render: (v, row) => (
        <TouchableOpacity onPress={() => handleOpenDetails(row)}>
          <VStack style={{ justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563eb' }} numberOfLines={2}>
              {v || row.title || '—'}
            </Text>
            {row.slug ? (
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }} numberOfLines={1}>
                Slug: {row.slug}
              </Text>
            ) : null}
          </VStack>
        </TouchableOpacity>
      ),
    },
    {
      key: 'feature_points',
      label: 'Feature Points',
      width: '140px',
      render: (v, row) => {
        const points = Array.isArray(v) ? v : row.feature_points || [];
        if (!points.length) {
          return <Text style={{ fontSize: 12, color: '#94a3b8' }}>—</Text>;
        }
        return (
          <TouchableOpacity
            style={styles.pointsBtn}
            onPress={() => handleOpenPointsModal(points, row.title)}
          >
            <Feather name="eye" size={12} color="#193867" style={{ marginRight: 4 }} />
            <Text style={styles.pointsBtnText}>View ({points.length})</Text>
          </TouchableOpacity>
        );
      },
    },
    {
      key: 'order',
      label: 'Order',
      width: '90px',
      render: (v) => (
        <Box style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>{v ?? 0}</Text>
        </Box>
      ),
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
    {
      key: 'created_by_name',
      label: 'Created By',
      width: '150px',
      render: (v, row: any) => {
        const name = v || row.created_by_name || '—';
        const initial = name !== '—' ? name.charAt(0).toUpperCase() : '';
        return (
          <HStack space="xs" className="items-center">
            {initial ? (
              <Box style={styles.avatarMini}>
                <Text style={styles.avatarMiniText}>{initial}</Text>
              </Box>
            ) : null}
            <Text style={{ fontSize: 13, color: '#334155', fontWeight: '500' }} numberOfLines={1}>
              {name}
            </Text>
          </HStack>
        );
      },
    },
    {
      key: 'updatedAt',
      label: 'Updated At',
      width: '140px',
      render: (v) => {
        if (!v) return '—';
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v);
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
      key: 'updated_by_name',
      label: 'Updated By',
      width: '150px',
      render: (v, row: any) => {
        const name = v || row.updated_by_name || '—';
        const initial = name !== '—' ? name.charAt(0).toUpperCase() : '';
        return (
          <HStack space="xs" className="items-center">
            {initial ? (
              <Box style={[styles.avatarMini, { backgroundColor: '#f3e8ff' }]}>
                <Text style={[styles.avatarMiniText, { color: '#7e22ce' }]}>{initial}</Text>
              </Box>
            ) : null}
            <Text style={{ fontSize: 13, color: '#334155', fontWeight: '500' }} numberOfLines={1}>
              {name}
            </Text>
          </HStack>
        );
      },
    },
  ];

  return (
    <Box className="flex-1 bg-[#fff]">
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <Box className="px-5 pb-1 pt-11">
          <HStack className="mb-2 items-center justify-between">
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add Feature</Text>
            </TouchableOpacity>
          </HStack>
          <HStack className="items-start justify-between">
            <VStack style={{ flex: 1 }}>
              <Heading size="xl" style={{ color: '#fff' }}>
                Features
              </Heading>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 18 }}>
                Manage features and highlights displayed on frontend portals
              </Text>
            </VStack>
            <Box style={styles.headerIconBox}>
              <Feather name="layers" size={24} color="#fff" />
            </Box>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Search Input & Status Filter */}
      <Box style={styles.filterSection}>
        <HStack space="sm" className="items-center">
          <HStack style={[styles.searchBoxContainer, { flex: 1 }]}>
            <Feather name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search features..."
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
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderWidth: 1,
              borderColor: statusFilter === 'all' ? '#e2e8f0' : '#2563eb',
              borderRadius: 10,
              backgroundColor: statusFilter === 'all' ? '#f8fafc' : '#eff6ff',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            onPress={() => {
              setStatusFilter((prev) => {
                if (prev === 'all') return 'active';
                if (prev === 'active') return 'deactive';
                return 'all';
              });
            }}
          >
            <SlidersHorizontal size={16} color={statusFilter === 'all' ? '#475569' : '#2563eb'} />
            {statusFilter !== 'all' && (
              <Box
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#2563eb',
                }}
              />
            )}
          </TouchableOpacity>
        </HStack>

        {statusFilter !== 'all' && (
          <Box className="mt-2.5 flex-row items-center">
            <Box
              style={{
                backgroundColor: '#2563eb15',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#2563eb' }}>
                Filter: {statusFilter === 'active' ? 'Active Features' : 'Deactive Features'}
              </Text>
              <TouchableOpacity onPress={() => setStatusFilter('all')} style={{ marginLeft: 6 }}>
                <X size={12} color="#2563eb" />
              </TouchableOpacity>
            </Box>
          </Box>
        )}
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
          {features.length === 0 ? (
            <Box className="items-center justify-center py-20">
              <Feather name="layers" size={40} color="#cbd5e1" />
              <Text className="mt-2 text-base text-typography-400">No features found</Text>
            </Box>
          ) : (
            <React.Fragment>
              <HtmlTable
                columns={FEATURE_TABLE_COLUMNS}
                data={features}
                rowActions={FEATURE_ROW_ACTIONS}
                onRowAction={(action, rowId) => {
                  const item = features.find(
                    (x: any) =>
                      String(x._id || x.id) === String(rowId) ||
                      String(rowId).startsWith(String(x._id || x.id))
                  );
                  if (!item) return;
                  if (action === 'details' || action === 'view') handleOpenDetails(item);
                  else if (action === 'edit') handleOpenEdit(item);
                  else if (action === 'toggle-status' || action === 'status')
                    handleOpenStatusConfirm(item);
                  else if (action === 'delete') handleDelete(item);
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
                  backgroundColor:
                    '#                                                                                               ffffff',
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
                        if (page > 1) fetchFeaturesList(page - 1);
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
                          onPress={() => fetchFeaturesList(p)}
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
                        if (page < totalPages) fetchFeaturesList(page + 1);
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

      {/* Feature Points View Modal */}
      <Modal
        visible={pointsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPointsModalVisible(false)}
      >
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <HStack className="mb-4 items-center justify-between">
              <VStack style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>
                  Feature Points
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b' }} numberOfLines={1}>
                  {selectedPointsTitle}
                </Text>
              </VStack>
              <TouchableOpacity
                onPress={() => setPointsModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={18} color="#64748b" />
              </TouchableOpacity>
            </HStack>

            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {selectedPoints.length === 0 ? (
                <Box className="items-center justify-center py-8">
                  <Text style={{ fontSize: 13, color: '#94a3b8' }}>No points available</Text>
                </Box>
              ) : (
                <VStack space="sm">
                  {selectedPoints.map((pt, idx) => (
                    <Box key={pt._id || idx} style={styles.pointCard}>
                      <HStack space="sm" className="items-start">
                        <Box style={styles.pointIndexBadge}>
                          <Text style={styles.pointIndexText}>{idx + 1}</Text>
                        </Box>
                        <VStack style={{ flex: 1 }}>
                          <Text style={styles.pointTitleText}>{pt.point_title || 'Untitled'}</Text>
                          {pt.point_description ? (
                            <Text style={styles.pointDescText}>{pt.point_description}</Text>
                          ) : null}
                        </VStack>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              )}
            </ScrollView>
          </Box>
        </Box>
      </Modal>

      {/* Status Confirm Dialog */}
      <StatusConfirmDialog
        open={statusConfirmOpen}
        onClose={() => {
          if (!statusLoading) {
            setStatusConfirmOpen(false);
            setSelectedFeatureForStatus(null);
          }
        }}
        onConfirm={handleConfirmStatusToggle}
        loading={statusLoading}
        targetStatus={selectedFeatureForStatus?.status === 1 ? 0 : 1}
        title={selectedFeatureForStatus?.status === 1 ? 'Deactive Feature' : 'Active Feature'}
        message={`Are you sure you want to ${selectedFeatureForStatus?.status === 1 ? 'deactive' : 'active'} this feature?`}
        confirmText={selectedFeatureForStatus?.status === 1 ? 'Deactive' : 'Active'}
        customBrandColor={selectedFeatureForStatus?.status === 1 ? '#64748b' : '#2563EB'}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 4,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    padding: 0,
  },
  listContent: { padding: 16, paddingBottom: 90 },
  pointsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  pointsBtnText: { fontSize: 11, fontWeight: '600', color: '#193867' },
  orderBadge: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  orderBadgeText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  pointIndexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointIndexText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pointTitleText: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  pointDescText: { fontSize: 11, color: '#64748b', marginTop: 2 },
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
