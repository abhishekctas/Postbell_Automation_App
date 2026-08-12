import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  View,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { useAuth } from '@/context/AuthContext';
import {
  getDashboardStats,
  getRecentPosts,
  getTopUsers,
  getPlatformAnalytics,
  getSubscriptionAnalytics,
  getAIUsageStats,
  getWebsiteVisitorsCount,
  getCustomerAvatarUrl,
  DashboardStats,
  RecentPost,
  TopUser,
  PlatformAnalytics,
  SubscriptionAnalytics,
  AIUsageStats,
  WebsiteVisitorDay,
} from './dashboard.api';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Feather,
  FontAwesome,
  AntDesign,
  FontAwesome6,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import HtmlTable, { HtmlTableColumn } from '@/components/HtmlTable';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import CustomerDashboard from '../customerDashboard/CustomerDashboard';

const { width: screenWidth } = Dimensions.get('window');

function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';
  if (typeof num !== 'number') return num;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

function formatRevenue(v: number) {
  if (!v) return '$0.00';
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

// ── Mini Progress Bar ──────────────────────────────────────────────────────────
function MiniProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <View style={styles.miniBarTrack}>
      <View style={[styles.miniBarFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

// ── Stat Column Component ──────────────────────────────────────────────────
function StatColumn({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  onPress,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  value: number | string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }}>
      <VStack style={styles.statCol} space="xs">
        <Box style={[styles.statIconContainer, { backgroundColor: iconBg }]}>
          <Feather name={icon as any} size={15} color={iconColor} />
        </Box>
        <Text style={styles.statValText}>{formatNumber(value as any)}</Text>
        <Text style={styles.statLabelText} numberOfLines={1}>
          {label}
        </Text>
      </VStack>
    </TouchableOpacity>
  );
}

// ── Post Status Badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { bg: string; color: string; border: string }> = {
    published: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    scheduled: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    draft: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    partial_published: { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
    partial: { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
    failed: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  };
  const key = (status || '').toLowerCase();
  const meta = MAP[key] ?? { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
  return (
    <Box style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{status.replace('_', ' ')}</Text>
    </Box>
  );
}

// Helper to format date into 'DD/MM/YYYY HH:MM'
const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Render social media platform icons in rounded chip box matching panel
const renderPlatformIconChips = (platform: string | string[]) => {
  const list = Array.isArray(platform) ? platform : platform ? [platform] : [];
  if (list.length === 0) return <Text style={{ fontSize: 12, color: '#94a3b8' }}>—</Text>;

  const getPlatformChip = (name: string, key: any) => {
    const low = name.trim().toLowerCase();
    let color = '#64748b';
    let icon = <Feather name="share-2" size={13} color={color} />;

    if (low.includes('facebook') || low === 'fb') {
      color = '#1877F2';
      icon = <FontAwesome name="facebook" size={13} color={color} />;
    } else if (low.includes('instagram') || low === 'ig') {
      color = '#E4405F';
      icon = <AntDesign name="instagram" size={13} color={color} />;
    } else if (low.includes('whatsapp') || low === 'wa') {
      color = '#25D366';
      icon = <FontAwesome name="whatsapp" size={13} color={color} />;
    } else if (low.includes('twitter') || low === 'x' || low.includes('x.com')) {
      color = '#000000';
      icon = <FontAwesome6 name="x-twitter" size={12} color={color} />;
    } else if (low.includes('linkedin') || low === 'in') {
      color = '#0A66C2';
      icon = <FontAwesome name="linkedin" size={13} color={color} />;
    } else if (low.includes('youtube') || low === 'yt') {
      color = '#FF0000';
      icon = <FontAwesome name="youtube-play" size={13} color={color} />;
    }

    return (
      <Box
        key={key}
        style={[styles.platformChip, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}
      >
        {icon}
      </Box>
    );
  };

  return (
    <HStack space="xs" style={{ alignItems: 'center' }}>
      {list.map((plat, idx) => getPlatformChip(plat, idx))}
    </HStack>
  );
};

// ── Contributor Avatar Component ──────────────────────────────────────────────
function ContributorAvatar({ avatar, name }: { avatar?: string; name: string }) {
  const [imageError, setImageError] = useState(false);
  const avatarUrl = avatar ? getCustomerAvatarUrl(avatar) : '';
  const initial = (name || 'U').charAt(0).toUpperCase();

  if (avatarUrl && !imageError) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={styles.contributorAvatarImage}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <Box style={styles.avatarCircle}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </Box>
  );
}

// ── Recent Posts Table Columns ─────────────────────────────────────────
const getRecentPostColumns = (): HtmlTableColumn<RecentPost>[] => [
  {
    key: 'title',
    label: 'Title',
    width: '200px',
    render: (v, row) => {
      const titleText = v || row.title || 'Untitled Post';
      const formattedDate = formatDate(row.date);
      return (
        <TouchableOpacity
          onPress={() => router.push('/pages/posts/posts')}
          activeOpacity={0.7}
          style={{ justifyContent: 'center' }}
        >
          <Text
            style={{ fontSize: 13, fontWeight: '600', color: '#1e293b', lineHeight: 18 }}
            numberOfLines={2}
          >
            {titleText}
          </Text>
          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{formattedDate}</Text>
        </TouchableOpacity>
      );
    },
  },
  {
    key: 'author',
    label: 'Author',
    width: '110px',
    render: (v) => (
      <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }} numberOfLines={1}>
        {v || '—'}
      </Text>
    ),
  },
  {
    key: 'platform',
    label: 'Platform',
    width: '40px',
    render: (v) => renderPlatformIconChips(v),
  },
  {
    key: 'status',
    label: 'Status',
    width: '40px',
    render: (v) => <StatusBadge status={v} />,
  },
];

