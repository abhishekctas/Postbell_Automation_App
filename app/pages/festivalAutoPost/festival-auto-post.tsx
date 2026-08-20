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
  Switch,
  Image,
  Platform,
  Dimensions,
  View,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
  getFestivalPosts,
  updateFestivalPostSelection,
  updateFestivalPost,
  createFestivalPost,
  sendFestivalNotifications,
  uploadFestivalImage,
  generateFestivalPostAI,
  getFestivalImageUrl,
  type FestivalGeneratedPost,
  type UpdateFestivalPostPayload,
  type CreateFestivalPostPayload,
} from './festival-auto-post.api';
import { getCategoryToken, tokenColor, getEventColor } from './festivalColors';
import { isPastDate, formatDisplayDate, getTimeAgo } from './festival-auto-post.dateUtils';
import FestivalCalendarView from './FestivalCalendarView';
import StatusConfirmDialog from '@/components/common/StatusConfirmDialog';
import { Plus } from 'lucide-react-native';

type ViewMode = 'feed' | 'calendar';

const CATEGORY_SUGGESTIONS = [
  'Religious',
  'National',
  'Cultural',
  'Seasonal',
  'Regional',
  'International',
];

const LIMIT_OPTIONS = [10, 20, 30, 50, 100];

/* ------------------------------------------------------------------ */
/*  Instagram-style Feed Card Component                               */
/* ------------------------------------------------------------------ */

function FestivalPostCard({
  post,
  isSelected,
  expandedCaption,
  expandedHashtag,
  notificationLoading,
  onToggleCaption,
  onToggleHashtag,
  onSelectPost,
  onEditPost,
  onSendNotification,
  onViewImage,
}: {
  post: FestivalGeneratedPost;
  isSelected: boolean;
  expandedCaption: boolean;
  expandedHashtag: boolean;
  notificationLoading: boolean;
  onToggleCaption: (expanded: boolean) => void;
  onToggleHashtag: (expanded: boolean) => void;
  onSelectPost: (checked: boolean) => void;
  onEditPost: () => void;
  onSendNotification: () => void;
  onViewImage: () => void;
}) {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const catToken = getCategoryToken(post.category, post.name);
  const catColors = tokenColor(catToken);
  const eventColors = getEventColor(post.category, post.name);
  const imageUrl = getFestivalImageUrl(post.image || post.image_url);
  const visibleHashtags = post.hashtags?.slice(0, expandedHashtag ? post.hashtags.length : 5);
  const hasMoreHashtags = (post.hashtags?.length || 0) > 5 && !expandedHashtag;

  const openActionMenu = () => {
    setActionMenuOpen(true);
  };

  return (
    <Box style={styles.igCard}>
      {/* Header — Avatar, Name, Auto Post badge, check badge, 3-dot menu */}
      <HStack style={styles.igCardHeader} className="items-center">
        <Box
          style={[
            styles.igAvatar,
            {
              backgroundColor: eventColors.bg,
              borderColor: isSelected ? '#193867' : `${eventColors.main}40`,
            },
          ]}
        >
          <Text style={[styles.igAvatarText, { color: eventColors.main }]}>
            {(post.name || 'F').charAt(0).toUpperCase()}
          </Text>
        </Box>
        <VStack style={{ flex: 1, minWidth: 0 }}>
          <HStack className="items-center" space="xs">
            <TouchableOpacity onPress={onEditPost}>
              <Text style={styles.igCardName} numberOfLines={1}>
                {post.name}
              </Text>
            </TouchableOpacity>
            {post.isAutoPost && (
              <Box style={styles.autoPostChip}>
                <Text style={styles.autoPostChipText}>Auto Post</Text>
              </Box>
            )}
            {isSelected && <Feather name="check-circle" size={14} color="#193867" />}
          </HStack>
        </VStack>
        <TouchableOpacity onPress={openActionMenu} style={styles.igMenuBtn}>
          <Feather name="more-horizontal" size={18} color="#0f172a" />
        </TouchableOpacity>
      </HStack>

      {/* Post Image — 4:5 ratio */}
      <TouchableOpacity activeOpacity={0.95} onPress={onViewImage}>
        <Box style={styles.igImageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.igImage} resizeMode="cover" />
          ) : (
            <Box style={styles.igImagePlaceholder}>
              <Feather name="image" size={36} color="#94a3b8" />
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>No Image</Text>
            </Box>
          )}
        </Box>
      </TouchableOpacity>

      {/* Action icons row */}
      <HStack style={styles.igActions} className="items-center justify-between">
        <HStack className="items-center">
          <TouchableOpacity style={styles.igActionBtn}>
            <Feather name="heart" size={22} color="#ef4444" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.igActionBtn}
            onPress={onSendNotification}
            disabled={notificationLoading}
          >
            {notificationLoading ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Feather name="send" size={21} color="#0f172a" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.igActionBtn} onPress={onEditPost}>
            <Feather name="edit-2" size={21} color="#0f172a" />
          </TouchableOpacity>
        </HStack>
        <HStack className="items-center">
          <Switch
            value={isSelected}
            onValueChange={(val) => onSelectPost(val)}
            trackColor={{ false: '#e2e8f0', true: '#34c759' }}
            thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
          {/* <TouchableOpacity style={styles.igActionBtn} onPress={onViewImage}>
            <Feather name="bookmark" size={21} color="#0f172a" />
          </TouchableOpacity> */}
        </HStack>
      </HStack>

      {/* Chips row: Status + Category + Scheduled/AI Auto + Date */}
      <HStack style={styles.igChipRow} className="flex-wrap items-center">
        <Box
          style={[
            styles.statusChip,
            {
              backgroundColor: isSelected ? 'rgba(22, 163, 74, 0.1)' : '#f1f5f9',
            },
          ]}
        >
          <Text style={[styles.statusChipText, { color: isSelected ? '#16a34a' : '#94a3b8' }]}>
            {isSelected ? 'Active' : 'Deactive'}
          </Text>
        </Box>

        <Box style={[styles.statusChip, { backgroundColor: catColors.bg }]}>
          <Text style={[styles.statusChipText, { color: catColors.main }]}>
            {post.category || 'General'}
          </Text>
        </Box>

        {post.post_status && (
          <Box style={[styles.statusChip, { backgroundColor: '#dbeafe' }]}>
            <Text style={[styles.statusChipText, { color: '#2563eb' }]}>
              {post.post_status === 'scheduled' ? 'Scheduled' : post.post_status}
            </Text>
          </Box>
        )}

        {post.autoGenerate && (
          <Box style={[styles.statusChip, { backgroundColor: '#f3e8ff' }]}>
            <Text style={[styles.statusChipText, { color: '#9333ea' }]}>AI Auto</Text>
          </Box>
        )}

        <Text style={styles.igDateText}>{formatDisplayDate(post.date)}</Text>
      </HStack>

      {/* Caption & Hashtags & Timestamp */}
      <Box style={styles.igCaptionWrap}>
        {post.caption ? (
          <Box style={{ marginBottom: 4 }}>
            <Text style={styles.igCaption} numberOfLines={expandedCaption ? undefined : 2}>
              <Text style={styles.igCaptionName}>{post.name} </Text>
              {post.caption}
            </Text>
            {!expandedCaption && (post.caption.length || 0) > 80 && (
              <TouchableOpacity onPress={() => onToggleCaption(true)}>
                <Text style={styles.igMoreText}>more</Text>
              </TouchableOpacity>
            )}
            {expandedCaption && (
              <TouchableOpacity onPress={() => onToggleCaption(false)}>
                <Text style={styles.igMoreText}>less</Text>
              </TouchableOpacity>
            )}
          </Box>
        ) : null}

        {visibleHashtags && visibleHashtags.length > 0 && (
          <Text style={styles.igHashtags}>
            {visibleHashtags.map((tag) => `#${tag.replace(/^#/, '')}`).join(' ')}
            {hasMoreHashtags && (
              <Text style={styles.igMoreText} onPress={() => onToggleHashtag(true)}>
                {' '}
                +{(post.hashtags?.length || 0) - 5} more
              </Text>
            )}
            {expandedHashtag && (post.hashtags?.length || 0) > 5 && (
              <Text style={styles.igMoreText} onPress={() => onToggleHashtag(false)}>
                {' '}
                show less
              </Text>
            )}
          </Text>
        )}

        <Text style={styles.igTimeAgo}>{getTimeAgo(post.date)}</Text>
      </Box>

      {/* ── ACTION MENU POPUP MODAL ────────────────────────────────────── */}
      <Modal
        visible={actionMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalOverlay}
          activeOpacity={1}
          onPress={() => setActionMenuOpen(false)}
        >
          <Box style={styles.actionMenuModalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.actionMenuModalTitle} numberOfLines={1}>
              {post.name || 'Festival Post'}
            </Text>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setActionMenuOpen(false);
                onEditPost();
              }}
            >
              <Feather name="edit-2" size={16} color="#2563EB" />
              <Text style={styles.actionMenuItemText}>Edit post</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setActionMenuOpen(false);
                onSendNotification();
              }}
            >
              <Feather name="send" size={16} color="#059669" />
              <Text style={styles.actionMenuItemText}>Send notification</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => {
                setActionMenuOpen(false);
                onViewImage();
              }}
            >
              <Feather name="eye" size={16} color="#475569" />
              <Text style={styles.actionMenuItemText}>View full image</Text>
            </TouchableOpacity>

            <Box style={styles.actionMenuDivider} />

            <TouchableOpacity
              style={styles.actionMenuCancelBtn}
              onPress={() => setActionMenuOpen(false)}
            >
              <Text style={styles.actionMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Box>
        </TouchableOpacity>
      </Modal>
    </Box>
  );
}

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

