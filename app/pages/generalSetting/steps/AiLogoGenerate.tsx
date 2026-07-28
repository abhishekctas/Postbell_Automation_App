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
  Linking,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather } from '@expo/vector-icons';
import { fetchWithAuth, API_BASE_URL } from '@/services/api';

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
    if (!isGenerating) {
      setGenerationStep(0);
      return;
    }
    const interval = setInterval(() => {
      setGenerationStep((prev) => (prev + 1) % GENERATION_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleParamChange = (field: keyof GenerationParams, value: string) => {
    setParams((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validate = (): string | null => {
    if (!params.companyName.trim()) return 'Company name is required.';
    if (params.companyName.trim().length < 2) return 'Company name must be at least 2 characters.';
    return null;
  };

  const getLogoFullUrl = (variation: LogoVariation): string => {
    if (variation.preview_url) {
      if (variation.preview_url.startsWith('http')) return variation.preview_url;
      const leadingSlash = variation.preview_url.startsWith('/') ? '' : '/';
      return `${uploadBaseUrl}${leadingSlash}${variation.preview_url}`;
    }
    return `${uploadBaseUrl}/company-logos/${variation.filename}`;
  };

  const handleGenerate = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setWarnings([]);
    setVariations([]);
    setSelectedId(null);

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/ai-logo/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: params.companyName.trim(),
          tagline: params.tagline.trim(),
          industry: params.industry.trim(),
          style: params.style,
          colors: params.colors.trim(),
          variationsCount: 3,
        }),
      });

      if (
        response?.code >= 400 ||
        response?.success === false ||
        response?.message === 'Internal Server Error'
      ) {
        throw new Error(response?.message || response?.error || 'Failed to generate logos.');
      }

      const responseData = response?.data || response;
      const newVariations = responseData?.variations || responseData?.data?.variations || [];
      const newWarnings = responseData?.warnings || responseData?.data?.warnings || [];

      if (!newVariations.length) {
        throw new Error(
          response?.message || responseData?.message || 'No logo variations generated.'
        );
      }

      setVariations(newVariations);
      setWarnings(newWarnings);
      setLastPromptParams({ ...params });
      setHasGenerated(true);
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to generate logos.';
      setError(backendMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [params, uploadBaseUrl]);

  const handleRegenerate = useCallback(
    async (variationId: string, oldFilename: string) => {
      const sourceParams = lastPromptParams || params;
      setRegeneratingId(variationId);
      setError(null);

      try {
        const response = await fetchWithAuth(`${API_BASE_URL}/ai-logo/regenerate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldFilename,
            companyName: sourceParams.companyName.trim(),
            tagline: sourceParams.tagline.trim(),
            industry: sourceParams.industry.trim(),
            style: sourceParams.style,
            colors: sourceParams.colors.trim(),
            variationIndex: variations.findIndex((v) => v.id === variationId),
          }),
        });

        const responseData = response?.data || response;
        const filename = responseData?.filename || responseData?.data?.filename;
        const preview_url = responseData?.preview_url || responseData?.data?.preview_url;

        if (filename) {
          setVariations((prev) =>
            prev.map((v) =>
              v.id === variationId
                ? { ...v, filename, preview_url: preview_url || v.preview_url }
                : v
            )
          );
        }

        if (selectedId === variationId) setSelectedId(null);
      } catch (err: any) {
        const backendMessage =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to regenerate logo.';
        setError(
          typeof backendMessage === 'string'
            ? backendMessage
            : JSON.stringify(backendMessage, null, 2)
        );
      } finally {
        setRegeneratingId(null);
      }
    },
    [params, lastPromptParams, variations, selectedId]
  );

  const handleRegenerateAll = () => {
    setHasGenerated(false);
    handleGenerate();
  };

  const handleDownload = async (filename: string, label: string) => {
    try {
      const fullUrl = `${uploadBaseUrl}/company-logos/${filename}`;
      if (Platform.OS === 'web') {
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${params.companyName.toLowerCase().replace(/\s+/g, '-')}-${label.toLowerCase()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        await Linking.openURL(fullUrl);
      }
    } catch {
      Alert.alert('Error', 'Failed to download the logo. Please try again.');
    }
  };

  const openViewer = (variation: LogoVariation) => {
    setViewingVariation(variation);
    setViewerOpen(true);
  };

  const handleConfirmSelection = async () => {
    const selected = variations.find((v) => v.id === selectedId);
    if (!selected) return;

    const toDelete = variations
      .filter((v) => v.id !== selectedId && v.filename.startsWith('ai-logo-'))
      .map((v) => v.filename);

    if (toDelete.length > 0) {
      try {
        await fetchWithAuth(`${API_BASE_URL}/ai-logo/cleanup`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filenames: toDelete }),
        });
      } catch (error) {
        console.error('Failed to cleanup unused logos:', error);
      }
    }

    const previewUrl = getLogoFullUrl(selected);
    onLogoSelected(selected.filename, previewUrl);
    onClose();
  };

  const handleClose = () => {
    if (variations.length > 0 && !selectedId) {
      const toDelete = variations
        .filter((v) => v.filename.startsWith('ai-logo-'))
        .map((v) => v.filename);

      if (toDelete.length > 0) {
        fetchWithAuth(`${API_BASE_URL}/ai-logo/cleanup`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filenames: toDelete }),
        }).catch(() => {});
      }
    }
    onClose();
  };

  const isFormValid = params.companyName.trim().length >= 2;

  if (!open) return null;

  return (
    <>
      <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.modalBackdrop}>
          <Box style={styles.modalContent}>
            {/* Header */}
            <HStack style={styles.modalHeader}>
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Box style={styles.iconCircle}>
                  <Feather name="zap" size={18} color="#ffffff" />
                </Box>
                <VStack>
                  <Heading style={styles.modalTitle}>Generate Logo with AI</Heading>
                  <Text style={styles.modalSubtitle}>
                    Create professional logo variations instantly
                  </Text>
                </VStack>
              </HStack>
              <TouchableOpacity onPress={handleClose} activeOpacity={0.8} style={styles.closeBtn}>
                <Feather name="x" size={20} color="#ffffff" />
              </TouchableOpacity>
            </HStack>

            {/* Progress indicator */}
            {isGenerating && (
              <Box style={styles.progressBarBg}>
                <Box style={styles.progressBarFill} />
              </Box>
            )}

            {/* Modal Body */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 520, padding: 16 }}
            >
              <VStack space="md" style={{ paddingBottom: 16 }}>
                <Text style={styles.sectionHeading}>Brand Details</Text>

                {/* Field 1: Company Name */}
                <VStack space="xs">
                  <Text style={styles.label}>Company Name *</Text>
                  <HStack style={styles.inputContainer}>
                    <Feather
                      name="briefcase"
                      size={16}
                      color="#9ca3af"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={styles.input}
                      value={params.companyName}
                      onChangeText={(val) => handleParamChange('companyName', val)}
                      placeholder="e.g. Acme Corporation"
                      placeholderTextColor="#9ca3af"
                    />
                  </HStack>
                </VStack>

                {/* Field 2: Tagline */}
                <VStack space="xs">
                  <Text style={styles.label}>Tagline (optional)</Text>
                  <TextInput
                    style={styles.inputSolo}
                    value={params.tagline}
                    onChangeText={(val) => handleParamChange('tagline', val)}
                    placeholder="e.g. Innovating the Future"
                    placeholderTextColor="#9ca3af"
                  />
                </VStack>

                {/* Field 3: Industry */}
                <VStack space="xs">
                  <Text style={styles.label}>Industry / Business Category</Text>
                  <HStack style={styles.inputContainer}>
                    <Feather name="grid" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.input}
                      value={params.industry}
                      onChangeText={(val) => handleParamChange('industry', val)}
                      placeholder="e.g. Technology, Retail, Healthcare"
                      placeholderTextColor="#9ca3af"
                    />
                  </HStack>
                </VStack>

                {/* Field 4: Preferred Colors */}
                <VStack space="xs">
                  <Text style={styles.label}>Preferred Colors (optional)</Text>
                  <HStack style={styles.inputContainer}>
                    <Feather name="droplet" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.input}
                      value={params.colors}
                      onChangeText={(val) => handleParamChange('colors', val)}
                      placeholder="e.g. Blue and Gold, Emerald Green"
                      placeholderTextColor="#9ca3af"
                    />
                  </HStack>
                </VStack>

                {/* Field 5: Logo Style Chips */}
                <VStack space="xs">
                  <Text style={styles.styleLabel}>LOGO STYLE</Text>
                  <HStack style={{ flexWrap: 'wrap', gap: 6 }}>
                    {STYLE_OPTIONS.map((opt) => {
                      const isSelected = params.style === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => handleParamChange('style', opt.value)}
                          style={[
                            styles.chip,
                            isSelected ? styles.chipSelected : styles.chipUnselected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                            ]}
                          >
                            {opt.emoji} {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </HStack>
                </VStack>

                {/* Generated Variations Section */}
                <VStack space="xs" style={{ marginTop: 12 }}>
                  <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.sectionHeading}>Generated Variations</Text>
                    {hasGenerated && (
                      <TouchableOpacity
                        onPress={handleRegenerateAll}
                        disabled={isGenerating || !!regeneratingId}
                        style={styles.regenerateAllBtn}
                      >
                        <Feather
                          name="refresh-cw"
                          size={12}
                          color="#0b53f8"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.regenerateAllBtnText}>Regenerate All</Text>
                      </TouchableOpacity>
                    )}
                  </HStack>

                  {/* Error Alert */}
                  {error && (
                    <Box style={styles.errorAlert}>
                      <HStack style={{ alignItems: 'center' }} space="xs">
                        <Feather name="alert-circle" size={16} color="#dc2626" />
                        <Text style={styles.errorAlertText}>{error}</Text>
                      </HStack>
                    </Box>
                  )}

                  {/* Warnings Alert */}
                  {warnings.length > 0 && (
                    <Box style={styles.warningAlert}>
                      <Text style={styles.warningAlertText}>{warnings.join('; ')}</Text>
                    </Box>
                  )}

                  {/* Loading State */}
                  {isGenerating && (
                    <VStack space="md" style={{ marginTop: 10 }}>
                      <Box style={styles.stepProgressBox}>
                        <HStack style={{ alignItems: 'center' }} space="xs">
                          <ActivityIndicator size="small" color="#0b53f8" />
                          <Text style={styles.stepProgressText}>
                            {GENERATION_STEPS[generationStep]}
                          </Text>
                        </HStack>
                      </Box>
                      <HStack space="sm" style={{ justifyContent: 'space-between' }}>
                        {[1, 2, 3].map((i) => (
                          <Box key={i} style={styles.skeletonCard}>
                            <ActivityIndicator size="small" color="#94a3b8" />
                          </Box>
                        ))}
                      </HStack>
                    </VStack>
                  )}

                  {/* Variations Display */}
                  {!isGenerating && variations.length > 0 && (
                    <VStack space="sm" style={{ marginTop: 8 }}>
                      {variations.map((variation) => {
                        const isSelected = selectedId === variation.id;
                        const isRegeneratingThis = regeneratingId === variation.id;
                        const fullUrl = getLogoFullUrl(variation);

                        return (
                          <Box
                            key={variation.id}
                            style={[styles.logoCard, isSelected && styles.logoCardSelected]}
                          >
                            {isSelected && (
                              <Box style={styles.selectedBadge}>
                                <Feather name="check" size={14} color="#ffffff" />
                              </Box>
                            )}

                            <Box style={styles.logoImageContainer}>
                              {isRegeneratingThis ? (
                                <VStack style={{ alignItems: 'center' }}>
                                  <ActivityIndicator size="small" color="#0b53f8" />
                                  <Text style={styles.regeneratingText}>Regenerating…</Text>
                                </VStack>
                              ) : (
                                <Image
                                  source={{ uri: fullUrl }}
                                  style={styles.logoImage}
                                  resizeMode="contain"
                                />
                              )}
                            </Box>

                            <Box style={{ padding: 10, alignItems: 'center' }}>
                              <Text style={styles.variationLabel}>{variation.label}</Text>
                            </Box>

                            <HStack style={styles.logoCardActions} space="xs">
                              <TouchableOpacity
                                style={[
                                  styles.useLogoBtn,
                                  isSelected ? styles.useLogoBtnActive : styles.useLogoBtnInactive,
                                ]}
                                onPress={() => setSelectedId(variation.id)}
                                disabled={isRegeneratingThis}
                              >
                                <Text
                                  style={[
                                    styles.useLogoBtnText,
                                    isSelected
                                      ? styles.useLogoBtnTextActive
                                      : styles.useLogoBtnTextInactive,
                                  ]}
                                >
                                  {isSelected ? '✓ Selected' : 'Use This Logo'}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.iconActionBtn}
                                onPress={() => openViewer(variation)}
                                disabled={isRegeneratingThis}
                              >
                                <Feather name="eye" size={15} color="#475569" />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.iconActionBtn}
                                onPress={() => handleDownload(variation.filename, variation.label)}
                                disabled={isRegeneratingThis}
                              >
                                <Feather name="download" size={15} color="#475569" />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.iconActionBtn}
                                onPress={() => handleRegenerate(variation.id, variation.filename)}
                                disabled={isRegeneratingThis}
                              >
                                <Feather name="refresh-cw" size={15} color="#475569" />
                              </TouchableOpacity>
                            </HStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  )}

                  {/* Empty State */}
                  {!isGenerating && !hasGenerated && (
                    <Box style={styles.emptyStateBox}>
                      <Feather name="zap" size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
                      <Heading style={styles.emptyStateTitle}>
                        Your AI logos will appear here
                      </Heading>
                      <Text style={styles.emptyStateSub}>Fill the details and click Generate</Text>
                    </Box>
                  )}
                </VStack>
              </VStack>
            </ScrollView>

            {/* Modal Footer */}
            <HStack style={styles.modalFooter} space="sm">
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.generateBtn,
                  (!isFormValid || isGenerating || !!regeneratingId) && styles.btnDisabled,
                ]}
                onPress={hasGenerated ? handleRegenerateAll : handleGenerate}
                disabled={!isFormValid || isGenerating || !!regeneratingId}
                activeOpacity={0.8}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <HStack style={{ alignItems: 'center' }}>
                    <Feather name="zap" size={15} color="blue" style={{ marginRight: 6 }} />
                    <Text style={styles.generateBtnText}>
                      {hasGenerated ? 'Regenerate All' : 'Generate Logos'}
                    </Text>
                  </HStack>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  (!selectedId || isGenerating || !!regeneratingId) && styles.btnDisabled,
                ]}
                onPress={handleConfirmSelection}
                disabled={!selectedId || isGenerating || !!regeneratingId}
                activeOpacity={0.8}
              >
                <HStack style={{ alignItems: 'center' }}>
                  <Feather
                    name="check-circle"
                    size={15}
                    color="#ffffff"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.confirmBtnText}>Use Selected Logo</Text>
                </HStack>
              </TouchableOpacity>
            </HStack>
          </Box>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      {viewerOpen && viewingVariation && (
        <Modal
          visible={viewerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <Box style={styles.viewerContent}>
              <HStack style={styles.viewerHeader}>
                <Heading style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>
                  {viewingVariation.label}
                </Heading>
                <TouchableOpacity onPress={() => setViewerOpen(false)}>
                  <Feather name="x" size={20} color="#64748b" />
                </TouchableOpacity>
              </HStack>

              <Box style={styles.viewerImageContainer}>
                <Image
                  source={{ uri: getLogoFullUrl(viewingVariation) }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              </Box>

              <HStack style={styles.viewerFooter}>
                <TouchableOpacity
                  style={styles.viewerDownloadBtn}
                  onPress={() => handleDownload(viewingVariation.filename, viewingVariation.label)}
                >
                  <Feather name="download" size={14} color="#0b53f8" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0b53f8' }}>
                    Download Logo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewerCloseBtn}
                  onPress={() => setViewerOpen(false)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#ffffff' }}>Close</Text>
                </TouchableOpacity>
              </HStack>
            </Box>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 680,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    backgroundColor: '#193867',
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  closeBtn: {
    padding: 4,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: '#e2e8f0',
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0b53f8',
    width: '60%',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  styleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inputContainer: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: '#0f172a',
  },
  inputSolo: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0f172a',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: '#0b53f8',
    borderColor: '#0b53f8',
  },
  chipUnselected: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  chipTextUnselected: {
    color: '#475569',
  },
  regenerateAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  regenerateAllBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0b53f8',
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  errorAlertText: {
    fontSize: 12,
    color: '#dc2626',
    flex: 1,
  },
  warningAlert: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  warningAlertText: {
    fontSize: 12,
    color: '#d97706',
  },
  stepProgressBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  stepProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0b53f8',
  },
  skeletonCard: {
    flex: 1,
    height: 140,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCard: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  logoCardSelected: {
    borderColor: '#0b53f8',
    backgroundColor: '#f8fafc',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: '#0b53f8',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImageContainer: {
    height: 180,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  regeneratingText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
  },
  variationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  logoCardActions: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  useLogoBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  useLogoBtnActive: {
    backgroundColor: '#0b53f8',
    borderColor: '#0b53f8',
  },
  useLogoBtnInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#0b53f8',
  },
  useLogoBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  useLogoBtnTextActive: {
    color: '#ffffff',
  },
  useLogoBtnTextInactive: {
    color: '#0b53f8',
  },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  emptyStateBox: {
    height: 220,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fafafa',
    marginTop: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyStateSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  generateBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0b53f8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  generateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0b53f8',
  },
  confirmBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b53f8',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Viewer Modal
  viewerContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
    padding: 16,
  },
  viewerHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  viewerImageContainer: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    marginVertical: 14,
    borderRadius: 12,
    padding: 12,
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  viewerDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0b53f8',
    backgroundColor: '#eff6ff',
  },
  viewerCloseBtn: {
    paddingHorizontal: 20,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
