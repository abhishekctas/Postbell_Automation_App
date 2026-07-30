import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  createFeature,
  updateFeature,
  getFeatureDetails,
  generateFeatureSlug,
  FeaturePoint,
  FeatureFormData,
  BASE,
} from './features.api';

const LIMITS = {
  title: 200,
  slug: 200,
  description: 2000,
  pointTitle: 200,
  pointDescription: 1000,
  maxPoints: 20,
};

export default function FeatureEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState('0');
  const [status, setStatus] = useState<number>(1);

  // Media
  const [image, setImage] = useState('');
  const [video, setVideo] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [removeVideo, setRemoveVideo] = useState(false);

  // Feature Points
  const [featurePoints, setFeaturePoints] = useState<FeaturePoint[]>([
    { point_title: '', point_description: '', icon: 'star' },
  ]);

  // Image Preview Modal
  const [previewImageModal, setPreviewImageModal] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');

  const loadFeatureData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getFeatureDetails(id);
      setTitle(data.title || '');
      setSlug(data.slug || '');
      setDescription(data.description || '');
      setOrder(data.order !== undefined ? String(data.order) : '0');
      setStatus(Number(data.status) === 0 ? 0 : 1);
      setImage(data.image || '');
      setVideo(data.video || '');
      setRemoveImage(false);
      setRemoveVideo(false);

      if (data.feature_points && data.feature_points.length > 0) {
        setFeaturePoints(data.feature_points);
      } else {
        setFeaturePoints([{ point_title: '', point_description: '', icon: 'star' }]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load feature data.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (isEditMode) {
      loadFeatureData();
    }
  }, [isEditMode, loadFeatureData]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditMode) {
      setSlug(generateFeatureSlug(val));
    }
  };

  const handleAddPoint = () => {
    if (featurePoints.length >= LIMITS.maxPoints) {
      Alert.alert('Limit Reached', `Maximum ${LIMITS.maxPoints} feature points allowed.`);
      return;
    }
    setFeaturePoints((prev) => [
      ...prev,
      { point_title: '', point_description: '', icon: 'check' },
    ]);
  };

  const handlePointChange = (index: number, field: keyof FeaturePoint, value: string) => {
    setFeaturePoints((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemovePoint = (index: number) => {
    if (featurePoints.length <= 1) {
      Alert.alert('Notice', 'At least one feature point is required.');
      return;
    }
    setFeaturePoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveImageAction = () => {
    Alert.alert('Remove Image', 'Are you sure you want to remove the feature image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setImage('');
          setRemoveImage(true);
        },
      },
    ]);
  };

  const handleRemoveVideoAction = () => {
    Alert.alert('Remove Video', 'Are you sure you want to remove the feature video?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setVideo('');
          setRemoveVideo(true);
        },
      },
    ]);
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Feature title is required.');
      return false;
    }
    if (!slug.trim()) {
      Alert.alert('Validation Error', 'Slug is required.');
      return false;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      Alert.alert(
        'Validation Error',
        'Slug must contain only lowercase letters, numbers, and hyphens (e.g., ai-editor).'
      );
      return false;
    }
    for (let i = 0; i < featurePoints.length; i++) {
      if (!featurePoints[i].point_title.trim()) {
        Alert.alert('Validation Error', `Point #${i + 1} title is required.`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || saving) return;

    try {
      setSaving(true);
      const payload: FeatureFormData = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        order: Number(order) || 0,
        status: status === 1 ? 1 : 0,
        image,
        video,
        removeImage,
        removeVideo,
        feature_points: featurePoints.map((pt) => ({
          point_title: pt.point_title.trim(),
          point_description: pt.point_description?.trim() || '',
          icon: pt.icon || 'star',
        })),
      };

      if (isEditMode && id) {
        await updateFeature(id, payload);
        Alert.alert('Success', 'Feature updated successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        await createFeature(payload);
        Alert.alert('Success', 'Feature created successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save feature.');
    } finally {
      setSaving(false);
    }
  };

  const getMediaUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
      return path;
    }
    return `${BASE}/${path}`;
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-sm text-slate-500">Loading feature details...</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <Box className="px-5 pb-5 pt-14">
          <HStack className="mb-2 items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <HStack className="items-center space-x-1">
                <Feather name="arrow-left" size={16} color="#fff" />
                <Text style={styles.backBtnText}>Back</Text>
              </HStack>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerSaveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.headerSaveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </HStack>

          <Heading size="xl" style={{ color: '#fff' }}>
            {isEditMode ? 'Edit Feature' : 'Create Feature'}
          </Heading>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            Manage feature content, media & publications
          </Text>
        </Box>
      </LinearGradient>

      {/* Main Content Form */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Basic Info */}
        <Box style={styles.sectionCard}>
          <HStack className="mb-4 items-center space-x-2">
            <Feather name="info" size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>Basic Info</Text>
          </HStack>

          <VStack space="md">
            {/* Title */}
            <VStack space="xs">
              <HStack className="items-center justify-between">
                <Text style={styles.inputLabel}>Feature Title *</Text>
                <Text style={styles.charCounter}>
                  {title.length} / {LIMITS.title}
                </Text>
              </HStack>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={handleTitleChange}
                placeholder="e.g. AI Writer & Editor"
                placeholderTextColor="#94a3b8"
                maxLength={LIMITS.title}
              />
            </VStack>

            {/* Slug */}
            <VStack space="xs">
              <HStack className="items-center justify-between">
                <Text style={styles.inputLabel}>Slug *</Text>
                <Text style={styles.charCounter}>
                  {slug.length} / {LIMITS.slug}
                </Text>
              </HStack>
              <TextInput
                style={styles.textInput}
                value={slug}
                onChangeText={setSlug}
                placeholder="e.g. ai-writer-editor"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                maxLength={LIMITS.slug}
              />
              <Text style={styles.helpText}>Lowercase letters, numbers and hyphens only</Text>
            </VStack>

            {/* Description */}
            <VStack space="xs">
              <HStack className="items-center justify-between">
                <Text style={styles.inputLabel}>Description</Text>
                <Text style={styles.charCounter}>
                  {description.length} / {LIMITS.description}
                </Text>
              </HStack>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description of feature..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={LIMITS.description}
              />
            </VStack>
          </VStack>
        </Box>

        {/* Section 2: Media */}
        <Box style={styles.sectionCard}>
          <HStack className="mb-4 items-center space-x-2">
            <Feather name="image" size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>Media Content</Text>
          </HStack>

          <VStack space="md">
            {/* Feature Image URL / Path */}
            <VStack space="xs">
              <Text style={styles.inputLabel}>Feature Image (URL or Path)</Text>
              <TextInput
                style={styles.textInput}
                value={image}
                onChangeText={(val) => {
                  setImage(val);
                  if (removeImage) setRemoveImage(false);
                }}
                placeholder="Enter image URL or filename"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              {image ? (
                <Box style={styles.mediaPreviewCard}>
                  <Image
                    source={{ uri: getMediaUrl(image) }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <HStack style={styles.mediaActionRow}>
                    <TouchableOpacity
                      style={styles.mediaBtn}
                      onPress={() => {
                        setPreviewImageSrc(getMediaUrl(image));
                        setPreviewImageModal(true);
                      }}
                    >
                      <Feather name="eye" size={13} color="#2563EB" />
                      <Text style={styles.mediaBtnText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.mediaBtn, styles.mediaBtnDanger]}
                      onPress={handleRemoveImageAction}
                    >
                      <Feather name="trash-2" size={13} color="#dc2626" />
                      <Text style={[styles.mediaBtnText, { color: '#dc2626' }]}>Delete</Text>
                    </TouchableOpacity>
                  </HStack>
                </Box>
              ) : null}
            </VStack>

            {/* Feature Video URL / Path */}
            <VStack space="xs">
              <Text style={styles.inputLabel}>Feature Video (URL or Path)</Text>
              <TextInput
                style={styles.textInput}
                value={video}
                onChangeText={(val) => {
                  setVideo(val);
                  if (removeVideo) setRemoveVideo(false);
                }}
                placeholder="Enter video URL or filename (mp4)"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              {video ? (
                <Box style={styles.mediaPreviewCard}>
                  <Box className="flex-row items-center justify-between rounded-lg bg-slate-900 p-3">
                    <HStack className="items-center space-x-2">
                      <Feather name="video" size={16} color="#38bdf8" />
                      <Text className="text-xs font-semibold text-white" numberOfLines={1}>
                        {video}
                      </Text>
                    </HStack>
                    <TouchableOpacity onPress={handleRemoveVideoAction}>
                      <Feather name="trash-2" size={14} color="#f87171" />
                    </TouchableOpacity>
                  </Box>
                </Box>
              ) : null}
            </VStack>

            {/* Media guidelines notice */}
            <Box style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>Media Upload Guidelines</Text>
              <Text style={styles.noticeItem}>
                • Video has higher priority than image when both are set.
              </Text>
              <Text style={styles.noticeItem}>
                • Supported formats: JPG, PNG, WEBP for image | MP4 for video.
              </Text>
            </Box>
          </VStack>
        </Box>

        {/* Section 3: Publish Settings */}
        <Box style={styles.sectionCard}>
          <HStack className="mb-4 items-center space-x-2">
            <Feather name="settings" size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>Publish Settings</Text>
          </HStack>

          <HStack space="md">
            <VStack space="xs" style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Display Order</Text>
              <TextInput
                style={styles.textInput}
                value={order}
                onChangeText={setOrder}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.helpText}>Lower number = shown first</Text>
            </VStack>

            <VStack space="xs" style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Status *</Text>
              <HStack space="xs" className="mt-0.5">
                <TouchableOpacity
                  style={[styles.statusToggle, status === 1 && styles.statusToggleActive]}
                  onPress={() => setStatus(1)}
                >
                  <Text
                    style={[styles.statusToggleText, status === 1 && styles.statusToggleTextActive]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusToggle, status === 0 && styles.statusToggleInactive]}
                  onPress={() => setStatus(0)}
                >
                  <Text
                    style={[
                      styles.statusToggleText,
                      status === 0 && styles.statusToggleTextInactive,
                    ]}
                  >
                    Inactive
                  </Text>
                </TouchableOpacity>
              </HStack>
              <Text style={styles.helpText}>
                {status === 1 ? 'Visible on app/website' : 'Hidden from portals'}
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Section 4: Feature Points */}
        <Box style={styles.sectionCard}>
          <HStack className="mb-4 items-center justify-between">
            <HStack className="items-center space-x-2">
              <Feather name="list" size={18} color="#2563EB" />
              <Text style={styles.sectionTitle}>Feature Points</Text>
              <Box style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {featurePoints.length}/{LIMITS.maxPoints}
                </Text>
              </Box>
            </HStack>

            <TouchableOpacity style={styles.addPointBtn} onPress={handleAddPoint}>
              <Feather name="plus" size={14} color="#2563EB" />
              <Text style={styles.addPointBtnText}>Add Point</Text>
            </TouchableOpacity>
          </HStack>

          <VStack space="md">
            {featurePoints.map((point, index) => (
              <Box key={index} style={styles.pointCard}>
                <HStack className="mb-3 items-center justify-between">
                  <HStack className="items-center space-x-2">
                    <Box style={styles.pointIndexCircle}>
                      <Text style={styles.pointIndexText}>{index + 1}</Text>
                    </Box>
                    <Text style={styles.pointHeaderLabel}>Feature Point #{index + 1}</Text>
                  </HStack>
                  {featurePoints.length > 1 ? (
                    <TouchableOpacity
                      onPress={() => handleRemovePoint(index)}
                      style={styles.removePointBtn}
                    >
                      <Feather name="trash-2" size={14} color="#dc2626" />
                    </TouchableOpacity>
                  ) : null}
                </HStack>

                <VStack space="sm">
                  <VStack space="xs">
                    <Text style={styles.inputLabel}>Point Title *</Text>
                    <TextInput
                      style={styles.subformInput}
                      value={point.point_title}
                      onChangeText={(val) => handlePointChange(index, 'point_title', val)}
                      placeholder="e.g. Instant Content Generation"
                      placeholderTextColor="#94a3b8"
                      maxLength={LIMITS.pointTitle}
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.inputLabel}>Point Description</Text>
                    <TextInput
                      style={[styles.subformInput, { minHeight: 46 }]}
                      value={point.point_description}
                      onChangeText={(val) => handlePointChange(index, 'point_description', val)}
                      placeholder="Details about this highlight..."
                      placeholderTextColor="#94a3b8"
                      multiline
                      maxLength={LIMITS.pointDescription}
                    />
                  </VStack>
                </VStack>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Save & Cancel Action Bar */}
        <VStack space="sm" className="mb-4 mt-2">
          <Button style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ButtonText style={styles.saveBtnText}>
                {isEditMode ? 'Update Feature' : 'Create Feature'}
              </ButtonText>
            )}
          </Button>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </VStack>
      </ScrollView>

      {/* Image Modal Preview */}
      <Modal
        visible={previewImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageModal(false)}
      >
        <Box style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setPreviewImageModal(false)}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          {previewImageSrc ? (
            <Image
              source={{ uri: previewImageSrc }}
              style={styles.fullModalImage}
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
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  backBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  headerSaveBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerSaveBtnText: { color: '#1D4ED8', fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionCard: {
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  charCounter: { fontSize: 10, color: '#94a3b8' },
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
  multilineInput: { minHeight: 90 },
  helpText: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  mediaPreviewCard: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  imagePreview: { width: '100%', height: 140 },
  mediaActionRow: {
    padding: 8,
    justifyContent: 'flex-end',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    gap: 4,
  },
  mediaBtnDanger: { backgroundColor: '#fef2f2' },
  mediaBtnText: { fontSize: 11, fontWeight: '600', color: '#2563EB' },
  noticeBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  noticeTitle: { fontSize: 12, fontWeight: '700', color: '#b45309', marginBottom: 4 },
  noticeItem: { fontSize: 11, color: '#92400e', marginTop: 2 },
  statusToggle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  statusToggleActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  statusToggleInactive: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  statusToggleText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  statusToggleTextActive: { color: '#15803d' },
  statusToggleTextInactive: { color: '#dc2626' },
  countBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  addPointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  addPointBtnText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  pointCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  pointIndexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointIndexText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pointHeaderLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  removePointBtn: { padding: 4 },
  subformInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
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
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullModalImage: { width: '90%', height: '80%' },
});
