import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AiLogoGeneratorModal from './AiLogoGenerate';
import { getCompanyLogoUrl } from '../customer-setup.api';

interface CompanyInformationProps {
  data: any;
  onChange: (data: any) => void;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
  onTouch?: (field: string) => void;
}

export default function CompanyInformation({
  data,
  onChange,
  errors = {},
  touched = {},
  onTouch,
}: CompanyInformationProps) {
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const handleChange = (field: string, value: any) => {
    onChange({ [field]: value });
  };

  const handlePickLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Permission to access your gallery is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        handleChange('company_logo', uri);
        handleChange('company_logo_preview', asset.uri);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to select image from gallery.');
    }
  };

  const handleRemoveLogo = () => {
    handleChange('company_logo', '');
    handleChange('company_logo_preview', '');
  };

  const handleAiLogoSelected = (filename: string, previewUrl: string) => {
    handleChange('company_logo', filename);
    handleChange('company_logo_preview', previewUrl);
  };

  const logoPreview =
    data.company_logo_preview || (data.company_logo ? getCompanyLogoUrl(data.company_logo) : '');

  return (
    <VStack space="md" style={styles.container}>
      {/* Header Banner */}
      <View style={styles.bannerHeader}>
        <HStack space="md" style={{ alignItems: 'center' }}>
          <View style={styles.bannerIconBox}>
            <Feather name="briefcase" size={22} color="#ffffff" />
          </View>
          <VStack style={{ flex: 1 }}>
            <Heading style={styles.bannerTitle}>Company Information</Heading>
            <Text style={styles.bannerSubtitle}>
              Configure your core business details and official brand logo
            </Text>
          </VStack>
        </HStack>
      </View>

      {/* Logo Section Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>COMPANY LOGO</Text>
        <Text style={styles.sectionSubtitle}>
          Upload your company logo or generate one with AI. Recommended: 400×400px PNG or SVG.
        </Text>

        <HStack space="md" style={styles.logoRow}>
          {/* Logo Avatar Box */}
          <View style={styles.avatarBox}>
            {logoPreview ? (
              <Image source={{ uri: logoPreview }} style={styles.avatarImg} resizeMode="contain" />
            ) : (
              <Feather name="image" size={32} color="#94a3b8" />
            )}
          </View>

          {/* Logo Action Buttons */}
          <VStack space="xs" style={{ flex: 1, justifyContent: 'center' }}>
            <HStack space="xs" style={{ flexWrap: 'wrap' }}>
              <TouchableOpacity onPress={handlePickLogo} style={styles.uploadBtn}>
                <Feather name="upload-cloud" size={14} color="#334155" style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>Upload Logo</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setAiModalOpen(true)} style={styles.aiGenerateBtn}>
                <Feather name="zap" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.aiGenerateBtnText}>Generate with AI</Text>
              </TouchableOpacity>

              {!!logoPreview && (
                <TouchableOpacity onPress={handleRemoveLogo} style={styles.removeBtn}>
                  <Feather name="trash-2" size={14} color="#dc2626" />
                </TouchableOpacity>
              )}
            </HStack>
            <Text style={styles.logoTipText}>Supported formats: PNG, JPG, WebP, SVG (Max 5MB)</Text>
          </VStack>
        </HStack>
      </View>

      {/* Business Details Form Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>BUSINESS DETAILS</Text>

        <VStack space="md" style={{ marginTop: 12 }}>
          {/* Company Name */}
          <VStack space="xs">
            <HStack style={{ alignItems: 'center' }}>
              <Text style={styles.label}>Company Name</Text>
              <Text style={{ color: '#dc2626', fontSize: 13 }}> *</Text>
            </HStack>
            <View style={[styles.inputContainer, !!errors?.company_name && styles.inputError]}>
              <Feather name="briefcase" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="Acme Corporation"
                placeholderTextColor="#94a3b8"
                value={data.company_name || ''}
                onChangeText={(val) => handleChange('company_name', val)}
                onBlur={() => onTouch?.('company_name')}
              />
            </View>
            {errors?.company_name && <Text style={styles.errorText}>{errors.company_name}</Text>}
          </VStack>

          {/* Website */}
          <VStack space="xs">
            <Text style={styles.label}>Company Website</Text>
            <View style={[styles.inputContainer, !!errors?.company_website && styles.inputError]}>
              <Feather name="globe" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="www.example.com"
                placeholderTextColor="#94a3b8"
                value={data.company_website || ''}
                onChangeText={(val) => handleChange('company_website', val)}
                onBlur={() => {
                  let val = (data.company_website || '').trim();
                  if (val && !/^https?:\/\//i.test(val) && !val.startsWith('www.')) {
                    val = `www.${val}`;
                  }
                  handleChange('company_website', val);
                  onTouch?.('company_website');
                }}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            {errors?.company_website && (
              <Text style={styles.errorText}>{errors.company_website}</Text>
            )}
          </VStack>

          {/* Email */}
          <VStack space="xs">
            <HStack style={{ alignItems: 'center' }}>
              <Text style={styles.label}>Company Email</Text>
              <Text style={{ color: '#dc2626', fontSize: 13 }}> *</Text>
            </HStack>
            <View style={[styles.inputContainer, !!errors?.company_email && styles.inputError]}>
              <Feather name="mail" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="hello@example.com"
                placeholderTextColor="#94a3b8"
                value={data.company_email || ''}
                onChangeText={(val) => handleChange('company_email', val)}
                onBlur={() => onTouch?.('company_email')}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            {errors?.company_email && <Text style={styles.errorText}>{errors.company_email}</Text>}
          </VStack>

          {/* Phone */}
          <VStack space="xs">
            <Text style={styles.label}>Company Phone</Text>
            <View style={[styles.inputContainer, !!errors?.company_phone && styles.inputError]}>
              <Feather name="phone" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                placeholder="+91 98765 43210"
                placeholderTextColor="#94a3b8"
                value={data.company_phone || ''}
                onChangeText={(val) => handleChange('company_phone', val)}
                onBlur={() => onTouch?.('company_phone')}
                keyboardType="phone-pad"
              />
            </View>
            {errors?.company_phone && <Text style={styles.errorText}>{errors.company_phone}</Text>}
          </VStack>
        </VStack>

        {/* Feature Badges Footer */}
        <HStack space="xs" style={styles.badgesFooter}>
          <View style={[styles.badge, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <Text style={[styles.badgeText, { color: '#1d4ed8' }]}>✦ Professional Branding</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Text style={[styles.badgeText, { color: '#15803d' }]}>✦ AI Logo Support</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}>
            <Text style={[styles.badgeText, { color: '#7e22ce' }]}>✦ Company Identity</Text>
          </View>
        </HStack>
      </View>

      {/* AI Logo Generator Modal */}
      <AiLogoGeneratorModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onLogoSelected={handleAiLogoSelected}
        initialCompanyName={data.company_name || ''}
      />
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
    paddingHorizontal: 16,
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
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  logoRow: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 12,
  },
  avatarBox: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 6,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  aiGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b53f8',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  aiGenerateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoTipText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 17,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  errorText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
    marginLeft: 2,
  },
  badgesFooter: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
