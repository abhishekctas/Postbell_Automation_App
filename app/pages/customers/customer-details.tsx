import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getCustomerDetails, getCustomerAvatarUrl, Customer } from './customers.api';

const PLATFORM_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> =
  {
    instagram: { label: 'Instagram', icon: 'instagram', color: '#E1306C', bg: '#fdf2f8' },
    facebook: { label: 'Facebook', icon: 'facebook', color: '#1877F2', bg: '#eff6ff' },
    twitter: { label: 'Twitter', icon: 'twitter', color: '#1DA1F2', bg: '#f0f9ff' },
    linkedin: { label: 'LinkedIn', icon: 'linkedin', color: '#0A66C2', bg: '#f0fdf4' },
    whatsapp: { label: 'WhatsApp', icon: 'message-circle', color: '#25D366', bg: '#f0fdf4' },
  };

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [connectedSocialAccounts, setConnectedSocialAccounts] = useState<any[]>([]);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getCustomerDetails(id);
      setCustomer(data);

      const socialAuth = data?.social_media_auth || {};
      const allAccounts: any[] = [];

      Object.entries(socialAuth).forEach(([platform, accounts]: [string, any]) => {
        if (Array.isArray(accounts)) {
          accounts.forEach((account: any) => {
            allAccounts.push({
              platform,
              account_id:
                account.account_id ||
                account.page_id ||
                account.instagram_business_account_id ||
                account.waba_id,
              connected_account_name:
                account.account_name ||
                account.page_name ||
                account.username ||
                account.verified_name ||
                '-',
              connection_status: account.connection_status || 'disconnected',
              auth_status: account.auth_status,
              is_default: account.is_default,
              connected_at: account.connected_at,
            });
          });
        }
      });

      setConnectedSocialAccounts(allAccounts);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load customer details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchCustomer();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchCustomer]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getGenderLabel = (g?: number) => {
    if (g === 1) return 'Male';
    if (g === 2) return 'Female';
    if (g === 3) return 'Other';
    return 'Not specified';
  };

  const formatAddress = (addr?: any) => {
    if (!addr) return 'No address provided';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      const { address_line_1, address_line_2, pincode, city, state } = addr;
      const parts = [
        address_line_1,
        address_line_2,
        city,
        state,
        pincode ? `PIN: ${pincode}` : '',
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'No address provided';
    }
    return String(addr);
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-sm text-slate-500">Loading customer profile...</Text>
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc] p-6">
        <Feather name="user-x" size={48} color="#94a3b8" />
        <Heading size="md" className="mt-4 text-slate-700">
          Customer Not Found
        </Heading>
        <Text className="mb-6 mt-1 text-center text-sm text-slate-500">
          The requested customer profile could not be found.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Customers</Text>
        </TouchableOpacity>
      </Box>
    );
  }

  const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer';
  const avatarUrl = getCustomerAvatarUrl(customer.image);
  const isActive = Number(customer.status) === 1;

  // Group social accounts by platform
  const groupedSocialAccounts: Record<string, any[]> = {};
  connectedSocialAccounts.forEach((acc) => {
    if (!groupedSocialAccounts[acc.platform]) {
      groupedSocialAccounts[acc.platform] = [];
    }
    groupedSocialAccounts[acc.platform].push(acc);
  });

  const postUsage = customer.postUsage;

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <Box className="px-5 pb-2 pt-12">
          <HStack className="mb-2 items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
              <HStack className="items-center space-x-1">
                <Feather name="arrow-left" size={16} color="#fff" />
                <Text style={styles.headerBackText}>Back</Text>
              </HStack>
            </TouchableOpacity>
          </HStack>

          <Heading size="xl" style={{ color: '#fff' }}>
            Customer Details
          </Heading>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 16 }}>
            View customer profile, social accounts & usage
          </Text>
        </Box>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card 1: Profile Information */}
        <Box style={styles.card}>
          <VStack className="mb-2 flex flex-row items-center gap-4 border-b border-slate-100 pb-2">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Box style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{fullName.charAt(0).toUpperCase()}</Text>
              </Box>
            )}
            <Box>
              <Text style={styles.profileName}>{fullName}</Text>
              <Text style={styles.profileEmail}>{customer.email || '-'}</Text>

              <Box
                style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeInactive]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isActive ? styles.textActive : styles.textInactive,
                  ]}
                >
                  {isActive ? 'Active Account' : 'Deactive Account'}
                </Text>
              </Box>
            </Box>
          </VStack>

          <VStack space="sm">
            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text style={styles.infoValue}>
                {customer.contact_no ? String(customer.contact_no) : 'Not provided'}
              </Text>
            </HStack>

            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{getGenderLabel(customer.gender)}</Text>
            </HStack>

            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoValue}>{customer.dob ? formatDate(customer.dob) : '-'}</Text>
            </HStack>

            <HStack style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Created</Text>
              <Text style={styles.infoValue}>{formatDate(customer.createdAt)}</Text>
            </HStack>

            <VStack style={styles.addressBlock}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.addressValue}>{formatAddress(customer.address)}</Text>
            </VStack>
          </VStack>
        </Box>

        {/* Card 2: Social Accounts */}
        <Box style={styles.card}>
          <HStack className="mb-4 items-center gap-2">
            <Feather name="share-2" size={18} color="#2563EB" />
            <Text style={styles.cardTitle}>Social Accounts</Text>
          </HStack>

          {Object.keys(groupedSocialAccounts).length > 0 ? (
            <VStack space="md">
              {Object.entries(groupedSocialAccounts).map(([platform, accounts]) => {
                const config = PLATFORM_CONFIG[platform.toLowerCase()] || {
                  label: platform,
                  icon: 'globe',
                  color: '#2563EB',
                  bg: '#eff6ff',
                };
                const connectedCount = accounts.filter(
                  (a) => a.connection_status === 'connected'
                ).length;

                return (
                  <Box key={platform} style={styles.platformCard}>
                    <HStack style={styles.platformHeader}>
                      <HStack className="items-center space-x-2">
                        <Box style={[styles.platformIconCircle, { backgroundColor: config.bg }]}>
                          <Feather name={config.icon as any} size={16} color={config.color} />
                        </Box>
                        <VStack>
                          <Text style={styles.platformName}>{config.label}</Text>
                          <Text style={styles.platformMeta}>
                            {connectedCount} of {accounts.length} connected
                          </Text>
                        </VStack>
                      </HStack>
                      <Box style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>
                          {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
                        </Text>
                      </Box>
                    </HStack>

                    <VStack space="xs" className="mt-3">
                      {accounts.map((acc, index) => {
                        const isConn = acc.connection_status === 'connected';
                        return (
                          <HStack key={index} style={styles.accountItemRow}>
                            <VStack style={{ flex: 1 }}>
                              <Text style={styles.accountNameText}>
                                {acc.connected_account_name}
                              </Text>
                              {acc.platform === 'instagram' ? (
                                <Text style={styles.accountSubtitle}>
                                  @{acc.connected_account_name}
                                </Text>
                              ) : null}
                            </VStack>
                            <HStack className="items-center space-x-1.5">
                              <View
                                style={[
                                  styles.statusDot,
                                  { backgroundColor: isConn ? '#22c55e' : '#94a3b8' },
                                ]}
                              />
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '600',
                                  color: isConn ? '#15803d' : '#64748b',
                                }}
                              >
                                {isConn ? 'Connected' : 'Disconnected'}
                              </Text>
                            </HStack>
                          </HStack>
                        );
                      })}
                    </VStack>
                  </Box>
                );
              })}
            </VStack>
          ) : (
            <Box style={styles.emptyStateBox}>
              <Feather name="link-2" size={24} color="#94a3b8" />
              <Text style={styles.emptyStateText}>No connected social accounts found</Text>
            </Box>
          )}
        </Box>

        {/* Card 3: Subscription Usage */}
        <Box style={styles.card}>
          <HStack className="mb-4 items-center gap-2">
            <Feather name="pie-chart" size={18} color="#2563EB" />
            <Text style={styles.cardTitle}>Subscription Usage</Text>
          </HStack>

          {!postUsage ? (
            <Box style={styles.emptyStateBox}>
              <Feather name="credit-card" size={24} color="#94a3b8" />
              <Text style={styles.emptyStateText}>No active subscription found</Text>
            </Box>
          ) : (
            <VStack space="sm">
              {/* Metric 1: Plan */}
              <Box style={styles.metricCard}>
                <HStack className="items-center gap-3">
                  <Box style={[styles.metricIconBox, { backgroundColor: '#e0e7ff' }]}>
                    <Feather name="credit-card" size={18} color="#4338ca" />
                  </Box>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.metricLabel}>Active Plan</Text>
                    <Text style={styles.metricValue}>
                      {postUsage?.plan_snapshot?.name || 'Standard Plan'}
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* Metric 2: Posts Today */}
              <Box style={styles.metricCard}>
                <HStack className="items-center gap-3">
                  <Box style={[styles.metricIconBox, { backgroundColor: '#dcfce7' }]}>
                    <Feather name="calendar" size={18} color="#15803d" />
                  </Box>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.metricLabel}>Posts Today</Text>
                    <Text style={styles.metricValue}>
                      {postUsage?.posts_used_today || 0} /{' '}
                      {postUsage?.plan_snapshot?.posts_per_day || 0}
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* Metric 3: Posts This Month */}
              <Box style={styles.metricCard}>
                <HStack className="items-center gap-3">
                  <Box style={[styles.metricIconBox, { backgroundColor: '#fef3c7' }]}>
                    <Feather name="clock" size={18} color="#b45309" />
                  </Box>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.metricLabel}>Posts This Month</Text>
                    <Text style={styles.metricValue}>
                      {postUsage?.posts_used_this_month || 0} /{' '}
                      {postUsage?.plan_snapshot?.posts_per_month || 0}
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* Metric 4: AI Usage Today */}
              <Box style={styles.metricCard}>
                <HStack className="items-center gap-3">
                  <Box style={[styles.metricIconBox, { backgroundColor: '#fce7f3' }]}>
                    <Feather name="zap" size={18} color="#be185d" />
                  </Box>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.metricLabel}>AI Content Usage Today</Text>
                    <Text style={styles.metricValue}>
                      {postUsage?.ai_content_used_today || 0} /{' '}
                      {postUsage?.plan_snapshot?.ai_content_generation_limit || 0}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            </VStack>
          )}
        </Box>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 6 },
  headerBackBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerBackText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  avatarImage: { width: 90, height: 90, borderRadius: 13, marginBottom: 8 },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 13,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarFallbackText: { fontSize: 32, fontWeight: '700', color: '#1d4ed8' },
  profileName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  profileEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#fee2e2' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  textActive: { color: '#15803d' },
  textInactive: { color: '#dc2626' },
  infoRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  addressBlock: { paddingTop: 8 },
  addressValue: { fontSize: 13, color: '#0f172a', fontWeight: '500', marginTop: 2 },
  platformCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  platformHeader: { justifyContent: 'space-between', alignItems: 'center' },
  platformIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  platformMeta: { fontSize: 11, color: '#64748b' },
  countBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  countBadgeText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  accountItemRow: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountNameText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  accountSubtitle: { fontSize: 11, color: '#94a3b8' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  emptyStateBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyStateText: { fontSize: 13, color: '#64748b', marginTop: 8 },
  metricCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  metricIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  metricValue: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  backButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
