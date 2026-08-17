import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
  Switch,
  View,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  getMyActiveSubscription,
  getMyUsageStats,
  getMySubscriptionHistory,
  updateAutoRenew,
  cancelMySubscription,
  ActiveSubscription,
  UsageStats,
  SubscriptionHistoryItem,
} from './my-subscription.api';

const { width: screenWidth } = Dimensions.get('window');

const formatDate = (raw?: string) => {
  if (!raw) return '—';
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatFullDate = (raw?: string) => {
  if (!raw) return '—';
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;
  const day = date.getDate();
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
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function MySubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Expanded History items tracker
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Auto Renew Modal State
  const [autoRenewModalVisible, setAutoRenewModalVisible] = useState(false);
  const [pendingRenewValue, setPendingRenewValue] = useState<boolean | null>(null);
  const [savingRenew, setSavingRenew] = useState(false);

  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [activeRes, usageRes, historyRes] = await Promise.allSettled([
        getMyActiveSubscription(),
        getMyUsageStats(),
        getMySubscriptionHistory(),
      ]);

      if (activeRes.status === 'fulfilled') {
        setActiveSub(activeRes.value?.data || null);
      }
      if (usageRes.status === 'fulfilled') {
        setUsageStats(usageRes.value?.data || null);
      }
      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value?.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load subscription details:', error);
      Alert.alert('Error', error.message || 'Failed to load subscription details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openAutoRenewPrompt = (checked: boolean) => {
    setPendingRenewValue(checked);
    setAutoRenewModalVisible(true);
  };

  const handleConfirmAutoRenew = async () => {
    if (pendingRenewValue === null || !activeSub) return;
    setSavingRenew(true);
    try {
      await updateAutoRenew(pendingRenewValue);
      setActiveSub((prev) => (prev ? { ...prev, auto_renew: pendingRenewValue } : null));
      setAutoRenewModalVisible(false);
      setPendingRenewValue(null);
      Alert.alert(
        'Success',
        `Auto-renew ${pendingRenewValue ? 'enabled' : 'disabled'} successfully.`
      );
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update auto-renew.');
    } finally {
      setSavingRenew(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      await cancelMySubscription(cancelReason || 'Cancelled from mobile app');
      setCancelModalVisible(false);
      setCancelReason('');
      Alert.alert('Subscription Cancelled', 'Your subscription has been cancelled.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const price = activeSub
    ? (activeSub.plan_snapshot?.price ??
      (activeSub.billing_cycle === 'monthly'
        ? (activeSub.plan_id?.price_per_month ?? 0)
        : (activeSub.plan_id?.price_per_year ?? 0)))
    : 0;

  // Billing timeline calculations
  const startDate = activeSub?.start_date ? new Date(activeSub.start_date) : new Date();
  const endDate = activeSub?.end_date ? new Date(activeSub.end_date) : new Date();
  const now = new Date();
  const totalDuration = Math.max(endDate.getTime() - startDate.getTime(), 1);
  const elapsedDuration = Math.max(now.getTime() - startDate.getTime(), 0);
  const periodProgressPct = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
  const totalDays = Math.max(1, Math.round(totalDuration / (1000 * 60 * 60 * 24)));
  const daysRemaining =
    activeSub?.days_remaining ??
    Math.max(0, Math.round((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const usedDays = Math.max(0, totalDays - daysRemaining);

  const postsUsedThisMonth =
    usageStats?.posts?.used_this_month ?? activeSub?.posts_used_this_month ?? 0;
  const postsLimitMonth =
    usageStats?.posts?.limit_per_month ?? activeSub?.plan_snapshot?.posts_per_month ?? 0;
  const postsRemainingMonth =
    usageStats?.posts?.remaining_this_month ??
    activeSub?.remaining_posts_this_month ??
    Math.max(0, postsLimitMonth - postsUsedThisMonth);

  const postsUsedToday = usageStats?.posts?.used_today ?? activeSub?.posts_used_today ?? 0;
  const postsLimitDay =
    usageStats?.posts?.limit_per_day ?? activeSub?.plan_snapshot?.posts_per_day ?? 0;
  const postsRemainingDay =
    usageStats?.posts?.remaining_today ??
    activeSub?.remaining_posts_today ??
    Math.max(0, postsLimitDay - postsUsedToday);

  const aiUsedToday = usageStats?.ai_content?.used_today ?? activeSub?.ai_content_used_today ?? 0;
  const aiLimitDay =
    usageStats?.ai_content?.limit_per_day ??
    activeSub?.plan_snapshot?.ai_content_generation_limit ??
    0;
  const aiRemainingDay =
    usageStats?.ai_content?.remaining_today ??
    activeSub?.remaining_ai_today ??
    Math.max(0, aiLimitDay - aiUsedToday);

  const usagePct =
    usageStats?.posts?.usage_percentage ??
    activeSub?.usage_percentage ??
    (postsLimitMonth > 0 ? Math.round((postsUsedThisMonth / postsLimitMonth) * 100) : 0);

  const featuresList: string[] =
    activeSub?.plan_snapshot?.features || activeSub?.plan_id?.features || [];

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header Banner */}
      <LinearGradient
        colors={['#0b53f8', '#023eb9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Box style={styles.headerGlow} />
        <Box style={styles.headerContent}>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <VStack style={{ flex: 1, paddingRight: 15 }}>
              <Heading style={styles.headerTitle}>My Subscriptions</Heading>
              <Text style={styles.headerSubtitle}>
                Manage active plans, billing cycle, usage & history
              </Text>
            </VStack>

            <TouchableOpacity onPress={onRefresh} style={styles.refreshIconBtn} activeOpacity={0.8}>
              {refreshing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Feather name="refresh-cw" size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Main Card */}
      <Box style={styles.mainCard}>
        {loading && !refreshing ? (
          <Box className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#0b53f8" />
            <Text style={{ marginTop: 12, fontSize: 13, color: '#64748b', fontWeight: '500' }}>
              Loading subscription details...
            </Text>
          </Box>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0b53f8']} />
            }
          >
            {/* Tab Toggle: Active Plan vs History */}
            <HStack style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]}
                onPress={() => setActiveTab('active')}
                activeOpacity={0.8}
              >
                <Feather
                  name="package"
                  size={15}
                  color={activeTab === 'active' ? '#0b53f8' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[styles.tabBtnText, activeTab === 'active' && styles.tabBtnTextActive]}
                >
                  Active Plan
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
                onPress={() => setActiveTab('history')}
                activeOpacity={0.8}
              >
                <Feather
                  name="clock"
                  size={15}
                  color={activeTab === 'history' ? '#0b53f8' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}
                >
                  History ({history.length})
                </Text>
              </TouchableOpacity>
            </HStack>

            {/* TAB 1: ACTIVE SUBSCRIPTION */}
            {activeTab === 'active' && (
              <>
                {activeSub ? (
                  <VStack space="md">
                    {/* Hero Active Plan Card */}
                    <Box style={styles.heroPlanCard}>
                      <View style={styles.heroPlanGradientBar} />

                      <Box style={{ padding: 16 }}>
                        <HStack
                          style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                        >
                          <VStack style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.heroPlanBadgeText}>CURRENT PLAN</Text>
                            <Text style={styles.heroPlanTitle}>
                              {activeSub.plan_snapshot?.name ||
                                activeSub.plan_id?.name ||
                                'Pro Plan'}
                            </Text>
                            <Text style={styles.heroPlanCycleSub}>
                              {activeSub.billing_cycle === 'annual' ||
                              activeSub.billing_cycle === 'yearly'
                                ? 'Billed annually'
                                : 'Billed monthly'}
                              {activeSub.plan_id?.description
                                ? ` · ${activeSub.plan_id.description}`
                                : ''}
                            </Text>
                          </VStack>

                          <Box style={styles.heroStatusChip}>
                            <View style={styles.heroStatusDot} />
                            <Text style={styles.heroStatusChipText}>
                              {activeSub.status === 1
                                ? 'Active'
                                : activeSub.status === 2
                                  ? 'Cancelled'
                                  : 'Expired'}
                            </Text>
                          </Box>
                        </HStack>

                        {/* Price Tag & Actions */}
                        <HStack
                          style={{
                            marginTop: 14,
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 10,
                          }}
                        >
                          <Box style={styles.priceBox}>
                            <Text style={styles.priceNumber}>₹{price}</Text>
                            <Text style={styles.priceCycle}>
                              per{' '}
                              {activeSub.billing_cycle === 'annual' ||
                              activeSub.billing_cycle === 'yearly'
                                ? 'year'
                                : 'month'}
                            </Text>
                          </Box>

                          <VStack space="xs" style={{ alignItems: 'flex-end' }}>
                            <HStack space="xs" style={{ alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>
                                Auto-renew {activeSub.auto_renew ? 'on' : 'off'}
                              </Text>
                              <Switch
                                value={activeSub.auto_renew !== false}
                                onValueChange={openAutoRenewPrompt}
                                disabled={savingRenew}
                                trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                                thumbColor={activeSub.auto_renew !== false ? '#16a34a' : '#94a3b8'}
                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                              />
                            </HStack>

                            <TouchableOpacity
                              onPress={() => setCancelModalVisible(true)}
                              style={styles.cancelLinkBtn}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.cancelLinkText}>Cancel subscription</Text>
                            </TouchableOpacity>
                          </VStack>
                        </HStack>

                        {/* Billing Period Progress Timeline */}
                        <Box style={styles.timelineBox}>
                          <HStack
                            style={{
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 8,
                            }}
                          >
                            <Text style={styles.timelineLabel}>Billing period progress</Text>
                            <Box style={styles.daysRemainingBadge}>
                              <View style={styles.daysRemainingDot} />
                              <Text style={styles.daysRemainingText}>{daysRemaining}d left</Text>
                            </Box>
                          </HStack>

                          <Box style={styles.timelineTrack}>
                            <Box
                              style={[styles.timelineFill, { width: `${periodProgressPct}%` }]}
                            />
                          </Box>

                          <HStack style={{ justifyContent: 'space-between', marginTop: 8 }}>
                            <VStack>
                              <Text style={styles.timelineDateLabel}>Start</Text>
                              <Text style={styles.timelineDateVal}>
                                {formatDate(activeSub.start_date)}
                              </Text>
                            </VStack>
                            <VStack style={{ alignItems: 'center' }}>
                              <Text style={styles.timelineUsedText}>
                                {usedDays} of {totalDays} days used
                              </Text>
                            </VStack>
                            <VStack style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.timelineDateLabel}>End</Text>
                              <Text style={styles.timelineDateVal}>
                                {formatDate(activeSub.end_date)}
                              </Text>
                            </VStack>
                          </HStack>
                        </Box>
                      </Box>
                    </Box>

                    {/* 3 Detail Cards (Billing, Payment, Plan Limits) */}
                    <VStack space="sm">
                      {/* 1. Billing Details Card */}
                      <Box style={styles.sectionCard}>
                        <HStack space="xs" style={{ alignItems: 'center', marginBottom: 12 }}>
                          <Box style={[styles.cardHeaderIconBox, { backgroundColor: '#eff6ff' }]}>
                            <Feather name="credit-card" size={15} color="#0b53f8" />
                          </Box>
                          <Text style={styles.sectionCardTitle}>BILLING</Text>
                        </HStack>

                        <VStack space="xs">
                          <HStack style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Cycle</Text>
                            <Text style={styles.infoVal}>
                              {activeSub.billing_cycle === 'annual' ||
                              activeSub.billing_cycle === 'yearly'
                                ? 'Annual'
                                : 'Monthly'}
                            </Text>
                          </HStack>
                          <HStack style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Amount</Text>
                            <Text style={styles.infoVal}>₹{price}</Text>
                          </HStack>
                          <HStack style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Provider</Text>
                            <Text style={styles.infoVal}>
                              {(activeSub.payment?.provider || 'Razorpay').toUpperCase()}
                            </Text>
                          </HStack>
                          <HStack style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.infoLabel}>Next billing</Text>
                            <Text
                              style={[
                                styles.infoVal,
                                { fontFamily: 'monospace', color: '#0b53f8' },
                              ]}
                            >
                              {formatDate(activeSub.next_billing_date || activeSub.end_date)}
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>

                      {/* 2. Payment Details Card */}
                      <Box style={styles.sectionCard}>
                        <HStack space="xs" style={{ alignItems: 'center', marginBottom: 12 }}>
                          <Box style={[styles.cardHeaderIconBox, { backgroundColor: '#ecfdf5' }]}>
                            <Feather name="check-circle" size={15} color="#059669" />
                          </Box>
                          <Text style={styles.sectionCardTitle}>PAYMENT</Text>
                        </HStack>

                        <VStack space="xs">
                          <HStack style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <Text
                              style={[
                                styles.infoVal,
                                {
                                  color:
                                    (activeSub.payment?.status || '').toLowerCase() === 'success'
                                      ? '#16a34a'
                                      : '#d97706',
                                  textTransform: 'capitalize',
                                },
                              ]}
                            >
                              {activeSub.payment?.status || 'Success'}
                            </Text>
                          </HStack>
                          <HStack style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Amount paid</Text>
                            <Text style={styles.infoVal}>
                              ₹{activeSub.payment?.amount ?? price}
                            </Text>
                          </HStack>
                          <HStack style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Start date</Text>
                            <Text style={[styles.infoVal, { fontFamily: 'monospace' }]}>
                              {formatDate(activeSub.start_date)}
                            </Text>
                          </HStack>
                          <HStack style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.infoLabel}>Days remaining</Text>
                            <Text style={[styles.infoVal, { color: '#16a34a' }]}>
                              {daysRemaining} days
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>

                      {/* 3. Plan Limits Card */}
                      <Box style={styles.sectionCard}>
                        <HStack space="xs" style={{ alignItems: 'center', marginBottom: 12 }}>
                          <Box style={[styles.cardHeaderIconBox, { backgroundColor: '#f5f3ff' }]}>
                            <Feather name="shield" size={15} color="#7c3aed" />
                          </Box>
                          <Text style={styles.sectionCardTitle}>PLAN LIMITS</Text>
                        </HStack>

                        <VStack space="xs">
                          <HStack style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Posts / month</Text>
                            <Text style={styles.infoVal}>
                              {activeSub.plan_snapshot?.posts_per_month ?? 'Unlimited'}
                            </Text>
                          </HStack>
                          <HStack style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Posts / day</Text>
                            <Text style={styles.infoVal}>
                              {activeSub.plan_snapshot?.posts_per_day ?? 'Unlimited'}
                            </Text>
                          </HStack>
                          <HStack style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.infoLabel}>AI content / day</Text>
                            <Text style={styles.infoVal}>
                              {activeSub.plan_snapshot?.ai_content_generation_limit ?? 'Unlimited'}
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>
                    </VStack>

                    {/* Usage This Period (4 Metric Usage Cards) */}
                    <Box style={{ marginTop: 6 }}>
                      <Text style={styles.sectionHeadingText}>USAGE THIS PERIOD</Text>

                      <HStack style={{ flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                        {/* 1. Posts this month */}
                        <Box style={styles.usageCard}>
                          <HStack
                            style={{
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 10,
                            }}
                          >
                            <Box style={[styles.usageIconBox, { backgroundColor: '#eff6ff' }]}>
                              <Feather name="package" size={15} color="#0b53f8" />
                            </Box>
                            <Box style={[styles.usagePctBadge, { backgroundColor: '#eff6ff' }]}>
                              <Text style={[styles.usagePctText, { color: '#0b53f8' }]}>
                                {postsLimitMonth > 0
                                  ? Math.round((postsUsedThisMonth / postsLimitMonth) * 100)
                                  : 0}
                                %
                              </Text>
                            </Box>
                          </HStack>
                          <Text style={styles.usageMainNumber}>
                            {postsUsedThisMonth}
                            <Text style={styles.usageTotalNumber}> / {postsLimitMonth || '∞'}</Text>
                          </Text>
                          <Text style={styles.usageLabel}>Posts this month</Text>
                          <View style={[styles.usageProgressTrack, { backgroundColor: '#dbeafe' }]}>
                            <View
                              style={[
                                styles.usageProgressFill,
                                {
                                  backgroundColor: '#0b53f8',
                                  width: `${postsLimitMonth > 0 ? Math.min(100, (postsUsedThisMonth / postsLimitMonth) * 100) : 0}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.usageRemainingText}>
                            {postsRemainingMonth} remaining
                          </Text>
                        </Box>

                        {/* 2. Posts today */}
                        <Box style={styles.usageCard}>
                          <HStack
                            style={{
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 10,
                            }}
                          >
                            <Box style={[styles.usageIconBox, { backgroundColor: '#f5f3ff' }]}>
                              <Feather name="bar-chart-2" size={15} color="#7c3aed" />
                            </Box>
                            <Box style={[styles.usagePctBadge, { backgroundColor: '#f5f3ff' }]}>
                              <Text style={[styles.usagePctText, { color: '#7c3aed' }]}>
                                {postsLimitDay > 0
                                  ? Math.round((postsUsedToday / postsLimitDay) * 100)
                                  : 0}
                                %
                              </Text>
                            </Box>
                          </HStack>
                          <Text style={styles.usageMainNumber}>
                            {postsUsedToday}
                            <Text style={styles.usageTotalNumber}> / {postsLimitDay || '∞'}</Text>
                          </Text>
                          <Text style={styles.usageLabel}>Posts today</Text>
                          <View style={[styles.usageProgressTrack, { backgroundColor: '#ede9fe' }]}>
                            <View
                              style={[
                                styles.usageProgressFill,
                                {
                                  backgroundColor: '#7c3aed',
                                  width: `${postsLimitDay > 0 ? Math.min(100, (postsUsedToday / postsLimitDay) * 100) : 0}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.usageRemainingText}>
                            {postsRemainingDay} remaining
                          </Text>
                        </Box>

                        {/* 3. AI content today */}
                        <Box style={styles.usageCard}>
                          <HStack
                            style={{
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 10,
                            }}
                          >
                            <Box style={[styles.usageIconBox, { backgroundColor: '#fffbeb' }]}>
                              <Feather name="zap" size={15} color="#d97706" />
                            </Box>
                            <Box style={[styles.usagePctBadge, { backgroundColor: '#fffbeb' }]}>
                              <Text style={[styles.usagePctText, { color: '#d97706' }]}>
                                {aiLimitDay > 0 ? Math.round((aiUsedToday / aiLimitDay) * 100) : 0}%
                              </Text>
                            </Box>
                          </HStack>
                          <Text style={styles.usageMainNumber}>
                            {aiUsedToday}
                            <Text style={styles.usageTotalNumber}> / {aiLimitDay || '∞'}</Text>
                          </Text>
                          <Text style={styles.usageLabel}>AI content today</Text>
                          <View style={[styles.usageProgressTrack, { backgroundColor: '#fef3c7' }]}>
                            <View
                              style={[
                                styles.usageProgressFill,
                                {
                                  backgroundColor: '#d97706',
                                  width: `${aiLimitDay > 0 ? Math.min(100, (aiUsedToday / aiLimitDay) * 100) : 0}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.usageRemainingText}>{aiRemainingDay} remaining</Text>
                        </Box>

                        {/* 4. Monthly quota */}
                        <Box style={styles.usageCard}>
                          <HStack
                            style={{
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 10,
                            }}
                          >
                            <Box style={[styles.usageIconBox, { backgroundColor: '#ecfdf5' }]}>
                              <Feather name="activity" size={15} color="#059669" />
                            </Box>
                            <Box style={[styles.usagePctBadge, { backgroundColor: '#ecfdf5' }]}>
                              <Text style={[styles.usagePctText, { color: '#059669' }]}>
                                {usagePct}%
                              </Text>
                            </Box>
                          </HStack>
                          <Text style={styles.usageMainNumber}>
                            {usagePct}
                            <Text style={styles.usageTotalNumber}>%</Text>
                          </Text>
                          <Text style={styles.usageLabel}>Monthly quota</Text>
                          <View style={[styles.usageProgressTrack, { backgroundColor: '#d1fae5' }]}>
                            <View
                              style={[
                                styles.usageProgressFill,
                                {
                                  backgroundColor: '#059669',
                                  width: `${Math.min(100, usagePct)}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.usageRemainingText}>
                            {Math.max(0, 100 - usagePct)}% remaining
                          </Text>
                        </Box>
                      </HStack>
                    </Box>

                    {/* Plan Features Checklist */}
                    {featuresList.length > 0 && (
                      <Box style={styles.sectionCard}>
                        <HStack space="xs" style={{ alignItems: 'center', marginBottom: 12 }}>
                          <Box style={[styles.cardHeaderIconBox, { backgroundColor: '#f5f3ff' }]}>
                            <Feather name="shield" size={15} color="#7c3aed" />
                          </Box>
                          <Text style={styles.sectionCardTitle}>PLAN FEATURES</Text>
                        </HStack>

                        <VStack space="xs">
                          {featuresList.map((feat: string, idx: number) => (
                            <HStack key={idx} style={styles.featureItemRow}>
                              <View style={styles.featureCheckDot}>
                                <Feather name="check" size={11} color="#16a34a" />
                              </View>
                              <Text style={styles.featureItemText}>{feat}</Text>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    )}
                  </VStack>
                ) : (
                  /* Empty state when no active subscription */
                  <Box style={styles.noActiveSubCard}>
                    <Box style={styles.noActiveIconBox}>
                      <Feather name="info" size={22} color="#0b53f8" />
                    </Box>
                    <Heading style={styles.noActiveTitle}>No active subscription</Heading>
                    <Text style={styles.noActiveDesc}>
                      Subscribe to a plan to unlock all features and continue using the platform
                      with uninterrupted automated posts.
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push('/pages/subscriptionPlans/subscription-plans')}
                      style={styles.viewPlansBtn}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.viewPlansBtnText}>View Available Plans</Text>
                      <Feather
                        name="arrow-right"
                        size={14}
                        color="#ffffff"
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>
                  </Box>
                )}
              </>
            )}

            {/* TAB 2: SUBSCRIPTION HISTORY */}
            {activeTab === 'history' && (
              <VStack space="sm">
                {history.length > 0 ? (
                  history.map((item, index) => {
                    const planName =
                      item.plan_snapshot?.name || item.plan_id?.name || 'Subscription Plan';
                    const isCancelled = item.status === 2 || !!item.cancelled_at;
                    const isActive = item.is_active || item.status === 1;
                    const isExpanded = expandedHistoryId === item._id;

                    const palettes = [
                      { bg: '#eff6ff', border: '#bfdbfe', dot: '#2563eb', text: '#1e3a8a' },
                      { bg: '#f5f3ff', border: '#ddd6fe', dot: '#7c3aed', text: '#5b21b6' },
                      { bg: '#ecfdf5', border: '#a7f3d0', dot: '#059669', text: '#065f46' },
                      { bg: '#fff7ed', border: '#fed7aa', dot: '#ea580c', text: '#9a3412' },
                    ];
                    const pal = palettes[index % palettes.length];

                    return (
                      <Box
                        key={item._id}
                        style={[
                          styles.historyCard,
                          { borderColor: pal.border, backgroundColor: '#ffffff' },
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() => setExpandedHistoryId(isExpanded ? null : item._id)}
                          activeOpacity={0.7}
                          style={{ padding: 14 }}
                        >
                          <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <HStack
                              space="sm"
                              style={{ flex: 1, alignItems: 'center', paddingRight: 8 }}
                            >
                              <Box style={[styles.historyIconBox, { backgroundColor: pal.bg }]}>
                                <Feather name="credit-card" size={16} color={pal.dot} />
                              </Box>

                              <VStack style={{ flex: 1 }}>
                                <Text
                                  style={[styles.historyPlanTitle, { color: pal.text }]}
                                  numberOfLines={1}
                                >
                                  {planName}
                                </Text>
                                <Text style={styles.historyCycleText}>
                                  {item.billing_cycle || 'monthly'} ·{' '}
                                  {formatFullDate(item.start_date)}
                                </Text>
                              </VStack>
                            </HStack>

                            <HStack space="xs" style={{ alignItems: 'center' }}>
                              <Text style={[styles.historyAmountText, { color: pal.text }]}>
                                ₹{item.payment?.amount || item.plan_snapshot?.price || 0}
                              </Text>

                              <Box
                                style={[
                                  styles.historyStatusPill,
                                  {
                                    backgroundColor: isActive
                                      ? '#dcfce7'
                                      : isCancelled
                                        ? '#fee2e2'
                                        : '#f1f5f9',
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: '700',
                                    color: isActive
                                      ? '#16a34a'
                                      : isCancelled
                                        ? '#dc2626'
                                        : '#64748b',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {isActive ? 'Active' : isCancelled ? 'Cancelled' : 'Expired'}
                                </Text>
                              </Box>

                              <Feather
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color={pal.dot}
                                style={{ marginLeft: 4 }}
                              />
                            </HStack>
                          </HStack>
                        </TouchableOpacity>

                        {/* Expandable Details Accordion */}
                        {isExpanded && (
                          <Box
                            style={[styles.historyExpandedContent, { borderTopColor: pal.border }]}
                          >
                            <HStack
                              style={{ flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}
                            >
                              <VStack style={{ width: '45%' }}>
                                <Text style={styles.expDetailLabel}>START DATE</Text>
                                <Text style={styles.expDetailVal}>
                                  {formatFullDate(item.start_date)}
                                </Text>
                              </VStack>

                              <VStack style={{ width: '45%' }}>
                                <Text style={styles.expDetailLabel}>END DATE</Text>
                                <Text style={styles.expDetailVal}>
                                  {formatFullDate(item.end_date)}
                                </Text>
                              </VStack>

                              <VStack style={{ width: '45%' }}>
                                <Text style={styles.expDetailLabel}>PROVIDER</Text>
                                <HStack space="xs" style={{ alignItems: 'center', marginTop: 2 }}>
                                  <View
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: 3,
                                      backgroundColor:
                                        item.payment?.status === 'success' ? '#16a34a' : '#d97706',
                                    }}
                                  />
                                  <Text
                                    style={[styles.expDetailVal, { textTransform: 'capitalize' }]}
                                  >
                                    {item.payment?.provider || 'Razorpay'}
                                  </Text>
                                </HStack>
                              </VStack>

                              <VStack style={{ width: '45%' }}>
                                <Text style={styles.expDetailLabel}>AUTO-RENEW</Text>
                                <Box
                                  style={[
                                    styles.miniStatusBadge,
                                    { backgroundColor: item.auto_renew ? '#dcfce7' : '#f1f5f9' },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: '700',
                                      color: item.auto_renew ? '#16a34a' : '#64748b',
                                    }}
                                  >
                                    {item.auto_renew ? 'On' : 'Off'}
                                  </Text>
                                </Box>
                              </VStack>

                              {isCancelled && item.cancelled_at && (
                                <VStack style={{ width: '100%', marginTop: 4 }}>
                                  <Text style={styles.expDetailLabel}>CANCELLED ON</Text>
                                  <Text style={[styles.expDetailVal, { color: '#dc2626' }]}>
                                    {formatFullDate(item.cancelled_at)}
                                  </Text>
                                </VStack>
                              )}

                              {isActive && item.next_billing_date && (
                                <VStack style={{ width: '100%', marginTop: 4 }}>
                                  <Text style={styles.expDetailLabel}>NEXT BILLING</Text>
                                  <Text style={[styles.expDetailVal, { color: '#0b53f8' }]}>
                                    {formatFullDate(item.next_billing_date)}
                                  </Text>
                                </VStack>
                              )}
                            </HStack>

                            {/* Usage info if available */}
                            {item.usage && (
                              <Box style={styles.expUsageBox}>
                                <HStack
                                  style={{ justifyContent: 'space-between', marginBottom: 4 }}
                                >
                                  <Text
                                    style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}
                                  >
                                    AI USAGE TODAY
                                  </Text>
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: pal.dot }}>
                                    {item.usage.ai_content_used_today || 0} /{' '}
                                    {item.plan_snapshot?.ai_content_generation_limit ?? '—'}
                                  </Text>
                                </HStack>
                                <View style={[styles.expUsageTrack, { backgroundColor: pal.bg }]}>
                                  <View
                                    style={[
                                      styles.expUsageFill,
                                      {
                                        backgroundColor: pal.dot,
                                        width: `${Math.min(
                                          100,
                                          ((item.usage.ai_content_used_today || 0) /
                                            (item.plan_snapshot?.ai_content_generation_limit ||
                                              200)) *
                                            100
                                        )}%`,
                                      },
                                    ]}
                                  />
                                </View>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  })
                ) : (
                  <Box style={styles.emptyCard}>
                    <Feather name="clock" size={28} color="#94a3b8" />
                    <Text
                      style={{ fontSize: 14, fontWeight: '600', color: '#64748b', marginTop: 8 }}
                    >
                      No subscription history found.
                    </Text>
                  </Box>
                )}
              </VStack>
            )}
          </ScrollView>
        )}
      </Box>

      {/* ── AUTO-RENEW CONFIRMATION MODAL ── */}
      <Modal
        visible={autoRenewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!savingRenew) {
            setAutoRenewModalVisible(false);
            setPendingRenewValue(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <Box style={styles.modalCard}>
            <View
              style={[
                styles.modalTopBar,
                { backgroundColor: pendingRenewValue ? '#16a34a' : '#d97706' },
              ]}
            />
            <Box style={{ padding: 20 }}>
              <HStack space="xs" style={{ alignItems: 'center', marginBottom: 12 }}>
                <Box
                  style={[
                    styles.modalIconBox,
                    { backgroundColor: pendingRenewValue ? '#ecfdf5' : '#fffbeb' },
                  ]}
                >
                  <Feather
                    name="repeat"
                    size={16}
                    color={pendingRenewValue ? '#16a34a' : '#d97706'}
                  />
                </Box>
                <Heading style={styles.modalTitle}>
                  {pendingRenewValue ? 'Enable auto-renew?' : 'Disable auto-renew?'}
                </Heading>
              </HStack>

              <Box
                style={[
                  styles.modalAlertBox,
                  {
                    backgroundColor: pendingRenewValue ? '#ecfdf5' : '#fffbeb',
                    borderColor: pendingRenewValue ? '#bbf7d0' : '#fde68a',
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 18,
                    color: pendingRenewValue ? '#15803d' : '#b45309',
                  }}
                >
                  {pendingRenewValue
                    ? `Your subscription will automatically renew on ${formatDate(activeSub?.next_billing_date || activeSub?.end_date)} for ₹${price}. You can turn this off anytime.`
                    : `Your subscription will not renew automatically and will expire on ${formatDate(activeSub?.end_date)}.`}
                </Text>
              </Box>

              <HStack space="sm" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
                <TouchableOpacity
                  onPress={() => {
                    setAutoRenewModalVisible(false);
                    setPendingRenewValue(null);
                  }}
                  disabled={savingRenew}
                  style={styles.modalCancelBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirmAutoRenew}
                  disabled={savingRenew}
                  style={[
                    styles.modalConfirmBtn,
                    { backgroundColor: pendingRenewValue ? '#16a34a' : '#d97706' },
                  ]}
                  activeOpacity={0.8}
                >
                  {savingRenew ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>
                      {pendingRenewValue ? 'Yes, enable' : 'Yes, disable'}
                    </Text>
                  )}
                </TouchableOpacity>
              </HStack>
            </Box>
          </Box>
        </View>
      </Modal>

      {/* ── CANCEL SUBSCRIPTION MODAL ── */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!cancelling) setCancelModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Box style={styles.modalCard}>
            <View style={[styles.modalTopBar, { backgroundColor: '#dc2626' }]} />
            <Box style={{ padding: 20 }}>
              <HStack space="xs" style={{ alignItems: 'center', marginBottom: 12 }}>
                <Box style={[styles.modalIconBox, { backgroundColor: '#fef2f2' }]}>
                  <Feather name="alert-circle" size={16} color="#dc2626" />
                </Box>
                <Heading style={styles.modalTitle}>Cancel subscription</Heading>
              </HStack>

              <Box
                style={[
                  styles.modalAlertBox,
                  { backgroundColor: '#fffbeb', borderColor: '#fde68a', marginBottom: 14 },
                ]}
              >
                <Text style={{ fontSize: 12, lineHeight: 18, color: '#b45309' }}>
                  Your subscription stays active until{' '}
                  <Text style={{ fontWeight: '700', color: '#b45309' }}>
                    {formatDate(activeSub?.end_date)}
                  </Text>
                  . You will not be charged again.
                </Text>
              </Box>

              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 }}>
                Reason (optional)
              </Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Help us improve by sharing why you're cancelling..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={cancelReason}
                onChangeText={setCancelReason}
              />

              <HStack space="sm" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
                <TouchableOpacity
                  onPress={() => setCancelModalVisible(false)}
                  disabled={cancelling}
                  style={styles.modalCancelBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelBtnText}>Keep subscription</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirmCancel}
                  disabled={cancelling}
                  style={[styles.modalConfirmBtn, { backgroundColor: '#dc2626' }]}
                  activeOpacity={0.8}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Cancel subscription</Text>
                  )}
                </TouchableOpacity>
              </HStack>
            </Box>
          </Box>
        </View>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingBottom: 32,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerContent: {
    zIndex: 2,
  },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
  refreshIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mainCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    elevation: 4,
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },

  tabContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    fontWeight: '700',
    color: '#0b53f8',
  },

  /* Hero Plan Card */
  heroPlanCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroPlanGradientBar: {
    height: 4,
    backgroundColor: '#0b53f8',
  },
  heroPlanBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroPlanTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  heroPlanCycleSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  heroStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  heroStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 5,
  },
  heroStatusChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803d',
    textTransform: 'uppercase',
  },
  priceBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  priceNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0b53f8',
    lineHeight: 26,
  },
  priceCycle: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
  },
  cancelLinkBtn: {
    paddingVertical: 4,
  },
  cancelLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },

  /* Timeline */
  timelineBox: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  daysRemainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  daysRemainingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
    marginRight: 4,
  },
  daysRemainingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  timelineTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    backgroundColor: '#0b53f8',
    borderRadius: 3,
  },
  timelineDateLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  timelineDateVal: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  timelineUsedText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '500',
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  infoRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },

  /* Usage Cards */
  sectionHeadingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  usageCard: {
    flex: 1,
    minWidth: (screenWidth - 44) / 2,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  usageIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usagePctBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  usagePctText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  usageMainNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  usageTotalNumber: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#94a3b8',
  },
  usageLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 8,
  },
  usageProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  usageProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  usageRemainingText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 5,
  },

  /* Plan Features */
  featureItemRow: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 4,
  },
  featureCheckDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  featureItemText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },

  /* No active sub state */
  noActiveSubCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noActiveIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  noActiveTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  noActiveDesc: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  viewPlansBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b53f8',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewPlansBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* History Items */
  historyCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyPlanTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyCycleText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
    textTransform: 'capitalize',
  },
  historyAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyExpandedContent: {
    padding: 14,
    borderTopWidth: 1,
    backgroundColor: '#fafbfc',
  },
  expDetailLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  expDetailVal: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 1,
  },
  miniStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  expUsageBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  expUsageTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  expUsageFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 24,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTopBar: {
    height: 4,
  },
  modalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalAlertBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
