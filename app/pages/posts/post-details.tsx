import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Linking,
  Modal,
  Platform,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getPost,
  getPostDetails,
  deletePost,
  publishPostNow,
  Post,
  PostDetails,
} from './posts.api';

const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: '#eff6ff', color: '#3b82f6', label: 'Published' },
  scheduled: { bg: '#f0fdf4', color: '#22c55e', label: 'Scheduled' },
  draft: { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
  failed: { bg: '#fef2f2', color: '#ef4444', label: 'Failed' },
  partial: { bg: '#fef3c7', color: '#d97706', label: 'Partial' },
};

function StatusBadge({ status }: { status?: string }) {
  const normStatus = (status ?? 'draft').toLowerCase();
  const meta = STATUS_META[normStatus] ?? STATUS_META.draft;
  return (
    <Box style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </Box>
  );
}

function PlatformIcon({ platform, size = 18 }: { platform: string; size?: number }) {
  const p = platform.toLowerCase();
  if (p.includes('facebook'))
    return <FontAwesome name="facebook-square" size={size} color="#1877f2" />;
  if (p.includes('instagram')) return <FontAwesome name="instagram" size={size} color="#e1306c" />;
  if (p.includes('whatsapp')) return <FontAwesome name="whatsapp" size={size} color="#25d366" />;
  if (p.includes('twitter') || p.includes('x'))
    return <FontAwesome name="twitter" size={size} color="#1da1f2" />;
  if (p.includes('linkedin')) return <FontAwesome name="linkedin" size={size} color="#0a66c2" />;
  if (p.includes('youtube')) return <FontAwesome name="youtube-play" size={size} color="#ff0000" />;
  return <Feather name="globe" size={size} color="#64748b" />;
}

