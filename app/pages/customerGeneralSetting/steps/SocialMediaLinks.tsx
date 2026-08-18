import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather, FontAwesome } from '@expo/vector-icons';

interface SocialMediaLinksProps {
  data: any;
  onChange: (data: any) => void;
  errors?: Record<string, string>;
}

const SOCIAL_FIELDS = [
  {
    id: 'instagram_url',
    label: 'Instagram Profile URL',
    placeholder: 'instagram.com/yourbrand',
    icon: 'instagram',
    color: '#E4405F',
    bgColor: '#fdf2f4',
    borderColor: '#fbcfe8',
  },
  {
    id: 'facebook_url',
    label: 'Facebook Page URL',
    placeholder: 'facebook.com/yourbrand',
    icon: 'facebook-square',
    color: '#1877F2',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  {
    id: 'whatsapp_number',
    label: 'WhatsApp Business Number',
    placeholder: '+91 98765 43210',
    icon: 'whatsapp',
    color: '#25D366',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
];

export default function SocialMediaLinks({ data, onChange, errors = {} }: SocialMediaLinksProps) {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const links = data.social_links || {};

  const isValidURL = (value: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\S*)?$/;
    return pattern.test(value.trim());
  };

  const isValidPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15;
  };

  const normalizeURL = (value: string) => {
    let v = value.trim();
    if (v && !v.startsWith('http://') && !v.startsWith('https://')) {
      v = `https://${v}`;
    }
    return v;
  };

  const handleChange = (field: string, value: string) => {
    let updatedValue = value;
    let errorMsg = '';

    if (field === 'instagram_url' || field === 'facebook_url') {
      if (value && !isValidURL(value)) {
        errorMsg = 'Please enter a valid URL';
      } else {
        updatedValue = value ? normalizeURL(value) : '';
      }
    }

    if (field === 'whatsapp_number') {
      const numeric = value.replace(/[^\d+]/g, '');
      updatedValue = numeric;
      if (numeric && !isValidPhone(numeric)) {
        errorMsg = 'Enter valid WhatsApp number (7-15 digits)';
      }
    }

    setLocalErrors((prev) => ({
      ...prev,
      [field]: errorMsg,
    }));

    onChange({
      social_links: {
        ...links,
        [field]: updatedValue,
      },
    });
  };

  return (
    <VStack space="md" style={styles.container}>
      {/* Header Banner */}
      <View style={styles.bannerHeader}>
        <HStack space="md" style={{ alignItems: 'center' }}>
          <View style={styles.bannerIconBox}>
            <Feather name="link" size={22} color="#ffffff" />
          </View>
          <VStack style={{ flex: 1 }}>
            <Heading style={styles.bannerTitle}>Social Media Links</Heading>
            <Text style={styles.bannerSubtitle}>
              Add public links to your profiles for footer embeds and flyers
            </Text>
          </VStack>
        </HStack>
      </View>

      {/* Form Fields Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>PROFILE URLS</Text>
        <VStack space="md" style={{ marginTop: 8 }}>
          {SOCIAL_FIELDS.map((item) => {
            const val = links[item.id] || '';
            const errorMsg = errors?.[item.id] || localErrors?.[item.id] || '';
            const hasValue = !!val;

            return (
              <View
                key={item.id}
                style={[
                  styles.linkCard,
                  hasValue && { borderColor: item.borderColor, backgroundColor: item.bgColor },
                ]}
              >
                <HStack space="sm" style={{ alignItems: 'center', marginBottom: 6 }}>
                  <View style={[styles.miniIconBox, { backgroundColor: item.color + '20' }]}>
                    <FontAwesome name={item.icon as any} size={15} color={item.color} />
                  </View>
                  <Text style={styles.fieldLabel}>{item.label}</Text>
                </HStack>

                <View style={[styles.inputWrapper, !!errorMsg && styles.inputError]}>
                  <Feather name="link-2" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    placeholder={item.placeholder}
                    placeholderTextColor="#94a3b8"
                    value={val}
                    onChangeText={(text) => handleChange(item.id, text)}
                    autoCapitalize="none"
                    keyboardType={item.id === 'whatsapp_number' ? 'phone-pad' : 'url'}
                  />
                </View>

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
              </View>
            );
          })}
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
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  linkCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  miniIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  errorText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
  },
});
