import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
  Switch,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  getMyActiveSubscription,
  getMySubscriptionHistory,
  updateAutoRenew,
  cancelMySubscription,
  ActiveSubscription,
  SubscriptionHistoryItem,
} from './my-subscription.api';

const formatDate = (raw?: string) => {
  if (!raw) return '—';
  const date = new Date(raw);
  if (isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export default function MySubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [updatingAutoRenew, setUpdatingAutoRenew] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [activeRes, historyRes] = await Promise.allSettled([
        getMyActiveSubscription(),
        getMySubscriptionHistory(),
      ]);

      if (activeRes.status === 'fulfilled') {
        setActiveSub(activeRes.value?.data || null);
      }
      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value?.data || []);
      }
    } catch (error: any) {
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

  const handleToggleAutoRenew = async (value: boolean) => {
    if (!activeSub) return;
    setUpdatingAutoRenew(true);
    try {
      await updateAutoRenew(value);
      setActiveSub((prev) => (prev ? { ...prev, auto_renew: value } : null));
      Alert.alert('Success', `Auto renew ${value ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update auto renew.');
    } finally {
      setUpdatingAutoRenew(false);
    }
  };

  const handleCancelSub = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your active subscription?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelMySubscription('Cancelled from mobile app');
              Alert.alert('Success', 'Subscription cancelled successfully.');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel subscription.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <LinearGradient
        colors={['#0b53f8', '#023eb9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Box style={styles.headerGlow} />
        <Box style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <VStack style={{ flex: 1, paddingRight: 15 }}>
              <Heading style={styles.headerTitle}>My Subscriptions</Heading>
              <Text style={styles.headerSubtitle}>
                Manage active plans, billing cycle, usage & history
              </Text>
            </VStack>
            <Box style={styles.iconContainer}>
              <Feather name="credit-card" size={26} color="#ffffff" />
            </Box>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Main Card */}
      <Box style={styles.mainCard}>
        {loading && !refreshing ? (
          <Box className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#0b53f8" />
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
                    {/* Active Plan Card */}
                    <Box style={styles.planCard}>
                      <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <VStack>
                          <Text style={styles.planBadgeText}>ACTIVE PLAN</Text>
                          <Text style={styles.planTitle}>
                            {activeSub.plan_snapshot?.name || 'Premium Plan'}
                          </Text>
                        </VStack>
                        <Box style={styles.statusBadge}>
                          <Text style={styles.statusBadgeText}>● Active</Text>
                        </Box>
                      </HStack>

                      <HStack
                        style={{
                          marginTop: 14,
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                        }}
                      >
                        <Text style={styles.priceText}>
                          ₹{activeSub.plan_snapshot?.price || 0}
                          <Text style={styles.cycleText}>
                            /{activeSub.billing_cycle === 'annual' ? 'year' : 'month'}
                          </Text>
                        </Text>
                        <Text style={styles.daysRemainingText}>
                          {activeSub.days_remaining || 0} Days Remaining
                        </Text>
                      </HStack>

                      {/* Progress Bar */}
                      <Box style={{ marginTop: 14 }}>
                        <HStack style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
                            Monthly Usage
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>
                            {activeSub.posts_used_this_month || 0} /{' '}
                            {activeSub.plan_snapshot?.posts_per_month || '∞'} posts
                          </Text>
                        </HStack>
                        <Box style={styles.progressTrack}>
                          <Box
                            style={[
                              styles.progressBar,
                              { width: `${Math.min(activeSub.usage_percentage || 0, 100)}%` },
                            ]}
                          />
                        </Box>
                      </Box>
                    </Box>

                    {/* Subscription Details Card */}
                    <Box style={styles.card}>
                      <Heading style={styles.cardTitle}>Plan Details</Heading>

                      <VStack space="sm" style={{ marginTop: 12 }}>
                        <HStack style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Billing Cycle</Text>
                          <Text style={styles.detailValue}>
                            {activeSub.billing_cycle === 'annual' ? 'Annual' : 'Monthly'}
                          </Text>
                        </HStack>

                        <HStack style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Start Date</Text>
                          <Text style={styles.detailValue}>{formatDate(activeSub.start_date)}</Text>
                        </HStack>

                        <HStack style={styles.detailRow}>
                          <Text style={styles.detailLabel}>End Date</Text>
                          <Text style={styles.detailValue}>{formatDate(activeSub.end_date)}</Text>
                        </HStack>

                        <HStack style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Daily Posts Limit</Text>
                          <Text style={styles.detailValue}>
                            {activeSub.plan_snapshot?.posts_per_day || 'Unlimited'}
                          </Text>
                        </HStack>

                        <HStack style={styles.detailRow}>
                          <Text style={styles.detailLabel}>AI Content Generation</Text>
                          <Text style={styles.detailValue}>
                            {activeSub.plan_snapshot?.ai_content_generation_limit || 'Unlimited'}
                          </Text>
                        </HStack>

                        {/* Auto Renew Switch */}
                        <HStack
                          style={[
                            styles.detailRow,
                            { paddingTop: 8, borderTopWidth: 1, borderColor: '#f1f5f9' },
                          ]}
                        >
                          <VStack style={{ flex: 1 }}>
                            <Text
                              style={[styles.detailLabel, { fontWeight: '700', color: '#0f172a' }]}
                            >
                              Auto Renew
                            </Text>
                            <Text style={{ fontSize: 11, color: '#64748b' }}>
                              Automatically renew subscription on expiry
                            </Text>
                          </VStack>
                          <Switch
                            value={activeSub.auto_renew !== false}
                            onValueChange={handleToggleAutoRenew}
                            disabled={updatingAutoRenew}
                            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                            thumbColor={activeSub.auto_renew !== false ? '#0b53f8' : '#f8fafc'}
                          />
                        </HStack>
                      </VStack>
                    </Box>

                    {/* Cancel Subscription Action */}
                    <TouchableOpacity
                      onPress={handleCancelSub}
                      disabled={cancelling}
                      style={styles.cancelBtn}
                      activeOpacity={0.8}
                    >
                      <Feather
                        name="x-circle"
                        size={16}
                        color="#dc2626"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.cancelBtnText}>
                        {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                      </Text>
                    </TouchableOpacity>
                  </VStack>
                ) : (
                  <Box style={styles.emptyCard}>
                    <Feather name="info" size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
                    <Heading style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>
                      No Active Subscription
                    </Heading>
                    <Text
                      style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 }}
                    >
                      You currently do not have an active subscription plan.
                    </Text>
                  </Box>
                )}
              </>
            )}

            {/* TAB 2: SUBSCRIPTION HISTORY */}
            {activeTab === 'history' && (
              <VStack space="sm">
                {history.length > 0 ? (
                  history.map((item) => (
                    <Box key={item._id} style={styles.historyCard}>
                      <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Heading style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                          {item.plan_snapshot?.name || 'Subscription Plan'}
                        </Heading>
                        <Box
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                            backgroundColor: item.status === 1 ? '#dcfce7' : '#fee2e2',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: item.status === 1 ? '#15803d' : '#dc2626',
                            }}
                          >
                            {item.status === 1
                              ? 'Active'
                              : item.status === 2
                                ? 'Cancelled'
                                : 'Expired'}
                          </Text>
                        </Box>
                      </HStack>

                      <HStack style={{ marginTop: 8, justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          Start: {formatDate(item.start_date)}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          End: {formatDate(item.end_date)}
                        </Text>
                      </HStack>
                    </Box>
                  ))
                ) : (
                  <Box style={styles.emptyCard}>
                    <Text style={{ fontSize: 13, color: '#64748b' }}>
                      No subscription history found.
                    </Text>
                  </Box>
                )}
              </VStack>
            )}
          </ScrollView>
        )}
      </Box>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backIcon: { color: '#fff', fontSize: 20, fontWeight: '600', marginRight: 4 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
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

  planCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 16,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0b53f8',
    letterSpacing: 0.8,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e3a8a',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  priceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  cycleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  daysRemainingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0b53f8',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0b53f8',
    borderRadius: 4,
  },

  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },

  historyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
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
});
