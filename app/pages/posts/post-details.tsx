import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  getAllSocialAccountsForPost,
  Post,
  PostDetails,
} from './posts.api';
import { API_BASE_URL } from '@/services/api';

// ─── Status Metadata ────────────────────────────────────────────────────────
const STATUS_META: Record<string, { bg: string; color: string; border: string; label: string }> = {
  published: { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe', label: 'PUBLISHED' },
  scheduled: { bg: '#f0fdf4', color: '#22c55e', border: '#bbf7d0', label: 'SCHEDULED' },
  draft: { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', label: 'DRAFT' },
  failed: { bg: '#fef2f2', color: '#ef4444', border: '#fecaca', label: 'FAILED' },
  partial: { bg: '#fff7ed', color: '#f97316', border: '#ffedd5', label: 'PARTIAL' },
};

function StatusBadge({ status }: { status?: string }) {
  const normStatus = (status ?? 'draft').toLowerCase();
  const meta = STATUS_META[normStatus] ?? STATUS_META.draft;
  return (
    <Box style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </Box>
  );
}

// ─── Platform Registry ──────────────────────────────────────────────────────
const PLATFORM_REGISTRY: Record<
  string,
  { label: string; icon: (size?: number, color?: string) => React.ReactNode; color: string }
> = {
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    icon: (size = 18, color = '#E1306C') => (
      <FontAwesome name="instagram" size={size} color={color} />
    ),
  },
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    icon: (size = 18, color = '#1877F2') => (
      <FontAwesome name="facebook-square" size={size} color={color} />
    ),
  },
  whatsapp: {
    label: 'WhatsApp',
    color: '#25D366',
    icon: (size = 18, color = '#25D366') => (
      <FontAwesome name="whatsapp" size={size} color={color} />
    ),
  },
};