// ── 1. AI Usage Analytics Section Component ──────────────────────────────────────
function AIUsageSection({
  data,
  onRefresh,
  refreshing,
}: {
  data: AIUsageStats | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  if (!data) return null;

  const typeEntries = data.usageByType ? Object.entries(data.usageByType) : [];
  const maxCount = typeEntries.length > 0 ? Math.max(...typeEntries.map(([, s]) => s.count), 1) : 1;

  return (
    <Box style={styles.cardWrapper}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <HStack space="xs" style={{ alignItems: 'center' }}>
          <Box style={[styles.sectionIconBg, { backgroundColor: '#f3e8ff' }]}>
            <MaterialCommunityIcons name="auto-fix" size={18} color="#8b5cf6" />
          </Box>
          <Heading size="md" style={styles.sectionTitleNoMargin}>
            AI Usage Analytics
          </Heading>
        </HStack>
        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.7}
            disabled={refreshing}
            style={styles.refreshIconBtn}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#0b53f8" />
            ) : (
              <Feather name="rotate-cw" size={13} color="#64748b" />
            )}
          </TouchableOpacity>
        )}
      </HStack>

      {/* Top 3 Stats: Total, Monthly, Daily */}
      <HStack style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <Box style={[styles.aiStatPill, { borderColor: '#ddd6fe', backgroundColor: '#f5f3ff' }]}>
          <Text style={[styles.aiStatVal, { color: '#7c3aed' }]}>
            {formatNumber(data.totalUsage)}
          </Text>
          <Text style={styles.aiStatLabel}>Total</Text>
        </Box>
        <Box style={[styles.aiStatPill, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}>
          <Text style={[styles.aiStatVal, { color: '#2563eb' }]}>
            {formatNumber(data.monthlyUsage)}
          </Text>
          <Text style={styles.aiStatLabel}>Monthly</Text>
        </Box>
        <Box style={[styles.aiStatPill, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
          <Text style={[styles.aiStatVal, { color: '#16a34a' }]}>
            {formatNumber(data.dailyUsage)}
          </Text>
          <Text style={styles.aiStatLabel}>Daily</Text>
        </Box>
      </HStack>

      {/* By Type List */}
      {typeEntries.length > 0 && (
        <VStack space="sm">
          <Text style={styles.subHeaderCaption}>BY TYPE</Text>
          {typeEntries.map(([type, s]) => (
            <VStack key={type} space="xs" style={{ marginBottom: 8 }}>
              <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.aiTypeName}>{type}</Text>
                <HStack space="xs" style={{ alignItems: 'center' }}>
                  <Text style={styles.aiTypeCount}>{s.count} uses</Text>
                  <Box style={styles.tokenTag}>
                    <Text style={styles.tokenTagText}>{s.totalTokens} tkns</Text>
                  </Box>
                </HStack>
              </HStack>
              <MiniProgressBar value={s.count} max={maxCount} color="#8b5cf6" />
            </VStack>
          ))}
        </VStack>
      )}
    </Box>
  );
}

