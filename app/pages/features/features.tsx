import React, { useState, useEffect, useCallback } from 'react';
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
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { listFeatures, deleteFeature, updateFeatureStatus, Feature } from './features.api';
import { useRouter, useFocusEffect } from 'expo-router';

export default function FeaturesScreen() {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchFeaturesList = useCallback(
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

        const res = await listFeatures(queryParams.toString());
        const items = res?.data || (Array.isArray(res) ? res : []);

        if (reset) {
          setFeatures(items);
        } else {
          setFeatures((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load features.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchFeaturesList(1, true);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchFeaturesList]);

  useFocusEffect(
    useCallback(() => {
      fetchFeaturesList(1, true);
    }, [fetchFeaturesList])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeaturesList(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchFeaturesList(page + 1, false);
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

  const handleToggleStatus = async (item: Feature) => {
    const id = item._id || item.id || '';
    const nextStatusVal = item.status === 1 ? 0 : 1;
    try {
      await updateFeatureStatus(id, nextStatusVal === 1);
      setFeatures((prev) =>
        prev.map((f) => ((f._id || f.id) === id ? { ...f, status: nextStatusVal } : f))
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update feature status.');
    }
  };

  const handleDelete = (item: Feature) => {
    const id = item._id || item.id || '';
    Alert.alert('Delete Feature', `Are you sure you want to delete the reature "${item.title}"?`, [
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

  const renderItem = ({ item }: { item: Feature }) => {
    const isAct = Number(item.status) === 1;

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenDetails(item)}>
        <Box style={styles.card}>
          <HStack className="items-start justify-between">
            <VStack space="xs" style={{ flex: 1, marginRight: 8 }}>
              <Text className="text-base font-bold text-typography-100">{item.title}</Text>
              <Text className="text-xs text-typography-400">
                Slug: {item.slug} | Order: {item.order ?? 0}
              </Text>
              {item.description ? (
                <Text className="mt-1 text-sm text-typography-500" numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              {item.feature_points?.length > 0 && (
                <Box className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <Text
                    style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 }}
                  >
                    Highlights ({item.feature_points.length}):
                  </Text>
                  {item.feature_points.slice(0, 2).map((pt, i) => (
                    <Text key={pt._id || i} style={styles.highlightText} numberOfLines={1}>
                      • [{pt.icon || 'star'}] {pt.point_title}
                    </Text>
                  ))}
                  {item.feature_points.length > 2 && (
                    <Text
                      style={{ fontSize: 10, color: '#2563EB', fontWeight: '600', marginTop: 2 }}
                    >
                      +{item.feature_points.length - 2} more points...
                    </Text>
                  )}
                </Box>
              )}
            </VStack>
            <VStack space="sm" className="items-end">
              <Box style={[styles.statusBadge, { backgroundColor: isAct ? '#dcfce7' : '#fee2e2' }]}>
                <Text
                  style={{ color: isAct ? '#15803d' : '#dc2626', fontSize: 10, fontWeight: '700' }}
                >
                  {isAct ? 'Active' : 'Inactive'}
                </Text>
              </Box>
              <TouchableOpacity
                style={styles.statusToggleAction}
                onPress={() => handleToggleStatus(item)}
              >
                <Text style={styles.statusToggleActionText}>
                  {isAct ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
            </VStack>
          </HStack>

          <HStack space="sm" className="mt-4 justify-end">
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenDetails(item)}>
              <HStack className="items-center space-x-1">
                <Feather name="eye" size={12} color="#2563EB" />
                <Text style={styles.actionBtnText}>Details</Text>
              </HStack>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
              <HStack className="items-center space-x-1">
                <Feather name="edit-2" size={12} color="#2563EB" />
                <Text style={styles.actionBtnText}>Edit</Text>
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
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <Box className="px-5 pb-1 pt-12">
          <HStack className="mb-1 items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <HStack className="items-center space-x-1">
                <Feather name="arrow-left" size={16} color="#fff" />
                <Text className="text-sm font-medium text-white">Back</Text>
              </HStack>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Text style={styles.addBtnText}>+ Add Feature</Text>
            </TouchableOpacity>
          </HStack>
          <Heading size="xl" style={{ color: '#fff' }}>
            Features
          </Heading>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
            Manage features and highlights displayed on frontend portals
          </Text>
        </Box>
      </LinearGradient>

      {/* Search Input */}
      <Box style={styles.filterSection}>
        <HStack style={styles.searchBoxContainer}>
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
      </Box>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </Box>
      ) : (
        <FlatList
          data={features}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Box className="items-center justify-center py-20">
              <Feather name="layers" size={40} color="#cbd5e1" />
              <Text className="mt-2 text-base text-typography-400">No features found</Text>
            </Box>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
            ) : null
          }
          renderItem={renderItem}
        />
      )}
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
  filterSection: {
    padding: 9,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  listContent: { padding: 16, paddingBottom: 75 },
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
  highlightText: { fontSize: 11, color: '#475569', marginTop: 2 },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusToggleAction: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f8fafc',
  },
  statusToggleActionText: { fontSize: 10, color: '#475569', fontWeight: '600' },
  actionBtn: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionBtnDanger: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
  },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
});