const getPlatformCfg = (platform: string) => {
  const key = (platform || '').toLowerCase();
  return (
    PLATFORM_REGISTRY[key] ?? {
      label: platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Platform',
      color: '#6366f1',
      icon: (size = 18, color = '#6366f1') => <Feather name="globe" size={size} color={color} />,
    }
  );
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (num?: number): string => {
  if (num == null || num === 0) return '0';
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1_000_000).toFixed(1)}M`;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/\//g, '-')
    .replace(',', '');
};

const resolveImageUrl = (imageUrl?: string): string => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http') || imageUrl.startsWith('file://')) return imageUrl;
  const staticBase = API_BASE_URL.replace(/\/v1\/?$/, '');
  return `${staticBase}/${imageUrl.replace(/^\//, '')}`;
};

const resolveMediaUrl = (platform: any, fallbackUrl?: string): string => {
  const post = platform.post ?? {};
  if (typeof post.media_url === 'string' && post.media_url) return resolveImageUrl(post.media_url);
  if (typeof post.full_picture === 'string' && post.full_picture)
    return resolveImageUrl(post.full_picture);
  if (typeof platform.media_url === 'string' && platform.media_url)
    return resolveImageUrl(platform.media_url);
  if (fallbackUrl) return resolveImageUrl(fallbackUrl);
  return '';
};

const resolvePostUrl = (platform: any): string => {
  const post = platform.post ?? {};
  if (typeof post.permalink === 'string' && post.permalink.startsWith('http'))
    return post.permalink;
  if (typeof post.permalink_url === 'string' && post.permalink_url.startsWith('http'))
    return post.permalink_url;
  if (typeof platform.permalink_url === 'string' && platform.permalink_url.startsWith('http'))
    return platform.permalink_url;
  if (typeof platform.post_url === 'string' && platform.post_url.startsWith('http'))
    return platform.post_url;
  return '';
};

const resolveCaption = (platform: any, fallback: string): string => {
  return (
    (platform.post?.caption as string) ||
    (platform.post?.message as string) ||
    (platform.caption as string) ||
    fallback ||
    ''
  );
};

const normaliseMetrics = (platform: any) => {
  const m = platform.insights?.metrics ?? platform.metrics ?? {};
  return {
    likes: m.likes ?? 0,
    comments: m.comments ?? 0,
    shares: m.shares ?? 0,
    saved: m.saved ?? m.saves ?? 0,
    reach: m.reach ?? 0,
    impressions: m.impressions ?? 0,
  };
};

const buildFallbackPlatformPosts = (
  postData: any,
  mainPost: any,
  accountNameById: Record<string, string>
): any[] => {
  const networks: string[] = postData?.selectedNetworks ?? mainPost?.selectedNetworks ?? [];
  const contentMap = postData?.platformSpecificContent ?? mainPost?.platformSpecificContent ?? {};
  const mainCaption = postData?.caption || mainPost?.caption || '';
  const mainImage = postData?.image_url || mainPost?.image_url || '';
  const mainHashtags = postData?.hashtags || mainPost?.hashtags || [];
  const mainStatus = postData?.post_status || mainPost?.post_status || 'draft';
  const mainDate =
    postData?.updatedAt || postData?.createdAt || mainPost?.updatedAt || mainPost?.createdAt;

  return networks.flatMap((network: string): any[] => {
    let entries: any[] = [];
    if (Array.isArray(contentMap)) {
      entries = contentMap.filter(
        (e) => (e.platform || '').toLowerCase() === network.toLowerCase()
      );
    } else if (contentMap && typeof contentMap === 'object') {
      const raw = contentMap[network] || contentMap[network.toLowerCase()];
      if (Array.isArray(raw)) entries = raw;
    }

    if (entries.length === 0) {
      return [
        {
          platform: network,
          post_id: `${postData?.post_id || mainPost?._id || 'post'}-${network}-0`,
          page_id: null,
          page_name: null,
          account_id: `${network}-account`,
          post_url: '',
          permalink_url: null,
          media_url: mainImage,
          content_type: 'media',
          post: { caption: mainCaption, message: mainCaption, media_url: mainImage },
          insights: null,
          comments: [],
          metrics: { likes: 0, comments: 0, shares: 0, saved: 0, reach: 0, impressions: 0 },
          total_interactions: 0,
          posted_at: mainDate,
          caption: mainCaption,
          hashtags: mainHashtags,
          post_status: mainStatus,
          error_message: '',
          account_name: network.charAt(0).toUpperCase() + network.slice(1) + ' Account',
        },
      ];
    }

    return entries.map((entry, idx) => {
      const entryHashtags = Array.isArray(entry.hashtags) ? entry.hashtags : [];
      const mediaUrl = entry.mediaUrl || entry.media_url || mainImage || '';
      const accountId = entry.account_id || entry.page_id || `${network}-account-${idx + 1}`;
      const caption = entry.caption || mainCaption;
      const resolvedAccountName =
        accountNameById[accountId] ||
        entry.account_name ||
        entry.username ||
        `${network.charAt(0).toUpperCase() + network.slice(1)} Account`;

      return {
        platform: network,
        post_id: `${postData?.post_id || mainPost?._id || 'post'}-${network}-${idx}`,
        page_id: entry.page_id ?? null,
        page_name: resolvedAccountName,
        account_id: accountId,
        post_url: entry.post_url || '',
        permalink_url: entry.post_url || null,
        media_url: mediaUrl,
        content_type: entry.contentType || 'media',
        post: { caption, message: caption, media_url: mediaUrl },
        insights: null,
        comments: [],
        metrics: { likes: 0, comments: 0, shares: 0, saved: 0, reach: 0, impressions: 0 },
        total_interactions: 0,
        posted_at: mainDate,
        caption,
        hashtags: entryHashtags.length > 0 ? entryHashtags : mainHashtags,
        post_status: entry.post_status || mainStatus,
        error_message: entry.error_message || '',
        account_name: resolvedAccountName,
      };
    });
  });
};

// ─── Metric Cell ────────────────────────────────────────────────────────────
function MetricCell({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Box
      style={[styles.metricCell, highlight ? styles.metricCellHighlight : styles.metricCellNormal]}
    >
      <HStack space="xs" className="items-center" style={{ marginBottom: 6 }}>
        <Box>{icon}</Box>
        <Text
          numberOfLines={1}
          style={[
            styles.metricCellLabel,
            highlight ? styles.metricCellLabelHighlight : styles.metricCellLabelNormal,
          ]}
        >
          {label}
        </Text>
      </HStack>
      <Text
        style={[
          styles.metricCellValue,
          highlight ? styles.metricCellValueHighlight : styles.metricCellValueNormal,
        ]}
      >
        {value}
      </Text>
    </Box>
  );
}

// ─── Comment Row ────────────────────────────────────────────────────────────
function CommentRow({
  comment,
  platformColor,
  depth = 0,
}: {
  comment: any;
  platformColor: string;
  depth?: number;
}) {
  const username = comment.username || comment.from?.name || 'User';
  const text = comment.text || comment.message || '';
  const timestamp = formatDate(comment.timestamp || comment.created_time);
  const likes = comment.like_count || 0;
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <Box
      style={[
        styles.commentRowWrapper,
        depth > 0 && {
          marginLeft: 14,
          borderLeftWidth: 2,
          borderLeftColor: `${platformColor}33`,
          paddingLeft: 10,
        },
      ]}
    >
      <HStack space="sm" className="items-start" style={{ paddingVertical: 8 }}>
        <Box
          style={[
            styles.commentAvatar,
            { backgroundColor: `${platformColor}18`, borderColor: `${platformColor}35` },
          ]}
        >
          <Text style={[styles.commentAvatarText, { color: platformColor }]}>{initials}</Text>
        </Box>
        <VStack style={{ flex: 1 }}>
          <HStack className="items-center justify-between" style={{ marginBottom: 2 }}>
            <Text style={styles.commentUser}>{username}</Text>
            {timestamp ? <Text style={styles.commentTime}>{timestamp}</Text> : null}
          </HStack>
          <Text style={styles.commentText}>{text}</Text>
          {likes > 0 && (
            <HStack space="xs" className="items-center" style={{ marginTop: 4 }}>
              <Feather name="heart" size={11} color="#ef4444" />
              <Text style={styles.commentLikes}>{likes}</Text>
            </HStack>
          )}
        </VStack>
      </HStack>
      {comment.replies?.data && comment.replies.data.length > 0 && (
        <VStack>
          {comment.replies.data.map((r: any) => (
            <CommentRow
              key={r.id || Math.random().toString()}
              comment={r}
              platformColor={platformColor}
              depth={depth + 1}
            />
          ))}
        </VStack>
      )}
    </Box>
  );
}