export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [details, setDetails] = useState<PostDetails | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const fetchPostDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const mainPost = await getPost(id);
      setPost(mainPost);

      try {
        const fullDetails = await getPostDetails(id);
        setDetails(fullDetails);
      } catch {
        // Fallback to basic post if detailed stats API fails
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load post details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const loadPostDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const mainPost = await getPost(id);
        if (!isMounted) return;
        setPost(mainPost);

        try {
          const fullDetails = await getPostDetails(id);
          if (!isMounted) return;
          setDetails(fullDetails);
        } catch {
          // Fallback to basic post if detailed stats API fails.
        }
      } catch (err: any) {
        if (!isMounted) return;
        Alert.alert('Error', err.message || 'Failed to load post details.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadPostDetails();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePublish = async () => {
    if (!id) return;
    try {
      await publishPostNow(id);
      Alert.alert('Success', 'Post published successfully!');
      fetchPostDetails();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish post.');
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(id);
            Alert.alert('Success', 'Post deleted.');
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete post.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#0052d4" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading Post Details...</Text>
      </Box>
    );
  }

  const title = post?.title || post?.caption || 'Untitled Post';
  const caption = post?.caption || details?.caption || 'No caption provided';
  const mediaUrl = post?.image_url || details?.image_url;
  const hashtags = post?.hashtags || details?.hashtags || [];
  const status = post?.post_status || details?.post_status || 'draft';
  const networks = post?.selectedNetworks || [];
  const summary = details?.summary;
  const platformsList = details?.platforms || [];

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <Box style={styles.header} className="px-5 pb-4 pt-14">
        <HStack className="items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Heading size="lg" style={{ color: '#fff', fontWeight: '700' }}>
            Post Details
          </Heading>
          <TouchableOpacity onPress={fetchPostDetails} style={styles.backBtn}>
            <Feather name="refresh-cw" size={20} color="#fff" />
          </TouchableOpacity>
        </HStack>
      </Box>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Post Card */}
        <Box style={styles.card}>
          <HStack className="mb-3 items-start justify-between">
            <VStack style={{ flex: 1, paddingRight: 10 }}>
              <Heading size="md" style={styles.postTitle}>
                {title}
              </Heading>
              <Text style={styles.dateText}>
                {post?.createdAt ? new Date(post.createdAt).toLocaleString() : 'Date N/A'}
              </Text>
            </VStack>
            <StatusBadge status={status} />
          </HStack>

          {/* Media Preview */}
          {mediaUrl ? (
            <TouchableOpacity
              onPress={() => setImageModalVisible(true)}
              style={styles.imageWrapper}
            >
              <Image
                source={{ uri: typeof mediaUrl === 'string' ? mediaUrl : '' }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <Box style={styles.imageBadge}>
                <Feather name="maximize-2" size={14} color="#fff" />
                <Text style={styles.imageBadgeText}>Tap to View</Text>
              </Box>
            </TouchableOpacity>
          ) : (
            <Box style={styles.noImagePlaceholder}>
              <Feather name="image" size={32} color="#94a3b8" />
              <Text style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>
                No Media Attached
              </Text>
            </Box>
          )}

          {/* Caption */}
          <VStack style={{ marginTop: 14 }}>
            <Text style={styles.sectionLabel}>Caption</Text>
            <Box style={styles.captionBox}>
              <Text style={styles.captionText}>{caption}</Text>
            </Box>
          </VStack>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <VStack style={{ marginTop: 12 }}>
              <Text style={styles.sectionLabel}>Hashtags</Text>
              <HStack space="xs" className="mt-1 flex-wrap">
                {hashtags.map((tag, idx) => (
                  <Box key={idx} style={styles.tagChip}>
                    <Text style={styles.tagText}>#{tag.replace(/^#/, '')}</Text>
                  </Box>
                ))}
              </HStack>
            </VStack>
          )}

          {/* Connected Networks */}
          {networks.length > 0 && (
            <VStack style={{ marginTop: 14 }}>
              <Text style={styles.sectionLabel}>Target Networks</Text>
              <HStack space="sm" className="mt-2 flex-wrap">
                {networks.map((net, idx) => (
                  <Box key={idx} style={styles.networkPill}>
                    <PlatformIcon platform={net} size={16} />
                    <Text style={styles.networkPillText}>
                      {net.charAt(0).toUpperCase() + net.slice(1)}
                    </Text>
                  </Box>
                ))}
              </HStack>
            </VStack>
          )}
        </Box>

        {/* Performance & Analytics Summary (if available) */}
        {summary && (
          <Box style={styles.card}>
            <Heading size="sm" style={styles.cardHeaderTitle}>
              📊 Engagement & Analytics
            </Heading>
            <HStack className="mt-3 flex-wrap justify-between">
              <Box style={styles.metricItem}>
                <Text style={styles.metricValue}>{summary.total_likes ?? 0}</Text>
                <Text style={styles.metricLabel}>Likes</Text>
              </Box>
              <Box style={styles.metricItem}>
                <Text style={styles.metricValue}>{summary.total_comments ?? 0}</Text>
                <Text style={styles.metricLabel}>Comments</Text>
              </Box>
              <Box style={styles.metricItem}>
                <Text style={styles.metricValue}>{summary.total_shares ?? 0}</Text>
                <Text style={styles.metricLabel}>Shares</Text>
              </Box>
              <Box style={styles.metricItem}>
                <Text style={styles.metricValue}>{summary.total_interactions ?? 0}</Text>
                <Text style={styles.metricLabel}>Interactions</Text>
              </Box>
            </HStack>
          </Box>
        )}

        {/* Platform Specific Breakdown */}
        {platformsList.length > 0 && (
          <Box style={styles.card}>
            <Heading size="sm" style={styles.cardHeaderTitle}>
              🌐 Platform Status Breakdown
            </Heading>
            <VStack space="sm" className="mt-3">
              {platformsList.map((item: any, index: number) => (
                <Box key={index} style={styles.platformCardItem}>
                  <HStack className="items-center justify-between">
                    <HStack space="sm" className="items-center">
                      <PlatformIcon platform={item.platform || 'globe'} size={20} />
                      <VStack>
                        <Text style={{ fontWeight: '700', fontSize: 13, color: '#0f172a' }}>
                          {item.account_name || item.platform || 'Social Account'}
                        </Text>
                        {item.post_url && (
                          <TouchableOpacity onPress={() => Linking.openURL(item.post_url)}>
                            <Text
                              style={{
                                color: '#0052d4',
                                fontSize: 11,
                                textDecorationLine: 'underline',
                              }}
                            >
                              View Post Link
                            </Text>
                          </TouchableOpacity>
                        )}
                      </VStack>
                    </HStack>
                    <StatusBadge status={item.post_status || status} />
                  </HStack>
                  {item.error_message && (
                    <Text style={styles.errorText}>Error: {item.error_message}</Text>
                  )}
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* Action Controls Bar */}
        <VStack space="sm" className="mb-8 mt-4">
          <HStack space="sm">
            <TouchableOpacity
              style={[styles.actionBtn, { flex: 1, backgroundColor: '#0052d4' }]}
              onPress={() => router.push({ pathname: '/pages/posts/post-editor', params: { id } })}
            >
              <Feather name="edit-2" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Edit Post</Text>
            </TouchableOpacity>

            {status === 'draft' && (
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#16a34a' }]}
                onPress={handlePublish}
              >
                <Feather name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Publish Now</Text>
              </TouchableOpacity>
            )}
          </HStack>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
            onPress={handleDelete}
          >
            <Feather name="trash-2" size={16} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Delete Post</Text>
          </TouchableOpacity>
        </VStack>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImageModalVisible(false)}
        >
          <Box style={styles.imageModalContent}>
            <TouchableOpacity
              onPress={() => setImageModalVisible(false)}
              style={styles.closeModalBtn}
            >
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
            {mediaUrl && (
              <Image
                source={{ uri: typeof mediaUrl === 'string' ? mediaUrl : '' }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </Box>
        </TouchableOpacity>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0052d4',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  postTitle: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  noImagePlaceholder: {
    height: 120,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  captionBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  captionText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  tagChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  tagText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  networkPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 6,
  },
  cardHeaderTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  metricItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0052d4',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  platformCardItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullImage: {
    width: '92%',
    height: '80%',
  },
});
