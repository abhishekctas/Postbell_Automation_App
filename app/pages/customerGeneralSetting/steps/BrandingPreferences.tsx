import React, { useState, useEffect } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather } from '@expo/vector-icons';

interface BrandingPreferencesProps {
  data: any;
  onChange: (data: any) => void;
}

const COLOR_PRESETS = [
  { label: 'Royal Blue', primary: '#0b53f8', secondary: '#3b82f6' },
  { label: 'Emerald', primary: '#16a34a', secondary: '#4ade80' },
  { label: 'Ruby Red', primary: '#dc2626', secondary: '#f87171' },
  { label: 'Violet', primary: '#7c3aed', secondary: '#a78bfa' },
  { label: 'Amber Orange', primary: '#ea580c', secondary: '#fb923c' },
  { label: 'Slate Dark', primary: '#1e293b', secondary: '#64748b' },
];

const BRAND_TONES = ['Professional', 'Casual', 'Friendly', 'Creative', 'Luxury', 'Bold'];

const LANGUAGES = ['English', 'Gujarati', 'Hindi'];

export default function BrandingPreferences({ data, onChange }: BrandingPreferencesProps) {
  const branding = data.branding_preferences || {};

  const primaryColor = branding.primary_color || '#0b53f8';
  const secondaryColor = branding.secondary_color || '#3b82f6';
  const brandTone = branding.brand_tone || 'Professional';
  const contentLanguage = branding.content_language || 'English';
  const defaultHashtags: string[] = branding.default_hashtags || [];

  const [hashtagInput, setHashtagInput] = useState('');

  useEffect(() => {
    if (defaultHashtags.length > 0 && !hashtagInput) {
      setHashtagInput(defaultHashtags.join(', '));
    }
  }, []);

  const handleUpdate = (field: string, value: any) => {
    onChange({
      branding_preferences: {
        ...branding,
        [field]: value,
      },
    });
  };

  const handlePresetSelect = (preset: { primary: string; secondary: string }) => {
    onChange({
      branding_preferences: {
        ...branding,
        primary_color: preset.primary,
        secondary_color: preset.secondary,
      },
    });
  };

  const handleHashtagTextChange = (text: string) => {
    setHashtagInput(text);
    const parsed = text
      .split(/[\s,]+/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
      .map((t) => `#${t}`);

    handleUpdate('default_hashtags', parsed);
  };

  const handleRemoveHashtag = (indexToRemove: number) => {
    const updated = defaultHashtags.filter((_, idx) => idx !== indexToRemove);
    handleUpdate('default_hashtags', updated);
    setHashtagInput(updated.join(', '));
  };

  return (
    <VStack space="md" style={styles.container}>
      {/* Header Banner */}
      <View style={styles.bannerHeader}>
        <HStack space="md" style={{ alignItems: 'center' }}>
          <View style={styles.bannerIconBox}>
            <Feather name="sliders" size={22} color="#ffffff" />
          </View>
          <VStack style={{ flex: 1 }}>
            <Heading style={styles.bannerTitle}>Branding Preferences</Heading>
            <Text style={styles.bannerSubtitle}>
              Customize your brand color palette, voice tone, content language and default hashtags
            </Text>
          </VStack>
        </HStack>
      </View>

      {/* Brand Colors Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>BRAND COLORS</Text>
        <HStack space="md" style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column' }}>
          {/* Primary Color */}
          <VStack space="xs" style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Primary Color</Text>
            <HStack space="sm" style={styles.colorInputRow}>
              <View style={[styles.colorSquare, { backgroundColor: primaryColor }]} />
              <TextInput
                style={styles.colorTextInput}
                value={primaryColor}
                onChangeText={(val) => handleUpdate('primary_color', val)}
                placeholder="#0b53f8"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </HStack>
          </VStack>

          {/* Secondary Color */}
          <VStack space="xs" style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Secondary Color</Text>
            <HStack space="sm" style={styles.colorInputRow}>
              <View style={[styles.colorSquare, { backgroundColor: secondaryColor }]} />
              <TextInput
                style={styles.colorTextInput}
                value={secondaryColor}
                onChangeText={(val) => handleUpdate('secondary_color', val)}
                placeholder="#3b82f6"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </HStack>
          </VStack>
        </HStack>

        {/* Quick Color Presets */}
        <VStack space="xs" style={{ marginTop: 14 }}>
          <Text style={styles.presetHeading}>Quick Palettes:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: 4 }}
          >
            <HStack space="xs">
              {COLOR_PRESETS.map((preset) => {
                const isActive =
                  preset.primary.toLowerCase() === primaryColor.toLowerCase() &&
                  preset.secondary.toLowerCase() === secondaryColor.toLowerCase();

                return (
                  <TouchableOpacity
                    key={preset.label}
                    onPress={() => handlePresetSelect(preset)}
                    style={[styles.presetChip, isActive && styles.presetChipActive]}
                  >
                    <HStack style={styles.presetSplit}>
                      <View style={[styles.presetHalf, { backgroundColor: preset.primary }]} />
                      <View style={[styles.presetHalf, { backgroundColor: preset.secondary }]} />
                    </HStack>
                    <Text style={[styles.presetLabel, isActive && styles.presetLabelActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </HStack>
          </ScrollView>
        </VStack>
      </View>

      {/* Voice & Language Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>VOICE & CONTENT</Text>
        <VStack space="md" style={{ marginTop: 8 }}>
          {/* Brand Tone Selector */}
          <VStack space="xs">
            <Text style={styles.fieldLabel}>Brand Tone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack space="xs">
                {BRAND_TONES.map((tone) => {
                  const isSelected = brandTone.toLowerCase() === tone.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={tone}
                      onPress={() => handleUpdate('brand_tone', tone)}
                      style={[styles.optionChip, isSelected && styles.optionChipActive]}
                    >
                      <Feather
                        name={isSelected ? 'check-circle' : 'circle'}
                        size={13}
                        color={isSelected ? '#0b53f8' : '#94a3b8'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[styles.optionChipText, isSelected && styles.optionChipTextActive]}
                      >
                        {tone}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HStack>
            </ScrollView>
          </VStack>

          {/* Content Language Selector */}
          <VStack space="xs">
            <Text style={styles.fieldLabel}>Content Language</Text>
            <HStack space="xs">
              {LANGUAGES.map((lang) => {
                const isSelected = contentLanguage.toLowerCase() === lang.toLowerCase();
                return (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => handleUpdate('content_language', lang)}
                    style={[styles.langChip, isSelected && styles.langChipActive]}
                  >
                    <Feather
                      name="globe"
                      size={13}
                      color={isSelected ? '#0b53f8' : '#64748b'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.langChipText, isSelected && styles.langChipTextActive]}>
                      {lang}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </HStack>
            <Text style={styles.helperTip}>
              AI-generated posts, flyer captions, and hashtag recommendations will be generated in{' '}
              {contentLanguage}.
            </Text>
          </VStack>
        </VStack>
      </View>

      {/* Default Hashtags Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>DEFAULT HASHTAGS</Text>
        <TextInput
          style={styles.hashtagInput}
          placeholder="postbell, automation, marketing, festival"
          placeholderTextColor="#94a3b8"
          value={hashtagInput}
          onChangeText={handleHashtagTextChange}
        />

        {/* Hashtags Tag Chips */}
        {defaultHashtags.length > 0 && (
          <View style={styles.chipsContainer}>
            {defaultHashtags.map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveHashtag(idx)}
                  style={styles.tagRemoveBtn}
                >
                  <Feather name="x" size={12} color="#0b53f8" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  colorInputRow: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  colorSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorTextInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 6,
  },
  presetHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  presetChipActive: {
    borderColor: '#0b53f8',
    backgroundColor: '#eff6ff',
  },
  presetSplit: {
    width: 24,
    height: 16,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  presetHalf: {
    flex: 1,
    height: '100%',
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  presetLabelActive: {
    color: '#0b53f8',
    fontWeight: '700',
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  optionChipActive: {
    borderColor: '#0b53f8',
    backgroundColor: '#eff6ff',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  optionChipTextActive: {
    color: '#0b53f8',
    fontWeight: '700',
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  langChipActive: {
    borderColor: '#0b53f8',
    backgroundColor: '#eff6ff',
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  langChipTextActive: {
    color: '#0b53f8',
    fontWeight: '700',
  },
  helperTip: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  hashtagInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0b53f8',
    marginRight: 6,
  },
  tagRemoveBtn: {
    padding: 2,
  },
});