// ─── Account Post Card ──────────────────────────────────────────────────────
function AccountPostCard({
  platform,
  fallbackImage,
  fallbackCaption,
  onOpenViewer,
}: {
  platform: any;
  fallbackImage?: string;
  fallbackCaption?: string;
  onOpenViewer: (url: string) => void;
}) {
  const cfg = getPlatformCfg(platform.platform);
  const metrics = normaliseMetrics(platform);
  const comments = platform.comments ?? [];
  const caption = resolveCaption(platform, fallbackCaption ?? '');
  const hashtags = platform.hashtags ?? [];
  const mediaUrl = resolveMediaUrl(platform, fallbackImage);
  const postUrl = resolvePostUrl(platform);
  const status = (platform.post_status || 'published').toLowerCase();
  const isFailed = status === 'failed';
  const statusLabel = status ? status.toUpperCase() : 'PUBLISHED';
  const statusColor =
    status === 'failed'
      ? '#ef4444'
      : status === 'draft'
        ? '#f59e0b'
        : status === 'partial'
          ? '#3b82f6'
          : '#22c55e';

  const accountName =
    platform.account_name ||
    platform.username ||
    platform.page_name ||
    `Account ${platform.account_id ? platform.account_id.slice(-6) : ''}`;

  const formattedDate = formatDate(platform.posted_at);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const CAPTION_LIMIT = 140;

  return (
    <Box style={styles.accountCard}>
      {/* ── Account header row ── */}
      <Box style={styles.accountHeaderRow}>
        <HStack space="sm" className="items-center" style={{ flex: 1, minWidth: 0 }}>
          <Box
            style={[
              styles.accountAvatar,
              { backgroundColor: `${cfg.color}15`, borderColor: `${cfg.color}30` },
            ]}
          >
            {cfg.icon(18, cfg.color)}
          </Box>
          <VStack style={{ flex: 1, minWidth: 0 }}>
            <HStack space="xs" className="items-center">
              <Text numberOfLines={1} style={styles.accountNameText}>
                {accountName}
              </Text>
              <Box
                style={[
                  styles.miniStatusBadge,
                  { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}40` },
                ]}
              >
                <Text style={[styles.miniStatusBadgeText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </Box>
            </HStack>
            {platform.account_id ? (
              <Text numberOfLines={1} style={styles.accountIdText}>
                Account: {platform.account_id}
              </Text>
            ) : null}
          </VStack>
        </HStack>

        {/* Date & Open Link */}
        <HStack space="xs" className="items-center" style={{ marginLeft: 8 }}>
          {formattedDate ? (
            <HStack space="xs" className="items-center" style={{ marginRight: 4 }}>
              <Feather name="calendar" size={12} color="#94a3b8" />
              <Text style={styles.accountDateText}>{formattedDate}</Text>
            </HStack>
          ) : null}
          {postUrl ? (
            <TouchableOpacity
              style={styles.openLinkBtn}
              onPress={() => Linking.openURL(postUrl)}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={12} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.openLinkBtnText}>Open</Text>
            </TouchableOpacity>
          ) : null}
        </HStack>
      </Box>

      {/* ── Failed error banner ── */}
      {isFailed && platform.error_message ? (
        <Box style={styles.errorBanner}>
          <Feather name="alert-triangle" size={15} color="#ef4444" style={{ marginTop: 1 }} />
          <Text style={styles.errorBannerText}>{platform.error_message}</Text>
        </Box>
      ) : null}

      {/* ── Main body (Image + Caption + Hashtags + Metrics) ── */}
      <Box style={{ padding: 14 }}>
        {/* Media Preview */}
        {mediaUrl ? (
          <TouchableOpacity
            onPress={() => onOpenViewer(mediaUrl)}
            activeOpacity={0.9}
            style={styles.platformMediaWrapper}
          >
            <Image
              source={{ uri: mediaUrl }}
              style={styles.platformMediaImage}
              resizeMode="cover"
            />
            <Box style={styles.imageBadge}>
              <Feather name="maximize-2" size={12} color="#fff" />
              <Text style={styles.imageBadgeText}>Tap to View</Text>
            </Box>
          </TouchableOpacity>
        ) : null}

        {/* Caption */}
        {caption ? (
          <Box style={{ marginTop: mediaUrl ? 12 : 0, marginBottom: 10 }}>
            <Text style={styles.captionText} numberOfLines={captionExpanded ? undefined : 4}>
              {caption}
            </Text>
            {caption.length > CAPTION_LIMIT && (
              <TouchableOpacity
                onPress={() => setCaptionExpanded(!captionExpanded)}
                style={{ marginTop: 4 }}
              >
                <Text style={[styles.readMoreBtn, { color: cfg.color }]}>
                  {captionExpanded ? 'Show less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </Box>
        ) : null}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <HStack space="xs" className="flex-wrap" style={{ marginBottom: 12 }}>
            {hashtags.map((tag: string, idx: number) => (
              <Box key={idx} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag.replace(/^#/, '')}</Text>
              </Box>
            ))}
          </HStack>
        )}

        {/* Platform Metrics Grid (6 boxes) */}
        {!isFailed && (
          <Box style={styles.grid2Col}>
            <MetricCell
              icon={<Feather name="heart" size={13} color="#94a3b8" />}
              label="LIKES"
              value={fmt(metrics.likes)}
            />
            <MetricCell
              icon={<Feather name="message-square" size={13} color="#94a3b8" />}
              label="COMMENTS"
              value={fmt(metrics.comments)}
            />
            <MetricCell
              icon={<Feather name="repeat" size={13} color="#94a3b8" />}
              label="SHARES"
              value={fmt(metrics.shares)}
            />
            <MetricCell
              icon={<Feather name="bookmark" size={13} color="#94a3b8" />}
              label="SAVES"
              value={fmt(metrics.saved)}
            />
            <MetricCell
              icon={<Feather name="eye" size={13} color="#94a3b8" />}
              label="REACH"
              value={fmt(metrics.reach)}
            />
            <MetricCell
              icon={<Feather name="bar-chart-2" size={13} color="#94a3b8" />}
              label="IMPRESSIONS"
              value={fmt(metrics.impressions)}
            />
          </Box>
        )}
      </Box>

      {/* ── Comments Section ── */}
      {comments.length > 0 ? (
        <Box style={styles.commentsSection}>
          <Text style={styles.commentsHeaderTitle}>Comments ({comments.length})</Text>
          <VStack>
            {comments.map((c: any) => (
              <CommentRow
                key={c.id || Math.random().toString()}
                comment={c}
                platformColor={cfg.color}
              />
            ))}
          </VStack>
        </Box>
      ) : !isFailed ? (
        <Box style={styles.noCommentsBox}>
          <Feather name="message-square" size={20} color="#cbd5e1" />
          <Text style={styles.noCommentsText}>No comments yet</Text>
          <Text style={styles.noCommentsSubText}>Comments from this account will appear here.</Text>
        </Box>
      ) : null}
    </Box>
  );
}

// ─── Main Screen Component ──────────────────────────────────────────────────
export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [details, setDetails] = useState<PostDetails | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [accountNameById, setAccountNameById] = useState<Record<string, string>>({});
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

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
        // Basic post fallback if details fails
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load post details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [mainPost, socialAccountsRes] = await Promise.allSettled([
          getPost(id),
          getAllSocialAccountsForPost(),
        ]);

        if (!isMounted) return;

        if (mainPost.status === 'fulfilled') {
          setPost(mainPost.value);
        }

        if (socialAccountsRes.status === 'fulfilled') {
          const accounts = Array.isArray((socialAccountsRes.value as any)?.data)
            ? (socialAccountsRes.value as any).data
            : Array.isArray(socialAccountsRes.value)
              ? (socialAccountsRes.value as any[])
              : [];
          const mapped: Record<string, string> = {};
          accounts.forEach((acc: any) => {
            if (acc?.account_id) {
              mapped[acc.account_id] = acc.account_name || acc.username || acc.account_id;
            }
          });
          setAccountNameById(mapped);
        }

        try {
          const fullDetails = await getPostDetails(id);
          if (isMounted) setDetails(fullDetails);
        } catch {
          // Keep base post
        }
      } catch (err: any) {
        if (isMounted) {
          Alert.alert('Error', err.message || 'Failed to load post details.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadData();

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

  // Grouped Platforms Computation
  const groupedPlatforms = useMemo(() => {
    const fallbackPlatforms = buildFallbackPlatformPosts(details, post, accountNameById);
    const explicitPlatforms = details?.platforms ?? [];

    const platforms =
      explicitPlatforms.length > 0
        ? (() => {
            const present = new Set(
              explicitPlatforms.map((p: any) => (p.platform || '').toLowerCase())
            );
            const merged = [...explicitPlatforms];
            for (const f of fallbackPlatforms) {
              if (!present.has((f.platform || '').toLowerCase())) {
                merged.push(f);
              }
            }
            return merged;
          })()
        : fallbackPlatforms;

    const map = new Map<string, any[]>();
    for (const p of platforms) {
      const key = (p.platform || 'other').toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }

    return Array.from(map.entries()).map(([platformKey, posts]) => ({
      platformKey,
      posts,
      totalInteractions: posts.reduce(
        (sum: number, p: any) => sum + (p.total_interactions ?? 0),
        0
      ),
      anyFailed: posts.some((p: any) => (p.post_status || '').toLowerCase() === 'failed'),
    }));
  }, [details, post, accountNameById]);

  const safeTab = Math.min(activeTab, Math.max(0, groupedPlatforms.length - 1));
  const activeGroup = groupedPlatforms[safeTab] ?? null;

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#0052d4" />
        <Text style={{ marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: '600' }}>
          Loading Post Details...
        </Text>
      </Box>
    );
  }

  const companyName =
    (post as any)?.company_name || (post as any)?.companyName || (details as any)?.company_name;
  const caption = post?.caption || details?.caption || 'No caption provided';
  const mediaUrl = resolveImageUrl(post?.image_url || details?.image_url);
  const hashtags = post?.hashtags || details?.hashtags || [];
  const status = post?.post_status || details?.post_status || 'draft';
  const networks: string[] = post?.selectedNetworks || (details as any)?.selectedNetworks || [];
  const summary = details?.summary;
  const createdDate = post?.createdAt || details?.createdAt;

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <Box style={styles.header} className="px-5 pb-4 pt-14">
        <HStack className="items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Heading size="lg" style={{ color: '#fff', fontWeight: '700' }}>
            Post Details
          </Heading>
          <TouchableOpacity onPress={fetchPostDetails} style={styles.backBtn}>
            <Feather name="refresh-cw" size={18} color="#fff" />
          </TouchableOpacity>
        </HStack>
      </Box>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Top Summary Card ── */}
        <Box style={styles.card}>
          {/* Company Name & Status */}
          <HStack className="items-start justify-between" style={{ marginBottom: 8 }}>
            <VStack style={{ flex: 1, paddingRight: 10 }}>
              {companyName ? <Text style={styles.companyNameText}>{companyName}</Text> : null}
              <Heading size="md" style={styles.postTitle}>
                {caption}
              </Heading>
            </VStack>
            <StatusBadge status={status} />
          </HStack>

          {/* Media Preview */}
          {mediaUrl ? (
            <TouchableOpacity
              onPress={() => setModalImageUrl(mediaUrl)}
              style={styles.imageWrapper}
              activeOpacity={0.9}
            >
              <Image source={{ uri: mediaUrl }} style={styles.previewImage} resizeMode="cover" />
              <Box style={styles.imageBadge}>
                <Feather name="maximize-2" size={12} color="#fff" />
                <Text style={styles.imageBadgeText}>Tap to View</Text>
              </Box>
            </TouchableOpacity>
          ) : (
            <Box style={styles.noImagePlaceholder}>
              <Feather name="image" size={32} color="#94a3b8" />
              <Text style={{ color: '#94a3b8', marginTop: 6, fontSize: 13, fontWeight: '500' }}>
                No Media Attached
              </Text>
            </Box>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <HStack space="xs" className="mt-3 flex-wrap">
              {hashtags.map((tag, idx) => (
                <Box key={idx} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag.replace(/^#/, '')}</Text>
                </Box>
              ))}
            </HStack>
          )}

          {/* Selected Platforms */}
          {networks.length > 0 && (
            <VStack style={{ marginTop: 14 }}>
              <Text style={styles.sectionLabel}>Selected platforms</Text>
              <HStack space="xs" className="mt-1 flex-wrap">
                {networks.map((net: string, idx: number) => {
                  const pCfg = getPlatformCfg(net);
                  return (
                    <Box key={idx} style={styles.selectedPlatformChip}>
                      {pCfg.icon(14, pCfg.color)}
                      <Text style={styles.selectedPlatformChipText}>{pCfg.label}</Text>
                    </Box>
                  );
                })}
              </HStack>
            </VStack>
          )}

          {/* Created Date */}
          {createdDate ? (
            <HStack space="xs" className="items-center" style={{ marginTop: 14 }}>
              <Feather name="calendar" size={13} color="#94a3b8" />
              <Text style={styles.dateText}>Created {formatDate(createdDate)}</Text>
            </HStack>
          ) : null}

          {/* ── Summary Metric Grid (8 cards) ── */}
          <Box style={[styles.grid2Col, { marginTop: 16 }]}>
            <MetricCell
              icon={<Feather name="users" size={14} color="#64748b" />}
              label="PLATFORMS"
              value={fmt(summary?.total_platforms ?? networks.length)}
            />
            <MetricCell
              icon={<Feather name="bar-chart-2" size={14} color="#ffffff" />}
              label="ENGAGEMENT"
              value={fmt(summary?.total_interactions ?? 0)}
              highlight
            />
            <MetricCell
              icon={<Feather name="heart" size={14} color="#64748b" />}
              label="LIKES"
              value={fmt(summary?.total_likes ?? 0)}
            />
            <MetricCell
              icon={<Feather name="message-square" size={14} color="#64748b" />}
              label="COMMENTS"
              value={fmt(summary?.total_comments ?? 0)}
            />
            <MetricCell
              icon={<Feather name="repeat" size={14} color="#64748b" />}
              label="SHARES"
              value={fmt(summary?.total_shares ?? 0)}
            />
            <MetricCell
              icon={<Feather name="bookmark" size={14} color="#64748b" />}
              label="SAVES"
              value={fmt(summary?.total_saved ?? 0)}
            />
            <MetricCell
              icon={<Feather name="eye" size={14} color="#64748b" />}
              label="REACH"
              value={fmt(summary?.total_reach ?? 0)}
            />
            <MetricCell
              icon={<Feather name="activity" size={14} color="#64748b" />}
              label="IMPRESSIONS"
              value={fmt(summary?.total_impressions ?? 0)}
            />
          </Box>
        </Box>

        {/* ── Platforms Section ── */}
        <VStack style={{ marginTop: 8, marginBottom: 14 }}>
          <Text style={styles.platformsSectionTitle}>PLATFORMS aBHI</Text>

          {/* Platform Pills / Tab Selector */}
          {groupedPlatforms.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.platformPillsList}
            >
              {groupedPlatforms.map((group, idx) => {
                const cfg = getPlatformCfg(group.platformKey);
                const isActive = safeTab === idx;
                return (
                  <TouchableOpacity
                    key={group.platformKey}
                    onPress={() => setActiveTab(idx)}
                    activeOpacity={0.8}
                    style={[
                      styles.platformPill,
                      isActive ? styles.platformPillActive : styles.platformPillInactive,
                    ]}
                  >
                    {cfg.icon(16, isActive ? '#ffffff' : cfg.color)}
                    <Text
                      style={[
                        styles.platformPillText,
                        isActive ? styles.platformPillTextActive : styles.platformPillTextInactive,
                      ]}
                    >
                      {cfg.label}
                    </Text>
                    <Box
                      style={[
                        styles.platformPillBadge,
                        isActive
                          ? styles.platformPillBadgeActive
                          : styles.platformPillBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.platformPillBadgeText,
                          isActive
                            ? styles.platformPillBadgeTextActive
                            : styles.platformPillBadgeTextInactive,
                        ]}
                      >
                        {group.posts.length}
                      </Text>
                    </Box>
                    {group.anyFailed && <Box style={styles.redErrorDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Active Platform Account Cards */}
          {activeGroup && activeGroup.posts.length > 0 ? (
            <VStack space="sm" style={{ marginTop: 12 }}>
              {activeGroup.posts.map((postItem: any, pIdx: number) => (
                <AccountPostCard
                  key={`${postItem.platform}-${postItem.post_id}-${postItem.account_id || pIdx}`}
                  platform={postItem}
                  fallbackImage={mediaUrl}
                  fallbackCaption={caption}
                  onOpenViewer={(url) => setModalImageUrl(url)}
                />
              ))}
            </VStack>
          ) : groupedPlatforms.length === 0 ? (
            <Box style={styles.emptyPlatformsCard}>
              <Feather name="globe" size={32} color="#94a3b8" />
              <Text style={styles.emptyPlatformsTitle}>No published platform data</Text>
              <Text style={styles.emptyPlatformsSubtitle}>
                This post has not been published to any platform yet.
              </Text>
            </Box>
          ) : null}
        </VStack>

        {/* ── Action Controls Bar ── */}
        <VStack space="sm" className="">
          <HStack space="sm">
            <TouchableOpacity
              style={[styles.actionBtn, { flex: 1, backgroundColor: '#0052d4' }]}
              onPress={() => router.push({ pathname: '/pages/posts/post-editor', params: { id } })}
              activeOpacity={0.8}
            >
              <Feather name="edit-2" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Edit Post</Text>
            </TouchableOpacity>

            {status === 'draft' && (
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#16a34a' }]}
                onPress={handlePublish}
                activeOpacity={0.8}
              >
                <Feather name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Publish Now</Text>
              </TouchableOpacity>
            )}
          </HStack>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Feather name="trash-2" size={16} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Delete Post</Text>
          </TouchableOpacity>
        </VStack>
      </ScrollView>

      {/* ── Fullscreen Image Modal ── */}
      <Modal
        visible={!!modalImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setModalImageUrl(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalImageUrl(null)}
        >
          <Box style={styles.imageModalContent}>
            <TouchableOpacity onPress={() => setModalImageUrl(null)} style={styles.closeModalBtn}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
            {modalImageUrl && (
              <Image
                source={{ uri: modalImageUrl }}
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

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0052d4',
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  companyNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  postTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 23,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
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
    height: 110,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tagChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedPlatformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
    marginTop: 4,
  },
  selectedPlatformChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 6,
  },
  grid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCell: {
    width: '48.5%',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    justifyContent: 'center',
  },
  metricCellNormal: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricCellHighlight: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  metricCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metricCellLabelNormal: {
    color: '#64748b',
  },
  metricCellLabelHighlight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  metricCellValue: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  metricCellValueNormal: {
    color: '#0f172a',
  },
  metricCellValueHighlight: {
    color: '#ffffff',
  },
  platformsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  platformPillsList: {
    paddingVertical: 4,
    paddingRight: 10,
  },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1.5,
  },
  platformPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  platformPillInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  platformPillText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  platformPillTextActive: {
    color: '#ffffff',
  },
  platformPillTextInactive: {
    color: '#1e293b',
  },
  platformPillBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  platformPillBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  platformPillBadgeInactive: {
    backgroundColor: '#f1f5f9',
  },
  platformPillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  platformPillBadgeTextActive: {
    color: '#ffffff',
  },
  platformPillBadgeTextInactive: {
    color: '#64748b',
  },
  redErrorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginLeft: 6,
  },
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  accountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  accountAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  accountNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 150,
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 6,
  },
  miniStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  accountIdText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  accountDateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  openLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  openLinkBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  errorBanner: {
    marginHorizontal: 14,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
    lineHeight: 16,
  },
  platformMediaWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  platformMediaImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f1f5f9',
  },
  captionText: {
    fontSize: 13,
    color: '#1e293b',
    lineHeight: 19,
  },
  readMoreBtn: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 14,
  },
  commentsHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  commentRowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  commentAvatarText: {
    fontSize: 10,
    fontWeight: '700',
  },
  commentUser: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  commentTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  commentText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  commentLikes: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  noCommentsBox: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  noCommentsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  noCommentsSubText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyPlatformsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  emptyPlatformsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  emptyPlatformsSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
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
