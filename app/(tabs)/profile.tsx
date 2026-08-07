import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { fetchWithAuth, API_ENDPOINTS, API_BASE_URL } from '@/services/api';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

function InfoRow({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  keyboardType?: any;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <VStack space="xs" style={{ marginBottom: 12 }}>
      <Text style={styles.formLabel}>{label}</Text>
      {onChangeText ? (
        <TextInput
          style={[styles.input, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#94a3b8"
        />
      ) : (
        <Text style={styles.formValue}>{value || '—'}</Text>
      )}
    </VStack>
  );
}

export default function ProfileScreen() {
  const { user, signOut, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [address, setAddress] = useState('');

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const uid = user?._id || user?.id;
        if (!uid) {
          setLoading(false);
          return;
        }
        const BASE = API_ENDPOINTS.profile.replace('/users', '');
        const res = await fetchWithAuth(`${BASE}/users/get-user/${uid}`);
        const data = res?.data || res;
        setFirstName(data?.first_name ?? user?.first_name ?? '');
        setLastName(data?.last_name ?? user?.last_name ?? '');
        setContactNo(String(data?.contact_no ?? user?.contact_no ?? ''));
        setAddress(data?.address ?? '');
        setAvatarUrl(data?.avatar ?? user?.avatar ?? null);
      } catch {
        setFirstName(user?.first_name ?? '');
        setLastName(user?.last_name ?? '');
        setAvatarUrl(user?.avatar ?? null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return null;
    if (
      /^https?:\/\//i.test(avatar) ||
      avatar.startsWith('file://') ||
      avatar.startsWith('content://')
    ) {
      return avatar;
    }
    const baseUrl = API_BASE_URL.replace(/\/v1\/?$/, '');
    return `${baseUrl}/profile/${avatar}`;
  };

  const handlePickAndUploadImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uid = user?._id || user?.id;
        if (!uid) {
          Alert.alert('Error', 'User ID not found');
          return;
        }

        setUploadingImage(true);

        const formData = new FormData();
        const filename = asset.uri.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image', {
          uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
          name: filename,
          type,
        } as any);

        const res = await fetchWithAuth(
          `${API_ENDPOINTS.profile}/profile/upload-profile-image/${uid}`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (res && res.success !== false) {
          const BASE = API_ENDPOINTS.profile.replace('/users', '');
          const userRes = await fetchWithAuth(`${BASE}/users/get-user/${uid}`);
          const updatedData = userRes?.data || userRes;
          const newAvatar =
            updatedData?.avatar ||
            res?.data?.avatar ||
            res?.avatar ||
            res?.user?.avatar ||
            asset.uri;

          setAvatarUrl(newAvatar);
          if (updateUser) {
            await updateUser({ avatar: newAvatar });
          }
          Alert.alert('Success', 'Profile image updated successfully!');
        } else {
          Alert.alert('Error', res?.message || 'Failed to upload profile image.');
        }
      }
    } catch (err: any) {
      console.error('Upload profile image error:', err);
      Alert.alert('Error', err?.message || 'Failed to upload profile image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const uid = user?._id || user?.id;
      if (!uid) return;
      const BASE = API_ENDPOINTS.profile.replace('/users', '');
      await fetchWithAuth(`${BASE}/users/update-user/${uid}`, {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          contact_no: contactNo,
          address,
        }),
      });
      await updateUser({ first_name: firstName, last_name: lastName });
      Alert.alert('Success', 'Profile updated!');
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials =
    `${firstName?.[0] ?? user?.first_name?.[0] ?? ''}${lastName?.[0] ?? user?.last_name?.[0] ?? ''}`.toUpperCase() ||
    'KC';

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <Box style={styles.header}>
        <HStack className="items-center justify-between px-5 pb-2 pt-14">
          <Box>
            <Heading size="xl" style={{ color: '#fff', fontWeight: '700', paddingTop: 12 }}>
              Profile
            </Heading>
          </Box>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <HStack className="items-center gap-0.5">
              <Feather name="arrow-left" size={16} color="#fff" />
              <Text style={styles.backBtnText}>Back</Text>
            </HStack>
          </TouchableOpacity>
        </HStack>
      </Box>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0052d4" />
        </Box>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Profile card */}
          <Box style={styles.profileCard}>
            <HStack space="lg" className="items-center">
              {/* Initials/Image Avatar with camera overlay badge */}
              <TouchableOpacity
                style={styles.avatarCircle}
                activeOpacity={0.8}
                onPress={handlePickAndUploadImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#0369a1" />
                ) : getAvatarUrl(avatarUrl) ? (
                  <Image source={{ uri: getAvatarUrl(avatarUrl)! }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
                <Box style={styles.avatarBadge}>
                  <Feather name="camera" size={12} color="#fff" />
                </Box>
              </TouchableOpacity>

              <VStack style={{ flex: 1 }}>
                <Heading size="md" style={styles.nameText}>
                  {firstName} {lastName}
                </Heading>
                <Text style={styles.emailText}>{user?.email}</Text>
              </VStack>
            </HStack>
          </Box>

          {/* Inline Editable Form Details */}
          <Box style={styles.editCard}>
            <Heading size="sm" style={styles.editCardTitle}>
              Edit Personal Details
            </Heading>
            <VStack space="md">
              <InfoRow
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                maxLength={50}
              />
              <InfoRow
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                maxLength={50}
              />
              <InfoRow label="Email" value={user?.email ?? ''} />
              <InfoRow
                label="Phone"
                value={contactNo}
                onChangeText={setContactNo}
                keyboardType="phone-pad"
                maxLength={15}
              />
              <InfoRow
                label="Address"
                value={address}
                onChangeText={setAddress}
                multiline
                maxLength={250}
              />
            </VStack>
            <Button size="lg" onPress={handleSave} isDisabled={saving} style={styles.saveBtn}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ButtonText style={{ fontWeight: '700', color: 'white' }}>Save Changes</ButtonText>
              )}
            </Button>
          </Box>

          {/* Settings Options List */}
          <VStack space="sm" style={{ marginBottom: 16 }}>
            {/* Log Out */}
            <TouchableOpacity
              style={styles.menuRow}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: signOut },
                ])
              }
            >
              <HStack space="md" className="items-center" style={{ flex: 1 }}>
                <Box style={[styles.menuIconBg, { backgroundColor: '#fff5f5' }]}>
                  <Feather name="log-out" size={18} color="#dc2626" />
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Text style={[styles.menuTitle, { color: '#dc2626' }]}>Log Out</Text>
                  <Text style={styles.menuSubtitle}>Sign out from your account</Text>
                </VStack>
              </HStack>
            </TouchableOpacity>
          </VStack>

          {/* Footer version */}
          <Text style={styles.footerVersion}>PostBell v1.0.0</Text>
        </ScrollView>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0052d4',
    paddingBottom: 0,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  backBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0369a1',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0052d4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  emailText: {
    fontSize: 12,
    color: '#64748b',
  },
  viewProfileBtn: {
    backgroundColor: '#0052d4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  viewProfileText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  menuRow: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  countText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  editCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  editCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
    paddingVertical: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  saveBtn: {
    backgroundColor: '#0052d4',
    borderRadius: 12,
    marginTop: 12,
  },
  footerVersion: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
});
