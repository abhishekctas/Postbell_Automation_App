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
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
  Text as SvgText,
  Rect,
  G,
} from 'react-native-svg';
import CustomerDashboard from '../customerDashboard/CustomerDashboard';

const { width: screenWidth } = Dimensions.get('window');

const STATIC_POST_IMAGES = [
  'https://images.unsplash.com/photo-1605276374104-edd2c0856643?w=300',
  'https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=300',
  'https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=300',
];

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
  const MAP: Record<string, { bg: string; color: string }> = {
    published: { bg: '#eff6ff', color: '#2563eb' }, // soft blue
    scheduled: { bg: '#f0fdf4', color: '#16a34a' }, // soft green matching screenshot
    draft: { bg: '#fffbeb', color: '#d97706' }, // soft amber
    partial_published: { bg: '#faf5ff', color: '#7c3aed' }, // soft purple
    failed: { bg: '#fef2f2', color: '#dc2626' }, // soft red
  };
  const meta = MAP[status] ?? { bg: '#f1f5f9', color: '#64748b' };
  return (
    <Box style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{status.replace('_', ' ')}</Text>
    </Box>
  );
}

// ── Custom SVG Line Chart Component ──────────────────────────────────────────
function EngagementChart({ totalReach }: { totalReach: number }) {
  const chartWidth = screenWidth - 64;
  const chartHeight = 130;

  const paddingLeft = 32;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 20;

  // Generate 7 days labels
  const getPast7Days = () => {
    const dates = [];
    const months = [
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
    ];
    const d = new Date();
    // Use fixed start month or dynamic
    for (let i = 6; i >= 0; i--) {
      const tempDate = new Date();
      tempDate.setDate(d.getDate() - i);
      dates.push(`${tempDate.getDate()} ${months[tempDate.getMonth()]}`);
    }
    return dates;
  };
  const dates = getPast7Days();

  // Generate 7 values representing a nice growth curve ending at the totalReach
  const multipliers = [0.35, 0.48, 0.4, 0.58, 0.5, 0.68, 1.0];
  const dataValues = multipliers.map((m) => Math.round(m * totalReach));
  const maxVal = Math.max(...dataValues) * 1.15 || 100;

  // Compute points coordinates
  const points = dataValues.map((val, idx) => {
    const x = paddingLeft + (idx * (chartWidth - paddingLeft - paddingRight)) / 6;
    const y =
      chartHeight - paddingBottom - (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
    return { x, y, val };
  });

  // Build SVG path
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    linePath += ` L ${points[i].x} ${points[i].y}`;
  }

  const fillPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`;

  // Format Y-axis labels
  const yLabels = [0, Math.round(maxVal * 0.45), Math.round(maxVal * 0.9)];

  return (
    <View style={{ height: chartHeight + 20, width: '100%', marginTop: 12 }}>
      <Svg height={chartHeight} width={chartWidth}>
        <Defs>
          <SvgLinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0b53f8" stopOpacity={0.2} />
            <Stop offset="100%" stopColor="#0b53f8" stopOpacity={0.0} />
          </SvgLinearGradient>
        </Defs>

        {/* Grid lines */}
        {yLabels.map((val, i) => {
          const y =
            chartHeight -
            paddingBottom -
            (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
          return (
            <Path
              key={i}
              d={`M ${paddingLeft} ${y} L ${chartWidth - paddingRight} ${y}`}
              stroke="#f1f5f9"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Y Axis text */}
        {yLabels.map((val, i) => {
          const y =
            chartHeight -
            paddingBottom -
            (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
          return (
            <SvgText
              key={i}
              x={paddingLeft - 8}
              y={y + 3}
              fill="#94a3b8"
              fontSize={10}
              fontWeight="600"
              textAnchor="end"
            >
              {formatNumber(val)}
            </SvgText>
          );
        })}

        {/* Gradient Fill under Line */}
        <Path d={fillPath} fill="url(#chartGrad)" />

        {/* Stroke Line */}
        <Path d={linePath} fill="none" stroke="#0b53f8" strokeWidth={2.5} />

        {/* Vertex dots */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="#0b53f8"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        ))}

        {/* Tooltip for the peak (last point) */}
        {(() => {
          const last = points[points.length - 1];
          const tooltipW = 44;
          const tooltipH = 18;
          const tooltipX = last.x - tooltipW / 2;
          const tooltipY = last.y - tooltipH - 8;
          return (
            <G>
              <Rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipW}
                height={tooltipH}
                rx={4}
                fill="#0b53f8"
              />
              <Path
                d={`M ${last.x - 4} ${tooltipY + tooltipH} L ${last.x} ${tooltipY + tooltipH + 4} L ${last.x + 4} ${tooltipY + tooltipH} Z`}
                fill="#0b53f8"
              />
              <SvgText
                x={last.x}
                y={tooltipY + 12}
                fill="#ffffff"
                fontSize={9}
                fontWeight="700"
                textAnchor="middle"
              >
                {formatNumber(last.val)}
              </SvgText>
            </G>
          );
        })()}
      </Svg>

      {/* X Axis labels */}
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
            style={{
              fontSize: 10,
              color: '#94a3b8',
              fontWeight: '600',
              width: (chartWidth - paddingLeft - paddingRight) / 7,
              textAlign: 'center',
            }}
          >
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

// Helper to format date into 'DD MMM YYYY • HH:MM AM/PM'
const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const day = d.getDate();
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
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;

  return `${day} ${month} ${year} • ${timeStr}`;
};

// Render social media platform icons
const renderPlatformIcons = (platform: string | string[]) => {
  const list = Array.isArray(platform) ? platform : platform ? [platform] : [];
  return (
    <HStack space="xs" style={{ marginTop: 4, alignItems: 'center' }}>
      {list.map((plat, idx) => {
        const name = plat.trim().toLowerCase();
        if (name.includes('facebook') || name === 'fb') {
          return (
            <FontAwesome
              key={idx}
              name="facebook-official"
              size={16}
              color="#1877F2"
              style={{ marginRight: 6 }}
            />
          );
        }
        if (name.includes('instagram') || name === 'ig') {
          return (
            <AntDesign
              key={idx}
              name="instagram"
              size={16}
              color="#E4405F"
              style={{ marginRight: 6 }}
            />
          );
        }
        if (name.includes('whatsapp') || name === 'wa') {
          return (
            <FontAwesome
              key={idx}
              name="whatsapp"
              size={16}
              color="#25D366"
              style={{ marginRight: 6 }}
            />
          );
        }
        if (name.includes('twitter') || name === 'x' || name.includes('x.com')) {
          return (
            <FontAwesome6
              key={idx}
              name="x-twitter"
              size={14}
              color="#000000"
              style={{ marginRight: 6 }}
            />
          );
        }
        if (name.includes('linkedin') || name === 'in') {
          return (
            <FontAwesome
              key={idx}
              name="linkedin"
              size={16}
              color="#0A66C2"
              style={{ marginRight: 6 }}
            />
          );
        }
        if (name.includes('youtube') || name === 'yt') {
          return (
            <FontAwesome
              key={idx}
              name="youtube-play"
              size={16}
              color="#FF0000"
              style={{ marginRight: 6 }}
            />
          );
        }
        return (
          <Feather key={idx} name="share-2" size={14} color="#64748b" style={{ marginRight: 6 }} />
        );
      })}
    </HStack>
  );
};

// ── 1. AI Usage Analytics Section Component ──────────────────────────────────────
function AIUsageSection({ data }: { data: AIUsageStats | null }) {
  if (!data) return null;

  const typeEntries = data.usageByType ? Object.entries(data.usageByType) : [];
  const maxCount = typeEntries.length > 0 ? Math.max(...typeEntries.map(([, s]) => s.count), 1) : 1;

  return (
    <Box style={styles.cardWrapper}>
      <HStack style={{ alignItems: 'center', marginBottom: 14 }}>
        <Box style={[styles.sectionIconBg, { backgroundColor: '#f3e8ff' }]}>
          <MaterialCommunityIcons name="auto-fix" size={18} color="#8b5cf6" />
        </Box>
        <Heading size="md" style={styles.sectionTitleNoMargin}>
          AI Usage Analytics
        </Heading>
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
function TopContributorsSection({ users }: { users: TopUser[] }) {
  if (!users || users.length === 0) return null;

  return (
    <Box style={styles.sectionMargin}>
      <HStack style={{ alignItems: 'center', marginBottom: 12 }}>
        <Box style={[styles.sectionIconBg, { backgroundColor: '#e0f2fe', marginRight: 10 }]}>
          <Feather name="award" size={18} color="#0284c7" />
        </Box>
        <Heading size="md" style={styles.sectionTitleNoMargin}>
          Top Contributors
        </Heading>
      </HStack>

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

            const displayName = u.name?.trim() || u.email || 'User';

            return (
              <Box key={u.id} style={styles.contributorCard}>
                {/* Header row: Avatar, Name/Company, Engagement %, Most Active badge */}
                <HStack style={{ alignItems: 'center', marginBottom: 8 }}>
                  <Box style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                  </Box>

                  <VStack style={{ flex: 1, marginLeft: 10, marginRight: 6 }}>
                    <Text style={styles.userNameText} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {u.companyName && (
                      <Text style={styles.userSubText} numberOfLines={1}>
                        {u.companyName}
                      </Text>
                    )}
                  </VStack>

                  {u.engagement != null && (
                    <Box style={styles.engagementBadge}>
                      <Text style={styles.engagementBadgeText}>{u.engagement}%</Text>
                    </Box>
                  )}

                  {mostActive.count > 0 && (
                    <Box
                      style={[
                        styles.mostActiveBadge,
                        {
                          backgroundColor: `${mostActive.color}15`,
                          borderColor: `${mostActive.color}30`,
                        },
                      ]}
                    >
                      <Text style={[styles.mostActiveBadgeText, { color: mostActive.color }]}>
                        {mostActive.name}
                      </Text>
                    </Box>
                  )}
                </HStack>

                {/* Row 2: Connected Accounts & Posts stats */}
                <HStack space="xs" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
                  <Box style={styles.infoPill}>
                    <Feather
                      name="file-text"
                      size={10}
                      color="#64748b"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.infoPillText}>{u.totalPosts ?? 0} posts</Text>
                  </Box>
                  <Box style={styles.infoPill}>
                    <Feather name="users" size={10} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.infoPillText}>{totalSocial} accounts</Text>
                  </Box>
                  {fbCount > 0 && (
                    <Box style={styles.infoPill}>
                      <FontAwesome
                        name="facebook"
                        size={10}
                        color="#1877F2"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.infoPillText}>{fbCount}</Text>
                    </Box>
                  )}
                  {igCount > 0 && (
                    <Box style={styles.infoPill}>
                      <AntDesign
                        name="instagram"
                        size={10}
                        color="#E4405F"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.infoPillText}>{igCount}</Text>
                    </Box>
                  )}
                  {waCount > 0 && (
                    <Box style={styles.infoPill}>
                      <FontAwesome
                        name="whatsapp"
                        size={10}
                        color="#25D366"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.infoPillText}>{waCount}</Text>
                    </Box>
                  )}
                </HStack>

                {/* Status grid */}
                <HStack
                  style={{
                    justifyContent: 'space-between',
                    backgroundColor: '#f8fafc',
                    padding: 6,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <View style={styles.statusColItem}>
                    <Text style={styles.statusColLabel}>Pub</Text>
                    <Text style={[styles.statusColVal, { color: '#16a34a' }]}>
                      {u.publishedPosts ?? 0}
                    </Text>
                  </View>
                  <View style={styles.statusColItem}>
                    <Text style={styles.statusColLabel}>Sched</Text>
                    <Text style={[styles.statusColVal, { color: '#d97706' }]}>
                      {u.scheduledPosts ?? 0}
                    </Text>
                  </View>
                  <View style={styles.statusColItem}>
                    <Text style={styles.statusColLabel}>Draft</Text>
                    <Text style={[styles.statusColVal, { color: '#4338ca' }]}>
                      {u.draftPosts ?? 0}
                    </Text>
                  </View>
                  <View style={styles.statusColItem}>
                    <Text style={styles.statusColLabel}>Partial</Text>
                    <Text style={[styles.statusColVal, { color: '#0f766e' }]}>
                      {u.partialPosts ?? 0}
                    </Text>
                  </View>
                  <View style={styles.statusColItem}>
                    <Text style={styles.statusColLabel}>Failed</Text>
                    <Text style={[styles.statusColVal, { color: '#dc2626' }]}>
                      {u.failedPosts ?? 0}
                    </Text>
                  </View>
                </HStack>

                {u.engagement != null && (
                  <MiniProgressBar value={u.engagement} max={100} color="#16a34a" />
                )}
              </Box>
            );
          })}
      </VStack>
    </Box>
  );
}

// ── 3. Subscription Analytics Section Component ──────────────────────────────────
function SubscriptionAnalyticsSection({
  data,
  onRefresh,
}: {
  data: SubscriptionAnalytics | null;
  onRefresh?: () => void;
}) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

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
      {/* Header with Title, Refresh Icon, and Monthly/Annual Toggle */}
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <HStack style={{ alignItems: 'center', flex: 1 }}>
          <Box style={[styles.sectionIconBg, { backgroundColor: '#fef3c7' }]}>
            <Feather name="credit-card" size={18} color="#d97706" />
          </Box>
          <Heading size="md" style={styles.sectionTitleNoMargin}>
            Subscription Analytics
          </Heading>
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={styles.refreshIconBtn}>
              <Feather name="rotate-cw" size={13} color="#64748b" />
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

      {/* Summary Cards */}
      <HStack style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <Box style={styles.subSummaryCard}>
          <Text style={styles.subSummaryLabel}>Subscribers</Text>
          <Text style={styles.subSummaryVal}>{totalSubscribers}</Text>
        </Box>
        <Box style={styles.subSummaryCard}>
          <Text style={styles.subSummaryLabel}>
            {billing === 'monthly' ? 'Monthly Rev' : 'Annual Rev'}
          </Text>
          <Text style={styles.subSummaryVal}>{formatRevenue(totalRev)}</Text>
        </Box>
        <Box style={styles.subSummaryCard}>
          <Text style={styles.subSummaryLabel}>Active Plans</Text>
          <Text style={styles.subSummaryVal}>{activePlansCount}</Text>
        </Box>
      </HStack>

      {/* Subscription Plan Distribution */}
      {plans.length > 0 && (
        <VStack space="xs" style={{ marginBottom: 16 }}>
          <Text style={styles.subHeaderCaption}>PLAN DISTRIBUTION</Text>
          {plans.map((p, idx) => {
            const color = PLAN_COLORS[idx % PLAN_COLORS.length];
            return (
              <VStack key={p.name + idx} space="xs" style={{ marginBottom: 10 }}>
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
          })}
        </VStack>
      )}

      {/* Customer Subscription Status */}
      {statusEntries.length > 0 && (
        <VStack space="xs">
          <Text style={styles.subHeaderCaption}>CUSTOMER SUBSCRIPTION STATUS</Text>
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
        </VStack>
      )}

      {plans.length === 0 && statusEntries.length === 0 && (
        <Box style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No subscription data available</Text>
        </Box>
      )}
    </Box>
  );
}

// ── 4. Website Visitors Section Component ──────────────────────────────────────
function WebsiteVisitorsSection({
  data,
  onRefresh,
}: {
  data: WebsiteVisitorDay[];
  onRefresh?: () => void;
}) {
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
  const chartHeight = 130;
  const paddingLeft = 28;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 20;

  const maxVal = Math.max(peak, 1) * 1.15;

  const points = values.map((val, idx) => {
    const x =
      paddingLeft +
      (idx * (chartWidth - paddingLeft - paddingRight)) / Math.max(1, values.length - 1);
    const y =
      chartHeight - paddingBottom - (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
    return { x, y, val };
  });

  let linePath = points.length > 0 ? `M ${points[0].x} ${points[0].y}` : '';
  for (let i = 1; i < points.length; i++) {
    linePath += ` L ${points[i].x} ${points[i].y}`;
  }

  const fillPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
      : '';

  return (
    <Box style={styles.cardWrapper}>
      <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <HStack style={{ alignItems: 'center' }}>
          <Box style={[styles.sectionIconBg, { backgroundColor: '#e0e7ff' }]}>
            <Feather name="globe" size={18} color="#4f46e5" />
          </Box>
          <Heading size="md" style={styles.sectionTitleNoMargin}>
            Website Visitors
          </Heading>
        </HStack>

        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} activeOpacity={0.7} style={styles.refreshIconBtn}>
            <Feather name="rotate-cw" size={13} color="#64748b" />
          </TouchableOpacity>
        )}
      </HStack>

      <HStack style={{ gap: 20, marginBottom: 12 }}>
        <Box>
          <Text style={styles.visitorMetricVal}>{total.toLocaleString()}</Text>
          <Text style={styles.visitorMetricLabel}>Total (7d)</Text>
        </Box>
        <Box>
          <Text style={[styles.visitorMetricVal, { color: '#378ADD' }]}>
            {peak.toLocaleString()}
          </Text>
          <Text style={styles.visitorMetricLabel}>Peak day</Text>
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

            <Path d={fillPath} fill="url(#visGrad)" />
            <Path d={linePath} fill="none" stroke="#378ADD" strokeWidth={2.5} />

            {points.map((p, i) => (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={3.5}
                fill="#ffffff"
                stroke="#378ADD"
                strokeWidth={1.8}
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
                style={{ fontSize: 9, color: '#94a3b8', fontWeight: '600', textAlign: 'center' }}
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
        getRecentPosts(8, params).catch(() => []),
        getTopUsers(5, params).catch(() => []),
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

  // Get first name with fallback
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
              {/* <Ionicons name="notifications" size={16} color="#0b53f8" /> */}
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
            {/* <TouchableOpacity style={styles.headerIconButton}>
              <Ionicons name="notifications-outline" size={20} color="white" />
              <Box style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>3</Text>
              </Box>
            </TouchableOpacity> */}

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

        {/* ── AI USAGE ANALYTICS ───────────────────────────────────────────── */}
        {aiUsageStats && (
          <Box style={styles.sectionMargin}>
            <AIUsageSection data={aiUsageStats} />
          </Box>
        )}

        {/* ── UPCOMING POSTS ────────────────────────────────────────────────── */}
        {recentPosts.length > 0 && (
          <Box style={styles.sectionMargin}>
            <HStack style={styles.sectionHeaderRow}>
              <Heading size="md" style={styles.sectionTitle}>
                Upcoming Posts
              </Heading>
              <TouchableOpacity onPress={() => router.push('/posts')}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </HStack>

            <VStack space="sm">
              {recentPosts.map((post, idx) => {
                const postImage = STATIC_POST_IMAGES[idx % STATIC_POST_IMAGES.length];
                return (
                  <Box key={post.id} style={styles.postCard}>
                    <HStack style={{ alignItems: 'center' }}>
                      {/* Post thumbnail */}
                      <Image source={{ uri: postImage }} style={styles.postThumbnail} />

                      {/* Middle Text Details */}
                      <VStack style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.postTitleText} numberOfLines={1}>
                          {post.title || 'Untitled Post'}
                        </Text>
                        <Text style={styles.postDateText}>{formatDate(post.date)}</Text>
                        {post.platform && renderPlatformIcons(post.platform)}
                      </VStack>

                      {/* Right Side Options & Badge */}
                      <VStack style={styles.postCardRight}>
                        <TouchableOpacity activeOpacity={0.7} style={styles.moreButton}>
                          <Feather name="more-horizontal" size={16} color="#64748b" />
                        </TouchableOpacity>
                        <StatusBadge status={post.status} />
                      </VStack>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          </Box>
        )}

        {/* ── ENGAGEMENT OVERVIEW (WITH CHART) ───────────────────────────────── */}
        {stats && (
          <Box style={styles.sectionMargin}>
            <Box style={styles.overviewCard}>
              <HStack style={styles.overviewHeaderRow}>
                <Text style={styles.overviewTitle}>Engagement Overview</Text>
                <TouchableOpacity style={styles.timeDropdown}>
                  <Text style={styles.timeDropdownText}>Last 7 days</Text>
                  <Feather
                    name="chevron-down"
                    size={12}
                    color="#64748b"
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </HStack>

              <VStack style={styles.metricsWrapper}>
                <Text style={styles.largeMetricText}>{formatNumber(stats.totalUsers * 100)}</Text>
                <HStack style={styles.trendRow}>
                  <Feather name="arrow-up" size={12} color="#16a34a" />
                  <Text style={styles.trendText}>+18.6% vs last 7 days</Text>
                </HStack>
              </VStack>

              {/* Dynamic SVG Line Graph */}
              <EngagementChart totalReach={stats.totalUsers * 100} />
            </Box>
          </Box>
        )}

        {/* ── TOP CONTRIBUTORS ──────────────────────────────────────────────── */}
        {topUsers.length > 0 && <TopContributorsSection users={topUsers} />}

        {/* ── PLATFORM ANALYTICS ────────────────────────────────────────────── */}
        {platforms.length > 0 && (
          <Box style={styles.sectionMargin}>
            <Heading size="md" style={styles.sectionTitle}>
              Platform Analytics
            </Heading>
            <VStack space="sm">
              {platforms.map((p) => {
                // Determine platform accent color
                const name = p.platform.toLowerCase();
                let color = '#0b53f8';
                if (name.includes('facebook') || name === 'fb') color = '#1877F2';
                else if (name.includes('instagram') || name === 'ig') color = '#E4405F';
                else if (name.includes('whatsapp') || name === 'wa') color = '#25D366';
                else if (name.includes('youtube') || name === 'yt') color = '#FF0000';

                return (
                  <Box key={p.platform} style={styles.platformCard}>
                    <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.platformNameText}>{p.platform}</Text>
                      <Text style={[styles.platformSuccessText, { color }]}>
                        {p.successRate != null ? `${Math.round(p.successRate)}% success` : '—'}
                      </Text>
                    </HStack>
                    <HStack style={styles.platformDetailsRow}>
                      <Text style={styles.platformDetailsText}>Total: {p.totalPosts}</Text>
                      <Text style={styles.platformDetailsText}>Posted: {p.postedPosts}</Text>
                      <Text style={styles.platformDetailsText}>Users: {p.uniqueUsers}</Text>
                    </HStack>
                    <Box style={styles.progressBg}>
                      <Box
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: color,
                            width: `${Math.min(100, p.successRate ?? 0)}%` as any,
                          },
                        ]}
                      />
                    </Box>
                  </Box>
                );
              })}
            </VStack>
          </Box>
        )}

        {/* ── SUBSCRIPTION ANALYTICS ─────────────────────────────────────────── */}
        {subscriptionAnalytics && (
          <Box style={styles.sectionMargin}>
            <SubscriptionAnalyticsSection data={subscriptionAnalytics} onRefresh={onRefresh} />
          </Box>
        )}

        {/* ── WEBSITE VISITORS ────────────────────────────────────────────────── */}
        {websiteVisitors.length > 0 && (
          <Box style={styles.sectionMargin}>
            <WebsiteVisitorsSection data={websiteVisitors} onRefresh={onRefresh} />
          </Box>
        )}
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
  badgeCount: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#084ad3',
  },
  badgeCountText: {
    color: '#ffffff',
    fontSize: 4,
    fontWeight: 'bold',
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
    paddingBottom: 40,
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
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    marginRight: 10,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0b53f8',
    fontWeight: '600',
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
  },
  postThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 12,
  },
  postTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  postDateText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  postCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
  },
  moreButton: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
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
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  timeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeDropdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  metricsWrapper: {
    marginTop: 12,
  },
  largeMetricText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
    marginLeft: 3,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
  },
  contributorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    marginLeft: 4,
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
  },
  infoPillText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  statusColItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusColLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
  },
  statusColVal: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  platformCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
  },
  platformNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  platformSuccessText: {
    fontSize: 12,
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
    marginBottom: 4,
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
    alignItems: 'center',
    marginHorizontal: 3,
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
    marginTop: 4,
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
  visitorMetricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  visitorMetricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  refreshIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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
