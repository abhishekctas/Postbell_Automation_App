import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { getOAuthUrl, getConnectionStatus, disconnectAccount } from '../customer-setup.api';

interface SocialMediaAuthProps {
  data: any;
  onChange: (data: any) => void;
}

const PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram Business',
    description:
      'Connect your Instagram professional or creator account to publish auto-posts & reels',
    iconName: 'instagram',
    color: '#E4405F',
    bgColor: '#fdf2f4',
    borderColor: '#fbcfe8',
    isComingSoon: false,
  },
  {
    id: 'facebook',
    name: 'Facebook Page',
    description:
      'Connect your Facebook business page to publish scheduled posts and festival flyers',
    iconName: 'facebook-square',
    color: '#1877F2',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    isComingSoon: false,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    description: 'Connect your X (Twitter) account for automated tweets & updates',
    iconName: 'twitter',
    color: '#000000',
    bgColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    isComingSoon: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect your LinkedIn profile or organization page for professional posts',
    iconName: 'linkedin-square',
    color: '#0077B5',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    isComingSoon: false,
  },
  {
    id: 'google_business',
    name: 'Google Business Profile',
    description: 'Connect Google Business Profile to update local business posts & offers',
    iconName: 'google',
    color: '#4285F4',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    isComingSoon: false,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    description: 'Connect your Pinterest account for visual pins & ideas',
    iconName: 'pinterest-p',
    color: '#BD081C',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    isComingSoon: false,
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    description: 'Connect your Snapchat account for story automation',
    iconName: 'snapchat-ghost',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fef3c7',
    isComingSoon: false,
  },
];

