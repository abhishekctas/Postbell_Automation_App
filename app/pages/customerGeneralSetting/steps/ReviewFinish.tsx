import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { getCompanyLogoUrl } from '../customer-setup.api';

interface ReviewFinishProps {
  data: any;
  onChange: (data: any) => void;
  onEdit: (stepIndex: number) => void;
}

export default function ReviewFinish({ data, onChange, onEdit }: ReviewFinishProps) {
  const branding = data.branding_preferences || {};
  const socialAuth = data.social_media_auth || {};
  const socialLinks = data.social_links || {};
  const aiConfig = data.ai_config || {};

  const logoPreview =
    data.company_logo_preview || (data.company_logo ? getCompanyLogoUrl(data.company_logo) : '');

  // Calculate completion percentage
  const calculateCompletion = () => {
    let count = 0;
    const total = 6;
    if (aiConfig.openai_api_key || aiConfig.gemini_api_key) count++;
    if (data.company_name?.trim()) count++;
    if (data.company_email?.trim()) count++;
    if (
      socialAuth.instagram?.connection_status === 'connected' ||
      socialAuth.facebook?.connection_status === 'connected'
    )
      count++;
    if (socialLinks.instagram_url || socialLinks.facebook_url || socialLinks.whatsapp_number)
      count++;
    if (branding.primary_color && branding.brand_tone) count++;
    return Math.round((count / total) * 100);
  };

  const completionRate = calculateCompletion();

  return (
    <VStack space="md" style={styles.container}>
      {/* Header Banner */}
      <View style={styles.bannerHeader}>
        <HStack space="md" style={{ alignItems: 'center' }}>
          <View style={styles.bannerIconBox}>
            <Feather name="check-circle" size={22} color="#ffffff" />
          </View>
          <VStack style={{ flex: 1 }}>
            <Heading style={styles.bannerTitle}>Review & Activate Workspace</Heading>
            <Text style={styles.bannerSubtitle}>
              Verify your setup configuration before saving and activating automation
            </Text>
          </VStack>
        </HStack>
      </View>

      {/* Completion Score Progress Card */}
      <View style={styles.card}>
        <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <VStack>
            <Text style={styles.progressHeading}>Setup Completion Score</Text>
            <Text style={styles.progressSubheading}>
              {completionRate === 100
                ? 'Your workspace is fully configured and ready to publish!'
                : 'Complete all sections for best automation performance.'}
            </Text>
          </VStack>
          <Text
            style={[styles.percentageText, { color: completionRate >= 80 ? '#16a34a' : '#0b53f8' }]}
          >
            {completionRate}%
          </Text>
        </HStack>

        {/* Progress Bar Track */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${completionRate}%`,
                backgroundColor: completionRate >= 80 ? '#16a34a' : '#0b53f8',
              },
            ]}
          />
        </View>
      </View>

      {/* Section 0: AI Configuration Review Card */}
      <View style={styles.card}>
        <HStack style={styles.cardHeaderRow}>
          <HStack space="xs" style={{ alignItems: 'center' }}>
            <Feather name="cpu" size={16} color="#0b53f8" />
            <Text style={styles.cardTitle}>AI Configuration</Text>
          </HStack>
          <TouchableOpacity onPress={() => onEdit(0)} style={styles.editBtn}>
            <Feather name="edit-2" size={13} color="#0b53f8" style={{ marginRight: 4 }} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </HStack>

        <VStack space="xs" style={{ marginTop: 8 }}>
          <HStack style={styles.reviewRow}>
            <Text style={styles.reviewKey}>OpenAI API Key:</Text>
            <Text style={styles.reviewVal}>
              {aiConfig.openai_api_key
                ? '••••••••••••••••' + aiConfig.openai_api_key.slice(-4)
                : 'Not configured'}
            </Text>
          </HStack>
          <HStack style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Gemini API Key:</Text>
            <Text style={styles.reviewVal}>
              {aiConfig.gemini_api_key
                ? '••••••••••••••••' + aiConfig.gemini_api_key.slice(-4)
                : 'Not configured'}
            </Text>
          </HStack>
        </VStack>
      </View>

      {/* Section 1: Company Information Review Card */}
      <View style={styles.card}>
        <HStack style={styles.cardHeaderRow}>
          <HStack space="xs" style={{ alignItems: 'center' }}>
            <Feather name="briefcase" size={16} color="#0b53f8" />
            <Text style={styles.cardTitle}>Company Information</Text>
          </HStack>
          <TouchableOpacity onPress={() => onEdit(1)} style={styles.editBtn}>
            <Feather name="edit-2" size={13} color="#0b53f8" style={{ marginRight: 4 }} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </HStack>

        <HStack space="md" style={{ marginTop: 8, alignItems: 'center' }}>
          {logoPreview ? (
            <Image source={{ uri: logoPreview }} style={styles.logoThumb} resizeMode="contain" />
          ) : (
            <View style={styles.logoThumbPlaceholder}>
              <Feather name="image" size={18} color="#94a3b8" />
            </View>
          )}

          <VStack style={{ flex: 1 }}>
            <Text style={styles.companyNameText}>{data.company_name || 'No company name'}</Text>
            <Text style={styles.companySubText}>{data.company_email || 'No email provided'}</Text>
            <Text style={styles.companySubText}>{data.company_phone || 'No phone provided'}</Text>
            {!!data.company_website && (
              <Text style={styles.companyWebText}>{data.company_website}</Text>
            )}
          </VStack>
        </HStack>
      </View>

      {/* Section 2: Social Media Auth Review Card */}
      <View style={styles.card}>
        <HStack style={styles.cardHeaderRow}>
          <HStack space="xs" style={{ alignItems: 'center' }}>
            <Feather name="shield" size={16} color="#0b53f8" />
            <Text style={styles.cardTitle}>Social Media Authorization</Text>
          </HStack>
          <TouchableOpacity onPress={() => onEdit(2)} style={styles.editBtn}>
            <Feather name="edit-2" size={13} color="#0b53f8" style={{ marginRight: 4 }} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </HStack>

        <VStack space="xs" style={{ marginTop: 8 }}>
          <HStack style={styles.reviewRow}>
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <FontAwesome name="instagram" size={14} color="#E4405F" />
              <Text style={styles.reviewKey}>Instagram:</Text>
            </HStack>
            <Text
              style={[
                styles.reviewVal,
                {
                  color:
                    socialAuth.instagram?.connection_status === 'connected' ? '#16a34a' : '#64748b',
                },
              ]}
            >
              {socialAuth.instagram?.connection_status === 'connected'
                ? `Connected (${socialAuth.instagram.connected_account_name || 'Account'})`
                : 'Disconnected'}
            </Text>
          </HStack>

          <HStack style={styles.reviewRow}>
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <FontAwesome name="facebook-square" size={14} color="#1877F2" />
              <Text style={styles.reviewKey}>Facebook:</Text>
            </HStack>
            <Text
              style={[
                styles.reviewVal,
                {
                  color:
                    socialAuth.facebook?.connection_status === 'connected' ? '#16a34a' : '#64748b',
                },
              ]}
            >
              {socialAuth.facebook?.connection_status === 'connected'
                ? `Connected (${socialAuth.facebook.connected_account_name || 'Page'})`
                : 'Disconnected'}
            </Text>
          </HStack>
        </VStack>
      </View>

      {/* Section 3: Social Media Links Review Card */}
      <View style={styles.card}>
        <HStack style={styles.cardHeaderRow}>
          <HStack space="xs" style={{ alignItems: 'center' }}>
            <Feather name="link" size={16} color="#0b53f8" />
            <Text style={styles.cardTitle}>Social Media Profile Links</Text>
          </HStack>
          <TouchableOpacity onPress={() => onEdit(3)} style={styles.editBtn}>
            <Feather name="edit-2" size={13} color="#0b53f8" style={{ marginRight: 4 }} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </HStack>

        <VStack space="xs" style={{ marginTop: 8 }}>
          <HStack style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Instagram URL:</Text>
            <Text style={styles.reviewVal} numberOfLines={1}>
              {socialLinks.instagram_url || '—'}
            </Text>
          </HStack>
          <HStack style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Facebook URL:</Text>
            <Text style={styles.reviewVal} numberOfLines={1}>
              {socialLinks.facebook_url || '—'}
            </Text>
          </HStack>
          <HStack style={styles.reviewRow}>
            <Text style={styles.reviewKey}>WhatsApp Number:</Text>
            <Text style={styles.reviewVal}>{socialLinks.whatsapp_number || '—'}</Text>
          </HStack>
        </VStack>
      </View>

      {/* Section 4: Branding Preferences Review Card */}
      <View style={styles.card}>
        <HStack style={styles.cardHeaderRow}>
          <HStack space="xs" style={{ alignItems: 'center' }}>
            <Feather name="sliders" size={16} color="#0b53f8" />
            <Text style={styles.cardTitle}>Branding Preferences</Text>
          </HStack>
          <TouchableOpacity onPress={() => onEdit(4)} style={styles.editBtn}>
            <Feather name="edit-2" size={13} color="#0b53f8" style={{ marginRight: 4 }} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </HStack>

        <VStack space="xs" style={{ marginTop: 8 }}>
          <HStack style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Color Palette:</Text>
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <View
                style={[
                  styles.miniColorDot,
                  { backgroundColor: branding.primary_color || '#0b53f8' },
                ]}
              />
              <Text style={styles.reviewVal}>{branding.primary_color || '#0b53f8'}</Text>
              <View
                style={[
                  styles.miniColorDot,
                  { backgroundColor: branding.secondary_color || '#3b82f6', marginLeft: 8 },
                ]}
              />
              <Text style={styles.reviewVal}>{branding.secondary_color || '#3b82f6'}</Text>
            </HStack>
          </HStack>

          <HStack style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Brand Tone:</Text>
            <Text style={styles.reviewVal}>{branding.brand_tone || 'Professional'}</Text>
          </HStack>

          <HStack style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Content Language:</Text>
            <Text style={styles.reviewVal}>{branding.content_language || 'English'}</Text>
          </HStack>

          <HStack style={styles.reviewRow}>
            <Text style={styles.reviewKey}>Default Hashtags:</Text>
            <Text style={styles.reviewVal} numberOfLines={1}>
              {branding.default_hashtags?.length > 0
                ? branding.default_hashtags.join(', ')
                : 'None'}
            </Text>
          </HStack>
        </VStack>
      </View>
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
  progressHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  progressSubheading: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  percentageText: {
    fontSize: 20,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0b53f8',
  },
  reviewRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  reviewKey: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  reviewVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    maxWidth: '60%',
  },
  logoThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logoThumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  companySubText: {
    fontSize: 11,
    color: '#64748b',
  },
  companyWebText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0b53f8',
  },
  miniColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
});
