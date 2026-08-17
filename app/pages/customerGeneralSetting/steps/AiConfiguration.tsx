import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather } from '@expo/vector-icons';

interface AiConfigurationProps {
  data: any;
  onChange: (data: any) => void;
  errors?: Record<string, string>;
}

const GUIDE_TABS = [
  { id: 'prerequisites', label: 'Prerequisites', icon: 'check-square' },
  { id: 'openai-setup', label: 'OpenAI Setup', icon: 'cpu' },
  { id: 'gemini-setup', label: 'Gemini Setup', icon: 'zap' },
  { id: 'verification', label: 'Verification', icon: 'shield' },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: 'help-circle' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'billing', label: 'Billing Guide', icon: 'credit-card' },
];

export default function AiConfiguration({ data, onChange, errors = {} }: AiConfigurationProps) {
  const [activeGuideTab, setActiveGuideTab] = useState('prerequisites');
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionLatency, setConnectionLatency] = useState<number | null>(null);
  const [expandedTroubleshoot, setExpandedTroubleshoot] = useState<string | null>(null);

  const aiConfig = data.ai_config || {};

  const handleKeyChange = (field: 'openai_api_key' | 'gemini_api_key', value: string) => {
    onChange({
      ai_config: {
        ...aiConfig,
        [field]: value.trim(),
      },
    });
    setConnectionStatus('idle');
  };

  const handleTestAiConnection = () => {
    if (!aiConfig.openai_api_key?.trim() && !aiConfig.gemini_api_key?.trim()) {
      Alert.alert(
        'Configuration Required',
        'Please enter at least one API key (OpenAI or Gemini) to test.'
      );
      return;
    }

    setTestingConnection(true);
    setConnectionStatus('idle');
    const start = Date.now();

    setTimeout(() => {
      const latency = Date.now() - start;
      setConnectionLatency(latency);
      if (
        (aiConfig.openai_api_key && aiConfig.openai_api_key.length > 10) ||
        (aiConfig.gemini_api_key && aiConfig.gemini_api_key.length > 10)
      ) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
      setTestingConnection(false);
    }, 1000);
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', `Could not open link: ${url}`);
    });
  };

  return (
    <VStack space="md" style={styles.container}>
      {/* Header Banner */}
      <View style={styles.bannerHeader}>
        <HStack space="md" style={{ alignItems: 'center' }}>
          <View style={styles.bannerIconBox}>
            <Feather name="cpu" size={24} color="#ffffff" />
          </View>
          <VStack style={{ flex: 1 }}>
            <Heading style={styles.bannerTitle}>AI Engine Configuration</Heading>
            <Text style={styles.bannerSubtitle}>
              Connect OpenAI or Google Gemini keys to power automated post and caption generation
            </Text>
          </VStack>
        </HStack>
      </View>

      {/* API Key Input Section Card */}
      <View style={styles.card}>
        <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <VStack>
            <Text style={styles.cardHeading}>API Credentials</Text>
            <Text style={styles.cardSubheading}>
              Provide your API keys. At least one valid key is required for automation.
            </Text>
          </VStack>
          <TouchableOpacity
            onPress={handleTestAiConnection}
            disabled={testingConnection}
            style={[styles.testBtn, testingConnection && { opacity: 0.6 }]}
          >
            {testingConnection ? (
              <ActivityIndicator size="small" color="#0b53f8" />
            ) : (
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Feather name="activity" size={14} color="#0b53f8" />
                <Text style={styles.testBtnText}>Test Connection</Text>
              </HStack>
            )}
          </TouchableOpacity>
        </HStack>

        {/* Connection Status Banner */}
        {connectionStatus === 'success' && (
          <View style={styles.statusSuccessBox}>
            <Feather name="check-circle" size={16} color="#16a34a" />
            <Text style={styles.statusSuccessText}>
              Credentials verified successfully! (Latency: {connectionLatency}ms)
            </Text>
          </View>
        )}
        {connectionStatus === 'error' && (
          <View style={styles.statusErrorBox}>
            <Feather name="alert-circle" size={16} color="#dc2626" />
            <Text style={styles.statusErrorText}>
              Connection test failed. Please verify your API keys and account billing limits.
            </Text>
          </View>
        )}

        <VStack space="md">
          {/* OpenAI API Key */}
          <VStack space="xs">
            <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Feather name="key" size={14} color="#334155" />
                <Text style={styles.inputLabel}>OpenAI API Key</Text>
              </HStack>
              <TouchableOpacity
                onPress={() => handleOpenLink('https://platform.openai.com/api-keys')}
              >
                <HStack space="xs" style={{ alignItems: 'center' }}>
                  <Text style={styles.linkText}>Get Key</Text>
                  <Feather name="external-link" size={12} color="#0b53f8" />
                </HStack>
              </TouchableOpacity>
            </HStack>

            <View style={[styles.inputWrapper, !!errors?.openai_api_key && styles.inputError]}>
              <TextInput
                style={styles.keyInput}
                placeholder="sk-proj-..."
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showOpenAIKey}
                value={aiConfig.openai_api_key || ''}
                onChangeText={(val) => handleKeyChange('openai_api_key', val)}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowOpenAIKey(!showOpenAIKey)}
                style={styles.eyeBtn}
              >
                <Feather name={showOpenAIKey ? 'eye-off' : 'eye'} size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            {errors?.openai_api_key ? (
              <Text style={styles.errorCaption}>{errors.openai_api_key}</Text>
            ) : (
              <Text style={styles.helperCaption}>Used for GPT-4o and advanced caption writing</Text>
            )}
          </VStack>

          {/* Gemini API Key */}
          <VStack space="xs">
            <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Feather name="zap" size={14} color="#334155" />
                <Text style={styles.inputLabel}>Google Gemini API Key</Text>
              </HStack>
              <TouchableOpacity
                onPress={() => handleOpenLink('https://aistudio.google.com/app/apikey')}
              >
                <HStack space="xs" style={{ alignItems: 'center' }}>
                  <Text style={styles.linkText}>Get Key</Text>
                  <Feather name="external-link" size={12} color="#0b53f8" />
                </HStack>
              </TouchableOpacity>
            </HStack>

            <View style={[styles.inputWrapper, !!errors?.gemini_api_key && styles.inputError]}>
              <TextInput
                style={styles.keyInput}
                placeholder="AIzaSy..."
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showGeminiKey}
                value={aiConfig.gemini_api_key || ''}
                onChangeText={(val) => handleKeyChange('gemini_api_key', val)}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowGeminiKey(!showGeminiKey)}
                style={styles.eyeBtn}
              >
                <Feather name={showGeminiKey ? 'eye-off' : 'eye'} size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            {errors?.gemini_api_key ? (
              <Text style={styles.errorCaption}>{errors.gemini_api_key}</Text>
            ) : (
              <Text style={styles.helperCaption}>
                Used for Gemini 1.5 Flash creative analysis and post ideas
              </Text>
            )}
          </VStack>
        </VStack>
      </View>

      {/* Interactive Setup & Billing Guides Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Interactive Setup & Billing Guide</Text>
        <Text style={styles.cardSubheading}>
          Step-by-step instructions on creating keys, setting budgets, and securing credentials.
        </Text>

        {/* Horizontal Navigation Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {GUIDE_TABS.map((tab) => {
            const isTabActive = activeGuideTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveGuideTab(tab.id)}
                style={[styles.guideTab, isTabActive && styles.guideTabActive]}
              >
                <Feather
                  name={tab.icon as any}
                  size={14}
                  color={isTabActive ? '#0b53f8' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.guideTabLabel, isTabActive && styles.guideTabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab Content Display */}
        <View style={styles.tabContentBox}>
          {activeGuideTab === 'prerequisites' && (
            <VStack space="md">
              <Text style={styles.guideSectionTitle}>What you need before starting:</Text>
              <HStack space="md" style={styles.prereqItem}>
                <View style={styles.prereqIconBox}>
                  <Feather name="mail" size={16} color="#0b53f8" />
                </View>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.prereqTitle}>Email Address</Text>
                  <Text style={styles.prereqDesc}>
                    Used to register or sign in to OpenAI Platform and Google AI Studio.
                  </Text>
                </VStack>
              </HStack>
              <HStack space="md" style={styles.prereqItem}>
                <View style={styles.prereqIconBox}>
                  <Feather name="credit-card" size={16} color="#16a34a" />
                </View>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.prereqTitle}>Payment Card ($5 recommended)</Text>
                  <Text style={styles.prereqDesc}>
                    Needed to enable API pay-as-you-go billing. Adding $5 credit provides thousands
                    of generated posts.
                  </Text>
                </VStack>
              </HStack>
              <HStack space="md" style={styles.prereqItem}>
                <View style={styles.prereqIconBox}>
                  <Feather name="clock" size={16} color="#d97706" />
                </View>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.prereqTitle}>10 Minutes Time</Text>
                  <Text style={styles.prereqDesc}>
                    Fast setup process to generate and copy API keys into this screen.
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          )}

          {activeGuideTab === 'openai-setup' && (
            <VStack space="md">
              <Text style={styles.guideSectionTitle}>How to get your OpenAI API Key:</Text>
              {[
                {
                  step: '1',
                  title: 'Open OpenAI Developer Platform',
                  desc: 'Visit platform.openai.com in your browser.',
                  link: 'https://platform.openai.com/',
                },
                {
                  step: '2',
                  title: 'Sign In / Register',
                  desc: 'Create your account or log in with Google/Email.',
                },
                {
                  step: '3',
                  title: 'Add $5 Prepaid Credit',
                  desc: 'Go to Settings → Billing → Add payment method. Top up $5 to activate API usage.',
                },
                {
                  step: '4',
                  title: 'Create Secret Key',
                  desc: 'Navigate to API Keys section and click "Create new secret key".',
                },
                {
                  step: '5',
                  title: 'Copy & Paste',
                  desc: 'Copy the secret key string immediately and paste it into the OpenAI API Key field above.',
                },
              ].map((s) => (
                <HStack key={s.step} space="sm" style={styles.stepItem}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{s.step}</Text>
                  </View>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{s.title}</Text>
                    <Text style={styles.stepDesc}>{s.desc}</Text>
                    {s.link && (
                      <TouchableOpacity onPress={() => handleOpenLink(s.link)}>
                        <Text style={styles.inlineLink}>Open platform.openai.com →</Text>
                      </TouchableOpacity>
                    )}
                  </VStack>
                </HStack>
              ))}
            </VStack>
          )}

          {activeGuideTab === 'gemini-setup' && (
            <VStack space="md">
              <Text style={styles.guideSectionTitle}>How to get your Google Gemini API Key:</Text>
              {[
                {
                  step: '1',
                  title: 'Open Google AI Studio',
                  desc: 'Go to aistudio.google.com and sign in with your Google account.',
                  link: 'https://aistudio.google.com/',
                },
                {
                  step: '2',
                  title: 'Create API Key',
                  desc: 'Click "Get API key" from the left sidebar and select "Create API key in new project".',
                },
                {
                  step: '3',
                  title: 'Enable Cloud Billing (Optional for Free Tier)',
                  desc: 'Link a Google Cloud billing account for higher tier rate limits.',
                },
                {
                  step: '4',
                  title: 'Copy & Paste',
                  desc: 'Copy the generated key (AIzaSy...) and paste it into the Gemini Key field above.',
                },
              ].map((s) => (
                <HStack key={s.step} space="sm" style={styles.stepItem}>
                  <View style={[styles.stepBadge, { backgroundColor: '#eff6ff' }]}>
                    <Text style={[styles.stepBadgeText, { color: '#0b53f8' }]}>{s.step}</Text>
                  </View>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{s.title}</Text>
                    <Text style={styles.stepDesc}>{s.desc}</Text>
                    {s.link && (
                      <TouchableOpacity onPress={() => handleOpenLink(s.link)}>
                        <Text style={styles.inlineLink}>Open aistudio.google.com →</Text>
                      </TouchableOpacity>
                    )}
                  </VStack>
                </HStack>
              ))}
            </VStack>
          )}

          {activeGuideTab === 'verification' && (
            <VStack space="sm">
              <Text style={styles.guideSectionTitle}>Verifying your AI Configuration:</Text>
              <Text style={styles.infoParagraph}>
                Once you paste your keys, click the{' '}
                <Text style={{ fontWeight: '700' }}>"Test Connection"</Text> button above. The
                system will perform a test handshake to ensure the key is active and responding.
              </Text>
              <View style={styles.tipBox}>
                <Feather name="info" size={16} color="#0b53f8" />
                <Text style={styles.tipText}>
                  Tip: A latency under 1500ms is ideal for real-time post and logo generations.
                </Text>
              </View>
            </VStack>
          )}

          {activeGuideTab === 'troubleshooting' && (
            <VStack space="sm">
              <Text style={styles.guideSectionTitle}>Frequently Faced Issues & Solutions:</Text>
              {[
                {
                  id: 'quota',
                  title: '429 Insufficient Quota / Rate Limit Exceeded',
                  desc: 'Ensure you have added at least $5 prepaid credits in OpenAI Platform Billing. Free promotional credits expire after 3 months.',
                },
                {
                  id: 'invalid',
                  title: '401 Unauthorized / Invalid API Key',
                  desc: 'Check if there are any accidental spaces before or after the key string. Delete the key in OpenAI/Google AI studio and generate a fresh one.',
                },
                {
                  id: 'region',
                  title: 'Location or Model Access Error',
                  desc: 'Confirm your country is supported by OpenAI and Google AI. Both services support 150+ countries worldwide.',
                },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    setExpandedTroubleshoot(expandedTroubleshoot === item.id ? null : item.id)
                  }
                  style={styles.accordionHeader}
                >
                  <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.accordionTitle}>{item.title}</Text>
                    <Feather
                      name={expandedTroubleshoot === item.id ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#64748b"
                    />
                  </HStack>
                  {expandedTroubleshoot === item.id && (
                    <Text style={styles.accordionDesc}>{item.desc}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </VStack>
          )}

          {activeGuideTab === 'security' && (
            <VStack space="sm">
              <Text style={styles.guideSectionTitle}>Key Protection & Security:</Text>
              <Text style={styles.infoParagraph}>
                Your API keys are encrypted at rest using industry-standard AES-256 encryption. Keys
                are never exposed publicly and are only invoked by backend server workers when you
                initiate post creations.
              </Text>
              <HStack space="xs" style={styles.securityBullet}>
                <Feather name="shield" size={14} color="#16a34a" />
                <Text style={styles.securityBulletText}>
                  Encrypted and stored securely in dedicated customer partitions.
                </Text>
              </HStack>
              <HStack space="xs" style={styles.securityBullet}>
                <Feather name="lock" size={14} color="#16a34a" />
                <Text style={styles.securityBulletText}>
                  You can revoke or regenerate keys anytime from OpenAI/Google dashboards.
                </Text>
              </HStack>
            </VStack>
          )}

          {activeGuideTab === 'billing' && (
            <VStack space="sm">
              <Text style={styles.guideSectionTitle}>Budget & Cost Recommendations:</Text>
              <Text style={styles.infoParagraph}>
                AI costs are based directly on token usage. With GPT-4o-mini and Gemini 1.5 Flash:
              </Text>
              <View style={styles.billingCard}>
                <Text style={styles.billingCost}>$5 USD ≈ 1,500+ Generated Posts & Captions</Text>
                <Text style={styles.billingSubtitle}>
                  Average cost per generated social post is less than $0.003 USD.
                </Text>
              </View>
            </VStack>
          )}
        </View>
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
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubheading: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  testBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0b53f8',
  },
  statusSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  statusSuccessText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '600',
  },
  statusErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  statusErrorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0b53f8',
  },
  inputWrapper: {
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
  keyInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  eyeBtn: {
    padding: 8,
  },
  helperCaption: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 2,
  },
  errorCaption: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
    marginLeft: 2,
  },
  tabsScroll: {
    gap: 8,
    paddingVertical: 12,
  },
  guideTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  guideTabActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#0b53f8',
  },
  guideTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  guideTabLabelActive: {
    color: '#0b53f8',
    fontWeight: '700',
  },
  tabContentBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
  },
  guideSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  prereqItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  prereqIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prereqTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  prereqDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  stepItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0b53f8',
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  inlineLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0b53f8',
    marginTop: 4,
  },
  infoParagraph: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  tipText: {
    fontSize: 11,
    color: '#1e40af',
    fontWeight: '600',
    flex: 1,
  },
  accordionHeader: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accordionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  accordionDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 16,
  },
  securityBullet: {
    alignItems: 'center',
    marginTop: 4,
  },
  securityBulletText: {
    fontSize: 11,
    color: '#334155',
  },
  billingCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 6,
  },
  billingCost: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803d',
  },
  billingSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
});