export default function SocialMediaAuth({ data, onChange }: SocialMediaAuthProps) {
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedForDisconnect, setSelectedForDisconnect] = useState<{
    platform: string;
    accountId?: string;
    name: string;
  } | null>(null);

  const authData = data.social_media_auth || {};

  // Auto-refresh statuses on initial mount
  useEffect(() => {
    PLATFORMS.filter((p) => !p.isComingSoon).forEach((platform) => {
      if (authData[platform.id]) {
        void handleRefreshStatusSilently(platform.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshStatusSilently = async (platform: string) => {
    try {
      const res = await getConnectionStatus(platform);
      if (res?.success && res.data) {
        onChange({
          social_media_auth: {
            ...(data.social_media_auth || {}),
            [platform]: res.data,
          },
        });
      }
    } catch (err) {
      // Silent error on auto-refresh
    }
  };

  const getPlatformAccounts = (platformId: string, platformData: any): any[] => {
    if (!platformData) return [];

    const mapCommonFields = (acc: any): any => ({
      account_id:
        acc.account_id || acc.page_id || acc.instagram_business_account_id || acc.id || platformId,
      account_name:
        acc.account_name ||
        acc.page_name ||
        acc.username ||
        acc.verified_name ||
        acc.connected_account_name ||
        'Connected Account',
      username: acc.username,
      primary_phone: acc.primary_phone || acc.display_phone_number,
      connection_status: acc.connection_status || 'connected',
      auth_status: acc.auth_status || 'authorized',
      is_connected: acc.connection_status === 'connected' || acc.is_connected !== false,
    });

    if (Array.isArray(platformData)) {
      return platformData.map((acc: any) => mapCommonFields(acc));
    }

    if (typeof platformData === 'object') {
      const isConnected =
        platformData.connection_status === 'connected' || platformData.is_connected;
      if (isConnected) {
        return [mapCommonFields(platformData)];
      }
    }

    return [];
  };

  const handleConnect = async (platform: string, isComingSoon?: boolean) => {
    if (isComingSoon) {
      Alert.alert('Coming Soon', `${platform} integration is coming soon!`);
      return;
    }
    setLoadingPlatform(platform);
    try {
      const res = await getOAuthUrl(platform, 'setup-wizard');
      if (res?.success && res.data?.oauth_url) {
        await Linking.openURL(res.data.oauth_url);
      } else {
        throw new Error(res?.error || res?.message || 'Could not retrieve authorization URL');
      }
    } catch (err: any) {
      Alert.alert('Connection Error', err?.message || `Failed to initiate ${platform} connection.`);
    } finally {
      setLoadingPlatform(null);
    }
  };

  const handleOpenDisconnectModal = (platform: string, name: string, accountId?: string) => {
    setSelectedForDisconnect({ platform, accountId, name });
    setConfirmModalOpen(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!selectedForDisconnect) return;
    const { platform, accountId } = selectedForDisconnect;
    setConfirmModalOpen(false);
    setLoadingPlatform(platform);

    try {
      const res = await disconnectAccount(platform);
      if (res?.success) {
        let updatedPlatformData: any = {
          connection_status: 'disconnected',
          connected_account_name: '',
          auth_status: 'unauthorized',
          reconnect_status: 'not_needed',
        };

        if (Array.isArray(authData[platform])) {
          updatedPlatformData = authData[platform].filter(
            (a: any) => (a.account_id || a.page_id || a.id) !== accountId
          );
        }

        onChange({
          social_media_auth: {
            ...authData,
            [platform]: updatedPlatformData,
          },
        });
        Alert.alert('Disconnected', `${platform.replace('_', ' ')} account has been disconnected.`);
      } else {
        throw new Error(res?.error || res?.message || 'Failed to disconnect account');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Disconnect failed');
    } finally {
      setLoadingPlatform(null);
      setSelectedForDisconnect(null);
    }
  };

  return (
    <VStack space="md" style={styles.container}>
      {/* Header Banner */}
      <View style={styles.bannerHeader}>
        <HStack space="md" style={{ alignItems: 'center' }}>
          <View style={styles.bannerIconBox}>
            <Feather name="shield" size={22} color="#ffffff" />
          </View>
          <VStack style={{ flex: 1 }}>
            <Heading style={styles.bannerTitle}>Social Media Connections</Heading>
            <Text style={styles.bannerSubtitle}>
              Connect your social media accounts for publishing and automation.
            </Text>
          </VStack>
        </HStack>
      </View>

      {/* Platform Cards */}
      {PLATFORMS.map((platform) => {
        const platformData = authData[platform.id];
        const accounts = getPlatformAccounts(platform.id, platformData);
        const isConnected = accounts.length > 0;
        const isLoadingThis = loadingPlatform === platform.id;

        return (
          <View
            key={platform.id}
            style={[styles.card, platform.isComingSoon && styles.cardDisabled]}
          >
            <HStack style={{ flexDirection: 'column' }}>
              <HStack space="md" style={{ flex: 1 }}>
                {/* Platform Icon */}
                <View
                  style={[
                    styles.platformIconCircle,
                    { backgroundColor: platform.bgColor, borderColor: platform.borderColor },
                  ]}
                >
                  <FontAwesome name={platform.iconName as any} size={22} color={platform.color} />
                </View>
                <VStack style={{ flex: 1 }}>
                  <HStack space="xs" style={{ alignItems: 'center' }}>
                    <Text style={styles.platformName}>{platform.name}</Text>
                    {isConnected ? (
                      <View style={styles.connectedBadge}>
                        <Feather
                          name="check-circle"
                          size={12}
                          color="#16a34a"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.connectedBadgeText}>
                          {accounts.length > 1 ? `${accounts.length} Accounts` : 'Connected'}
                        </Text>
                      </View>
                    ) : platform.isComingSoon ? (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
                      </View>
                    ) : null}
                  </HStack>

                  <Text style={styles.platformDesc}>{platform.description}</Text>
                </VStack>
              </HStack>
              {/* Platform Details */}
              <VStack style={{ flex: 1 }}>
                {/* Connected Accounts List */}
                {isConnected && (
                  <VStack space="xs" style={{ marginTop: 8 }}>
                    {accounts.map((acc, idx) => (
                      <View key={acc.account_id || idx} style={styles.connectedAccountBox}>
                        <Feather
                          name="user-check"
                          size={13}
                          color="#0f172a"
                          style={{ marginRight: 6 }}
                        />
                        <VStack style={{ flex: 1 }}>
                          <Text style={styles.connectedAccountText} numberOfLines={1}>
                            {acc.account_name}
                          </Text>
                          {acc.username && (
                            <Text style={styles.accountSubText} numberOfLines={1}>
                              @{acc.username}
                            </Text>
                          )}
                          {acc.primary_phone && (
                            <Text style={styles.accountSubText} numberOfLines={1}>
                              📞 {acc.primary_phone}
                            </Text>
                          )}
                        </VStack>

                        {/* Disconnect button next to account name */}
                        <TouchableOpacity
                          onPress={() =>
                            handleOpenDisconnectModal(
                              platform.id,
                              acc.account_name || platform.name,
                              acc.account_id
                            )
                          }
                          disabled={isLoadingThis}
                          style={styles.disconnectIconBtn}
                          activeOpacity={0.7}
                        >
                          <Feather name="link-2" size={14} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </VStack>
                )}
              </VStack>
            </HStack>

            {/* Action Buttons Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => handleConnect(platform.id, platform.isComingSoon)}
                disabled={isLoadingThis || platform.isComingSoon}
                style={[
                  styles.connectBtn,
                  {
                    backgroundColor: platform.isComingSoon ? '#cbd5e1' : '#193867',
                  },
                ]}
              >
                {isLoadingThis ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <HStack space="xs" style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Feather
                      name={isConnected ? 'plus' : 'external-link'}
                      size={14}
                      color="#ffffff"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.connectBtnText}>
                      {isLoadingThis
                        ? 'Processing...'
                        : platform.isComingSoon
                          ? 'Coming Soon'
                          : isConnected
                            ? 'Add Account'
                            : 'Connect Account'}
                    </Text>
                  </HStack>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Disconnect Confirmation Modal */}
      <Modal
        visible={confirmModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalBox}>
            <View style={styles.warningIconCircle}>
              <Feather name="alert-triangle" size={24} color="#dc2626" />
            </View>

            <Heading style={styles.modalTitle}>Disconnect Account?</Heading>
            <Text style={styles.modalBody}>
              Are you sure you want to disconnect {selectedForDisconnect?.name}? Automatic
              publishing to this platform will be paused until re-connected.
            </Text>

            <HStack space="sm" style={styles.modalActionRow}>
              <TouchableOpacity
                onPress={() => setConfirmModalOpen(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmDisconnect} style={styles.modalConfirmBtn}>
                <Text style={styles.modalConfirmBtnText}>Disconnect</Text>
              </TouchableOpacity>
            </HStack>
          </View>
        </View>
      </Modal>
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bannerHeader: {
    backgroundColor: '#0b53f8',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardDisabled: {
    opacity: 0.7,
  },
  platformIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  comingSoonBadge: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  comingSoonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  platformDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  connectedAccountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  connectedAccountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  accountSubText: {
    fontSize: 11,
    color: '#64748b',
  },
  disconnectIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginLeft: 8,
  },
  actionRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9,
    width: '100%',
  },
  connectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    maxWidth: 420,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  warningIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalBody: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalActionRow: {
    marginTop: 18,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 9,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
