import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { getCustomerConfig, saveCurrentStep, activeWorkspace } from './customer-setup.api';

// Step components
import AiConfiguration from './steps/AiConfiguration';
import CompanyInformation from './steps/CompanyInformation';
import SocialMediaAuth from './steps/SocialMediaAuth';
import SocialMediaLinks from './steps/SocialMediaLinks';
import BrandingPreferences from './steps/BrandingPreferences';
import ReviewFinish from './steps/ReviewFinish';

export interface SetupWizardData {
  company_name: string;
  company_website: string;
  company_email: string;
  company_phone: string;
  company_logo: string;
  company_logo_preview?: string;
  social_media_auth: {
    instagram: {
      connection_status: string;
      connected_account_name: string;
      auth_status: string;
      reconnect_status: string;
      account_id?: string;
      username?: string;
    };
    facebook: {
      connection_status: string;
      connected_account_name: string;
      auth_status: string;
      reconnect_status: string;
      page_id?: string;
      page_name?: string;
    };
    whatsapp: {
      connection_status: string;
      connected_account_name: string;
      auth_status: string;
      reconnect_status: string;
    };
  };
  social_links: {
    instagram_url: string;
    facebook_url: string;
    whatsapp_number: string;
    linkedin_url?: string;
    twitter_url?: string;
  };
  branding_preferences: {
    primary_color: string;
    secondary_color: string;
    content_language: string;
    brand_tone: string;
    default_cta: string;
    default_hashtags: string[];
  };
  ai_config: {
    gemini_api_key: string;
    openai_api_key: string;
  };
}

const initialSetupData: SetupWizardData = {
  company_name: '',
  company_website: '',
  company_email: '',
  company_phone: '',
  company_logo: '',
  social_media_auth: {
    instagram: {
      connection_status: 'disconnected',
      connected_account_name: '',
      auth_status: 'unauthorized',
      reconnect_status: 'not_needed',
    },
    facebook: {
      connection_status: 'disconnected',
      connected_account_name: '',
      auth_status: 'unauthorized',
      reconnect_status: 'not_needed',
    },
    whatsapp: {
      connection_status: 'disconnected',
      connected_account_name: '',
      auth_status: 'unauthorized',
      reconnect_status: 'not_needed',
    },
  },
  social_links: {
    instagram_url: '',
    facebook_url: '',
    whatsapp_number: '',
    linkedin_url: '',
    twitter_url: '',
  },
  branding_preferences: {
    primary_color: '#0b53f8',
    secondary_color: '#3b82f6',
    content_language: 'English',
    brand_tone: 'Professional',
    default_cta: 'Learn More',
    default_hashtags: ['postbell', 'automation', 'marketing'],
  },
  ai_config: {
    gemini_api_key: '',
    openai_api_key: '',
  },
};

const WIZARD_STEPS = [
  { key: 0, label: 'AI Config', icon: 'cpu' },
  { key: 1, label: 'Company', icon: 'briefcase' },
  { key: 2, label: 'Auth', icon: 'shield' },
  { key: 3, label: 'Links', icon: 'link' },
  { key: 4, label: 'Branding', icon: 'sliders' },
  { key: 5, label: 'Review', icon: 'check-circle' },
];

