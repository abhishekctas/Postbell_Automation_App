import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather } from '@expo/vector-icons';
import { fetchWithAuth, API_BASE_URL } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';

export interface LogoVariation {
  id: string;
  label: string;
  filename: string;
  preview_url: string;
}

export interface GenerationParams {
  companyName: string;
  tagline: string;
  industry: string;
  style: string;
  colors: string;
}

export interface AiLogoGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onLogoSelected: (filename: string, previewUrl: string) => void;
  initialCompanyName?: string;
}

const STYLE_OPTIONS = [
  { value: 'modern', label: 'Modern', emoji: '✦' },
  { value: 'minimal', label: 'Minimal', emoji: '○' },
  { value: 'luxury', label: 'Luxury', emoji: '◆' },
  { value: 'tech', label: 'Tech', emoji: '⬡' },
  { value: 'bold', label: 'Bold', emoji: '▲' },
  { value: 'classic', label: 'Classic', emoji: '◎' },
  { value: 'playful', label: 'Playful', emoji: '★' },
  { value: 'elegant', label: 'Elegant', emoji: '∞' },
];

const GENERATION_STEPS = [
  'Analyzing your brand details…',
  'Crafting design concepts…',
  'Generating logo variations…',
  'Finalizing artwork…',
];

export default function AiLogoGeneratorModal({
  open,
  onClose,
  onLogoSelected,
  initialCompanyName = '',
}: AiLogoGeneratorModalProps) {
  const uploadBaseUrl = API_BASE_URL.replace(/\/v1$/, '');

  const [params, setParams] = useState<GenerationParams>({
    companyName: initialCompanyName,
    tagline: '',
    industry: '',
    style: 'modern',
    colors: '',
  });

  const [variations, setVariations] = useState<LogoVariation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastPromptParams, setLastPromptParams] = useState<GenerationParams | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingVariation, setViewingVariation] = useState<LogoVariation | null>(null);

  // Sync initial company name
  useEffect(() => {
    if (initialCompanyName && !params.companyName) {
      setParams((prev) => ({ ...prev, companyName: initialCompanyName }));
    }
  }, [initialCompanyName]);

  // Generation step animation
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setGenerationStep(0);
      interval = setInterval(() => {
        setGenerationStep((prev) => (prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev));
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  const handleChange = useCallback((field: keyof GenerationParams, value: string) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleGenerate = async () => {
    if (!params.companyName.trim()) {
      setError('Company name is required to generate a logo');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setWarnings([]);
    setSelectedId(null);

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/logo-generate/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to generate logos');
      }

      const generatedVariations: LogoVariation[] = response.data.map((item: any) => ({
        id: item.id,
        label: item.label,
        filename: item.filename,
        preview_url: `${uploadBaseUrl}${item.preview_url}`,
      }));

      setVariations(generatedVariations);
      setSelectedId(generatedVariations[0]?.id || null);
      setLastPromptParams({ ...params });
      setHasGenerated(true);

      if (response.warnings && response.warnings.length > 0) {
        setWarnings(response.warnings);
      }
    } catch (err: any) {
      setError(
        err?.message || 'Error generating logos. Please check AI credentials and try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateSingle = async (variationId: string) => {
    const target = variations.find((v) => v.id === variationId);
    if (!target) return;

    setRegeneratingId(variationId);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/logo-generate/regenerate-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: params.companyName,
          tagline: params.tagline,
          industry: params.industry,
          style: params.style,
          colors: params.colors,
          label: target.label,
        }),
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to regenerate variation');
      }

      const updated = {
        ...target,
        filename: response.data.filename,
        preview_url: `${uploadBaseUrl}${response.data.preview_url}`,
      };

      setVariations((prev) => prev.map((v) => (v.id === variationId ? updated : v)));
      if (selectedId === variationId) {
        setSelectedId(updated.id);
      }
    } catch (err: any) {
      Alert.alert('Regeneration Notice', err.message || 'Could not regenerate this variation');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleUseSelected = () => {
    const selected = variations.find((v) => v.id === selectedId);
    if (!selected) return;
    onLogoSelected(selected.filename, selected.preview_url);
    onClose();
  };

  const handleOpenViewer = (variation: LogoVariation) => {
    setViewingVariation(variation);
    setViewerOpen(true);
  };

  const selectedVariation = variations.find((v) => v.id === selectedId);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#193867', '#0b53f8', '#2563eb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Header */}
            <HStack style={styles.header}>
              <HStack space="sm" style={{ alignItems: 'center', flex: 1 }}>
                <View style={styles.iconCircle}>
                  <Feather name="zap" size={20} color="#0b53f8" />
                </View>
                <VStack style={{ flex: 1 }}>
                  <Heading style={styles.title}>AI Logo Generator</Heading>
                  <Text style={styles.subtitle}>
                    Describe your brand to generate tailored, multi-concept logos
                  </Text>
                </VStack>
              </HStack>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </HStack>
          </LinearGradient>

          {/* Body */}
          <ScrollView
            contentContainerStyle={styles.bodyScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error Notification */}
            {error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={16} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <View style={styles.warningBox}>
                <Feather name="alert-triangle" size={16} color="#d97706" />
                <VStack style={{ flex: 1 }}>
                  {warnings.map((w, idx) => (
                    <Text key={idx} style={styles.warningText}>
                      {w}
                    </Text>
                  ))}
                </VStack>
              </View>
            )}

            {/* Prompt Config Card */}
            <View style={styles.formCard}>
              <Text style={styles.sectionHeader}>BRAND DETAILS</Text>

              <VStack space="md">
                {/* Company Name */}
                <VStack space="xs">
                  <HStack style={{ alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>Company / Brand Name</Text>
                    <Text style={{ color: '#dc2626', fontSize: 13 }}> *</Text>
                  </HStack>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Nexus Dynamics"
                    placeholderTextColor="#94a3b8"
                    value={params.companyName}
                    onChangeText={(val) => handleChange('companyName', val)}
                  />
                </VStack>

                {/* Tagline & Industry */}
                <HStack
                  space="md"
                  style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column' }}
                >
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Tagline (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Empowering Tomorrow"
                      placeholderTextColor="#94a3b8"
                      value={params.tagline}
                      onChangeText={(val) => handleChange('tagline', val)}
                    />
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Industry / Niche</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Fintech, SaaS, Health"
                      placeholderTextColor="#94a3b8"
                      value={params.industry}
                      onChangeText={(val) => handleChange('industry', val)}
                    />
                  </VStack>
                </HStack>

                {/* Colors */}
                <VStack space="xs">
                  <Text style={styles.fieldLabel}>Preferred Colors</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Deep Blue and Emerald Green"
                    placeholderTextColor="#94a3b8"
                    value={params.colors}
                    onChangeText={(val) => handleChange('colors', val)}
                  />
                </VStack>

                {/* Style Selector */}
                <VStack space="xs">
                  <Text style={styles.fieldLabel}>Design Aesthetic</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginVertical: 4 }}
                  >
                    <HStack space="xs">
                      {STYLE_OPTIONS.map((opt) => {
                        const isSelected = params.style === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            onPress={() => handleChange('style', opt.value)}
                            style={[styles.styleChip, isSelected && styles.styleChipActive]}
                          >
                            <Text style={[styles.styleEmoji, isSelected && { color: '#0b53f8' }]}>
                              {opt.emoji}
                            </Text>
                            <Text
                              style={[styles.styleLabel, isSelected && styles.styleLabelActive]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </HStack>
                  </ScrollView>
                </VStack>
              </VStack>

              {/* Generate Button */}
              <TouchableOpacity
                onPress={handleGenerate}
                disabled={isGenerating}
                style={[styles.generateBtn, isGenerating && { opacity: 0.7 }]}
                activeOpacity={0.8}
              >
                {isGenerating ? (
                  <HStack space="sm" style={{ alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.generateBtnText}>
                      {GENERATION_STEPS[generationStep] || 'Generating…'}
                    </Text>
                  </HStack>
                ) : (
                  <HStack space="sm" style={{ alignItems: 'center' }}>
                    <Feather name="zap" size={16} color="#ffffff" />
                    <Text style={styles.generateBtnText}>
                      {hasGenerated ? 'Re-generate All Concepts' : 'Generate Logo Concepts'}
                    </Text>
                  </HStack>
                )}
              </TouchableOpacity>
            </View>

            {/* Generated Results Section */}
            {variations.length > 0 && (
              <VStack space="md" style={styles.resultsCard}>
                <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <VStack>
                    <Text style={styles.resultsTitle}>Generated Variations</Text>
                    <Text style={styles.resultsSubtitle}>
                      Select your favorite design or zoom in to inspect details
                    </Text>
                  </VStack>
                  <Text style={styles.badgeCount}>{variations.length} concepts</Text>
                </HStack>

                {/* Variation Cards Grid */}
                <View style={styles.grid}>
                  {variations.map((variation) => {
                    const isSelected = selectedId === variation.id;
                    const isRegeneratingThis = regeneratingId === variation.id;

                    return (
                      <View
                        key={variation.id}
                        style={[styles.variationCard, isSelected && styles.variationCardActive]}
                      >
                        {/* Image Preview Container */}
                        <TouchableOpacity
                          onPress={() => setSelectedId(variation.id)}
                          activeOpacity={0.9}
                          style={styles.cardImageTouch}
                        >
                          {isRegeneratingThis ? (
                            <View style={styles.loadingBox}>
                              <ActivityIndicator size="small" color="#0b53f8" />
                              <Text style={styles.loadingText}>Regenerating…</Text>
                            </View>
                          ) : (
                            <Image
                              source={{ uri: variation.preview_url }}
                              style={styles.previewImage}
                              resizeMode="contain"
                            />
                          )}

                          {isSelected && (
                            <View style={styles.selectedBadge}>
                              <Feather name="check" size={14} color="#ffffff" />
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* Card Info & Actions */}
                        <HStack style={styles.variationFooter}>
                          <Text style={styles.variationLabel} numberOfLines={1}>
                            {variation.label}
                          </Text>
                          <HStack space="xs">
                            <TouchableOpacity
                              onPress={() => handleOpenViewer(variation)}
                              style={styles.actionIconBtn}
                            >
                              <Feather name="maximize-2" size={14} color="#64748b" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRegenerateSingle(variation.id)}
                              disabled={isRegeneratingThis}
                              style={styles.actionIconBtn}
                            >
                              <Feather name="refresh-cw" size={14} color="#64748b" />
                            </TouchableOpacity>
                          </HStack>
                        </HStack>
                      </View>
                    );
                  })}
                </View>
              </VStack>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <HStack style={styles.modalFooter}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleUseSelected}
              disabled={!selectedVariation || isGenerating}
              style={[styles.selectBtn, (!selectedVariation || isGenerating) && { opacity: 0.5 }]}
            >
              <Feather name="check-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.selectBtnText}>Use Selected Logo</Text>
            </TouchableOpacity>
          </HStack>
        </View>
      </View>

      {/* Image Zoom Modal */}
      {viewerOpen && viewingVariation && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
          <View style={styles.viewerOverlay}>
            <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerOpen(false)}>
              <Feather name="x" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Image
              source={{ uri: viewingVariation.preview_url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <Text style={styles.fullImageLabel}>{viewingVariation.label}</Text>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 24 : 12,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 720,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#d1d5db',
    lineHeight: 19,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  bodyScroll: {
    padding: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  styleChipActive: {
    borderColor: '#0b53f8',
    backgroundColor: '#eff6ff',
  },
  styleEmoji: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 6,
  },
  styleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  styleLabelActive: {
    color: '#0b53f8',
    fontWeight: '700',
  },
  generateBtn: {
    backgroundColor: '#0b53f8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#0b53f8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  generateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultsSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badgeCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0b53f8',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  variationCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 200 : '45%',
    maxWidth: Platform.OS === 'web' ? '48%' : '100%',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  variationCardActive: {
    borderColor: '#0b53f8',
    backgroundColor: '#ffffff',
    shadowColor: '#0b53f8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  cardImageTouch: {
    height: 140,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    position: 'relative',
    padding: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loadingText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0b53f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  variationFooter: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
  },
  variationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    justifyContent: 'flex-end',
    gap: 10,
    backgroundColor: '#ffffff',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b53f8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  viewerClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  fullImage: {
    width: '90%',
    height: '70%',
  },
  fullImageLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
});
