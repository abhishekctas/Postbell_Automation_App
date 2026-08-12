import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getFeatureDetails, Feature, getFeatureMediaUrl } from './features.api';

export default function FeatureDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getFeatureDetails(id);
      setFeature(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch feature details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchDetails();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchDetails]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getMediaUrl = (path?: string) => {
    return getFeatureMediaUrl(path);
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-sm text-slate-500">Loading feature details...</Text>
      </Box>
    );
  }

  if (!feature) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc] p-6">
        <Feather name="alert-circle" size={48} color="#94a3b8" />
        <Heading size="md" className="mt-4 text-slate-700">
          Feature Not Found
        </Heading>
        <Text className="mb-6 mt-1 text-center text-sm text-slate-500">
          The requested feature could not be found or has been deleted.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Features</Text>
        </TouchableOpacity>
      </Box>
    );
  }

  const orderLabel = String(feature.order ?? 0).padStart(2, '0');
  const isActive = Number(feature.status) === 1;
  const hasImage = Boolean(feature.image);
  const hasVideo = Boolean(feature.video);

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <Box className="px-5 pb-5 pt-14">
          <HStack className="mb-2 items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
              <HStack className="items-center space-x-1">
                <Feather name="arrow-left" size={16} color="#fff" />
                <Text style={styles.headerBackText}>Back</Text>
              </HStack>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerEditBtn}
              onPress={() =>
                router.push({
                  pathname: '/pages/features/feature-editor',
                  params: { id: feature._id || feature.id },
                })
              }
            >
              <HStack className="items-center space-x-1">
                <Feather name="edit-2" size={13} color="#1D4ED8" />
                <Text style={styles.headerEditText}>Edit</Text>
              </HStack>
            </TouchableOpacity>
          </HStack>

          <Heading size="xl" style={{ color: '#fff' }}>
            Feature Details
          </Heading>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            View feature preview, status & configurations
          </Text>
        </Box>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card 1: Website Feature Section Preview */}
        <Box style={styles.card}>
          <HStack className="mb-3 items-center space-x-2">
            <Feather name="layout" size={16} color="#2563EB" />
            <Text style={styles.cardTitle}>Website Feature Section Preview</Text>
          </HStack>

          {/* Dark Container Mockup */}
          <Box style={styles.darkPreviewBox}>
            {/* Header / Main Title Block */}
            <Box style={styles.previewHeaderBlock}>
              <Text style={styles.orderLabelText}>{orderLabel}</Text>
              <Text style={styles.featureTitleText}>{feature.title}</Text>
              {feature.description ? (
                <Text style={styles.featureDescText}>{feature.description}</Text>
              ) : null}
            </Box>

            {/* Feature Points Timeline */}
            <Box style={styles.pointsTimelineBlock}>
              <Text style={styles.timelineSectionTitle}>HIGHLIGHTS & STEPS</Text>

              {feature.feature_points && feature.feature_points.length > 0 ? (
                <View style={styles.timelineContainer}>
                  {/* Vertical connecting line */}
                  <View style={styles.timelineLine} />

                  {feature.feature_points.map((pt, i) => (
                    <View key={pt._id || i} style={styles.timelineItem}>
                      {/* Step Dot */}
                      <View style={styles.stepDot}>
                        <Feather name="check" size={10} color="#fff" />
                      </View>

                      <Text style={styles.stepNumberText}>
                        STEP {String(i + 1).padStart(2, '0')}
                      </Text>
                      {pt.point_title ? (
                        <Text style={styles.stepTitleText}>{pt.point_title}</Text>
                      ) : null}
                      {pt.point_description ? (
                        <Text style={styles.stepDescText}>{pt.point_description}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyPointsText}>No feature points added.</Text>
              )}
            </Box>

            {/* Media Block */}
            <Box style={styles.previewMediaBlock}>
              {hasVideo ? (
                <Box style={styles.videoBox}>
                  <Feather name="video" size={32} color="#38bdf8" />
                  <Text style={styles.videoText}>Video Content Attached</Text>
                  <Text style={styles.videoSubtext} numberOfLines={1}>
                    {feature.video}
                  </Text>
                </Box>
              ) : hasImage ? (
                <TouchableOpacity onPress={() => setImageModalVisible(true)}>
                  <Image
                    source={{ uri: getMediaUrl(feature.image) }}
                    style={styles.imageBox}
                    resizeMode="cover"
                  />
                  <Text style={styles.tapToViewText}>Tap to inspect full image</Text>
                </TouchableOpacity>
              ) : (
                <Box style={styles.noMediaBox}>
                  <Feather name="image" size={24} color="#475569" />
                  <Text style={styles.noMediaText}>No media uploaded</Text>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Card 2: Publishing Info */}
        <Box style={styles.card}>
          <HStack className="mb-4 items-center space-x-2">
            <Feather name="globe" size={16} color="#2563EB" />
            <Text style={styles.cardTitle}>Publishing Info</Text>
          </HStack>

          <VStack space="sm">
            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Box style={[styles.statusChip, isActive ? styles.chipActive : styles.chipInactive]}>
                <Text
                  style={[
                    styles.statusChipText,
                    isActive ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </Box>
            </HStack>

            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Display Order</Text>
              <Text style={styles.infoValue}>{feature.order ?? 0}</Text>
            </HStack>

            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Slug</Text>
              <Text style={styles.infoValue}>{feature.slug || '-'}</Text>
            </HStack>

            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created At</Text>
              <Text style={styles.infoValue}>{formatDate(feature.createdAt)}</Text>
            </HStack>

            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Updated At</Text>
              <Text style={styles.infoValue}>{formatDate(feature.updatedAt)}</Text>
            </HStack>
          </VStack>
        </Box>

        {/* Card 3: Settings Info */}
        <Box style={styles.card}>
          <HStack className="mb-4 items-center space-x-2">
            <Feather name="sliders" size={16} color="#2563EB" />
            <Text style={styles.cardTitle}>Settings & Overview</Text>
          </HStack>

          <VStack space="sm">
            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Has Image</Text>
              <Box style={[styles.statusChip, hasImage ? styles.chipActive : styles.chipInactive]}>
                <Text
                  style={[
                    styles.statusChipText,
                    hasImage ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  {hasImage ? 'Yes' : 'No'}
                </Text>
              </Box>
            </HStack>

            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Has Video</Text>
              <Box style={[styles.statusChip, hasVideo ? styles.chipActive : styles.chipInactive]}>
                <Text
                  style={[
                    styles.statusChipText,
                    hasVideo ? styles.chipTextActive : styles.chipTextInactive,
                  ]}
                >
                  {hasVideo ? 'Yes' : 'No'}
                </Text>
              </Box>
            </HStack>

            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Feature Points Count</Text>
              <Text style={styles.infoValue}>{feature.feature_points?.length ?? 0}</Text>
            </HStack>
          </VStack>
        </Box>
      </ScrollView>

      {/* Full Screen Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <Box style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setImageModalVisible(false)}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          {hasImage ? (
            <Image
              source={{ uri: getMediaUrl(feature.image) }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          ) : null}
        </Box>
      </Modal>
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
  headerEditBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerEditText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
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
  darkPreviewBox: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginTop: 4,
  },
  previewHeaderBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
    marginBottom: 12,
  },
  orderLabelText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e2e8f0',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  featureTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fb923c',
    marginBottom: 6,
  },
  featureDescText: { fontSize: 13, color: '#94a3b8', lineHeight: 18 },
  pointsTimelineBlock: {
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 14,
    marginBottom: 14,
  },
  timelineSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 10,
  },
  timelineContainer: { position: 'relative', paddingLeft: 22 },
  timelineLine: {
    position: 'absolute',
    left: 7,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: '#1e293b',
  },
  timelineItem: { marginBottom: 12, position: 'relative' },
  stepDot: {
    position: 'absolute',
    left: -22,
    top: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 10, fontWeight: '700', color: '#fb923c' },
  stepTitleText: { fontSize: 13, fontWeight: '700', color: '#f8fafc', marginTop: 1 },
  stepDescText: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  emptyPointsText: { fontSize: 12, color: '#64748b', fontStyle: 'italic' },
  previewMediaBlock: { marginTop: 4 },
  videoBox: {
    backgroundColor: '#0b1220',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    alignItems: 'center',
  },
  videoText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600', marginTop: 6 },
  videoSubtext: { color: '#64748b', fontSize: 11, marginTop: 2 },
  imageBox: { width: '100%', height: 160, borderRadius: 10 },
  tapToViewText: { fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  noMediaBox: {
    backgroundColor: '#0b1220',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 20,
    alignItems: 'center',
  },
  noMediaText: { color: '#64748b', fontSize: 12, marginTop: 4 },
  infoRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chipActive: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  chipInactive: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#15803d' },
  chipTextInactive: { color: '#dc2626' },
  backButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalImage: { width: '90%', height: '80%' },
});
