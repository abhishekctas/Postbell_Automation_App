import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  View,
  Image,
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
  DashboardStats,
  RecentPost,
} from '../dashboard/dashboard.api';
import { Feather, FontAwesome, AntDesign, FontAwesome6, Ionicons } from '@expo/vector-icons';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
  G,
  Line,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';
  if (typeof num !== 'number') return num;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  value: number | string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <HStack style={styles.statCardTop}>
        <Box style={[styles.statIconContainer, { backgroundColor: iconBg }]}>
          <Feather name={icon as any} size={15} color={iconColor} />
        </Box>
      </HStack>
      <Text style={styles.statValText}>{formatNumber(value as any)}</Text>
      <Text style={styles.statLabelText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { bg: string; color: string; border: string; label: string }> = {
    published: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Published' },
    scheduled: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Scheduled' },
    draft: { bg: '#fffbeb', color: '#d97706', border: '#fef3c7', label: 'Draft' },
    partial_published: { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff', label: 'Partial' },
    failed: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Failed' },
  };
  const meta = MAP[status] ?? {
    bg: '#f1f5f9',
    color: '#64748b',
    border: '#e2e8f0',
    label: status.replace('_', ' '),
  };
  return (
    <Box style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <View style={[styles.badgeDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </Box>
  );
}

function ReachChart({ totalReach }: { totalReach: number }) {
  const chartWidth = Math.min(screenWidth - 64, 520);
  const chartHeight = 135;
  const paddingLeft = 24;
  const paddingRight = 20;
  const paddingTop = 16;
  const paddingBottom = 24;

  const dataPoints = [
    { day: 'Mon', val: 180 },
    { day: 'Tue', val: 340 },
    { day: 'Wed', val: 290 },
    { day: 'Thu', val: 610 },
    { day: 'Fri', val: 480 },
    { day: 'Sat', val: 750 },
    { day: 'Sun', val: Math.max(totalReach, 940) },
  ];

  const maxVal = Math.max(...dataPoints.map((d) => d.val), 1000);

  const getX = (index: number) => {
    const availableWidth = chartWidth - paddingLeft - paddingRight;
    return paddingLeft + (index / (dataPoints.length - 1)) * availableWidth;
  };

  const getY = (val: number) => {
    const availableHeight = chartHeight - paddingTop - paddingBottom;
    return paddingTop + availableHeight - (val / maxVal) * availableHeight;
  };

  let pathD = `M ${getX(0)} ${getY(dataPoints[0].val)}`;
  for (let i = 1; i < dataPoints.length; i++) {
    const x0 = getX(i - 1);
    const y0 = getY(dataPoints[i - 1].val);
    const x1 = getX(i);
    const y1 = getY(dataPoints[i].val);
    const cx = (x0 + x1) / 2;
    pathD += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }

  const areaD = `${pathD} L ${getX(dataPoints.length - 1)} ${chartHeight - paddingBottom} L ${getX(0)} ${chartHeight - paddingBottom} Z`;
  const dates = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const peakIndex = dataPoints.length - 1;

  return (
    <View style={{ marginTop: 10, alignItems: 'center' }}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <SvgLinearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0b53f8" stopOpacity="0.3" />
            <Stop offset="80%" stopColor="#0b53f8" stopOpacity="0.03" />
            <Stop offset="100%" stopColor="#0b53f8" stopOpacity="0.0" />
          </SvgLinearGradient>
        </Defs>

        {/* Dashed Grid Lines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingTop + ratio * (chartHeight - paddingTop - paddingBottom);
          return (
            <Line
              key={idx}
              x1={paddingLeft}
              y1={y}
              x2={chartWidth - paddingRight}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Gradient Fill & Curved Line */}
        <Path d={areaD} fill="url(#reachGradient)" />
        <Path d={pathD} fill="none" stroke="#0b53f8" strokeWidth="3" strokeLinecap="round" />

        {/* Data Point Circles */}
        {dataPoints.map((pt, i) => {
          const isPeak = i === peakIndex;
          return (
            <G key={i}>
              {isPeak && (
                <Circle cx={getX(i)} cy={getY(pt.val)} r="7" fill="#0b53f8" fillOpacity="0.2" />
              )}
              <Circle
                cx={getX(i)}
                cy={getY(pt.val)}
                r={isPeak ? '4.5' : '3.5'}
                fill={isPeak ? '#0b53f8' : '#ffffff'}
                stroke="#0b53f8"
                strokeWidth={isPeak ? '2.5' : '2'}
              />
            </G>
          );
        })}
      </Svg>

      {/* Days X-Axis Labels */}
      <View
        style={{
          flexDirection: 'row',
          width: chartWidth,
          paddingLeft: paddingLeft - 4,
          paddingRight: paddingRight - 4,
          justifyContent: 'space-between',
          marginTop: 4,
        }}
      >
        {dates.map((d, i) => {
          const isSun = d === 'Sun';
          return (
            <Text
              key={i}
              style={{
                fontSize: 11,
                color: isSun ? '#0b53f8' : '#94a3b8',
                fontWeight: isSun ? '700' : '600',
                textAlign: 'center',
              }}
            >
              {d}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

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
  return `${day} ${month} ${year} • ${hours}:${minutes} ${ampm}`;
};

const renderPlatformIcons = (platform: string | string[]) => {
  const list = Array.isArray(platform) ? platform : platform ? [platform] : [];
  return (
    <HStack space="xs" style={{ alignItems: 'center' }}>
      {list.map((plat, idx) => {
        const name = plat.trim().toLowerCase();
        if (name.includes('facebook') || name === 'fb') {
          return (
            <FontAwesome
              key={idx}
              name="facebook-official"
              size={15}
              color="#1877F2"
              style={{ marginRight: 5 }}
            />
          );
        }
        if (name.includes('instagram') || name === 'ig') {
          return (
            <AntDesign
              key={idx}
              name="instagram"
              size={15}
              color="#E4405F"
              style={{ marginRight: 5 }}
            />
          );
        }
        if (name.includes('whatsapp') || name === 'wa') {
          return (
            <FontAwesome
              key={idx}
              name="whatsapp"
              size={15}
              color="#25D366"
              style={{ marginRight: 5 }}
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
              style={{ marginRight: 5 }}
            />
          );
        }
        if (name.includes('linkedin') || name === 'in') {
          return (
            <FontAwesome
              key={idx}
              name="linkedin"
              size={15}
              color="#0A66C2"
              style={{ marginRight: 5 }}
            />
          );
        }
        return (
          <Feather key={idx} name="share-2" size={13} color="#64748b" style={{ marginRight: 5 }} />
        );
      })}
    </HStack>
  );
};

export default function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);

  const fetchCustomerData = useCallback(async () => {
    try {
      const params = 'loginType=customer';
      const [s, posts] = await Promise.all([getDashboardStats(params), getRecentPosts(6, params)]);
      setStats(s);
      setRecentPosts(Array.isArray(posts) ? posts : []);
    } catch (err) {
      console.error('Failed to load customer dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomerData();
  };

  if (loading) {
    return (
      <Box style={styles.loadingContainer}>
        <View style={styles.loadingPulseBox}>
          <ActivityIndicator size="large" color="#0b53f8" />
        </View>
        <Text style={{ marginTop: 14, color: '#64748b', fontSize: 14, fontWeight: '600' }}>
          Loading customer workspace...
        </Text>
      </Box>
    );
  }

  const firstName = user?.first_name || '';
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const customerPlatforms = [
    {
      key: 'instagram',
      name: 'Instagram Business',
      handle: '@postbell_official',
      status: 'Connected',
      icon: 'instagram',
      color: '#E4405F',
      bg: '#fce7f3',
    },
    {
      key: 'facebook',
      name: 'Facebook Page',
      handle: 'Postbell Official',
      status: 'Connected',
      icon: 'facebook-official',
      color: '#1877F2',
      bg: '#eff6ff',
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp Business',
      handle: '+1 (555) 019-2834',
      status: 'Connected',
      icon: 'whatsapp',
      color: '#25D366',
      bg: '#dcfce7',
    },
    {
      key: 'linkedin',
      name: 'LinkedIn Company',
      handle: 'Postbell Corp',
      status: 'Disconnected',
      icon: 'linkedin',
      color: '#0A66C2',
      bg: '#f1f5f9',
    },
    {
      key: 'twitter',
      name: 'Twitter / X',
      handle: '@postbell_app',
      status: 'Disconnected',
      icon: 'twitter',
      color: '#1DA1F2',
      bg: '#f1f5f9',
    },
  ];

  const connectedCount = customerPlatforms.filter((p) => p.status === 'Connected').length;

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
      {/* Dynamic Header Banner */}
      <LinearGradient
        colors={['#0b53f8', '#084ad3', '#063bb3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerDecorationCircle1} />
        <View style={styles.headerDecorationCircle2} />

        <HStack style={styles.headerContent}>
          <HStack space="md" style={{ alignItems: 'center', flex: 1 }}>
            <View style={styles.avatarWrapper}>
              {user?.image ? (
                <Image source={{ uri: user.image }} style={styles.userAvatarHeader} />
              ) : (
                <Box style={styles.avatarPlaceholderHeader}>
                  <Text style={styles.avatarInitialHeader}>
                    {(firstName || 'C').charAt(0).toUpperCase()}
                  </Text>
                </Box>
              )}
              <View style={styles.onlineBadgeDot} />
            </View>

            <VStack style={{ flex: 1 }}>
              <HStack style={{ alignItems: 'center' }}>
                <Text style={styles.greetingSub}>{timeGreeting}, 👋</Text>
              </HStack>
              <Heading style={styles.userName} numberOfLines={1}>
                {firstName ? `${firstName} ${user?.last_name || ''}`.trim() : 'Customer Workspace'}
              </Heading>
              <View style={styles.workspacePill}>
                <View style={styles.workspacePillDot} />
                <Text style={styles.workspacePillText}>Active Workspace</Text>
              </View>
            </VStack>
          </HStack>
          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.headerIconButton}
          >
            <Feather name="log-out" size={18} color="white" />
          </TouchableOpacity>
        </HStack>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0b53f8']} />
        }
      >
        {/* Quick Stats Grid - Total 7 Cards */}
        <VStack space="sm" style={{ marginTop: 14 }}>
          {/* Row 1: Total Posts & Posted & Scheduled & Draft */}
          <HStack space="sm" style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="send"
                iconBg="#eff6ff"
                iconColor="#0b53f8"
                value={stats?.totalPosts ?? 0}
                label="Total Posts"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="check-circle"
                iconBg="#f0fdf4"
                iconColor="#16a34a"
                value={stats?.publishedPosts ?? 0}
                label="Posted"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="clock"
                iconBg="#fffbeb"
                iconColor="#d97706"
                value={stats?.scheduledPosts ?? 0}
                label="Scheduled"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="file-text"
                iconBg="#faf5ff"
                iconColor="#7c3aed"
                value={stats?.draftPosts ?? 0}
                label="Draft"
              />
            </View>
          </HStack>

          {/* Row 2: Failed & Partial & Connections */}
          <HStack space="sm" style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="alert-circle"
                iconBg="#fef2f2"
                iconColor="#dc2626"
                value={stats?.failedPosts ?? 0}
                label="Failed"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="pie-chart"
                iconBg="#ccfbf1"
                iconColor="#0f766e"
                value={stats?.partialPublishedPosts ?? 0}
                label="Partial"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="share-2"
                iconBg="#e0f2fe"
                iconColor="#0284c7"
                value={connectedCount}
                label="Connections"
              />
            </View>
          </HStack>
        </VStack>

        {/* Analytics & Reach Chart Card */}
        <Box style={[styles.card, styles.shadowCard, { marginTop: 18 }]}>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <VStack>
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Feather name="trending-up" size={14} color="#0b53f8" />
                <Text
                  style={{ fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 }}
                >
                  ENGAGEMENT & REACH
                </Text>
              </HStack>
              <Heading style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 2 }}>
                {formatNumber(stats?.totalPosts ? stats.totalPosts * 165 : 1420)} Impressions
              </Heading>
            </VStack>
            <View style={styles.growthBadge}>
              <Text style={styles.growthBadgeText}>+22.5% 🚀</Text>
            </View>
          </HStack>

          <ReachChart totalReach={stats?.totalPosts || 920} />
        </Box>

        {/* Social Media Connections Section */}
        <VStack space="xs" style={{ marginTop: 22 }}>
          <HStack style={styles.sectionHeader}>
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <View style={styles.sectionIconBg}>
                <Feather name="link-2" size={16} color="#0b53f8" />
              </View>
              <VStack>
                <Heading style={styles.sectionTitle}>Social Media Connections</Heading>
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500' }}>
                  {connectedCount} of {customerPlatforms.length} accounts connected
                </Text>
              </VStack>
            </HStack>
            <TouchableOpacity
              onPress={() => router.push('/pages/generalSetting/general-settings')}
              activeOpacity={0.7}
              style={styles.manageBtn}
            >
              <Text style={styles.seeAllText}>Manage</Text>
              <Feather name="chevron-right" size={14} color="#0b53f8" />
            </TouchableOpacity>
          </HStack>

          <VStack space="sm">
            {customerPlatforms.map((plat) => {
              const isConn = plat.status === 'Connected';
              return (
                <TouchableOpacity
                  key={plat.key}
                  style={[styles.card, styles.shadowCard, styles.platformCard]}
                  activeOpacity={0.85}
                  onPress={() => router.push('/pages/generalSetting/general-settings')}
                >
                  <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <HStack space="sm" style={{ alignItems: 'center' }}>
                      <Box style={[styles.platformIconBox, { backgroundColor: plat.bg }]}>
                        <FontAwesome name={plat.icon as any} size={18} color={plat.color} />
                      </Box>
                      <VStack>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                          {plat.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                          {isConn ? plat.handle : 'Not connected'}
                        </Text>
                      </VStack>
                    </HStack>

                    <Box
                      style={[
                        styles.connPill,
                        {
                          backgroundColor: isConn ? '#dcfce7' : '#f1f5f9',
                          borderColor: isConn ? '#bbf7d0' : '#e2e8f0',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.connDot,
                          { backgroundColor: isConn ? '#16a34a' : '#94a3b8' },
                        ]}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: isConn ? '#15803d' : '#64748b',
                        }}
                      >
                        {plat.status}
                      </Text>
                    </Box>
                  </HStack>
                </TouchableOpacity>
              );
            })}
          </VStack>
        </VStack>

        {/* Activity Timeline / Recent Activity Section */}
        <VStack space="xs" style={{ marginTop: 22 }}>
          <HStack style={styles.sectionHeader}>
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#f5f3ff' }]}>
                <Feather name="activity" size={16} color="#7c3aed" />
              </View>
              <VStack>
                <Heading style={styles.sectionTitle}>Activity Timeline</Heading>
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500' }}>
                  Recent posts & stories
                </Text>
              </VStack>
            </HStack>
          </HStack>

          <VStack space="sm">
            {recentPosts.length > 0
              ? recentPosts.map((post) => (
                <View key={post.id} style={[styles.card, styles.shadowCard, styles.timelineCard]}>
                  <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <VStack style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                        {post.title || 'Untitled Post'}
                      </Text>
                      <HStack space="xs" style={{ alignItems: 'center', marginTop: 6 }}>
                        {renderPlatformIcons(post.platform || [])}
                        <View style={styles.timeDivider} />
                        <Feather
                          name="clock"
                          size={11}
                          color="#94a3b8"
                          style={{ marginRight: 3 }}
                        />
                        <Text style={{ fontSize: 11, color: '#64748b' }}>
                          {formatDate(post.date || '')}
                        </Text>
                      </HStack>
                    </VStack>
                    <StatusBadge status={post.status || 'published'} />
                  </HStack>
                </View>
              ))
              : [
                {
                  title: 'Diwali Special Offer Banner',
                  platform: ['instagram', 'facebook'],
                  date: new Date().toISOString(),
                  status: 'published',
                },
                {
                  title: 'New Product Teaser Story',
                  platform: ['instagram'],
                  date: new Date(Date.now() - 3600000 * 2).toISOString(),
                  status: 'scheduled',
                },
                {
                  title: 'Weekend Promotion Broadcast',
                  platform: ['whatsapp'],
                  date: new Date(Date.now() - 3600000 * 5).toISOString(),
                  status: 'published',
                },
                {
                  title: 'Customer Festival Wishes Post',
                  platform: ['facebook', 'twitter'],
                  date: new Date(Date.now() - 3600000 * 24).toISOString(),
                  status: 'draft',
                },
              ].map((item, idx) => (
                <View key={idx} style={[styles.card, styles.shadowCard, styles.timelineCard]}>
                  <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <VStack style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                        {item.title}
                      </Text>
                      <HStack space="xs" style={{ alignItems: 'center', marginTop: 6 }}>
                        {renderPlatformIcons(item.platform)}
                        <View style={styles.timeDivider} />
                        <Feather
                          name="clock"
                          size={11}
                          color="#94a3b8"
                          style={{ marginRight: 3 }}
                        />
                        <Text style={{ fontSize: 11, color: '#64748b' }}>
                          {formatDate(item.date)}
                        </Text>
                      </HStack>
                    </VStack>
                    <StatusBadge status={item.status} />
                  </HStack>
                </View>
              ))}
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingPulseBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerDecorationCircle1: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerDecorationCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  userAvatarHeader: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  avatarPlaceholderHeader: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#0b53f8',
  },
  greetingSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  userName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 1,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  workspacePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4ade80',
    marginRight: 5,
  },
  workspacePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  quickActionsContainer: {
    marginTop: 2,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },

  statsRow: {
    width: '100%',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statMiniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statMiniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  statValText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  shadowCard: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  growthBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  growthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },

  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0b53f8',
    marginRight: 2,
  },

  platformCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  platformIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  connDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  timelineCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  timeDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 4,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