/* ------------------------------------------------------------------ */
/*  Main Screen Component                                             */
/* ------------------------------------------------------------------ */

export default function FestivalAutoPostScreen() {
  const [posts, setPosts] = useState<FestivalGeneratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('feed');
  const [selectedPosts, setSelectedPosts] = useState<Record<string, boolean>>({});
  const [limitDropdownOpen, setLimitDropdownOpen] = useState(false);

  const [notificationLoadingId, setNotificationLoadingId] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});
  const [expandedHashtags, setExpandedHashtags] = useState<Record<string, boolean>>({});
  const [imageViewer, setImageViewer] = useState<{ open: boolean; src: string; alt: string }>({
    open: false,
    src: '',
    alt: '',
  });

  // Status confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    post: FestivalGeneratedPost | null;
    type: 'active' | 'deactive' | null;
    loading: boolean;
  }>({
    open: false,
    post: null,
    type: null,
    loading: false,
  });

  // Add / Edit Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const modalScrollViewRef = useRef<ScrollView>(null);
  const [editingPost, setEditingPost] = useState<FestivalGeneratedPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'active' | 'deactive'>('active');
  const [selectedFestival, setSelectedFestival] = useState(true);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState<Date | null>(null);
  const [generatingType, setGeneratingType] = useState<'gemini' | 'openai' | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fetchFestivalPostsList = useCallback(async () => {
    try {
      setLoading(true);
      const shouldLoadAllForCalendar = viewMode === 'calendar';
      const queryParams = new URLSearchParams();
      queryParams.append('page', shouldLoadAllForCalendar ? '1' : page.toString());
      queryParams.append('limit', shouldLoadAllForCalendar ? '1000' : limit.toString());

      if (search.trim()) {
        queryParams.append('search', search.trim());
      }

      queryParams.append('currentMonth', 'true');

      const res = await getFestivalPosts(queryParams.toString());

      const items = res?.data || [];
      setPosts(items);
      setSelectedPosts(
        items.reduce(
          (acc, p) => {
            acc[p.id] = Boolean(p.selectedFestival);
            return acc;
          },
          {} as Record<string, boolean>
        )
      );
      setTotal(res?.pagination?.total || items.length);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error loading festival posts:', err);
      Alert.alert('Error', err.message || 'Failed to load festival posts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, search, viewMode]);

  useEffect(() => {
    fetchFestivalPostsList();
  }, [fetchFestivalPostsList]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFestivalPostsList();
  };

  const getPostId = (post: FestivalGeneratedPost) => post._id || post.id || post.festivalId;

  // Toggle selection with confirm dialog
  const handleOpenStatusConfirm = (post: FestivalGeneratedPost, nextVal: boolean) => {
    setConfirmDialog({
      open: true,
      post,
      type: nextVal ? 'active' : 'deactive',
      loading: false,
    });
  };

  const handleConfirmStatus = async () => {
    if (!confirmDialog.post || !confirmDialog.type) return;
    const post = confirmDialog.post;
    const isActivating = confirmDialog.type === 'active';
    const postId = getPostId(post);

    try {
      setConfirmDialog((prev) => ({ ...prev, loading: true }));
      await updateFestivalPostSelection(postId, isActivating);
      setPosts((prev) =>
        prev.map((p) => (getPostId(p) === postId ? { ...p, selectedFestival: isActivating } : p))
      );
      setSelectedPosts((prev) => ({
        ...prev,
        [postId]: isActivating,
      }));
      setConfirmDialog({ open: false, post: null, type: null, loading: false });
      Alert.alert(
        'Success',
        `Festival automated posting ${isActivating ? 'enabled' : 'disabled'}.`
      );
    } catch (e: any) {
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
      Alert.alert('Error', e.message || 'Failed to update festival selection.');
    }
  };

  const handleSendNotification = async (item: FestivalGeneratedPost) => {
    try {
      setNotificationLoadingId(item.name);
      const res = await sendFestivalNotifications(item.name);
      Alert.alert(
        'Notifications Sent',
        res.message || `Successfully triggered notifications for ${item.name}!`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to trigger notifications.');
    } finally {
      setNotificationLoadingId(null);
    }
  };

  const resetForm = () => {
    setName('');
    setDate('');
    setCategory('');
    setStatus('active');
    setSelectedFestival(true);
    setAutoGenerate(false);
    setCaption('');
    setHashtags([]);
    setHashtagInput('');
    setImageUrl('');
    setLocalImageUri(null);
    setImageError(null);
    setTouched({});
    setGeneratingType(null);
  };

  const handleOpenAdd = (initialDate?: Date | null) => {
    setEditingPost(null);
    resetForm();
    const targetDate = initialDate ?? new Date();
    if (isPastDate(targetDate)) {
      Alert.alert('Validation Error', 'Cannot create a festival post for a past date');
      return;
    }
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${d}`);
    setDatePickerValue(targetDate);
    setModalVisible(true);
  };

  const handleOpenEdit = (post: FestivalGeneratedPost) => {
    setEditingPost(post);
    setName(post.name || '');
    setDate(post.date || '');
    setCategory(post.category || '');
    setStatus(post.status || 'active');
    setSelectedFestival(Boolean(post.selectedFestival));
    setAutoGenerate(Boolean(post.autoGenerate));
    setCaption(post.caption || '');
    setHashtags(post.hashtags ? [...post.hashtags] : []);
    setHashtagInput('');
    setImageUrl(post.image || post.image_url || '');
    setLocalImageUri(null);
    setImageError(null);
    setTouched({});
    setDatePickerValue(post.date ? new Date(post.date) : new Date());
    setModalVisible(true);
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      if (isPastDate(selectedDate)) {
        Alert.alert('Validation Error', 'Date cannot be in the past');
        return;
      }
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      setDate(`${y}-${m}-${d}`);
      setDatePickerValue(selectedDate);
      setTouched((prev) => ({ ...prev, date: true }));
    }
  };

  const openDatePicker = () => {
    const currentDate = date ? new Date(date) : new Date();
    setDatePickerValue(isNaN(currentDate.getTime()) ? new Date() : currentDate);
    setShowDatePicker(true);
  };

  const processHashtags = (input: string) => {
    if (!input.trim()) return;
    const hashtagRegex = /#?(\w+)/g;
    const matches = [...input.matchAll(hashtagRegex)];
    const newTags = matches
      .map((match) => match[1].trim().toLowerCase())
      .filter((tag) => tag.length > 0);
    if (newTags.length === 0) return;
    setHashtags((prev) => {
      const combined = [...prev];
      newTags.forEach((tag) => {
        if (!combined.includes(tag)) combined.push(tag);
      });
      return combined;
    });
    setHashtagInput('');
    setTouched((prev) => ({ ...prev, hashtags: true }));
  };

  const handleAddHashtag = () => {
    const value = hashtagInput.trim().replace(/^#+/, '');
    if (!value) return;
    if (hashtags.includes(value)) {
      setHashtagInput('');
      return;
    }
    setHashtags((prev) => [...prev, value]);
    setHashtagInput('');
    setTouched((prev) => ({ ...prev, hashtags: true }));
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
    setTouched((prev) => ({ ...prev, hashtags: true }));
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setImageError('Image must be less than 5 MB');
        return;
      }
      setLocalImageUri(asset.uri);
      setImageError(null);
      setTouched((prev) => ({ ...prev, image: true }));
    }
  };

  const handleGenerateAI = async (provider: 'gemini' | 'openai') => {
    if (!name.trim() || !category.trim()) {
      Alert.alert('Validation Error', 'Festival name and category are required for AI generation.');
      return;
    }
    setGeneratingType(provider);
    try {
      const prompt = `Generate a festival post for ${name.trim()} (${category.trim()})`;
      const res = await generateFestivalPostAI(provider, {
        prompt,
        referenceImageUri: localImageUri || undefined,
      });
      const aiPost = res?.data?.posts?.[0];
      if (aiPost) {
        if (aiPost.caption) setCaption(aiPost.caption);
        if (aiPost.hashtags) {
          setHashtags((aiPost.hashtags || []).map((tag: string) => tag.replace(/^#/, '').trim()));
        }
        const aiImage = aiPost.image_url || aiPost.image;
        if (aiImage) {
          setImageUrl(aiImage);
          setLocalImageUri(null);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'AI generation failed.');
    } finally {
      setGeneratingType(null);
    }
  };

  const hasName = name.trim().length > 0;
  const hasDate = date.trim().length > 0;
  const isDateInPast = hasDate && isPastDate(date);
  const hasCategory = category.trim().length > 0;
  const hasCaption = caption.trim().length > 0;
  const hasHashtags = hashtags.length > 0;
  const hasImage = Boolean(localImageUri || imageUrl);

  const handleSave = async () => {
    setTouched({
      name: true,
      date: true,
      category: true,
      caption: true,
      hashtags: true,
      image: true,
    });

    if (
      !hasName ||
      !hasDate ||
      isDateInPast ||
      !hasCategory ||
      !hasCaption ||
      !hasHashtags ||
      !hasImage
    ) {
      modalScrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    try {
      setSaving(true);
      let finalImageUrl = imageUrl;

      if (localImageUri) {
        const uploadRes = await uploadFestivalImage(localImageUri);
        if (uploadRes.data?.url) {
          finalImageUrl = uploadRes.data.url;
        } else {
          throw new Error('Failed to upload image');
        }
      }

      if (editingPost) {
        const payload: UpdateFestivalPostPayload = {
          name: name.trim(),
          date,
          category: category.trim(),
          status,
          selectedFestival,
          autoGenerate,
          caption: caption.trim(),
          hashtags,
          image: finalImageUrl,
        };
        const response = await updateFestivalPost(getPostId(editingPost), payload);
        const updated = response.data;
        setPosts((prev) =>
          prev.map((p) =>
            getPostId(p) === getPostId(editingPost)
              ? { ...p, ...(updated || {}), ...payload, date: payload.date || p.date }
              : p
          )
        );
        Alert.alert('Success', 'Festival event updated!');
      } else {
        const payload: CreateFestivalPostPayload = {
          name: name.trim(),
          date,
          category: category.trim(),
          status,
          selectedFestival,
          autoGenerate,
          caption: caption.trim(),
          hashtags,
          image: finalImageUrl,
        };
        const response = await createFestivalPost(payload);
        const created = response.data;
        if (created) {
          setPosts((prev) => [created, ...prev]);
        }
        Alert.alert('Success', 'Festival event created!');
      }

      setModalVisible(false);
      resetForm();
      fetchFestivalPostsList();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save festival configuration.');
    } finally {
      setSaving(false);
    }
  };

  const previewImageUri = localImageUri || (imageUrl ? getFestivalImageUrl(imageUrl) : '') || null;
  const isCreate = !editingPost;
  const headerTitle =
    name.trim() || (isCreate ? 'New Festival Event' : editingPost?.name || 'Festival');

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Top Header */}
      <LinearGradient
        colors={['#1e3a8a', '#2563eb', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerGlowCircle1} />
        <View style={styles.headerGlowCircle2} />

        <Box className="px-5 pb-1 pt-12">
          <HStack className="items-center justify-between">
            <VStack style={{ flex: 1, paddingRight: 10 }}>
              <Heading size="xl" style={styles.headerTitle}>
                Festival Auto Posts
              </Heading>
              <Text style={styles.headerSubtitle}>
                Automate & schedule festival wishes and campaigns
              </Text>
            </VStack>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => handleOpenAdd()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.12)']}
                style={styles.addBtnGradient}
              >
                <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.addBtnText}>Add Event</Text>
              </LinearGradient>
            </TouchableOpacity>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Main Container Card */}
      <Box style={styles.mainCard}>
        {/* Filter & View Mode Controls Section matching customer page */}
        <Box style={styles.filterSection}>
          <HStack space="sm" className="items-center">
            {/* Search Input */}
            <Box style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
              <View pointerEvents="none" style={styles.searchIcon}>
                <Feather name="search" size={16} color="#94a3b8" />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={(text) => {
                  setSearch(text);
                  setPage(1);
                }}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  style={{ position: 'absolute', right: 12, zIndex: 1 }}
                >
                  <Feather name="x" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </Box>

            {/* View Mode Toggle: Feed vs Calendar */}
            <HStack style={styles.viewModeToggle}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setViewMode('feed')}
                style={[styles.viewModeBtn, viewMode === 'feed' && styles.viewModeBtnActive]}
              >
                <Ionicons
                  name="grid-outline"
                  size={15}
                  color={viewMode === 'feed' ? '#ffffff' : '#334155'}
                />
                <Text
                  style={[
                    styles.viewModeBtnText,
                    viewMode === 'feed' && styles.viewModeBtnTextActive,
                  ]}
                >
                  Feed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setViewMode('calendar')}
                style={[styles.viewModeBtn, viewMode === 'calendar' && styles.viewModeBtnActive]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={viewMode === 'calendar' ? '#ffffff' : '#334155'}
                />
                <Text
                  style={[
                    styles.viewModeBtnText,
                    viewMode === 'calendar' && styles.viewModeBtnTextActive,
                  ]}
                >
                  Calendar
                </Text>
              </TouchableOpacity>
            </HStack>

            {/* Refresh button */}
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => {
                setPage(1);
                setSearch('');
                fetchFestivalPostsList();
              }}
              disabled={loading}
            >
              <Feather name="rotate-cw" size={16} color="#2563EB" />
            </TouchableOpacity>
          </HStack>
        </Box>

        {/* Main Content Area */}
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
          }
        >
          {/* Loading Spinner */}
          {loading ? (
            <Box className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#2563EB" />
            </Box>
          ) : viewMode === 'calendar' ? (
            /* Calendar View */
            <FestivalCalendarView
              posts={posts}
              onEditPost={handleOpenEdit}
              onCreateAtDate={handleOpenAdd}
            />
          ) : (
            /* Feed View */
            <VStack space="md">
              {posts.length === 0 ? (
                /* Empty State */
                <Box style={styles.emptyStateCard}>
                  <Box style={styles.emptyStateIconWrap}>
                    <Feather name="calendar" size={32} color="#2563EB" />
                  </Box>
                  <Text style={styles.emptyStateTitle}>No festival posts yet</Text>
                  <Text style={styles.emptyStateText}>
                    Create festival events with captions, hashtags, and images. Mark your favorites
                    as active to send notifications.
                  </Text>
                  <TouchableOpacity style={styles.emptyStateBtn} onPress={() => handleOpenAdd()}>
                    <Feather name="plus" size={16} color="#ffffff" />
                    <Text style={styles.emptyStateBtnText}>Create your first event</Text>
                  </TouchableOpacity>
                </Box>
              ) : (
                /* Feed Cards List */
                <>
                  {posts.map((post) => {
                    const postId = getPostId(post);
                    return (
                      <FestivalPostCard
                        key={postId}
                        post={post}
                        isSelected={Boolean(selectedPosts[postId] ?? post.selectedFestival)}
                        expandedCaption={expandedCaptions[postId] || false}
                        expandedHashtag={expandedHashtags[postId] || false}
                        notificationLoading={notificationLoadingId === post.name}
                        onToggleCaption={(expanded) =>
                          setExpandedCaptions((prev) => ({ ...prev, [postId]: expanded }))
                        }
                        onToggleHashtag={(expanded) =>
                          setExpandedHashtags((prev) => ({ ...prev, [postId]: expanded }))
                        }
                        onSelectPost={(checked) => handleOpenStatusConfirm(post, checked)}
                        onEditPost={() => handleOpenEdit(post)}
                        onSendNotification={() => handleSendNotification(post)}
                        onViewImage={() =>
                          setImageViewer({
                            open: true,
                            src: getFestivalImageUrl(post.image || post.image_url) || '',
                            alt: post.name || 'Festival Image',
                          })
                        }
                      />
                    );
                  })}

                  {/* Pagination Controls matching customer page */}
                  <Box style={styles.paginationCard}>
                    <HStack className="items-center justify-between " style={{ gap: 8 }}>
                      <Text style={styles.paginationInfo}>
                        {' '}
                        <Text style={{ fontWeight: '700', color: '#0f172a' }}>
                          {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
                        </Text>{' '}
                        of <Text style={{ fontWeight: '700', color: '#0f172a' }}>{total}</Text>{' '}
                        posts
                      </Text>

                      <HStack className="flex-wrap items-center" space="sm" style={{ gap: 6 }}>
                        {/* Limit Selector Dropdown */}
                        <TouchableOpacity
                          style={styles.limitDropdownTrigger}
                          onPress={() => setLimitDropdownOpen(true)}
                        >
                          <Text style={styles.limitDropdownText}>{limit}</Text>
                          <Feather
                            name="chevron-down"
                            size={13}
                            color="#2563EB"
                            style={{ marginLeft: 3 }}
                          />
                        </TouchableOpacity>

                        {/* Numbered Pagination Buttons */}
                        <HStack className="flex-wrap items-center" space="xs" style={{ gap: 3 }}>
                          {/* First Page */}
                          <TouchableOpacity
                            onPress={() => setPage(1)}
                            disabled={page <= 1}
                            style={[styles.pageNavBtn, page <= 1 && styles.pageNavBtnDisabled]}
                          >
                            <Feather
                              name="chevrons-left"
                              size={14}
                              color={page <= 1 ? '#94a3b8' : '#2563EB'}
                            />
                          </TouchableOpacity>

                          {/* Prev Page */}
                          <TouchableOpacity
                            onPress={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            style={[styles.pageNavBtn, page <= 1 && styles.pageNavBtnDisabled]}
                          >
                            <Feather
                              name="chevron-left"
                              size={14}
                              color={page <= 1 ? '#94a3b8' : '#2563EB'}
                            />
                          </TouchableOpacity>

                          {/* Page Numbers */}
                          {getPageNumbers(page, totalPages).map((p) => {
                            const isActive = p === page;
                            return (
                              <TouchableOpacity
                                key={p}
                                onPress={() => setPage(p)}
                                style={[styles.pageNumBtn, isActive && styles.pageNumBtnActive]}
                              >
                                <Text
                                  style={[styles.pageNumText, isActive && styles.pageNumTextActive]}
                                >
                                  {p}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}

                          {/* Next Page */}
                          <TouchableOpacity
                            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            style={[
                              styles.pageNavBtn,
                              page >= totalPages && styles.pageNavBtnDisabled,
                            ]}
                          >
                            <Feather
                              name="chevron-right"
                              size={14}
                              color={page >= totalPages ? '#94a3b8' : '#2563EB'}
                            />
                          </TouchableOpacity>

                          {/* Last Page */}
                          <TouchableOpacity
                            onPress={() => setPage(totalPages)}
                            disabled={page >= totalPages}
                            style={[
                              styles.pageNavBtn,
                              page >= totalPages && styles.pageNavBtnDisabled,
                            ]}
                          >
                            <Feather
                              name="chevrons-right"
                              size={14}
                              color={page >= totalPages ? '#94a3b8' : '#2563EB'}
                            />
                          </TouchableOpacity>
                        </HStack>
                      </HStack>
                    </HStack>
                  </Box>
                </>
              )}
            </VStack>
          )}
        </ScrollView>
      </Box>

      {/* Rows per page Limit Dropdown Modal */}
      <Modal
        visible={limitDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLimitDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalOverlay}
          activeOpacity={1}
          onPress={() => setLimitDropdownOpen(false)}
        >
          <Box style={styles.dropdownModalBox}>
            <Text style={styles.dropdownModalTitle}>Rows per page</Text>
            {LIMIT_OPTIONS.map((opt) => {
              const isSelected = limit === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.dropdownModalItem, isSelected && styles.dropdownModalItemActive]}
                  onPress={() => {
                    setLimit(opt);
                    setPage(1);
                    setLimitDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownModalItemText,
                      isSelected && styles.dropdownModalItemTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                  {isSelected && <Feather name="check" size={16} color="#2563EB" />}
                </TouchableOpacity>
              );
            })}
          </Box>
        </TouchableOpacity>
      </Modal>

      {/* Active / Deactive Confirm Dialog */}
      <StatusConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, post: null, type: null, loading: false })}
        onConfirm={handleConfirmStatus}
        loading={confirmDialog.loading}
        title={confirmDialog.type === 'active' ? 'Active Festival Post' : 'Deactive Festival Post'}
        message={
          confirmDialog.type === 'active'
            ? `Are you sure you want to active the festival post "${confirmDialog.post?.name}"? Customers will receive greetings.`
            : `Are you sure you want to deactive the festival post "${confirmDialog.post?.name}"?`
        }
        confirmText={confirmDialog.type === 'active' ? 'Active Post' : 'Deactive Post'}
        targetStatus={confirmDialog.type === 'active' ? 'active' : 'deactive'}
        customBrandColor={confirmDialog.type === 'active' ? '#2563EB' : '#64748b'}
      />

      {/* Fullscreen Image Viewer Modal */}
      <Modal
        visible={imageViewer.open}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewer({ open: false, src: '', alt: '' })}
      >
        <TouchableOpacity
          style={styles.imageViewerOverlay}
          activeOpacity={1}
          onPress={() => setImageViewer({ open: false, src: '', alt: '' })}
        >
          {imageViewer.src ? (
            <Image
              source={{ uri: imageViewer.src }}
              style={styles.imageViewerImg}
              resizeMode="contain"
            />
          ) : null}
        </TouchableOpacity>
      </Modal>

      {/* Add / Edit Festival Event Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !saving && setModalVisible(false)}
      >
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            {/* Modal Header */}
            <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.modalHeader}>
              <HStack className="items-center" space="md">
                <Box style={styles.modalHeaderAvatar}>
                  <Text style={styles.modalHeaderAvatarText}>
                    {headerTitle.charAt(0).toUpperCase()}
                  </Text>
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.modalHeaderKicker}>
                    {isCreate ? 'New Festival Event' : 'Edit Festival'}
                  </Text>
                  <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                    {headerTitle}
                  </Text>
                  <HStack className="flex-wrap items-center" space="xs">
                    <Feather name="calendar" size={12} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.modalHeaderMeta}>
                      {date ? formatDisplayDate(date) : 'No date set'}
                    </Text>
                    {category ? (
                      <>
                        <Text style={styles.modalHeaderDot}>•</Text>
                        <Text style={styles.modalHeaderMeta}>{category}</Text>
                      </>
                    ) : null}
                    {selectedFestival && (
                      <Box style={styles.modalSelectedChip}>
                        <Text style={styles.modalSelectedChipText}>Selected</Text>
                      </Box>
                    )}
                  </HStack>
                </VStack>
                <TouchableOpacity
                  onPress={() => !saving && setModalVisible(false)}
                  disabled={saving}
                  style={styles.modalCloseBtn}
                >
                  <Feather name="x" size={20} color="#fff" />
                </TouchableOpacity>
              </HStack>
            </LinearGradient>

            {/* Modal Scrollable Form */}
            <ScrollView
              ref={modalScrollViewRef}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: Dimensions.get('window').height * 0.58 }}
            >
              <VStack space="md" style={{ padding: 16 }}>
                {/* Festival Name */}
                <VStack space="xs">
                  <Text style={styles.label}>Festival Name *</Text>
                  <TextInput
                    style={[styles.modalInput, touched.name && !hasName && styles.modalInputError]}
                    value={name}
                    onChangeText={setName}
                    onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                    placeholder="e.g. Diwali, Eid, Christmas, New Year..."
                  />
                  {touched.name && !hasName && (
                    <Text style={styles.errorText}>Festival name is required</Text>
                  )}
                </VStack>

                {/* Date & Category Row */}
                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Date *</Text>
                    <TouchableOpacity onPress={openDatePicker}>
                      <Box
                        style={[
                          styles.modalInput,
                          styles.datePickerBox,
                          touched.date && (!hasDate || isDateInPast) && styles.modalInputError,
                        ]}
                      >
                        <Text style={{ color: date ? '#0f172a' : '#94a3b8' }}>
                          {date ? formatDisplayDate(date) : 'Select date'}
                        </Text>
                      </Box>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={datePickerValue || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={new Date()}
                        onChange={handleDateChange}
                      />
                    )}
                    {touched.date && !hasDate && (
                      <Text style={styles.errorText}>Date is required</Text>
                    )}
                    {touched.date && isDateInPast && (
                      <Text style={styles.errorText}>Date cannot be in the past</Text>
                    )}
                  </VStack>

                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Category *</Text>
                    <TextInput
                      style={[
                        styles.modalInput,
                        touched.category && !hasCategory && styles.modalInputError,
                      ]}
                      value={category}
                      onChangeText={setCategory}
                      onBlur={() => setTouched((p) => ({ ...p, category: true }))}
                      placeholder="e.g. Religious, National"
                    />
                  </VStack>
                </HStack>

                {/* Category Suggestion Chips */}
                <HStack style={styles.categoryChips} className="flex-wrap">
                  {CATEGORY_SUGGESTIONS.map((suggestion) => {
                    const isActive = category.toLowerCase() === suggestion.toLowerCase();
                    const chipColors = getEventColor(suggestion);
                    return (
                      <TouchableOpacity
                        key={suggestion}
                        onPress={() => {
                          setCategory(suggestion);
                          setTouched((p) => ({ ...p, category: true }));
                        }}
                        style={[
                          styles.categoryChip,
                          isActive
                            ? { backgroundColor: chipColors.main, borderColor: chipColors.main }
                            : { backgroundColor: 'transparent', borderColor: '#e2e8f0' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: isActive ? '#fff' : '#64748b' },
                          ]}
                        >
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </HStack>
                {touched.category && !hasCategory && (
                  <Text style={styles.errorText}>Please select or type an event category</Text>
                )}

                {/* Image Section & AI Generation */}
                <Box
                  style={[
                    styles.imageSection,
                    touched.image && !hasImage && styles.imageSectionError,
                  ]}
                >
                  <Text style={[styles.label, { marginBottom: 10 }]}>
                    Post Image & AI Generation *
                  </Text>
                  <HStack style={styles.aiBtnRow} className="flex-wrap">
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={handlePickImage}
                      disabled={saving || generatingType !== null}
                    >
                      <Feather name="image" size={14} color="#2563EB" />
                      <Text style={styles.uploadBtnText}>Upload Image</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.aiBtn, { backgroundColor: '#0284c7' }]}
                      onPress={() => handleGenerateAI('gemini')}
                      disabled={saving || generatingType !== null || !hasName || !hasCategory}
                    >
                      {generatingType === 'gemini' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Feather name="zap" size={14} color="#fff" />
                          <Text style={styles.aiBtnText}>Generate with Gemini</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.aiBtn, { backgroundColor: '#2563EB' }]}
                      onPress={() => handleGenerateAI('openai')}
                      disabled={saving || generatingType !== null || !hasName || !hasCategory}
                    >
                      {generatingType === 'openai' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Feather name="zap" size={14} color="#fff" />
                          <Text style={styles.aiBtnText}>Generate with OpenAI</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </HStack>

                  {imageError && <Text style={styles.errorText}>{imageError}</Text>}
                  {touched.image && !hasImage && !imageError && (
                    <Text style={styles.errorText}>An operational image asset is required.</Text>
                  )}

                  {previewImageUri && (
                    <TouchableOpacity
                      style={styles.imagePreviewWrap}
                      onPress={() =>
                        setImageViewer({
                          open: true,
                          src: previewImageUri,
                          alt: name || 'Preview',
                        })
                      }
                    >
                      <Image
                        source={{ uri: previewImageUri }}
                        style={styles.imagePreview}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  )}
                </Box>

                {/* Caption */}
                <VStack space="xs">
                  <Text style={styles.label}>Caption *</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      styles.captionInput,
                      touched.caption && !hasCaption && styles.modalInputError,
                    ]}
                    value={caption}
                    onChangeText={setCaption}
                    onBlur={() => setTouched((p) => ({ ...p, caption: true }))}
                    multiline
                    placeholder="Write the post caption..."
                  />
                  <Text style={styles.helperText}>{caption.length} characters</Text>
                  {touched.caption && !hasCaption && (
                    <Text style={styles.errorText}>Caption content is required</Text>
                  )}
                </VStack>

                {/* Hashtags */}
                <VStack space="xs">
                  <Text style={styles.label}>Hashtags *</Text>
                  <HStack space="sm" className="items-center">
                    <TextInput
                      style={[
                        styles.modalInput,
                        { flex: 1 },
                        touched.hashtags && !hasHashtags && styles.modalInputError,
                      ]}
                      value={hashtagInput}
                      onChangeText={setHashtagInput}
                      onBlur={() => {
                        if (hashtagInput.trim()) processHashtags(hashtagInput);
                        setTouched((p) => ({ ...p, hashtags: true }));
                      }}
                      onSubmitEditing={handleAddHashtag}
                      placeholder="Paste or type hashtags (e.g. #Diwali #FestivalOfLights)"
                    />
                    <TouchableOpacity
                      style={styles.addHashtagBtn}
                      onPress={handleAddHashtag}
                      disabled={!hashtagInput.trim()}
                    >
                      <Text style={styles.addHashtagBtnText}>Add</Text>
                    </TouchableOpacity>
                  </HStack>
                  {hashtags.length > 0 && (
                    <HStack style={styles.hashtagChips} className="flex-wrap">
                      {hashtags.map((tag) => (
                        <TouchableOpacity
                          key={tag}
                          style={styles.hashtagChip}
                          onPress={() => handleRemoveHashtag(tag)}
                        >
                          <Text style={styles.hashtagChipText}>#{tag.replace(/^#/, '')}</Text>
                          <Feather name="x" size={12} color="#2563EB" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      ))}
                    </HStack>
                  )}
                  {touched.hashtags && !hasHashtags && (
                    <Text style={styles.errorText}>At least one hashtag is required</Text>
                  )}
                </VStack>

                {/* Selected for notifications switch */}
                <Box style={styles.switchCard}>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.switchCardTitle}>Selected for notifications</Text>
                    <Text style={styles.switchCardSub}>
                      Customers will be notified for this festival
                    </Text>
                  </VStack>
                  <Switch
                    value={selectedFestival}
                    onValueChange={setSelectedFestival}
                    trackColor={{ false: '#e2e8f0', true: '#34c759' }}
                    thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                  />
                </Box>

                {/* Auto-generate switch */}
                <Box style={styles.switchCard}>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.switchCardTitle}>Auto-generate posts</Text>
                    <Box style={[styles.yesNoChip, autoGenerate ? styles.yesChip : styles.noChip]}>
                      <Text
                        style={[
                          styles.yesNoChipText,
                          autoGenerate ? styles.yesChipText : styles.noChipText,
                        ]}
                      >
                        {autoGenerate ? 'YES' : 'NO'}
                      </Text>
                    </Box>
                  </VStack>
                  <Switch value={autoGenerate} onValueChange={setAutoGenerate} />
                </Box>
              </VStack>
            </ScrollView>

            {/* Modal Footer */}
            <HStack space="sm" style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => !saving && setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                style={{ flex: 1, backgroundColor: '#2563EB', borderRadius: 12 }}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ButtonText style={{ color: 'white' }}>
                    {isCreate ? 'Create Event' : 'Save Changes'}
                  </ButtonText>
                )}
              </Button>
            </HStack>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGlowCircle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerGlowCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12.5,
    marginTop: 2,
    fontWeight: '400',
  },
  mainCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // paddingHorizontal: 14,
    paddingTop: 12,
    marginTop: -20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  addBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  filterSection: {
    paddingHorizontal: 14,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingLeft: 38,
    paddingRight: 34,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: 'transparent',
  },
  viewModeBtnActive: {
    backgroundColor: '#0b57d0',
    shadowColor: '#0b57d0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 3,
  },
  viewModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  viewModeBtnTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  refreshBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 9,
    paddingVertical: 12,
  },
  scrollContainer: {
    paddingTop: 14,
    paddingBottom: 40,
  },
  igCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginHorizontal: 15,
  },
  igCardHeader: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  igAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: 8,
  },
  igAvatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  igCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 180,
  },
  autoPostChip: {
    backgroundColor: '#2563EB',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  autoPostChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  igMenuBtn: {
    padding: 4,
  },
  igImageWrap: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: '#f1f5f9',
  },
  igImage: {
    width: '100%',
    height: '100%',
  },
  igImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    aspectRatio: 4 / 5,
  },
  igActions: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  igActionBtn: {
    padding: 8,
  },
  igChipRow: {
    paddingHorizontal: 10,
    paddingTop: 4,
    gap: 4,
  },
  statusChip: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  igDateText: {
    fontSize: 10,
    color: '#94a3b8',
    marginLeft: 'auto',
  },
  igCaptionWrap: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 12,
  },
  igCaption: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#0f172a',
  },
  igCaptionName: {
    fontWeight: '700',
  },
  igMoreText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  igHashtags: {
    fontSize: 12,
    color: '#2563EB',
    lineHeight: 18,
  },
  igTimeAgo: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginTop: 4,
  },
  emptyStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
    marginHorizontal: 15,
  },
  emptyStateIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyStateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emptyStateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  paginationCard: {
    backgroundColor: '#ffffff',
    marginTop: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 40,
  },
  paginationInfo: {
    fontSize: 12,
    color: '#64748b',
  },
  limitDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  limitDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  pageNumBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  pageNumBtnActive: {
    backgroundColor: '#2563EB',
  },
  pageNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pageNumTextActive: {
    color: '#ffffff',
  },
  pageNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  pageNavBtnDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.5,
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModalBox: {
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownModalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dropdownModalItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownModalItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownModalItemTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  imageViewerImg: {
    width: '100%',
    height: '80%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  modalHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  modalHeaderAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
  },
  modalHeaderKicker: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  modalHeaderTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
  },
  modalHeaderMeta: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 11,
    fontWeight: '500',
  },
  modalHeaderDot: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
  },
  modalSelectedChip: {
    backgroundColor: 'rgba(34,197,94,0.25)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.5)',
    marginLeft: 4,
  },
  modalSelectedChipText: {
    color: '#bbf7d0',
    fontSize: 10,
    fontWeight: '600',
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 6,
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
  modalInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  captionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  datePickerBox: {
    justifyContent: 'center',
    minHeight: 44,
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
    marginTop: 2,
  },
  helperText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  categoryChips: {
    gap: 6,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageSection: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  imageSectionError: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239,68,68,0.02)',
  },
  aiBtnRow: {
    gap: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  uploadBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  aiBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePreviewWrap: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  addHashtagBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  addHashtagBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 13,
  },
  hashtagChips: {
    gap: 6,
    marginTop: 8,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  hashtagChipText: {
    color: '#2563EB',
    fontSize: 11.5,
    fontWeight: '600',
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  switchCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  switchCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  yesNoChip: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  yesChip: {
    borderColor: '#86efac',
    backgroundColor: '#dcfce7',
  },
  noChip: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  yesNoChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  yesChipText: {
    color: '#15803d',
  },
  noChipText: {
    color: '#64748b',
  },
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
  statusToggleBtnActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  statusToggleBtnActiveDanger: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  statusToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  statusToggleTextActive: {
    color: '#15803d',
  },
  statusToggleTextActiveDanger: {
    color: '#dc2626',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    minHeight: 44,
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  actionMenuModalBox: {
    width: 250,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  actionMenuModalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 4,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 10,
  },
  actionMenuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  actionMenuCancelBtn: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  actionMenuCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
});
