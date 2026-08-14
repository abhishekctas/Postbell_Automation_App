import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  View,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { useAuth } from '@/context/AuthContext';
import {
  getCustomerDashboardSummary,
  getCustomerAnalytics,
  getCustomerRecentActivity,
  getMediaUrl,
  CustomerDashboardSummary,
  CustomerAnalytics,
  RecentActivity,
  SocialMediaPlatform,
} from './CustomerdashboardApi';
import {
  Feather,
  FontAwesome,
  AntDesign,
  FontAwesome6,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';
  if (typeof num !== 'number') return String(num);
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
  const norm = (status || '').toLowerCase().trim();
  const MAP: Record<string, { bg: string; color: string; border: string; label: string }> = {
    published: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Published' },
    scheduled: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Scheduled' },
    draft: { bg: '#fffbeb', color: '#d97706', border: '#fef3c7', label: 'Draft' },
    partial_published: { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff', label: 'Partial' },
    partial: { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff', label: 'Partial' },
    failed: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Failed' },
  };
  const meta = MAP[norm] ?? {
    bg: '#f1f5f9',
    color: '#64748b',
    border: '#e2e8f0',
    label: status ? status.replace('_', ' ') : 'Draft',
  };
  return (
    <Box style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <View style={[styles.badgeDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </Box>
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
  if (list.length === 0) {
    return (
      <Feather name="share-2" size={13} color="#64748b" style={{ marginRight: 5 }} />
    );
  }
  return (
    <HStack space="xs" style={{ alignItems: 'center' }}>
      {list.map((plat, idx) => {
        const name = (plat || '').trim().toLowerCase();
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

const getPlatformMeta = (platformKey: string) => {
  const key = (platformKey || '').toLowerCase().trim();
  if (key.includes('instagram') || key === 'ig') {
    return {
      name: 'Instagram',
      icon: 'instagram',
      iconType: 'antdesign',
      color: '#E4405F',
      bg: '#fce7f3',
    };
  }
  if (key.includes('facebook') || key === 'fb') {
    return {
      name: 'Facebook',
      icon: 'facebook-official',
      iconType: 'fontawesome',
      color: '#1877F2',
      bg: '#eff6ff',
    };
  }
  if (key.includes('whatsapp') || key === 'wa') {
    return {
      name: 'WhatsApp Business',
      icon: 'whatsapp',
      iconType: 'fontawesome',
      color: '#25D366',
      bg: '#dcfce7',
    };
  }
  if (key.includes('twitter') || key === 'x') {
    return {
      name: 'Twitter / X',
      icon: 'x-twitter',
      iconType: 'fontawesome6',
      color: '#0f172a',
      bg: '#f1f5f9',
    };
  }
  if (key.includes('linkedin') || key === 'in') {
    return {
      name: 'LinkedIn',
      icon: 'linkedin',
      iconType: 'fontawesome',
      color: '#0A66C2',
      bg: '#e0f2fe',
    };
  }
  return {
    name: platformKey || 'Social Platform',
    icon: 'share-2',
    iconType: 'feather',
    color: '#0b53f8',
    bg: '#eff6ff',
  };
};

export default function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const userId = user?._id || user?.id || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dashboardData, setDashboardData] = useState<CustomerDashboardSummary | null>(null);
  const [analyticsData, setAnalyticsData] = useState<CustomerAnalytics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    try {
      const [summaryRes, analyticsRes, activityRes] = await Promise.allSettled([
        getCustomerDashboardSummary(userId),
        getCustomerAnalytics(userId),
        getCustomerRecentActivity(userId),
      ]);

      if (summaryRes.status === 'fulfilled') {
        setDashboardData(summaryRes.value);
      } else {
        console.error('Customer summary fetch error:', summaryRes.reason);
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalyticsData(analyticsRes.value);
      } else {
        console.error('Customer analytics fetch error:', analyticsRes.reason);
      }

      if (activityRes.status === 'fulfilled') {
        setRecentActivity(Array.isArray(activityRes.value) ? activityRes.value : []);
      } else {
        console.error('Customer recent activity fetch error:', activityRes.reason);
      }

      // If summary failed, set error for visibility
      if (summaryRes.status === 'rejected') {
        setError(
          summaryRes.reason?.message || 'Failed to load customer dashboard data'
        );
      }
    } catch (err: any) {
      console.error('Failed to load customer dashboard data:', err);
      setError(err?.message || 'Failed to load customer dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      void fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [userId, fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchDashboardData();
  };

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

  if (error && !dashboardData) {
    return (
      <Box style={styles.loadingContainer}>
        <View style={[styles.loadingPulseBox, { backgroundColor: '#fef2f2' }]}>
          <Feather name="alert-circle" size={28} color="#dc2626" />
        </View>
        <Text style={{ marginTop: 14, color: '#1e293b', fontSize: 16, fontWeight: '700' }}>
          Unable to load dashboard
        </Text>
        <Text
          style={{
            marginTop: 6,
            color: '#64748b',
            fontSize: 13,
            textAlign: 'center',
            paddingHorizontal: 32,
          }}
        >
          {error}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            void fetchDashboardData();
          }}
          style={styles.retryButton}
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={14} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Retry</Text>
        </TouchableOpacity>
      </Box>
    );
  }

  const firstName = user?.first_name || '';
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const posts = dashboardData?.posts;
  const social = dashboardData?.socialMedia;

  // Compute total social accounts connected
  const platformsList: SocialMediaPlatform[] = Array.isArray(social?.platforms)
    ? social.platforms
    : [];

  const totalConnectedCount =
    social?.totalConnections ??
    platformsList.reduce((acc, p) => acc + (p.connectedAccounts || 0), 0);

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
              {user?.image || user?.avatar ? (
                <Image
                  source={{ uri: getMediaUrl(user.image || user.avatar) }}
                  style={styles.userAvatarHeader}
                />
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
                {fullName || firstName || 'Customer Workspace'}
              </Heading>
              <View style={styles.workspacePill}>
                <View style={styles.workspacePillDot} />
                <Text style={styles.workspacePillText}>Customer Workspace</Text>
              </View>
            </VStack>
          </HStack>

          <HStack space="xs" style={{ alignItems: 'center' }}>
            <TouchableOpacity
              onPress={onRefresh}
              style={[styles.headerIconButton, { marginRight: 6 }]}
              activeOpacity={0.8}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Feather name="refresh-cw" size={17} color="#ffffff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.headerIconButton}
              activeOpacity={0.8}
            >
              <Feather name="log-out" size={17} color="#ffffff" />
            </TouchableOpacity>
          </HStack>
        </HStack>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#193867']} />
        }
      >
        {/* Quick Stats Grid - Total 7 Cards matching Reference Panel */}
        <VStack space="sm" style={{ marginBottom: 0 }}>
          {/* Row 1: Total Posts, Posted, Scheduled, Draft */}
          <HStack space="sm" style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="send"
                iconBg="#eff6ff"
                iconColor="#0b53f8"
                value={posts?.total ?? 0}
                label="Total Posts"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="check-circle"
                iconBg="#f0fdf4"
                iconColor="#16a34a"
                value={posts?.published ?? 0}
                label="Posted"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="clock"
                iconBg="#fffbeb"
                iconColor="#d97706"
                value={posts?.scheduled ?? 0}
                label="Scheduled"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="file-text"
                iconBg="#faf5ff"
                iconColor="#7c3aed"
                value={posts?.draft ?? 0}
                label="Draft"
              />
            </View>
          </HStack>

          {/* Row 2: Failed, Partial, Connections */}
          <HStack space="sm" style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="alert-circle"
                iconBg="#fef2f2"
                iconColor="#dc2626"
                value={posts?.failed ?? 0}
                label="Failed"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="pie-chart"
                iconBg="#ccfbf1"
                iconColor="#0f766e"
                value={posts?.partial ?? 0}
                label="Partial"
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                icon="share-2"
                iconBg="#e0f2fe"
                iconColor="#0284c7"
                value={totalConnectedCount}
                label="Connections"
              />
            </View>
          </HStack>
        </VStack>

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
                  {totalConnectedCount} connected accounts
                </Text>
              </VStack>
            </HStack>
          </HStack>

          {platformsList.length > 0 ? (
            <VStack space="sm">
              {platformsList.map((plat, platIdx) => {
                const meta = getPlatformMeta(plat.platform);
                const hasAccounts = Array.isArray(plat.accounts) && plat.accounts.length > 0;
                const isConnected = plat.connectedAccounts > 0;

                return (
                  <View
                    key={plat.platform || platIdx}
                    style={[styles.card, styles.shadowCard, { paddingVertical: 14 }]}
                  >
                    <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <HStack space="sm" style={{ alignItems: 'center' }}>
                        <Box style={[styles.platformIconBox, { backgroundColor: meta.bg }]}>
                          {meta.iconType === 'antdesign' && (
                            <AntDesign name={meta.icon as any} size={18} color={meta.color} />
                          )}
                          {meta.iconType === 'fontawesome' && (
                            <FontAwesome name={meta.icon as any} size={18} color={meta.color} />
                          )}
                          {meta.iconType === 'fontawesome6' && (
                            <FontAwesome6 name={meta.icon as any} size={16} color={meta.color} />
                          )}
                          {meta.iconType === 'feather' && (
                            <Feather name={meta.icon as any} size={18} color={meta.color} />
                          )}
                        </Box>
                        <VStack>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>
                            {meta.name}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                            {plat.connectedAccounts} / {plat.totalAccounts || 1} connected
                          </Text>
                        </VStack>
                      </HStack>

                      <Box
                        style={[
                          styles.connPill,
                          {
                            backgroundColor: isConnected ? '#dcfce7' : '#f1f5f9',
                            borderColor: isConnected ? '#bbf7d0' : '#e2e8f0',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.connDot,
                            { backgroundColor: isConnected ? '#16a34a' : '#94a3b8' },
                          ]}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: isConnected ? '#15803d' : '#64748b',
                          }}
                        >
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </Text>
                      </Box>
                    </HStack>

                    {/* Sub Accounts (if any) */}
                    {hasAccounts && (
                      <VStack space="xs" style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }}>
                        {plat.accounts?.map((acc, accIdx) => {
                          const accConnected = (acc.connectionStatus || '').toLowerCase() === 'connected';
                          return (
                            <Box
                              key={acc.accountId || accIdx}
                              style={[
                                styles.subAccountRow,
                                {
                                  backgroundColor: accConnected ? '#f0fdf4' : '#f8fafc',
                                  borderColor: accConnected ? '#bbf7d0' : '#e2e8f0',
                                },
                              ]}
                            >
                              <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <VStack style={{ flex: 1, paddingRight: 8 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>
                                    {acc.accountName || 'Account'}
                                  </Text>
                                  <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                    Last: {acc.lastConnected ? formatDate(acc.lastConnected) : 'Never'}
                                  </Text>
                                </VStack>
                                <View
                                  style={[
                                    styles.miniChip,
                                    {
                                      backgroundColor: accConnected ? '#dcfce7' : '#fee2e2',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '700',
                                      color: accConnected ? '#16a34a' : '#dc2626',
                                    }}
                                  >
                                    {acc.connectionStatus || (accConnected ? 'connected' : 'disconnected')}
                                  </Text>
                                </View>
                              </HStack>
                            </Box>
                          );
                        })}
                      </VStack>
                    )}
                  </View>
                );
              })}
            </VStack>
          ) : (
            <Box style={[styles.card, styles.shadowCard, styles.emptyCard]}>
              <Feather name="link" size={28} color="#94a3b8" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b', marginTop: 10 }}>
                No Social Connections
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                Connect your social media accounts to start automating and publishing posts.
              </Text>
            </Box>
          )}
        </VStack>

        {/* Activity Timeline / Recent Activity Section */}
        <VStack space="xs" style={{ marginTop: 22, marginBottom: 40 }}>
          <HStack style={styles.sectionHeader}>
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#f5f3ff' }]}>
                <Feather name="activity" size={16} color="#7c3aed" />
              </View>
              <VStack>
                <Heading style={styles.sectionTitle}>Activity Timeline</Heading>
              </VStack>
            </HStack>
          </HStack>

          {recentActivity.length > 0 ? (
            <VStack space="sm">
              {recentActivity.map((item, idx) => {
                const normStatus = (item.status || '').toLowerCase();
                const previewImg = item.image_url ? getMediaUrl(item.image_url) : undefined;
                return (
                  <View key={item.id || idx} style={[styles.card, styles.shadowCard, styles.timelineCard]}>
                    <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <HStack space="sm" style={{ flex: 1, alignItems: 'flex-start' }}>
                        {/* Timeline Status Icon Dot */}
                        <View
                          style={[
                            styles.timelineDotIcon,
                            {
                              backgroundColor:
                                normStatus === 'published'
                                  ? '#16a34a'
                                  : normStatus === 'scheduled'
                                    ? '#d97706'
                                    : '#64748b',
                            },
                          ]}
                        >
                          <Feather
                            name={
                              normStatus === 'published'
                                ? 'send'
                                : normStatus === 'scheduled'
                                  ? 'clock'
                                  : 'file-text'
                            }
                            size={12}
                            color="#ffffff"
                          />
                        </View>

                        <VStack style={{ flex: 1, paddingRight: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                            {item.title || 'Untitled Post'}
                          </Text>

                          <HStack space="xs" style={{ alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                            {renderPlatformIcons(item.platform || [])}
                            <View style={styles.timeDivider} />
                            <Feather
                              name="calendar"
                              size={11}
                              color="#94a3b8"
                              style={{ marginRight: 3 }}
                            />
                            <Text style={{ fontSize: 11, color: '#64748b' }}>
                              {formatDate(item.date || '')}
                            </Text>
                          </HStack>

                          {/* Hashtags */}
                          {Array.isArray(item.hashtags) && item.hashtags.length > 0 && (
                            <HStack space="xs" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                              {item.hashtags.slice(0, 3).map((tag, tagIdx) => (
                                <View key={tagIdx} style={styles.hashtagBadge}>
                                  <Text style={styles.hashtagText}>
                                    {tag.startsWith('#') ? tag : `#${tag}`}
                                  </Text>
                                </View>
                              ))}
                              {item.hashtags.length > 3 && (
                                <Text style={{ fontSize: 10, color: '#94a3b8', alignSelf: 'center', marginLeft: 2 }}>
                                  +{item.hashtags.length - 3}
                                </Text>
                              )}
                            </HStack>
                          )}
                        </VStack>
                      </HStack>

                      <StatusBadge status={item.status || 'published'} />
                    </HStack>

                    {/* Image Preview if available */}
                    {previewImg && (
                      <View style={styles.postImageWrapper}>
                        <Image
                          source={{ uri: previewImg }}
                          style={styles.postImage}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </VStack>
          ) : (
            <Box style={[styles.card, styles.shadowCard, styles.emptyCard]}>
              <Feather name="inbox" size={28} color="#94a3b8" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b', marginTop: 10 }}>
                No Recent Activity
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                Your recent posts and interactions will appear here once you create content.
              </Text>
            </Box>
          )}
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
    padding: 24,
  },
  loadingPulseBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#193867',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 16,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#193867',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14,
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
    borderColor: '#193867',
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
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

  progressBarTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
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

  subAccountRow: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  timelineCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  timelineDotIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginTop: 2,
  },
  timeDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 4,
  },
  hashtagBadge: {
    backgroundColor: 'rgba(11, 83, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(11, 83, 248, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
    marginBottom: 4,
  },
  hashtagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0b53f8',
  },
  postImageWrapper: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    height: 140,
    width: '100%',
    backgroundColor: '#f1f5f9',
  },
  postImage: {
    width: '100%',
    height: '100%',
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