export default function CustomerSetupWizard() {
  const { updateUser } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [setupData, setSetupData] = useState<SetupWizardData>(initialSetupData);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<number, any>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load configuration on mount
  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      setLoading(true);
      try {
        const res = await getCustomerConfig();
        if (res?.success && res.data?.customer) {
          const cust = res.data.customer;
          const stripMarkdownUrl = (value: string): string => {
            if (!value) return '';
            const match = value.match(/\[.*?\]\((.*?)\)/);
            return match ? match[1] : value;
          };

          if (isMounted) {
            setSetupData((prev) => ({
              ...prev,
              company_name:
                cust.company_info?.company_name || cust.company_name || prev.company_name,
              company_website:
                cust.company_info?.company_website || cust.website || prev.company_website,
              company_email:
                cust.company_info?.company_email || cust.company_email || prev.company_email,
              company_phone:
                cust.company_info?.company_phone || cust.company_phone || prev.company_phone,
              company_logo: cust.company_info?.company_logo || cust.logo_url || prev.company_logo,
              social_media_auth: cust.social_media_auth || prev.social_media_auth,
              social_links: {
                instagram_url: stripMarkdownUrl(cust.social_links?.instagram_url || ''),
                facebook_url: stripMarkdownUrl(cust.social_links?.facebook_url || ''),
                whatsapp_number: cust.social_links?.whatsapp_number || cust.whatsapp_no || '',
                linkedin_url: stripMarkdownUrl(cust.social_links?.linkedin_url || ''),
                twitter_url: stripMarkdownUrl(cust.social_links?.twitter_url || ''),
              },
              branding_preferences: {
                ...prev.branding_preferences,
                ...(cust.branding_preferences || {}),
                default_hashtags:
                  cust.branding_preferences?.default_hashtags ||
                  cust.default_hashtags ||
                  prev.branding_preferences.default_hashtags,
              },
              ai_config: {
                ...prev.ai_config,
                gemini_api_key:
                  cust.ai_config?.gemini_api_key ||
                  cust.gemini_api_key ||
                  prev.ai_config.gemini_api_key,
                openai_api_key:
                  cust.ai_config?.openai_api_key ||
                  cust.openai_api_key ||
                  prev.ai_config.openai_api_key,
              },
            }));

            if (typeof res.data.currentStep === 'number') {
              setActiveStep(res.data.currentStep);
            }
          }
        } else {
          // Check local draft fallback
          const draft = await AsyncStorage.getItem('customerSetupDraft');
          if (draft && isMounted) {
            try {
              const parsed = JSON.parse(draft);
              setSetupData((prev) => ({ ...prev, ...parsed }));
            } catch (e) {
              console.log('Draft parse notice:', e);
            }
          }
        }
      } catch (err: any) {
        console.log('Config fetch notice:', err?.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update State handler
  const updateSetupData = (partial: Partial<SetupWizardData>) => {
    setSetupData((prev) => ({ ...prev, ...partial }));
    setGeneralError(null);
    setStepErrors((prev) => ({ ...prev, [activeStep]: {} }));
  };

  // Step Validation logic
  const validateStep = (step: number): { valid: boolean; errors: any } => {
    switch (step) {
      case 0: {
        const openai = setupData.ai_config?.openai_api_key?.trim() || '';
        const gemini = setupData.ai_config?.gemini_api_key?.trim() || '';
        if (!openai && !gemini) {
          return {
            valid: false,
            errors: {
              openai_api_key: 'At least one API key is required',
              gemini_api_key: 'At least one API key is required',
            },
          };
        }
        return { valid: true, errors: {} };
      }

      case 1: {
        const errors: any = {};
        if (!setupData.company_name?.trim()) {
          errors.company_name = 'Company name is required';
        }
        if (!setupData.company_email?.trim()) {
          errors.company_email = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupData.company_email.trim())) {
          errors.company_email = 'Please enter a valid email address';
        }
        if (setupData.company_website?.trim()) {
          const web = setupData.company_website.trim();
          if (!/^(https?:\/\/|www\.)[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(web)) {
            errors.company_website = 'Website must be a valid URL';
          }
        }
        if (setupData.company_phone?.trim()) {
          const cleanPhone = setupData.company_phone.replace(/[\s().-]/g, '');
          if (!/^[+]?\d{7,15}$/.test(cleanPhone)) {
            errors.company_phone = 'Phone must be between 7-15 digits';
          }
        }
        return { valid: Object.keys(errors).length === 0, errors };
      }

      case 3: {
        const errors: any = {};
        const isUrl = (val: string) =>
          /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\S*)?$/.test(val.trim());
        if (setupData.social_links?.instagram_url && !isUrl(setupData.social_links.instagram_url)) {
          errors.instagram_url = 'Please enter a valid Instagram URL';
        }
        if (setupData.social_links?.facebook_url && !isUrl(setupData.social_links.facebook_url)) {
          errors.facebook_url = 'Please enter a valid Facebook URL';
        }
        return { valid: Object.keys(errors).length === 0, errors };
      }

      default:
        return { valid: true, errors: {} };
    }
  };

  const handleNext = () => {
    const check = validateStep(activeStep);
    setStepErrors((prev) => ({ ...prev, [activeStep]: check.errors }));

    if (!check.valid) {
      if (activeStep === 0) {
        Alert.alert(
          'Configuration Required',
          'Please configure at least one AI API key (OpenAI or Gemini) to continue.'
        );
      } else {
        Alert.alert(
          'Validation Notice',
          'Please correct the highlighted fields before proceeding.'
        );
      }
      return;
    }

    if (activeStep < WIZARD_STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // Local cache
      const { company_logo_preview, ...dataToSave } = setupData as any;
      await AsyncStorage.setItem('customerSetupDraft', JSON.stringify(dataToSave));

      // Server progress
      const res = await saveCurrentStep(activeStep, setupData);
      if (res?.success) {
        Alert.alert('Success', 'Your progress has been saved as a draft.');
      } else {
        Alert.alert('Saved Locally', 'Draft saved on your device.');
      }
    } catch (e: any) {
      Alert.alert('Notice', 'Draft cached locally on your device.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteSetup = async () => {
    setIsSaving(true);
    try {
      const res = await activeWorkspace(setupData);
      if (res?.success) {
        await AsyncStorage.removeItem('customerSetupDraft');
        await updateUser({ setup_completed: true, setupCompleted: true });
        Alert.alert(
          '🎉 Setup Completed',
          'Your workspace configuration has been activated successfully!'
        );
        router.replace('/(tabs)');
      } else {
        throw new Error(res?.message || 'Failed to complete workspace setup');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not complete workspace activation.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderCurrentStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <AiConfiguration
            data={setupData}
            onChange={updateSetupData}
            errors={stepErrors[0] || {}}
          />
        );
      case 1:
        return (
          <CompanyInformation
            data={setupData}
            onChange={updateSetupData}
            errors={stepErrors[1] || {}}
          />
        );
      case 2:
        return <SocialMediaAuth data={setupData} onChange={updateSetupData} />;
      case 3:
        return (
          <SocialMediaLinks
            data={setupData}
            onChange={updateSetupData}
            errors={stepErrors[3] || {}}
          />
        );
      case 4:
        return <BrandingPreferences data={setupData} onChange={updateSetupData} />;
      case 5:
        return (
          <ReviewFinish
            data={setupData}
            onChange={updateSetupData}
            onEdit={(step) => setActiveStep(step)}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0b53f8" />
        <Text style={styles.loadingText}>Loading setup configuration…</Text>
      </View>
    );
  }

  return (
    <VStack space="md" style={styles.container}>
      {/* Top Stepper Bar */}
      <View style={styles.stepperContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepperScroll}
        >
          {WIZARD_STEPS.map((step, idx) => {
            const isActive = activeStep === step.key;
            const isCompleted = activeStep > step.key;

            return (
              <TouchableOpacity
                key={step.key}
                onPress={() => {
                  if (step.key <= activeStep) {
                    setActiveStep(step.key);
                  }
                }}
                style={[
                  styles.stepTab,
                  isActive && styles.stepTabActive,
                  isCompleted && styles.stepTabCompleted,
                ]}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.stepNumberCircle,
                    isActive && styles.stepNumberCircleActive,
                    isCompleted && styles.stepNumberCircleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Feather name="check" size={12} color="#16a34a" />
                  ) : (
                    <Text style={[styles.stepNumberText, isActive && styles.stepNumberTextActive]}>
                      {idx + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepTabLabel,
                    isActive && styles.stepTabLabelActive,
                    isCompleted && styles.stepTabLabelCompleted,
                  ]}
                >
                  {step.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Linear Progress Bar */}
        <View style={styles.stepperProgressBar}>
          <View
            style={[
              styles.stepperProgressFill,
              { width: `${((activeStep + 1) / WIZARD_STEPS.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Main Step Content */}
      <ScrollView
        style={styles.stepScrollView}
        contentContainerStyle={styles.stepContentBox}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderCurrentStep()}
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View style={styles.bottomBar}>
        <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={handleBack}
            disabled={activeStep === 0}
            style={[styles.backBtn, activeStep === 0 && { opacity: 0.35 }]}
          >
            <Feather name="chevron-left" size={16} color="#334155" style={{ marginRight: 4 }} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <HStack space="xs">
            {/* Save Draft Button */}
            <TouchableOpacity
              onPress={handleSaveDraft}
              disabled={isSaving}
              style={styles.saveDraftBtn}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <HStack space="xs" style={{ alignItems: 'center' }}>
                  <Feather name="save" size={14} color="#475569" />
                  <Text style={styles.saveDraftBtnText}>Save Draft</Text>
                </HStack>
              )}
            </TouchableOpacity>

            {/* Next / Complete Setup Button */}
            {activeStep < WIZARD_STEPS.length - 1 ? (
              <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
                <Text style={styles.nextBtnText}>Next Step</Text>
                <Feather name="chevron-right" size={16} color="#ffffff" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCompleteSetup}
                disabled={isSaving}
                style={styles.completeBtn}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <HStack space="xs" style={{ alignItems: 'center' }}>
                    <Feather name="check-circle" size={15} color="#ffffff" />
                    <Text style={styles.completeBtnText}>Complete Setup</Text>
                  </HStack>
                )}
              </TouchableOpacity>
            )}
          </HStack>
        </HStack>
      </View>
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
    fontWeight: '600',
  },
  stepperContainer: {
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    zIndex: 20,
  },
  stepperScroll: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  stepTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepTabActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#0b53f8',
  },
  stepTabCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  stepNumberCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  stepNumberCircleActive: {
    backgroundColor: '#0b53f8',
  },
  stepNumberCircleCompleted: {
    backgroundColor: '#dcfce7',
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  stepNumberTextActive: {
    color: '#ffffff',
  },
  stepTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  stepTabLabelActive: {
    color: '#0b53f8',
    fontWeight: '800',
  },
  stepTabLabelCompleted: {
    color: '#15803d',
    fontWeight: '700',
  },
  stepperProgressBar: {
    height: 3,
    backgroundColor: '#f1f5f9',
  },
  stepperProgressFill: {
    height: '100%',
    backgroundColor: '#0b53f8',
  },
  stepScrollView: {
    flex: 1,
  },
  stepContentBox: {},
  bottomBar: {
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  saveDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    marginRight: 8,
  },
  saveDraftBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: '#0b53f8',
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: '#16a34a',
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
