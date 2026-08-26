import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  Platform,
  Image,
  View,
  TextInput,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { listPosts, deletePost, Post, getImageUrl } from './posts.api';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

const PLATFORMS_FILTER = [
  { id: 'all', label: 'All Networks', icon: 'globe', color: '#4f46e5' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook-square', color: '#1877f2' },
  { id: 'instagram', label: 'Instagram', icon: 'instagram', color: '#e1306c' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', color: '#25d366' },
  { id: 'twitter', label: 'Twitter / X', icon: 'twitter', color: '#1da1f2' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', color: '#0a66c2' },
  { id: 'snapchat', label: 'Snapchat', icon: 'snapchat-ghost', color: '#eab308' },
  { id: 'google-business', label: 'Google Business', icon: 'google', color: '#4285f4' },
  { id: 'pinterest', label: 'Pinterest', icon: 'pinterest', color: '#e60023' },
];

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_META: Record<
  string,
  { bg: string; color: string; dot: string; label: string; icon: keyof typeof Feather.glyphMap }
> = {
  published: {
    bg: '#eff6ff',
    color: '#2563eb',
    dot: '#3b82f6',
    label: 'Published',
    icon: 'check-circle',
  },
  scheduled: {
    bg: '#f0fdf4',
    color: '#16a34a',
    dot: '#22c55e',
    label: 'Scheduled',
    icon: 'clock',
  },
  draft: {
    bg: '#f8fafc',
    color: '#64748b',
    dot: '#94a3b8',
    label: 'Draft',
    icon: 'edit-3',
  },
  failed: {
    bg: '#fef2f2',
    color: '#dc2626',
    dot: '#ef4444',
    label: 'Failed',
    icon: 'alert-circle',
  },
  partial: {
    bg: '#fffbeb',
    color: '#d97706',
    dot: '#f59e0b',
    label: 'Partial',
    icon: 'pie-chart',
  },
};

function StatusBadge({ status }: { status?: string }) {
  const normStatus = (status ?? 'draft').toLowerCase();
  const meta = STATUS_META[normStatus] ?? STATUS_META.draft;
  return (
    <Box style={[styles.badge, { backgroundColor: meta.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </Box>
  );
}

// ── Filter tab ────────────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'all', label: 'All', icon: 'layers' as const },
  { id: 'scheduled', label: 'Scheduled', icon: 'clock' as const },
  { id: 'published', label: 'Published', icon: 'check-circle' as const },
  { id: 'failed', label: 'Failed', icon: 'alert-circle' as const },
  { id: 'partial', label: 'Partial', icon: 'pie-chart' as const },
  { id: 'draft', label: 'Drafts', icon: 'edit-3' as const },
];

// ── Post card ─────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onPressCard,
  onOpenOptions,
}: {
  post: Post;
  onPressCard: () => void;
  onOpenOptions: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const platforms = post.selectedNetworks ?? [];
  const rawImg =
    typeof post.image_url === 'string' && post.image_url.trim()
      ? post.image_url
      : post.generalContent?.media?.[0]?.url || post.generalContent?.media?.[0]?.imagePath;
  const previewImg = getImageUrl(rawImg);

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPressCard} style={styles.postCardContainer}>
      <Box style={styles.postCard}>
        <HStack space="md" className="items-center" style={{ flex: 1 }}>
          {/* Left: Thumbnail */}
          {previewImg && !imageError ? (
            <Image
              source={{ uri: previewImg }}
              style={styles.cardImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <Image
              source={require('@/assets/images/360_image.jpg')}
              style={styles.cardImage}
              resizeMode="cover"
            />
          )}

          {/* Middle: Details */}
          <VStack space="xs" style={{ flex: 1, justifyContent: 'center' }}>
            <Text
              className="text-sm font-bold text-typography-900"
              numberOfLines={2}
              style={styles.cardTitle}
            >
              {post.title || post.caption || 'Untitled Post'}
            </Text>

            {post.createdAt && (
              <HStack space="xs" className="items-center" style={{ marginTop: 2 }}>
                <Feather name="calendar" size={11} color="#94a3b8" />
                <Text style={styles.cardDate}>
                  {(() => {
                    const d = new Date(post.createdAt);
                    if (isNaN(d.getTime())) return post.createdAt;
                    return (
                      d.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }) +
                      ' • ' +
                      d.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    );
                  })()}
                </Text>
              </HStack>
            )}

            {/* Social Platforms */}
            {platforms.length > 0 && (
              <HStack space="xs" className="mt-1.5 flex-wrap items-center">
                {platforms.map((p, idx) => {
                  const name = p.toLowerCase();
                  let iconName = '';
                  let iconColor = '#64748b';
                  if (name.includes('facebook')) {
                    iconName = 'facebook-square';
                    iconColor = '#1877f2';
                  } else if (name.includes('instagram')) {
                    iconName = 'instagram';
                    iconColor = '#e1306c';
                  } else if (name.includes('whatsapp')) {
                    iconName = 'whatsapp';
                    iconColor = '#25d366';
                  } else if (name.includes('twitter') || name.includes('x')) {
                    iconName = 'twitter';
                    iconColor = '#1da1f2';
                  } else if (name.includes('linkedin')) {
                    iconName = 'linkedin';
                    iconColor = '#0a66c2';
                  } else if (name.includes('snapchat')) {
                    iconName = 'snapchat-ghost';
                    iconColor = '#eab308';
                  } else if (name.includes('google_business')) {
                    iconName = 'google';
                    iconColor = '#313641ff';
                  } else if (name.includes('pinterest')) {
                    iconName = 'pinterest';
                    iconColor = '#e60023';
                  }
                  if (!iconName) return null;
                  return (
                    <View key={idx} style={styles.platformIconWrapper}>
                      <FontAwesome name={iconName as any} size={14} color={iconColor} />
                    </View>
                  );
                })}
              </HStack>
            )}
          </VStack>

          {/* Right: Actions and Status */}
          <VStack
            style={{
              alignItems: 'flex-end',
              height: '100%',
              justifyContent: 'space-between',
              minHeight: 78,
            }}
          >
            <TouchableOpacity
              onPress={onOpenOptions}
              style={styles.moreBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="more-horizontal" size={18} color="#64748b" />
            </TouchableOpacity>
            <StatusBadge status={post.post_status} />
          </VStack>
        </HStack>
      </Box>
    </TouchableOpacity>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function PostsScreen() {
  const { user } = useAuth();
  const { status: statusParam } = useLocalSearchParams<{ action?: string; status?: string }>();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(
    statusParam && FILTERS.some((f) => f.id === statusParam) ? statusParam : 'all'
  );

  useEffect(() => {
    if (statusParam && FILTERS.some((f) => f.id === statusParam)) {
      setFilter(statusParam);
    }
  }, [statusParam]);

  const [platformFilter, setPlatformFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [actionPost, setActionPost] = useState<Post | null>(null);

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const isAnyDropdownOpen = statusDropdownOpen || platformDropdownOpen;

  const selectedStatusItem = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const selectedPlatformItem =
    PLATFORMS_FILTER.find((p) => p.id === platformFilter) || PLATFORMS_FILTER[0];

  const fetchPosts = useCallback(
    async (
      pg = 1,
      reset = true,
      overrideFilter?: string,
      overridePlatform?: string,
      overrideSearch?: string
    ) => {
      if (reset) setLoading(true);
      try {
        const activeFilter = overrideFilter !== undefined ? overrideFilter : filter;
        const activePlatform = overridePlatform !== undefined ? overridePlatform : platformFilter;
        const activeSearch = overrideSearch !== undefined ? overrideSearch : searchQuery;

        const status = activeFilter === 'all' ? undefined : activeFilter;
        const platform = activePlatform === 'all' ? undefined : activePlatform;
        const loginType = user?.loginType || 'user';
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: '15',
          loginType,
        });

        if (activeSearch.trim()) {
          queryParams.append('search', activeSearch.trim());
        }

        const columnFiltersObj: Record<string, string> = {};
        if (status) columnFiltersObj.post_status = status;
        if (platform) columnFiltersObj.platform = platform;
        if (Object.keys(columnFiltersObj).length > 0) {
          queryParams.append('columnFilters', JSON.stringify(columnFiltersObj));
        }

        const res = (await listPosts(queryParams.toString())) as any;
        const rawItems = res?.data || (Array.isArray(res) ? res : res?.results || []);
        const items: Post[] = Array.isArray(rawItems) ? rawItems : [];
        if (reset) {
          setPosts(items);
        } else {
          setPosts((prev) => [...prev, ...items]);
        }
        const lastPage = res?.pagination?.lastPage ?? 1;
        setHasMore(pg < lastPage);
        setPage(pg);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load posts.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter, platformFilter, searchQuery, user]
  );

  const handleResetAndRefresh = () => {
    setSearchQuery('');
    setFilter('all');
    setPlatformFilter('all');
    setStatusDropdownOpen(false);
    setPlatformDropdownOpen(false);
    fetchPosts(1, true, 'all', 'all', '');
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts(1, true);
    }, [fetchPosts])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchPosts(page + 1, false);
  };

  const handleDelete = (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(postId);
            setPosts((prev) => prev.filter((p) => (p._id || p.id) !== postId));
          } catch {
            Alert.alert('Error', 'Failed to delete post.');
          }
        },
      },
    ]);
  };

  const navigateToDetails = (postId?: string) => {
    if (!postId) return;
    router.push({
      pathname: '/pages/posts/post-details',
      params: { id: postId },
    });
  };

  const navigateToEditor = (postId?: string) => {
    if (postId) {
      router.push({
        pathname: '/pages/posts/post-editor',
        params: { id: postId },
      });
    } else {
      router.push('/pages/posts/post-editor');
    }
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Backdrop overlay to close dropdown & block background scroll when open */}
      {isAnyDropdownOpen && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.dropdownBackdrop}
          onPress={() => {
            setStatusDropdownOpen(false);
            setPlatformDropdownOpen(false);
          }}
        />
      )}
      {/* ── Unique Attractive Header ────────────────────────────────────────── */}
      <LinearGradient
        colors={['#0b53f8', '#084ad3', '#063bb3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Decorative background glow circles */}
        <View style={styles.headerGlowCircle1} />
        <View style={styles.headerGlowCircle2} />

        <Box className="px-5 pb-3 pt-12">
          {/* Top Row: Title + Add Button */}
          <HStack className="mb-1 items-center justify-between">
            <VStack style={{ flex: 1 }}>
              <HStack space="xs" className="items-center">
                <Heading size="xl" style={styles.headerTitle}>
                  Posts
                </Heading>
              </HStack>
              <Text style={styles.headerSubtitle}>Create, schedule & manage social posts</Text>
            </VStack>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigateToEditor()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
                style={styles.addBtnGradient}
              >
                <Feather name="plus" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.addBtnText}>Add Post</Text>
              </LinearGradient>
            </TouchableOpacity>
          </HStack>
          <HStack className="mt-2 items-center gap-2.5">
            {/* Integrated Modern Search Bar */}
            <Box style={styles.searchContainer}>
              <Feather name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search posts..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={(text) => setSearchQuery(text)}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={16} color="#64748b" />
                </TouchableOpacity>
              )}
            </Box>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleResetAndRefresh}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.12)']}
                style={styles.headerBtnGradient}
              >
                <Feather name="refresh-cw" size={17} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </HStack>
        </Box>
      </LinearGradient>

      {/* ── Dropdown Filters Bar ────────────────────────────────────────────── */}
      <View style={styles.dropdownFiltersContainer}>
        {/* Status Dropdown Trigger */}
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              filter !== 'all' && styles.dropdownTriggerActive,
              statusDropdownOpen && styles.dropdownTriggerOpen,
            ]}
            onPress={() => {
              setStatusDropdownOpen(true);
              setPlatformDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <HStack space="xs" className="items-center" style={{ flex: 1 }}>
              <Feather
                name={selectedStatusItem?.icon || 'layers'}
                size={13}
                color={filter !== 'all' ? '#2563eb' : '#64748b'}
              />
              <Text
                style={[
                  styles.dropdownTriggerText,
                  filter !== 'all' && styles.dropdownTriggerTextActive,
                ]}
                numberOfLines={1}
              >
                {selectedStatusItem?.label || 'Status'}
              </Text>
            </HStack>
          </TouchableOpacity>
        </View>

        {/* Platform Dropdown Trigger */}
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              platformFilter !== 'all' && styles.dropdownTriggerActive,
              platformDropdownOpen && styles.dropdownTriggerOpen,
            ]}
            onPress={() => {
              setPlatformDropdownOpen(true);
              setStatusDropdownOpen(false);
            }}
            activeOpacity={0.8}
          >
            <HStack space="xs" className="items-center" style={{ flex: 1 }}>
              {selectedPlatformItem?.id === 'all' ? (
                <Feather
                  name="globe"
                  size={13}
                  color={platformFilter !== 'all' ? selectedPlatformItem.color : '#64748b'}
                />
              ) : (
                <FontAwesome
                  name={selectedPlatformItem?.icon as any}
                  size={13}
                  color={selectedPlatformItem?.color || '#64748b'}
                />
              )}
              <Text
                style={[
                  styles.dropdownTriggerText,
                  platformFilter !== 'all' && styles.dropdownTriggerTextActive,
                ]}
                numberOfLines={1}
              >
                {selectedPlatformItem?.label || 'Platform'}
              </Text>
            </HStack>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Posts List ──────────────────────────────────────────────────────── */}
      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>Loading posts...</Text>
        </Box>
      ) : (
        <FlatList
          data={posts}
          scrollEnabled={!isAnyDropdownOpen}
          keyExtractor={(p) => p._id || p.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Box style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIconBox}>
                <Feather name="layers" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyStateTitle}>No posts found</Text>
              <Text style={styles.emptyStateSubtitle}>
                {searchQuery || filter !== 'all' || platformFilter !== 'all'
                  ? 'Try changing your search or active filters'
                  : 'Start by creating your first social media post'}
              </Text>
              <TouchableOpacity
                style={styles.emptyStateBtn}
                onPress={() => navigateToEditor()}
                activeOpacity={0.85}
              >
                <Feather name="plus" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyStateBtnText}>Create New Post</Text>
              </TouchableOpacity>
            </Box>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 20 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPressCard={() => navigateToDetails(item._id || item.id)}
              onOpenOptions={() => {
                setActionPost(item);
                setOptionsModalVisible(true);
              }}
            />
          )}
        />
      )}

      {/* ── Filter Dropdown Selection Modal ── */}
      <Modal
        visible={isAnyDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setStatusDropdownOpen(false);
          setPlatformDropdownOpen(false);
        }}
      >
        <TouchableOpacity
          style={styles.dropdownModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setStatusDropdownOpen(false);
            setPlatformDropdownOpen(false);
          }}
        >
          <TouchableOpacity activeOpacity={1} style={styles.dropdownModalCard}>
            <HStack className="mb-3 items-center justify-between">
              <HStack space="xs" className="items-center gap-2">
                <Feather name={statusDropdownOpen ? 'filter' : 'globe'} size={18} color="#2563eb" />
                <Heading size="md" style={{ color: '#0f172a', fontWeight: '700', fontSize: 16 }}>
                  {statusDropdownOpen ? 'Select Status Filter' : 'Select Platform Filter'}
                </Heading>
              </HStack>
              <TouchableOpacity
                onPress={() => {
                  setStatusDropdownOpen(false);
                  setPlatformDropdownOpen(false);
                }}
              >
                <Feather name="x" size={20} color="#64748b" style={{ color: '#ffffff' }} />
              </TouchableOpacity>
            </HStack>

            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {statusDropdownOpen &&
                FILTERS.map((item) => {
                  const isSelected = filter === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.dropdownModalItem,
                        isSelected && styles.dropdownModalItemActive,
                      ]}
                      onPress={() => {
                        setFilter(item.id);
                        setStatusDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <HStack space="sm" className="items-center" style={{ flex: 1 }}>
                        <Feather
                          name={item.icon}
                          size={16}
                          color={isSelected ? '#2563eb' : '#64748b'}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[
                            styles.dropdownModalItemText,
                            isSelected && styles.dropdownModalItemTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </HStack>
                      {isSelected && <Feather name="check" size={16} color="#2563eb" />}
                    </TouchableOpacity>
                  );
                })}

              {platformDropdownOpen &&
                PLATFORMS_FILTER.map((item) => {
                  const isSelected = platformFilter === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.dropdownModalItem,
                        isSelected && styles.dropdownModalItemActive,
                      ]}
                      onPress={() => {
                        setPlatformFilter(item.id);
                        setPlatformDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <HStack space="sm" className="items-center" style={{ flex: 1 }}>
                        {item.id === 'all' ? (
                          <Feather
                            name="globe"
                            size={16}
                            color={isSelected ? '#2563eb' : item.color}
                            style={{ marginRight: 8 }}
                          />
                        ) : (
                          <FontAwesome
                            name={item.icon as any}
                            size={16}
                            color={item.color}
                            style={{ marginRight: 8 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.dropdownModalItemText,
                            isSelected && styles.dropdownModalItemTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </HStack>
                      {isSelected && <Feather name="check" size={16} color="#2563eb" />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Attractive Options Menu Modal ────────────────────────────────────── */}
      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <Box style={styles.optionsModalCard}>
            {/* Top Sheet Handle */}
            <View style={styles.modalHandle} />

            {/* Header info preview */}
            <View style={styles.modalHeaderPreview}>
              <Text style={styles.optionsModalTitle} numberOfLines={1}>
                {actionPost?.title || actionPost?.caption || 'Post Actions'}
              </Text>
              {actionPost?.post_status && <StatusBadge status={actionPost.post_status} />}
            </View>

            {/* Actions List */}
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setOptionsModalVisible(false);
                if (actionPost?._id || actionPost?.id) {
                  navigateToDetails(actionPost._id || actionPost.id);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: '#eff6ff' }]}>
                <Feather name="eye" size={16} color="#2563eb" />
              </View>
              <Text style={styles.optionItemText}>View Details</Text>
              <Feather
                name="chevron-right"
                size={16}
                color="#cbd5e1"
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setOptionsModalVisible(false);
                const targetId = actionPost?._id || actionPost?.id;
                if (targetId) {
                  navigateToEditor(targetId);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: '#eef2ff' }]}>
                <Feather name="edit-2" size={16} color="#4f46e5" />
              </View>
              <Text style={styles.optionItemText}>Edit Post</Text>
              <Feather
                name="chevron-right"
                size={16}
                color="#cbd5e1"
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setOptionsModalVisible(false);
                const targetId = actionPost?._id || actionPost?.id;
                if (targetId) {
                  handleDelete(targetId);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: '#fef2f2' }]}>
                <Feather name="trash-2" size={16} color="#dc2626" />
              </View>
              <Text style={[styles.optionItemText, { color: '#dc2626' }]}>Delete Post</Text>
              <Feather
                name="chevron-right"
                size={16}
                color="#cbd5e1"
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setOptionsModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Box>
        </TouchableOpacity>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: 6,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    fontSize: 24,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '400',
  },
  headerBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  headerBtnGradient: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 12,
  },
  filterTabsWrapper: {
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  filterList: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  filterBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  platformFilterRow: {
    backgroundColor: '#f8fafc',
    paddingBottom: 6,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
  },
  platformChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  platformChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  postCardContainer: {
    marginBottom: 12,
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageWrapper: {
    position: 'relative',
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  networkCounterBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  networkCounterText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
    lineHeight: 19,
  },
  cardDate: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 3,
  },
  platformIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  moreBtn: {
    width: 26,
    height: 26,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyStateIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyStateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyStateBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionsModalTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionItemText: {
    fontSize: 14.5,
    color: '#1e293b',
    fontWeight: '600',
  },
  modalCancelBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 998,
    backgroundColor: 'transparent',
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  dropdownModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  dropdownModalItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownModalItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  dropdownModalItemTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  dropdownFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  dropdownTriggerActive: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  dropdownTriggerTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  dropdownTriggerOpen: {
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  inlineDropdownMenu: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 25,
    overflow: 'scroll',
  },
  dropdownScrollView: {
    maxHeight: 240,
    flexGrow: 0,
    overflow: 'scroll',
  },

  dropdownScrollContent: {
    paddingBottom: 4,
    overflow: 'scroll',
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 1,
  },
  dropdownMenuItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownMenuItemText: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '500',
  },
  dropdownMenuItemTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});
