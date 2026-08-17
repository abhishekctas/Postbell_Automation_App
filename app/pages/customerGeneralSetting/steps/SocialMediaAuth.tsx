import React, { useState } from 'react';
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
  },
];

export default function SocialMediaAuth({ data, onChange }: SocialMediaAuthProps) {
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const [refreshingPlatform, setRefreshingPlatform] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedForDisconnect, setSelectedForDisconnect] = useState<{
    platform: 'facebook' | 'instagram';
    name: string;
  } | null>(null);

  const authData = data.social_media_auth || {};

  const handleConnect = async (platform: 'facebook' | 'instagram') => {
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

  const handleRefreshStatus = async (platform: 'facebook' | 'instagram') => {
    setRefreshingPlatform(platform);
    try {
      const res = await getConnectionStatus(platform);
      if (res?.success && res.data) {
        const isConnected = res.data.connection_status === 'connected' || res.data.is_connected;
        onChange({
          social_media_auth: {
            ...authData,
            [platform]: {
              ...authData[platform],
              connection_status: isConnected ? 'connected' : 'disconnected',
              connected_account_name:
                res.data.connected_account_name || authData[platform]?.connected_account_name || '',
              auth_status: res.data.auth_status || 'authorized',
            },
          },
        });
        Alert.alert('Status Updated', `${platform} connection status refreshed successfully.`);
      }
    } catch (err: any) {
      Alert.alert('Status Notice', err?.message || 'Could not fetch latest status.');
    } finally {
      setRefreshingPlatform(null);
    }
  };

  const handleOpenDisconnectModal = (platform: 'facebook' | 'instagram', name: string) => {
    setSelectedForDisconnect({ platform, name });
    setConfirmModalOpen(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!selectedForDisconnect) return;
    const { platform } = selectedForDisconnect;
    setConfirmModalOpen(false);
    setLoadingPlatform(platform);

    try {
      const res = await disconnectAccount(platform);
      if (res?.success) {
        onChange({
          social_media_auth: {
            ...authData,
            [platform]: {
              connection_status: 'disconnected',
              connected_account_name: '',
              auth_status: 'unauthorized',
              reconnect_status: 'not_needed',
            },
          },
        });
        Alert.alert('Disconnected', `${platform} account has been disconnected.`);
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
            <Heading style={styles.bannerTitle}>Social Media Authorization</Heading>
            <Text style={styles.bannerSubtitle}>
              Authorize your social platforms for direct 1-click automatic post publishing
            </Text>
          </VStack>
        </HStack>
      </View>

      {/* Platform Cards */}
      {PLATFORMS.map((platform) => {
        const pData = authData[platform.id] || {};
        const isConnected = pData.connection_status === 'connected';
        const accountName =
          pData.connected_account_name || pData.username || pData.page_name || 'Authorized Page';
        const isLoadingThis = loadingPlatform === platform.id;
        const isRefreshingThis = refreshingPlatform === platform.id;

        return (
          <View key={platform.id} style={styles.card}>
            <HStack style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
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

                {/* Platform Details */}
                <VStack style={{ flex: 1 }}>
                  <HStack space="xs" style={{ alignItems: 'center' }}>
                    <Text style={styles.platformName}>{platform.name}</Text>
                    {isConnected && (
                      <View style={styles.connectedBadge}>
                        <Feather
                          name="check-circle"
                          size={12}
                          color="#16a34a"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.connectedBadgeText}>Connected</Text>
                      </View>
                    )}
                  </HStack>

                  <Text style={styles.platformDesc}>{platform.description}</Text>

                  {isConnected && (
                    <View style={styles.connectedAccountBox}>
                      <Feather
                        name="user-check"
                        size={13}
                        color="#0f172a"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.connectedAccountText} numberOfLines={1}>
                        {accountName}
                      </Text>
                    </View>
                  )}
                </VStack>
              </HStack>
            </HStack>

            {/* Action Buttons Row */}
            <HStack space="xs" style={styles.actionRow}>
              {isConnected ? (
                <>
                  <TouchableOpacity
                    onPress={() => handleRefreshStatus(platform.id as any)}
                    disabled={isRefreshingThis}
                    style={styles.refreshBtn}
                  >
                    {isRefreshingThis ? (
                      <ActivityIndicator size="small" color="#64748b" />
                    ) : (
                      <HStack space="xs" style={{ alignItems: 'center' }}>
                        <Feather name="refresh-cw" size={13} color="#64748b" />
                        <Text style={styles.refreshBtnText}>Refresh</Text>
                      </HStack>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenDisconnectModal(platform.id as any, accountName)}
                    disabled={isLoadingThis}
                    style={styles.disconnectBtn}
                  >
                    <HStack space="xs" style={{ alignItems: 'center' }}>
                      <Feather name="link-2" size={13} color="#dc2626" />
                      <Text style={styles.disconnectBtnText}>Disconnect</Text>
                    </HStack>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={() => handleConnect(platform.id as any)}
                  disabled={isLoadingThis}
                  style={[styles.connectBtn, { backgroundColor: platform.color }]}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <HStack space="xs" style={{ alignItems: 'center' }}>
                      <Feather name="link" size={14} color="#ffffff" />
                      <Text style={styles.connectBtnText}>Connect {platform.name}</Text>
                    </HStack>
                  )}
                </TouchableOpacity>
              )}
            </HStack>
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
    backgroundColor: '#193867',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 8,
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
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
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
  platformDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  connectedAccountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  connectedAccountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  actionRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    justifyContent: 'flex-end',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
  },
  connectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  refreshBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  disconnectBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 8,
  },
  disconnectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
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