// ── 2. Top Contributors Section Component ──────────────────────────────────────
function TopContributorsSection({
  users,
  onRefresh,
  refreshing,
}: {
  users: TopUser[];
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <Box style={styles.sectionMargin}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <HStack space="xs" style={{ alignItems: 'center' }}>
          <Box style={[styles.sectionIconBg, { backgroundColor: '#e0f2fe' }]}>
            <Feather name="award" size={18} color="#0284c7" />
          </Box>
          <Heading size="md" style={styles.sectionTitleNoMargin}>
            Top Contributors
          </Heading>
        </HStack>
        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.7}
            disabled={refreshing}
            style={styles.refreshIconBtn}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#0b53f8" />
            ) : (
              <Feather name="rotate-cw" size={13} color="#64748b" />
            )}
          </TouchableOpacity>
        )}
      </HStack>

      {users.length === 0 ? (
        <Box style={[styles.cardWrapper, styles.emptyContainer]}>
          <Feather name="award" size={28} color="#cbd5e1" style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>No contributors found</Text>
        </Box>
      ) : (
        <VStack space="sm">
          {users
            .filter((u) => u.id)
            .map((u) => {
              const fbCount = u.socialMedia?.facebook?.length || 0;
              const igCount = u.socialMedia?.instagram?.length || 0;
              const waCount = u.socialMedia?.whatsapp?.length || 0;
              const totalSocial = fbCount + igCount + waCount;

              const platformStats = [
                { name: 'Facebook', count: fbCount, color: '#1877F2' },
                { name: 'Instagram', count: igCount, color: '#E4405F' },
                { name: 'WhatsApp', count: waCount, color: '#25D366' },
              ];

              const mostActive = platformStats.reduce((max, p) => (p.count > max.count ? p : max), {
                name: 'None',
                count: 0,
                color: '#64748b',
              });

              const displayName = u.name?.trim() || u.email || 'Unknown User';

              return (
                <Box key={u.id} style={styles.contributorCard}>
                  {/* Header row: Avatar, Name/Company, Engagement %, Most Active badge */}
                  <HStack style={{ alignItems: 'center', marginBottom: 10 }}>
                    <ContributorAvatar avatar={u.avatar} name={displayName} />

                    <VStack style={{ flex: 1, marginLeft: 10, marginRight: 6 }}>
                      <Text style={styles.userNameText} numberOfLines={1}>
                        {displayName}
                      </Text>
                      {u.companyName ? (
                        <Text style={styles.userSubText} numberOfLines={1}>
                          {u.companyName}
                        </Text>
                      ) : null}
                    </VStack>

                    {u.engagement != null && (
                      <Box style={styles.engagementBadge}>
                        <Text style={styles.engagementBadgeText}>{u.engagement}%</Text>
                      </Box>
                    )}

                    <Box
                      style={[
                        styles.mostActiveBadge,
                        {
                          backgroundColor:
                            mostActive.count > 0 ? `${mostActive.color}15` : '#f1f5f9',
                          borderColor: mostActive.count > 0 ? `${mostActive.color}30` : '#e2e8f0',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.mostActiveBadgeText,
                          { color: mostActive.count > 0 ? mostActive.color : '#64748b' },
                        ]}
                      >
                        {mostActive.count > 0 ? `Most: ${mostActive.name}` : 'No activity'}
                      </Text>
                    </Box>
                  </HStack>

                  {/* Row 2: Connected Accounts & Posts stats */}
                  <HStack space="xs" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    <Box style={styles.infoPill}>
                      <Feather
                        name="file-text"
                        size={11}
                        color="#64748b"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.infoPillText}>{u.totalPosts ?? 0} posts</Text>
                    </Box>
                    <Box style={styles.infoPill}>
                      <Feather name="users" size={11} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.infoPillText}>{totalSocial} accounts</Text>
                    </Box>
                  </HStack>

                  {/* Row 3: Platform accounts breakdown */}
                  <HStack space="xs" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    <Box style={styles.infoPill}>
                      <FontAwesome
                        name="facebook"
                        size={11}
                        color="#1877F2"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.infoPillText}>{fbCount} Facebook</Text>
                    </Box>
                    <Box style={styles.infoPill}>
                      <AntDesign
                        name="instagram"
                        size={11}
                        color="#E4405F"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.infoPillText}>{igCount} Instagram</Text>
                    </Box>
                    <Box style={styles.infoPill}>
                      <FontAwesome
                        name="whatsapp"
                        size={11}
                        color="#25D366"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.infoPillText}>{waCount} WhatsApp</Text>
                    </Box>
                  </HStack>

                  {/* Row 4: Status grid */}
                  <HStack style={styles.contributorStatusGrid}>
                    <View style={[styles.statusBox, { backgroundColor: 'rgba(22,163,74,0.09)' }]}>
                      <Text style={[styles.statusBoxLabel, { color: '#15803d' }]}>Published</Text>
                      <Text style={[styles.statusBoxVal, { color: '#15803d' }]}>
                        {u.publishedPosts ?? 0}
                      </Text>
                    </View>
                    <View style={[styles.statusBox, { backgroundColor: 'rgba(217,119,6,0.09)' }]}>
                      <Text style={[styles.statusBoxLabel, { color: '#b45309' }]}>Scheduled</Text>
                      <Text style={[styles.statusBoxVal, { color: '#b45309' }]}>
                        {u.scheduledPosts ?? 0}
                      </Text>
                    </View>
                    <View style={[styles.statusBox, { backgroundColor: 'rgba(99,102,241,0.09)' }]}>
                      <Text style={[styles.statusBoxLabel, { color: '#4338ca' }]}>Draft</Text>
                      <Text style={[styles.statusBoxVal, { color: '#4338ca' }]}>
                        {u.draftPosts ?? 0}
                      </Text>
                    </View>
                    <View style={[styles.statusBox, { backgroundColor: 'rgba(20,184,166,0.09)' }]}>
                      <Text style={[styles.statusBoxLabel, { color: '#0f766e' }]}>Partial</Text>
                      <Text style={[styles.statusBoxVal, { color: '#0f766e' }]}>
                        {u.partialPosts ?? 0}
                      </Text>
                    </View>
                    <View style={[styles.statusBox, { backgroundColor: 'rgba(239,68,68,0.09)' }]}>
                      <Text style={[styles.statusBoxLabel, { color: '#b91c1c' }]}>Failed</Text>
                      <Text style={[styles.statusBoxVal, { color: '#b91c1c' }]}>
                        {u.failedPosts ?? 0}
                      </Text>
                    </View>
                  </HStack>

                  {/* Progress bar */}
                  {u.engagement != null && (
                    <MiniProgressBar value={u.engagement} max={100} color="#16a34a" />
                  )}
                </Box>
              );
            })}
        </VStack>
      )}
    </Box>
  );
}

// ── 3. Subscription Analytics Section Component ──────────────────────────────────
function SubscriptionAnalyticsSection({
  data,
  onRefresh,
  refreshing,
}: {
  data: SubscriptionAnalytics | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [selectedTab, setSelectedTab] = useState<number>(0);

  if (!data) return null;

  const plans = (data.planDistribution ?? []).map((p: any) => ({
    name: p._id || p.name || p.planName || 'Unknown',
    count: billing === 'monthly' ? (p.monthly ?? p.count ?? 0) : (p.annual ?? p.count ?? 0),
    revenue:
      billing === 'monthly'
        ? (p.monthlyRevenue ?? p.revenue ?? 0)
        : (p.annualRevenue ?? p.revenue ?? 0),
  }));

  const totalSubscribers = data.summary?.totalSubscribers ?? plans.reduce((s, p) => s + p.count, 0);

  const totalRev =
    billing === 'monthly'
      ? (data.billingCycle?.monthly?.revenue ?? plans.reduce((s, p) => s + p.revenue, 0))
      : (data.billingCycle?.annual?.revenue ?? plans.reduce((s, p) => s + p.revenue, 0));

  const activePlansCount =
    data.summary?.activeSubscriptionCount ?? plans.filter((p) => p.count > 0).length;

  const maxCount = Math.max(...plans.map((p) => p.count), 1);

  const PLAN_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e'];

  const statusEntries: { name: string; count: number; revenue: number }[] = Array.isArray(
    data.statusBreakdown
  )
    ? (data.statusBreakdown as any[]).map((s: any) => ({
        name: s.status || s._id || s.name || 'Unknown',
        count: s.count ?? 0,
        revenue: s.revenue ?? 0,
      }))
    : Object.entries(data.statusBreakdown ?? {}).map(([status, item]: [string, any]) => ({
        name: status,
        count: item?.count ?? 0,
        revenue: item?.revenue ?? 0,
      }));

  return (
    <Box style={styles.cardWrapper}>
      {/* Header with Title, Refresh Icon, and Monthly/Annual Toggle in clean alignment */}
      <Box style={{ marginBottom: 16 }}>
        <HStack
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <HStack
            space="xs"
            style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
          >
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <Box style={[styles.sectionIconBg, { backgroundColor: '#fef3c7' }]}>
                <Feather name="credit-card" size={18} color="#d97706" />
              </Box>
              <Heading size="md" style={styles.sectionTitleNoMargin}>
                Subscription Analytics
              </Heading>
            </HStack>
            {onRefresh && (
              <TouchableOpacity
                onPress={onRefresh}
                activeOpacity={0.7}
                disabled={refreshing}
                style={styles.refreshIconBtn}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#0b53f8" />
                ) : (
                  <Feather name="rotate-cw" size={13} color="#64748b" />
                )}
              </TouchableOpacity>
            )}
          </HStack>

          {/* Toggle Group */}
          <HStack style={styles.toggleGroupContainer}>
            <TouchableOpacity
              onPress={() => setBilling('monthly')}
              style={[styles.toggleBtn, billing === 'monthly' && styles.toggleBtnActive]}
            >
              <Text
                style={[styles.toggleBtnText, billing === 'monthly' && styles.toggleBtnTextActive]}
              >
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBilling('annual')}
              style={[styles.toggleBtn, billing === 'annual' && styles.toggleBtnActive]}
            >
              <Text
                style={[styles.toggleBtnText, billing === 'annual' && styles.toggleBtnTextActive]}
              >
                Annual
              </Text>
            </TouchableOpacity>
          </HStack>
        </HStack>
      </Box>

      {/* Summary Cards */}
      <HStack style={{ justifyContent: 'space-between', marginBottom: 16, gap: 8 }}>
        <Box style={styles.subSummaryCard}>
          <HStack
            style={{
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: 6,
            }}
          >
            <Text style={styles.subSummaryLabel} numberOfLines={1}>
              Subscribers
            </Text>
            <Box style={[styles.subSummaryIconBg, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
              <Feather name="users" size={12} color="#3b82f6" />
            </Box>
          </HStack>
          <Text style={[styles.subSummaryVal, { color: '#1e293b' }]}>{totalSubscribers}</Text>
        </Box>

        <Box style={styles.subSummaryCard}>
          <HStack
            style={{
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: 6,
            }}
          >
            <Text style={styles.subSummaryLabel} numberOfLines={1}>
              {billing === 'monthly' ? 'Monthly Rev' : 'Annual Rev'}
            </Text>
            <Box style={[styles.subSummaryIconBg, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Feather name="dollar-sign" size={12} color="#10b981" />
            </Box>
          </HStack>
          <Text style={[styles.subSummaryVal, { color: '#10b981' }]}>
            {formatRevenue(totalRev)}
          </Text>
        </Box>

        <Box style={styles.subSummaryCard}>
          <HStack
            style={{
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: 6,
            }}
          >
            <Text style={styles.subSummaryLabel} numberOfLines={1}>
              Active Plans
            </Text>
            <Box style={[styles.subSummaryIconBg, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
              <Feather name="credit-card" size={12} color="#8b5cf6" />
            </Box>
          </HStack>
          <Text style={[styles.subSummaryVal, { color: '#8b5cf6' }]}>{activePlansCount}</Text>
        </Box>
      </HStack>

      {/* Sub Tabs Selector */}
      <HStack style={styles.subTabContainer}>
        {['Plans', 'Status', 'Details'].map((t, idx) => (
          <TouchableOpacity
            key={t}
            onPress={() => setSelectedTab(idx)}
            style={[styles.subTabBtn, selectedTab === idx && styles.subTabBtnActive]}
          >
            <Text style={[styles.subTabBtnText, selectedTab === idx && styles.subTabBtnTextActive]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </HStack>

      {/* Tab 0: Subscription Plan Distribution */}
      {selectedTab === 0 && (
        <VStack space="xs">
          {plans.length > 0 ? (
            plans.map((p, idx) => {
              const color = PLAN_COLORS[idx % PLAN_COLORS.length];
              return (
                <VStack key={p.name + idx} space="xs" style={{ marginBottom: 12 }}>
                  <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.planNameText} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <HStack space="xs" style={{ alignItems: 'center' }}>
                      <Text style={styles.planCountText}>{p.count} users</Text>
                      <Box
                        style={[
                          styles.revBadge,
                          { backgroundColor: `${color}15`, borderColor: `${color}30` },
                        ]}
                      >
                        <Text style={[styles.revBadgeText, { color }]}>
                          {formatRevenue(p.revenue)}
                        </Text>
                      </Box>
                    </HStack>
                  </HStack>
                  <MiniProgressBar value={p.count} max={maxCount} color={color} />
                </VStack>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No plan data available</Text>
          )}
        </VStack>
      )}

      {/* Tab 1: Customer Subscription Status */}
      {selectedTab === 1 && (
        <VStack space="xs">
          {statusEntries.length > 0 ? (
            <HStack style={{ flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {statusEntries.map((item, idx) => (
                <Box key={item.name + idx} style={styles.statusPill}>
                  <Text style={styles.statusPillTitle}>{item.name}</Text>
                  <HStack space="xs" style={{ alignItems: 'center', marginTop: 2 }}>
                    <Text style={styles.statusPillCount}>{item.count} subs</Text>
                    <Text style={styles.statusPillRev}>({formatRevenue(item.revenue)})</Text>
                  </HStack>
                </Box>
              ))}
            </HStack>
          ) : (
            <Text style={styles.emptyText}>No subscription status data available</Text>
          )}
        </VStack>
      )}

      {/* Tab 2: Plans Detail Breakdown */}
      {selectedTab === 2 && (
        <VStack space="xs">
          {plans.length > 0 ? (
            plans.map((p, idx) => {
              const color = PLAN_COLORS[idx % PLAN_COLORS.length];
              const pct = totalSubscribers ? (p.count / totalSubscribers) * 100 : 0;
              return (
                <VStack key={p.name + idx} space="xs" style={{ marginBottom: 12 }}>
                  <HStack style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text style={styles.planNameText} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                      {p.count} ({pct.toFixed(1)}%)
                    </Text>
                  </HStack>
                  <MiniProgressBar value={pct} max={100} color={color} />
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Revenue: {formatRevenue(p.revenue)}
                  </Text>
                </VStack>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No plan details available</Text>
          )}
        </VStack>
      )}
    </Box>
  );
}

// ── 4. Platform Performance Section Component ──────────────────────────────────
function PlatformPerformanceSection({
  platforms,
  onRefresh,
  refreshing,
}: {
  platforms: PlatformAnalytics[];
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <Box style={styles.sectionMargin}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <HStack space="xs" style={{ alignItems: 'center' }}>
          <Box style={[styles.sectionIconBg, { backgroundColor: '#eff6ff' }]}>
            <Feather name="monitor" size={18} color="#0b53f8" />
          </Box>
          <Heading size="md" style={styles.sectionTitleNoMargin}>
            Platform Performance
          </Heading>
        </HStack>
        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.7}
            disabled={refreshing}
            style={styles.refreshIconBtn}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#0b53f8" />
            ) : (
              <Feather name="rotate-cw" size={13} color="#64748b" />
            )}
          </TouchableOpacity>
        )}
      </HStack>

      {platforms.length === 0 ? (
        <Box style={[styles.cardWrapper, styles.emptyContainer]}>
          <Feather name="monitor" size={28} color="#cbd5e1" style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>No platform performance data available</Text>
        </Box>
      ) : (
        <VStack space="sm">
          {platforms.map((p) => {
            const name = p.platform.toLowerCase();
            let color = '#0b53f8';
            if (name.includes('facebook') || name === 'fb') color = '#1877F2';
            else if (name.includes('instagram') || name === 'ig') color = '#E4405F';
            else if (name.includes('whatsapp') || name === 'wa') color = '#25D366';
            else if (name.includes('youtube') || name === 'yt') color = '#FF0000';
            else if (name.includes('twitter') || name === 'x') color = '#000000';
            else if (name.includes('linkedin') || name === 'in') color = '#0A66C2';

            const success = Math.round(p.successRate ?? 0);
            const rateBadgeBg = success >= 80 ? '#f0fdf4' : success >= 60 ? '#fffbeb' : '#fef2f2';
            const rateBadgeColor =
              success >= 80 ? '#16a34a' : success >= 60 ? '#d97706' : '#dc2626';
            const rateBadgeBorder =
              success >= 80 ? '#bbf7d0' : success >= 60 ? '#fde68a' : '#fecaca';

            return (
              <Box key={p.platform} style={styles.platformCard}>
                <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <HStack space="xs" style={{ alignItems: 'center' }}>
                    <Box
                      style={[
                        styles.platformIconBox,
                        { backgroundColor: `${color}15`, borderColor: `${color}30` },
                      ]}
                    >
                      <Text style={[styles.platformIconText, { color }]} numberOfLines={1}>
                        {p.platform.slice(0, 2).toUpperCase()}
                      </Text>
                    </Box>
                    <VStack style={{ marginLeft: 8 }}>
                      <Text style={styles.platformNameText}>{p.platform}</Text>
                      <Text style={styles.platformSubText}>
                        {p.uniqueUsers} users · {p.totalPosts} posts
                      </Text>
                    </VStack>
                  </HStack>

                  <Box
                    style={[
                      styles.successRatePill,
                      { backgroundColor: rateBadgeBg, borderColor: rateBadgeBorder },
                    ]}
                  >
                    <Text style={[styles.successRatePillText, { color: rateBadgeColor }]}>
                      {success}%
                    </Text>
                  </Box>
                </HStack>

                <Box style={styles.progressBg}>
                  <Box
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: color,
                        width: `${Math.min(100, success)}%` as any,
                      },
                    ]}
                  />
                </Box>

                <HStack style={styles.platformDetailsRow}>
                  <Text style={styles.platformDetailsText}>
                    <Text style={{ color: '#16a34a', fontWeight: '700' }}>
                      {p.postedPosts ?? 0}
                    </Text>{' '}
                    published
                  </Text>
                  <Text style={styles.platformDetailsText}>
                    <Text style={{ color: '#0b53f8', fontWeight: '700' }}>
                      {p.scheduledPosts ?? 0}
                    </Text>{' '}
                    scheduled
                  </Text>
                </HStack>
              </Box>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}

// ── 5. Website Visitors Section Component ──────────────────────────────────────
function WebsiteVisitorsSection({
  data: propData,
  onRefresh: parentRefresh,
  refreshing,
}: {
  data?: WebsiteVisitorDay[];
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [data, setData] = useState<WebsiteVisitorDay[]>(propData ?? []);

  const fetchVisitorData = useCallback(async () => {
    try {
      const res = await getWebsiteVisitorsCount();
      const raw = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data)
          ? (res as any).data
          : [];
      if (raw.length > 0) {
        setData(raw);
      }
    } catch {
      // fallback to propData
    }
  }, []);

  useEffect(() => {
    if (propData && propData.length > 0) {
      setData(propData);
    } else {
      void fetchVisitorData();
    }
  }, [propData, fetchVisitorData]);

  const onRefresh = () => {
    void fetchVisitorData();
    if (parentRefresh) parentRefresh();
  };

  const sortedData = [...(data ?? [])].sort((a, b) => a._id.localeCompare(b._id));
  const dates = sortedData.map((d) => {
    const parts = d._id.split('-');
    if (parts.length === 3) {
      const date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return `${date.getDate()} ${months[date.getMonth()]}`;
    }
    return d._id;
  });

  const values = sortedData.map((d) => d.count);
  const total = values.reduce((s, v) => s + v, 0);
  const peak = values.length ? Math.max(...values) : 0;

  const chartWidth = screenWidth - 64;
  const chartHeight = 140;
  const paddingLeft = 28;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 24;

  const maxVal = Math.max(peak, 1) * 1.15;

  const points = values.map((val, idx) => {
    const x =
      paddingLeft +
      (idx * (chartWidth - paddingLeft - paddingRight)) / Math.max(1, values.length - 1);
    const y =
      chartHeight - paddingBottom - (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
    return { x, y, val };
  });

  const getSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const smoothLinePath = getSmoothPath(points);
  const smoothFillPath =
    points.length > 0
      ? `${smoothLinePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
      : '';

  return (
    <Box style={styles.cardWrapper}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <HStack style={{ alignItems: 'center' }}>
          <Box
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'rgba(59,130,246,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Feather name="users" size={20} color="#193867" />
          </Box>
          <Heading size="md" style={styles.sectionTitleNoMargin}>
            Website Visitors
          </Heading>
        </HStack>

        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.7}
            disabled={refreshing}
            style={styles.refreshIconBtn}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#0b53f8" />
            ) : (
              <Feather name="rotate-cw" size={13} color="#64748b" />
            )}
          </TouchableOpacity>
        )}
      </HStack>

      <HStack style={{ gap: 24, marginBottom: 14 }}>
        <Box>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#1e293b', lineHeight: 26 }}>
            {total.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '400', marginTop: 2 }}>
            Total (7d)
          </Text>
        </Box>
        <Box>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#378ADD', lineHeight: 26 }}>
            {peak.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '400', marginTop: 2 }}>
            Peak day
          </Text>
        </Box>
      </HStack>

      {values.length > 0 ? (
        <View style={{ height: chartHeight + 20, width: '100%' }}>
          <Svg height={chartHeight} width={chartWidth}>
            <Defs>
              <SvgLinearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#378ADD" stopOpacity={0.25} />
                <Stop offset="100%" stopColor="#378ADD" stopOpacity={0.02} />
              </SvgLinearGradient>
            </Defs>

            {/* Horizontal Dashed Grid Lines */}
            {[0.2, 0.5, 0.8].map((factor, i) => {
              const y = paddingTop + factor * (chartHeight - paddingTop - paddingBottom);
              return (
                <Path
                  key={i}
                  d={`M ${paddingLeft} ${y} L ${chartWidth - paddingRight} ${y}`}
                  stroke="rgba(0,0,0,0.06)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              );
            })}

            <Path d={smoothFillPath} fill="url(#visGrad)" />
            <Path d={smoothLinePath} fill="none" stroke="#378ADD" strokeWidth={2.2} />

            {points.map((p, i) => (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={4}
                fill="#ffffff"
                stroke="#378ADD"
                strokeWidth={2}
              />
            ))}
          </Svg>

          <View
            style={{
              flexDirection: 'row',
              width: chartWidth,
              paddingLeft: paddingLeft,
              paddingRight: paddingRight,
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            {dates.map((d, i) => (
              <Text
                key={i}
                style={{ fontSize: 10, color: '#64748b', fontWeight: '500', textAlign: 'center' }}
              >
                {d}
              </Text>
            ))}
          </View>
        </View>
      ) : (
        <Box style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No visitor data available</Text>
        </Box>
      )}
    </Box>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const isCustomer =
    user?.loginType === 'customer' || user?.role_name?.toLowerCase().includes('customer');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Per-section refreshing indicators
  const [refreshingAI, setRefreshingAI] = useState(false);
  const [refreshingPosts, setRefreshingPosts] = useState(false);
  const [refreshingUsers, setRefreshingUsers] = useState(false);
  const [refreshingPlatforms, setRefreshingPlatforms] = useState(false);
  const [refreshingSubs, setRefreshingSubs] = useState(false);
  const [refreshingVisitors, setRefreshingVisitors] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [platforms, setPlatforms] = useState<PlatformAnalytics[]>([]);
  const [aiUsageStats, setAiUsageStats] = useState<AIUsageStats | null>(null);
  const [subscriptionAnalytics, setSubscriptionAnalytics] = useState<SubscriptionAnalytics | null>(
    null
  );
  const [websiteVisitors, setWebsiteVisitors] = useState<WebsiteVisitorDay[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const loginType = user?.loginType || 'user';
      const params = `loginType=${loginType}`;
      const [s, posts, users, plat, ai, sub, visitors] = await Promise.all([
        getDashboardStats(params).catch(() => null),
        getRecentPosts(10, params).catch(() => []),
        getTopUsers(10, params).catch(() => []),
        getPlatformAnalytics(params).catch(() => []),
        getAIUsageStats(params).catch(() => null),
        getSubscriptionAnalytics(params).catch(() => null),
        getWebsiteVisitorsCount(params).catch(() => []),
      ]);

      if (s) setStats(s);
      setRecentPosts(Array.isArray(posts) ? posts : []);
      setTopUsers(Array.isArray(users) ? users : []);
      setPlatforms(Array.isArray(plat) ? plat : []);
      if (ai) setAiUsageStats(ai);
      if (sub) setSubscriptionAnalytics(sub);
      setWebsiteVisitors(Array.isArray(visitors) ? visitors : []);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchAll();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // ── Individual Section Refresh Handlers ─────────────────────────────────────
  const refreshAI = async () => {
    setRefreshingAI(true);
    try {
      const loginType = user?.loginType || 'user';
      const res = await getAIUsageStats(`loginType=${loginType}`);
      if (res) setAiUsageStats(res);
    } catch {
      // ignore
    } finally {
      setRefreshingAI(false);
    }
  };

  const refreshPosts = async () => {
    setRefreshingPosts(true);
    try {
      const loginType = user?.loginType || 'user';
      const res = await getRecentPosts(10, `loginType=${loginType}`);
      setRecentPosts(Array.isArray(res) ? res : []);
    } catch {
      // ignore
    } finally {
      setRefreshingPosts(false);
    }
  };

  const refreshUsers = async () => {
    setRefreshingUsers(true);
    try {
      const loginType = user?.loginType || 'user';
      const res = await getTopUsers(10, `loginType=${loginType}`);
      setTopUsers(Array.isArray(res) ? res : []);
    } catch {
      // ignore
    } finally {
      setRefreshingUsers(false);
    }
  };

  const refreshPlatforms = async () => {
    setRefreshingPlatforms(true);
    try {
      const loginType = user?.loginType || 'user';
      const res = await getPlatformAnalytics(`loginType=${loginType}`);
      setPlatforms(Array.isArray(res) ? res : []);
    } catch {
      // ignore
    } finally {
      setRefreshingPlatforms(false);
    }
  };

  const refreshSubscriptions = async () => {
    setRefreshingSubs(true);
    try {
      const loginType = user?.loginType || 'user';
      const res = await getSubscriptionAnalytics(`loginType=${loginType}`);
      if (res) setSubscriptionAnalytics(res);
    } catch {
      // ignore
    } finally {
      setRefreshingSubs(false);
    }
  };

  const refreshVisitors = async () => {
    setRefreshingVisitors(true);
    try {
      const loginType = user?.loginType || 'user';
      const res = await getWebsiteVisitorsCount(`loginType=${loginType}`);
      setWebsiteVisitors(Array.isArray(res) ? res : []);
    } catch {
      // ignore
    } finally {
      setRefreshingVisitors(false);
    }
  };

  if (isCustomer) {
    return <CustomerDashboard />;
  }

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-background-0">
        <ActivityIndicator size="large" color="#0b53f8" />
        <Text className="mt-3 text-typography-500">Loading dashboard...</Text>
      </Box>
    );
  }

  const firstName = user?.first_name || '';

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        signOut();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ]);
    }
  };

  return (
    <Box style={styles.container}>
      {/* ── HEADER BAR ──────────────────────────────────────────────────────── */}
      <LinearGradient colors={['#0c55f8', '#084ad3']} style={styles.header}>
        <HStack style={styles.headerTopRow}>
          {/* Logo with bell icon */}
          <HStack space="lg" style={styles.logoRow}>
            <View style={styles.logoIconBg}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.logoText}>POSTBELL</Text>
          </HStack>

          {/* Notification bell and logout buttons */}
          <HStack space="md" style={styles.headerRightIcons}>
            <TouchableOpacity onPress={handleSignOut} style={styles.headerIconButton}>
              <Feather name="log-out" size={18} color="white" />
            </TouchableOpacity>
          </HStack>
        </HStack>

        <VStack style={styles.headerWelcomeSection} space="xs">
          <Text style={styles.headerGreeting}>Welcome back, {firstName}! 👋</Text>
          <Text style={styles.headerSubtitle}>
            Here&apos;s what is happening with your content.
          </Text>
        </VStack>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0b53f8" />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── ERROR ─────────────────────────────────────────────────────────── */}
        {error && (
          <Box style={styles.errorBox}>
            <Text className="text-sm text-error-700">{error}</Text>
          </Box>
        )}

        {/* ── OVERLAPPING STATS CARD ────────────────────────────────────────── */}
        {stats && (
          <View style={styles.statsCardWrapper}>
            {/* Row 1 */}
            <HStack style={styles.statsRow}>
              <StatColumn
                icon="edit"
                iconBg="#eff6ff"
                iconColor="#3b82f6"
                value={stats.totalPosts}
                label="Total Posts"
                onPress={() => router.push('/pages/posts/posts')}
              />
              <StatColumn
                icon="check-square"
                iconBg="#f0fdf4"
                iconColor="#16a34a"
                value={stats.publishedPosts}
                label="Published"
                onPress={() =>
                  router.push({ pathname: '/pages/posts/posts', params: { status: 'published' } })
                }
              />
              <StatColumn
                icon="calendar"
                iconBg="#fffbeb"
                iconColor="#d97706"
                value={stats.scheduledPosts}
                label="Scheduled"
                onPress={() =>
                  router.push({ pathname: '/pages/posts/posts', params: { status: 'scheduled' } })
                }
              />
              <StatColumn
                icon="edit-2"
                iconBg="#faf5ff"
                iconColor="#7c3aed"
                value={stats.draftPosts}
                label="Drafts"
                onPress={() =>
                  router.push({ pathname: '/pages/posts/posts', params: { status: 'draft' } })
                }
              />
            </HStack>

            {/* Divider line */}
            <View style={styles.statsDivider} />

            {/* Row 2 */}
            <HStack style={styles.statsRow}>
              <StatColumn
                icon="trending-up"
                iconBg="#e0e7ff"
                iconColor="#4f46e5"
                value={stats.totalUsers}
                label="Active Customers"
                onPress={() => router.push('/pages/customers/customers')}
              />
              <StatColumn
                icon="alert-circle"
                iconBg="#fef2f2"
                iconColor="#dc2626"
                value={stats.failedPosts}
                label="Failed"
                onPress={() =>
                  router.push({ pathname: '/pages/posts/posts', params: { status: 'failed' } })
                }
              />
              <StatColumn
                icon="layers"
                iconBg="#ffedd5"
                iconColor="#ea580c"
                value={stats.partialPublishedPosts}
                label="Partial"
                onPress={() =>
                  router.push({ pathname: '/pages/posts/posts', params: { status: 'partial' } })
                }
              />
            </HStack>
          </View>
        )}

        {/* ── 1. AI USAGE ANALYTICS ────────────────────────────────────────── */}
        {aiUsageStats && (
          <Box style={styles.sectionMargin}>
            <AIUsageSection data={aiUsageStats} onRefresh={refreshAI} refreshing={refreshingAI} />
          </Box>
        )}

        {/* ── 2. RECENT POSTS ──────────────────────────────────────────────── */}
        <Box style={styles.sectionMargin}>
          <HStack style={styles.sectionHeaderRow}>
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <Box
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: 'rgba(59,130,246,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                }}
              >
                <Feather name="bar-chart-2" size={18} color="#193867" />
              </Box>
              <Heading size="md" style={styles.sectionTitleNoMargin}>
                Recent Posts
              </Heading>
            </HStack>

            <HStack space="sm" style={{ alignItems: 'center' }}>
              <TouchableOpacity
                onPress={refreshPosts}
                activeOpacity={0.7}
                disabled={refreshingPosts}
                style={styles.refreshIconBtn}
              >
                {refreshingPosts ? (
                  <ActivityIndicator size="small" color="#0b53f8" />
                ) : (
                  <Feather name="rotate-cw" size={13} color="#64748b" />
                )}
              </TouchableOpacity>
            </HStack>
          </HStack>

          {recentPosts.length > 0 ? (
            <HtmlTable
              columns={getRecentPostColumns()}
              data={recentPosts}
              tableContainerStyle={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 16,
                backgroundColor: '#ffffff',
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
                marginHorizontal: 0,
                marginVertical: 4,
              }}
              headerRowStyle={{
                backgroundColor: '#f8fafc',
                borderBottomWidth: 1.5,
                borderBottomColor: '#e2e8f0',
                paddingVertical: 6,
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
                backgroundColor: '#ffffff',
                paddingVertical: 4,
              }}
            />
          ) : (
            <Box style={[styles.cardWrapper, styles.emptyContainer]}>
              <Feather name="file-text" size={28} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No recent posts available</Text>
            </Box>
          )}
        </Box>

        {/* ── 3. PLATFORM PERFORMANCE ────────────────────────────────────────── */}
        <PlatformPerformanceSection
          platforms={platforms}
          onRefresh={refreshPlatforms}
          refreshing={refreshingPlatforms}
        />

        {/* ── 4. TOP CONTRIBUTORS ──────────────────────────────────────────── */}
        <TopContributorsSection
          users={topUsers}
          onRefresh={refreshUsers}
          refreshing={refreshingUsers}
        />

        {/* ── 5. SUBSCRIPTION ANALYTICS ─────────────────────────────────────── */}
        {subscriptionAnalytics && (
          <Box style={styles.sectionMargin}>
            <SubscriptionAnalyticsSection
              data={subscriptionAnalytics}
              onRefresh={refreshSubscriptions}
              refreshing={refreshingSubs}
            />
          </Box>
        )}

        {/* ── 6. WEBSITE VISITORS ────────────────────────────────────────────── */}
        <Box style={styles.sectionMargin}>
          <WebsiteVisitorsSection
            data={websiteVisitors}
            onRefresh={refreshVisitors}
            refreshing={refreshingVisitors}
          />
        </Box>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoImage: {
    width: 140,
    height: 55,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconBg: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerWelcomeSection: {
    paddingHorizontal: 20,
  },
  headerGreeting: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 85,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  statsCardWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  statLabelText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  statsDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  sectionMargin: {
    marginTop: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  sectionTitleNoMargin: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  sectionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  viewAllText: {
    fontSize: 13,
    color: '#0b53f8',
    fontWeight: '700',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cardWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contributorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
    marginBottom: 10,
  },
  contributorAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  avatarInitial: {
    color: '#0b53f8',
    fontSize: 15,
    fontWeight: 'bold',
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  userSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  engagementBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  engagementBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  mostActiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 6,
  },
  mostActiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  contributorStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 10,
  },
  statusBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBoxLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  statusBoxVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  platformChip: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  platformCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
    marginBottom: 10,
  },
  platformIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformIconText: {
    fontWeight: '800',
    fontSize: 11,
  },
  platformNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'capitalize',
  },
  platformSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  successRatePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  successRatePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  platformDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  platformDetailsText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  progressBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  miniBarTrack: {
    height: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  miniBarFill: {
    height: 5,
    borderRadius: 3,
  },
  aiStatPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  aiStatVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  aiStatLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  subHeaderCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  aiTypeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  aiTypeCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tokenTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tokenTagText: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '600',
  },
  subSummaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'flex-start',
  },
  subSummaryIconBg: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subSummaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  subSummaryVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  subTabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  subTabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  subTabBtnTextActive: {
    color: '#0b53f8',
    fontWeight: '700',
  },
  planNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  planCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  revBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  revBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 100,
  },
  statusPillTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'capitalize',
  },
  statusPillCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusPillRev: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '600',
  },
  refreshIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleGroupContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#3b82f6',
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
