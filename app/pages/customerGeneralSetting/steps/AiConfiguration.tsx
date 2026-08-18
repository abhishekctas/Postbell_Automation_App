import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
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
  { id: 'openai-setup', label: 'OpenAI setup', icon: 'cpu' },
  { id: 'gemini-setup', label: 'Gemini setup', icon: 'zap' },
  { id: 'verification', label: 'Verification', icon: 'shield' },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: 'help-circle' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'billing', label: 'Billing', icon: 'credit-card' },
];

const PREREQUISITES = [
  {
    icon: 'mail',
    title: 'An email address',
    body: 'Used to register or sign in to OpenAI Platform and Google AI Studio.',
  },
  {
    icon: 'credit-card',
    title: 'A payment card',
    body: 'Needed to enable billing. We recommend funding each account with about $5.',
  },
  {
    icon: 'users',
    title: 'Account access',
    body: 'If this workspace belongs to a team, confirm you have permission to create API keys.',
  },
  {
    icon: 'clock',
    title: '10 minutes',
    body: 'That is roughly how long the whole setup takes for both providers.',
  },
];

const OPENAI_STEPS = [
  {
    title: 'Open OpenAI Platform',
    body: 'Head to the OpenAI developer platform in a new tab.',
    link: { label: 'platform.openai.com', url: 'https://platform.openai.com/' },
  },
  {
    title: 'Sign in or create an account',
    body: 'Use an existing account, or register a new one with your email address.',
  },
  {
    title: 'Add a payment method',
    body: 'Go to Billing → Add payment method.',
    highlight: 'Recommended: add only $5 USD to start — that is enough to begin using the service.',
  },
  {
    title: 'Create a new secret key',
    body: 'Open API Keys, then select Create new secret key.',
  },
  {
    title: 'Copy the key into the field above',
    body: 'OpenAI shows the full key once. Copy it immediately and paste it into the OpenAI API Key field.',
  },
];

const GEMINI_STEPS = [
  {
    title: 'Open Google AI Studio',
    body: 'Head to Google AI Studio in a new tab.',
    link: { label: 'aistudio.google.com', url: 'https://aistudio.google.com/' },
  },
  {
    title: 'Sign in with Google',
    body: 'Use the Google account you want this integration tied to.',
  },
  {
    title: 'Enable billing, if prompted',
    body: 'Some usage tiers require a Google Cloud billing account.',
    highlight: 'Recommended: start with a $5 USD budget so you can test usage safely.',
  },
  {
    title: 'Create an API key',
    body: 'Select Get API key, then create a new key.',
  },
  {
    title: 'Copy the key into the field above',
    body: 'Copy the generated key and paste it into the Gemini API Key field.',
  },
];

const VERIFICATION_ITEMS = [
  {
    title: 'Key format looks right',
    body: 'OpenAI keys start with sk-, Gemini keys start with AIza.',
  },
  {
    title: 'No trailing spaces',
    body: 'Pasted keys sometimes carry a stray space or line break — trim if needed.',
  },
  {
    title: 'Billing is active',
    body: 'A key without an active payment method will fail on the first real request.',
  },
  {
    title: 'Field saved without an error',
    body: 'The field border and helper text below each input should be clear of red.',
  },
];

const TROUBLESHOOTING = [
  {
    id: 'invalid-key',
    error: 'Invalid API key',
    cause: 'The key was copied with extra whitespace, truncated, or has already been revoked.',
    solution:
      'Regenerate a fresh key from the provider dashboard and paste it in fully, without extra characters.',
  },
  {
    id: 'insufficient-quota',
    error: 'Insufficient quota / billing not enabled',
    cause:
      'The account has no active payment method, or the initial free credits have been used up.',
    solution:
      'Add a payment method under Billing and confirm at least a small balance or budget is available.',
  },
  {
    id: 'rate-limit',
    error: 'Rate limit exceeded',
    cause: 'Too many requests were sent in a short window for the account tier.',
    solution: 'Slow down request frequency, or raise the tier/limits from the provider dashboard.',
  },
  {
    id: 'not-saving',
    error: 'Key appears to save but nothing changes',
    cause:
      'The page may not have persisted the change, or a browser extension is interfering with the field.',
    solution:
      'Refresh the page, retype the key without autofill, and confirm the field no longer shows the error helper text.',
  },
  {
    id: 'network-cors',
    error: 'Network or CORS-style error when testing',
    cause: 'A firewall, proxy, or ad blocker is blocking the request to the provider API.',
    solution: 'Temporarily disable blockers or try from a different network, then retry.',
  },
];

const SECURITY_TIPS = [
  {
    icon: 'lock',
    title: 'Never share your key',
    body: 'Treat API keys like passwords. Do not paste them into chats, tickets, or public repositories.',
  },
  {
    icon: 'clock',
    title: 'Rotate keys periodically',
    body: 'Generate a new key every few months and revoke the old one, especially after any team change.',
  },
  {
    icon: 'shield',
    title: 'Scope and limit usage',
    body: 'Where the provider supports it, restrict a key to only the models or budget it actually needs.',
  },
  {
    icon: 'alert-triangle',
    title: 'Revoke immediately if leaked',
    body: 'If a key is ever exposed, revoke it from the provider dashboard right away and issue a replacement.',
  },
];

const OPENAI_BILLING_STEPS = [
  {
    title: 'Open the Billing page',
    body: 'From the OpenAI Platform dashboard, go to Settings → Billing.',
    link: {
      label: 'platform.openai.com/settings/organization/billing',
      url: 'https://platform.openai.com/settings/organization/billing/overview',
    },
  },
  {
    title: 'Add a payment method',
    body: 'Select Add payment details and enter a card. Most accounts run on prepaid credit rather than a postpaid invoice.',
  },
  {
    title: 'Add initial credit',
    body: 'Choose an amount to add to your balance.',
    highlight: 'Recommended: start with $5 USD — enough to test and run light usage.',
  },
  {
    title: 'Set a usage limit (optional but recommended)',
    body: 'Under Limits, set a monthly budget so spend cannot exceed what you expect to pay.',
  },
  {
    title: 'Confirm the balance is active',
    body: 'Return to the Billing overview and confirm your available credit shows a non-zero balance before testing the key.',
  },
];

const GEMINI_BILLING_STEPS = [
  {
    title: 'Open Google Cloud Billing',
    body: 'Gemini API billing is managed through a linked Google Cloud project, not AI Studio itself.',
    link: {
      label: 'console.cloud.google.com/billing',
      url: 'https://console.cloud.google.com/billing',
    },
  },
  {
    title: 'Create or select a billing account',
    body: 'If you do not have one yet, select Create account and follow the prompts to add a payment method.',
  },
  {
    title: 'Link billing to your project',
    body: 'Make sure the Google Cloud project tied to your Gemini API key has this billing account linked, under Billing → Link a billing account.',
    highlight: 'Recommended: start with a $5 USD budget so you can test usage safely.',
  },
  {
    title: 'Set your Gemini API Spend Cap',
    body: 'Navigate directly to your Google AI Studio Spend settings page to enforce a strict monthly usage limit on your developer project.',
    link: {
      label: 'aistudio.google.com/spend',
      url: 'https://aistudio.google.com/spend',
    },
    highlight:
      'Recommended: We strictly recommend setting a budget cap of $5 USD (or ₹1,000.00 INR as shown in the dashboard preview) to test safely and prevent unwanted charges.',
  },
  {
    title: 'Set a budget alert (optional but recommended)',
    body: 'Under Budgets & alerts, create a budget so you get notified before spend grows unexpectedly.',
  },
  {
    title: 'Verify billing is enabled',
    body: 'On the project dashboard, confirm the billing status shows Active before testing the key.',
  },
];

export default function AiConfiguration({ data, onChange, errors = {} }: AiConfigurationProps) {
  const [activeGuideTab, setActiveGuideTab] = useState('prerequisites');
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionLatency, setConnectionLatency] = useState<number | null>(null);
  const [troubleshootQuery, setTroubleshootQuery] = useState('');
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
  // const handleTestAiConnection = () => {
  //   if (!aiConfig.openai_api_key?.trim() && !aiConfig.gemini_api_key?.trim()) {
  //     Alert.alert(
  //       'Configuration Required',
  //       'Please enter at least one API key (OpenAI or Gemini) to test.'
  //     );
  //     return;
  //   }

  //   setTestingConnection(true);
  //   setConnectionStatus('idle');
  //   const start = Date.now();

  //   setTimeout(() => {
  //     const latency = Date.now() - start;
  //     setConnectionLatency(latency);
  //     if (
  //       (aiConfig.openai_api_key && aiConfig.openai_api_key.length > 10) ||
  //       (aiConfig.gemini_api_key && aiConfig.gemini_api_key.length > 10)
  //     ) {
  //       setConnectionStatus('success');
  //     } else {
  //       setConnectionStatus('error');
  //     }
  //     setTestingConnection(false);
  //   }, 1000);
  // };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', `Could not open link: ${url}`);
    });
  };

  const filteredTroubleshooting = useMemo(() => {
    const q = troubleshootQuery.trim().toLowerCase();
    if (!q) return TROUBLESHOOTING;
    return TROUBLESHOOTING.filter(
      (t) =>
        t.error.toLowerCase().includes(q) ||
        t.cause.toLowerCase().includes(q) ||
        t.solution.toLowerCase().includes(q)
    );
  }, [troubleshootQuery]);

  return (
    <VStack space="md" style={styles.container}>
      {/* ============================== HERO HEADER ============================== */}
      <View style={styles.bannerHeader}>
        <VStack space="xs">
          {/* Provider Chips */}
          <HStack space="xs" style={{ marginBottom: 6 }}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>OpenAI</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Google Gemini</Text>
            </View>
          </HStack>

          <Heading style={styles.bannerTitle}>AI Configuration & Setup Guide</Heading>
          <Text style={styles.bannerSubtitle}>
            Connect your OpenAI and Gemini API keys, then follow the walkthrough below.
          </Text>
        </VStack>
      </View>

      {/* ===================== KEY CONFIGURATION CARD ===================== */}
      <View style={styles.card}>
        <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <HStack space="sm" style={{ alignItems: 'center', flex: 1 }}>
            <View style={styles.headerIconBox}>
              <Feather name="key" size={18} color="#0b53f8" />
            </View>
            <VStack style={{ flex: 1 }}>
              <Text style={styles.cardHeading}>Your API keys</Text>
              <Text style={styles.cardSubheading}>
                Paste keys from each provider once you have generated them below.
              </Text>
            </VStack>
            {/* <TouchableOpacity
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
            </TouchableOpacity> */}
          </HStack>
        </HStack>

        {/* Persistent Callout for PostBell Billing Disclaimer */}
        <View style={styles.disclaimerCalloutBox}>
          <HStack space="sm" style={{ alignItems: 'flex-start' }}>
            <Feather name="alert-triangle" size={18} color="#b91c1c" style={{ marginTop: 2 }} />
            <VStack style={{ flex: 1 }}>
              <Text style={styles.disclaimerCalloutTitle}>
                Billing & Cost Responsibility Disclaimer
              </Text>
              <Text style={styles.disclaimerCalloutText}>
                All usage fees, account charges, or API costs are billed directly by your selected
                third-party AI providers (OpenAI or Google). PostBell has no access to your external
                payment accounts, does not process API payments, and is{' '}
                <Text style={{ fontWeight: '700', color: '#0f172a' }}>
                  not responsible or liable
                </Text>{' '}
                for any charges, fees, or quotas incurred under your API keys.
              </Text>
            </VStack>
          </HStack>
        </View>

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
                placeholder="sk-..."
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
            ) : null}
          </VStack>

          {/* Gemini API Key */}
          <VStack space="xs">
            <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Feather name="zap" size={14} color="#334155" />
                <Text style={styles.inputLabel}>Gemini API Key *</Text>
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
                placeholder="AIza..."
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
            ) : null}
          </VStack>
        </VStack>
      </View>

      {/* ===================== INTERACTIVE GUIDES CARD ===================== */}
      <View style={styles.card}>
        <Text style={styles.eyebrow}>SETUP &amp; BILLING GUIDE</Text>
        <Text style={styles.cardHeading}>Step-by-Step Walkthrough</Text>
        <Text style={styles.cardSubheading}>
          Explore instructions on creating keys, setting budgets, and securing credentials.
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
          {/* PREREQUISITES */}
          {activeGuideTab === 'prerequisites' && (
            <VStack space="md">
              <View>
                <Text style={styles.eyebrow}>BEFORE YOU START</Text>
                <Text style={styles.guideSectionTitle}>Prerequisites</Text>
                <Text style={styles.guideSectionDesc}>
                  Make sure you have these ready — it keeps both setups to about five minutes each.
                </Text>
              </View>

              <VStack space="sm">
                {PREREQUISITES.map((p) => (
                  <HStack key={p.title} space="md" style={styles.prereqItem}>
                    <View style={styles.prereqIconBox}>
                      <Feather name={p.icon as any} size={16} color="#0b53f8" />
                    </View>
                    <VStack style={{ flex: 1 }}>
                      <Text style={styles.prereqTitle}>{p.title}</Text>
                      <Text style={styles.prereqDesc}>{p.body}</Text>
                    </VStack>
                  </HStack>
                ))}
              </VStack>

              <View style={styles.warningCalloutBox}>
                <HStack space="sm" style={{ alignItems: 'flex-start' }}>
                  <Feather name="alert-circle" size={18} color="#b45309" style={{ marginTop: 2 }} />
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.warningCalloutTitle}>
                      Third-Party AI Provider Disclaimer
                    </Text>
                    <Text style={styles.warningCalloutText}>
                      You are solely responsible for your OpenAI and Google Gemini accounts, API
                      keys, billing, and usage. If your AI account is suspended, restricted, billed
                      unexpectedly, exceeds its quota, or encounters any other account-related
                      issue, PostBell is not responsible or liable. Please ensure your API keys
                      remain valid, your account has sufficient credits, and you comply with your AI
                      provider's terms and policies.
                    </Text>
                  </VStack>
                </HStack>
              </View>
            </VStack>
          )}

          {/* OPENAI SETUP */}
          {activeGuideTab === 'openai-setup' && (
            <VStack space="md">
              <View>
                <Text style={styles.eyebrow}>PROVIDER 1</Text>
                <Text style={styles.guideSectionTitle}>OpenAI API key setup</Text>
              </View>

              <VStack space="sm">
                {OPENAI_STEPS.map((s, index) => (
                  <HStack key={s.title} space="sm" style={styles.stepItem}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{index + 1}</Text>
                    </View>
                    <VStack style={{ flex: 1 }}>
                      <Text style={styles.stepTitle}>{s.title}</Text>
                      <Text style={styles.stepDesc}>{s.body}</Text>
                      {s.link && (
                        <TouchableOpacity
                          onPress={() => handleOpenLink(s.link.url)}
                          style={{ marginTop: 4 }}
                        >
                          <HStack space="xs" style={{ alignItems: 'center' }}>
                            <Text style={styles.inlineLink}>{s.link.label}</Text>
                            <Feather name="arrow-up-right" size={13} color="#0b53f8" />
                          </HStack>
                        </TouchableOpacity>
                      )}
                      {s.highlight && (
                        <View style={styles.stepHighlightBox}>
                          <Text style={styles.stepHighlightTitle}>Before you continue</Text>
                          <Text style={styles.stepHighlightText}>{s.highlight}</Text>
                        </View>
                      )}
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          )}

          {/* GEMINI SETUP */}
          {activeGuideTab === 'gemini-setup' && (
            <VStack space="md">
              <View>
                <Text style={styles.eyebrow}>PROVIDER 2</Text>
                <Text style={styles.guideSectionTitle}>Google Gemini API key setup</Text>
              </View>

              <VStack space="sm">
                {GEMINI_STEPS.map((s, index) => (
                  <HStack key={s.title} space="sm" style={styles.stepItem}>
                    <View style={[styles.stepBadge, { backgroundColor: '#f0fdfa' }]}>
                      <Text style={[styles.stepBadgeText, { color: '#0f766e' }]}>{index + 1}</Text>
                    </View>
                    <VStack style={{ flex: 1 }}>
                      <Text style={styles.stepTitle}>{s.title}</Text>
                      <Text style={styles.stepDesc}>{s.body}</Text>
                      {s.link && (
                        <TouchableOpacity
                          onPress={() => handleOpenLink(s.link.url)}
                          style={{ marginTop: 4 }}
                        >
                          <HStack space="xs" style={{ alignItems: 'center' }}>
                            <Text style={[styles.inlineLink, { color: '#0f766e' }]}>
                              {s.link.label}
                            </Text>
                            <Feather name="arrow-up-right" size={13} color="#0f766e" />
                          </HStack>
                        </TouchableOpacity>
                      )}
                      {s.highlight && (
                        <View style={styles.stepHighlightBox}>
                          <Text style={styles.stepHighlightTitle}>Before you continue</Text>
                          <Text style={styles.stepHighlightText}>{s.highlight}</Text>
                        </View>
                      )}
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          )}

          {/* VERIFICATION */}
          {activeGuideTab === 'verification' && (
            <VStack space="md">
              <View>
                <Text style={styles.eyebrow}>DOUBLE-CHECK</Text>
                <Text style={styles.guideSectionTitle}>Verification</Text>
                <Text style={styles.guideSectionDesc}>
                  Run through this checklist after pasting each key.
                </Text>
              </View>

              <VStack space="xs" style={styles.verificationListCard}>
                {VERIFICATION_ITEMS.map((item, i) => (
                  <View key={item.title}>
                    <HStack space="sm" style={{ alignItems: 'flex-start', paddingVertical: 10 }}>
                      <Feather
                        name="check-circle"
                        size={18}
                        color="#16a34a"
                        style={{ marginTop: 2 }}
                      />
                      <VStack style={{ flex: 1 }}>
                        <Text style={styles.checklistTitle}>{item.title}</Text>
                        <Text style={styles.checklistDesc}>{item.body}</Text>
                      </VStack>
                    </HStack>
                    {i < VERIFICATION_ITEMS.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </VStack>

              <View style={styles.tipBox}>
                <HStack space="sm" style={{ alignItems: 'flex-start' }}>
                  <Feather name="info" size={16} color="#0b53f8" style={{ marginTop: 2 }} />
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.tipTitle}>Fastest way to confirm a key works</Text>
                    <Text style={styles.tipText}>
                      Trigger any AI-powered feature once after saving. A successful response is the
                      clearest sign the key and billing are both set up correctly.
                    </Text>
                  </VStack>
                </HStack>
              </View>
            </VStack>
          )}

          {/* TROUBLESHOOTING */}
          {activeGuideTab === 'troubleshooting' && (
            <VStack space="md">
              <View>
                <Text style={styles.eyebrow}>IF SOMETHING BREAKS</Text>
                <Text style={styles.guideSectionTitle}>Troubleshooting</Text>
              </View>

              {/* Search Bar */}
              <View style={styles.searchWrapper}>
                <Feather name="search" size={16} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search errors, e.g. rate limit"
                  placeholderTextColor="#94a3b8"
                  value={troubleshootQuery}
                  onChangeText={setTroubleshootQuery}
                />
                {troubleshootQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setTroubleshootQuery('')}>
                    <Feather name="x" size={16} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              <VStack space="sm">
                {filteredTroubleshooting.length === 0 ? (
                  <Text style={styles.noResultsText}>
                    No matching issues. Try a different search term.
                  </Text>
                ) : (
                  filteredTroubleshooting.map((item) => {
                    const isExpanded = expandedTroubleshoot === item.id;
                    return (
                      <View key={item.id} style={styles.accordionContainer}>
                        <TouchableOpacity
                          onPress={() => setExpandedTroubleshoot(isExpanded ? null : item.id)}
                          style={styles.accordionHeader}
                        >
                          <HStack
                            style={{
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flex: 1,
                            }}
                          >
                            <HStack
                              space="xs"
                              style={{ alignItems: 'center', flex: 1, paddingRight: 8 }}
                            >
                              <Feather name="alert-circle" size={16} color="#dc2626" />
                              <Text style={styles.accordionTitle}>{item.error}</Text>
                            </HStack>
                            <Feather
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color="#64748b"
                            />
                          </HStack>
                        </TouchableOpacity>

                        {isExpanded && (
                          <VStack space="sm" style={styles.accordionContent}>
                            <VStack space="xs">
                              <Text style={styles.troubleshootSubLabel}>LIKELY CAUSE</Text>
                              <Text style={styles.troubleshootBodyText}>{item.cause}</Text>
                            </VStack>
                            <VStack space="xs">
                              <Text style={[styles.troubleshootSubLabel, { color: '#16a34a' }]}>
                                SOLUTION
                              </Text>
                              <Text style={styles.troubleshootBodyText}>{item.solution}</Text>
                            </VStack>
                          </VStack>
                        )}
                      </View>
                    );
                  })
                )}
              </VStack>
            </VStack>
          )}

          {/* SECURITY */}
          {activeGuideTab === 'security' && (
            <VStack space="md">
              <View>
                <Text style={styles.eyebrow}>KEEP IT SAFE</Text>
                <Text style={styles.guideSectionTitle}>Security best practices</Text>
              </View>

              <VStack space="sm">
                {SECURITY_TIPS.map((tip) => (
                  <View key={tip.title} style={styles.securityCard}>
                    <HStack space="sm" style={{ alignItems: 'flex-start' }}>
                      <View style={styles.securityIconBox}>
                        <Feather name={tip.icon as any} size={16} color="#dc2626" />
                      </View>
                      <VStack style={{ flex: 1 }}>
                        <Text style={styles.securityTitle}>{tip.title}</Text>
                        <Text style={styles.securityDesc}>{tip.body}</Text>
                      </VStack>
                    </HStack>
                  </View>
                ))}
              </VStack>

              <View style={styles.disclaimerCalloutBox}>
                <HStack space="sm" style={{ alignItems: 'flex-start' }}>
                  <Feather name="lock" size={18} color="#b91c1c" style={{ marginTop: 2 }} />
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.disclaimerCalloutTitle}>
                      Keys grant full account access
                    </Text>
                    <Text style={styles.disclaimerCalloutText}>
                      Anyone with a copy of your key can spend against your account balance. Store
                      keys only in this configuration screen or a secrets manager — never in code,
                      tickets, or shared documents.
                    </Text>
                  </VStack>
                </HStack>
              </View>
            </VStack>
          )}

          {/* BILLING */}
          {activeGuideTab === 'billing' && (
            <VStack space="md">
              <View>
                <Text style={styles.eyebrow}>COSTS</Text>
                <Text style={styles.guideSectionTitle}>Billing &amp; responsibility</Text>
                <Text style={styles.guideSectionDesc}>
                  Each provider manages billing separately from the API key itself — follow the
                  steps for the provider(s) you use.
                </Text>
              </View>

              {/* OpenAI Billing */}
              <View style={styles.billingProviderCard}>
                <HStack space="xs" style={{ alignItems: 'center', marginBottom: 12 }}>
                  <View style={styles.providerBadge}>
                    <Text style={styles.providerBadgeText}>OpenAI</Text>
                  </View>
                  <Text style={styles.billingProviderTitle}>Setting up OpenAI billing</Text>
                </HStack>

                <VStack space="sm">
                  {OPENAI_BILLING_STEPS.map((s, index) => (
                    <HStack key={s.title} space="sm" style={styles.stepItem}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{index + 1}</Text>
                      </View>
                      <VStack style={{ flex: 1 }}>
                        <Text style={styles.stepTitle}>{s.title}</Text>
                        <Text style={styles.stepDesc}>{s.body}</Text>
                        {s.link && (
                          <TouchableOpacity
                            onPress={() => handleOpenLink(s.link.url)}
                            style={{ marginTop: 4, flexDirection: 'row', flexWrap: 'wrap' }}
                          >
                            <HStack
                              space="xs"
                              style={{
                                alignItems: 'center',
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                              }}
                            >
                              <Text style={styles.inlineLink}>{s.link.label}</Text>
                              <Feather name="arrow-up-right" size={13} color="#0b53f8" />
                            </HStack>
                          </TouchableOpacity>
                        )}
                        {s.highlight && (
                          <View style={styles.stepHighlightBox}>
                            <Text style={styles.stepHighlightTitle}>Before you continue</Text>
                            <Text style={styles.stepHighlightText}>{s.highlight}</Text>
                          </View>
                        )}
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </View>

              {/* Gemini Billing */}
              <View style={styles.billingProviderCard}>
                <HStack space="xs" style={{ alignItems: 'center', marginBottom: 12 }}>
                  <View style={[styles.providerBadge, { backgroundColor: '#f0fdfa' }]}>
                    <Text style={[styles.providerBadgeText, { color: '#0f766e' }]}>
                      Google Gemini
                    </Text>
                  </View>
                  <Text style={styles.billingProviderTitle}>Setting up Gemini billing</Text>
                </HStack>

                <VStack space="sm">
                  {GEMINI_BILLING_STEPS.map((s, index) => (
                    <HStack key={s.title} space="sm" style={styles.stepItem}>
                      <View style={[styles.stepBadge, { backgroundColor: '#f0fdfa' }]}>
                        <Text style={[styles.stepBadgeText, { color: '#0f766e' }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <VStack style={{ flex: 1 }}>
                        <Text style={styles.stepTitle}>{s.title}</Text>
                        <Text style={styles.stepDesc}>{s.body}</Text>
                        {s.link && (
                          <TouchableOpacity
                            onPress={() => handleOpenLink(s.link.url)}
                            style={{ marginTop: 4 }}
                          >
                            <HStack space="xs" style={{ alignItems: 'center' }}>
                              <Text style={[styles.inlineLink, { color: '#0f766e' }]}>
                                {s.link.label}
                              </Text>
                              <Feather name="arrow-up-right" size={13} color="#0f766e" />
                            </HStack>
                          </TouchableOpacity>
                        )}
                        {s.highlight && (
                          <View style={styles.stepHighlightBox}>
                            <Text style={styles.stepHighlightTitle}>Before you continue</Text>
                            <Text style={styles.stepHighlightText}>{s.highlight}</Text>
                          </View>
                        )}
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </View>

              {/* Payment recommendation card */}
              <View style={styles.paymentRecommendationCard}>
                <HStack space="sm" style={{ alignItems: 'flex-start' }}>
                  <Feather
                    name="alert-triangle"
                    size={18}
                    color="#b45309"
                    style={{ marginTop: 2 }}
                  />
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.paymentRecommendationTitle}>Payment recommendation</Text>
                    <Text style={styles.paymentRecommendationText}>
                      For both OpenAI and Gemini, we recommend adding only{' '}
                      <Text style={{ fontWeight: '800', color: '#0f172a' }}>$5 USD</Text> initially.
                      This is sufficient for testing and normal usage, and you can always add more
                      later if needed.
                    </Text>
                    <Text style={[styles.paymentRecommendationText, { marginTop: 8 }]}>
                      Usage-based charges from each provider are billed directly to the payment
                      method on that provider account. Review your usage dashboard regularly so
                      spend never comes as a surprise.
                    </Text>
                  </VStack>
                </HStack>
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
    backgroundColor: '#0b53f8',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.78)',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#0b53f8',
    marginBottom: 4,
  },
  disclaimerCalloutBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  disclaimerCalloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  disclaimerCalloutText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  warningCalloutBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 6,
  },
  warningCalloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  warningCalloutText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
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
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
  },
  guideSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  guideSectionDesc: {
    fontSize: 12,
    color: '#5b6478',
    marginTop: 4,
    lineHeight: 18,
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
    backgroundColor: '#eff6ff',
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
    color: '#5b6478',
    marginTop: 2,
    lineHeight: 16,
  },
  stepItem: {
    // backgroundColor: '#ffffff',
    // padding: 12,
    // borderRadius: 10,
    // borderWidth: 1,
    // borderColor: '#e2e8f0',
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
    fontSize: 11.5,
    color: '#5b6478',
    marginTop: 2,
    lineHeight: 17,
  },
  inlineLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0b53f8',
  },
  stepHighlightBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  stepHighlightTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: 2,
  },
  stepHighlightText: {
    fontSize: 11,
    color: '#5b6478',
    lineHeight: 16,
  },
  verificationListCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  checklistTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  checklistDesc: {
    fontSize: 11,
    color: '#5b6478',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  tipBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  tipText: {
    fontSize: 11,
    color: '#5b6478',
    lineHeight: 16,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  noResultsText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    padding: 8,
  },
  accordionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  accordionHeader: {
    padding: 12,
  },
  accordionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  accordionContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  troubleshootSubLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  troubleshootBodyText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 17,
  },
  securityCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  securityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  securityDesc: {
    fontSize: 11,
    color: '#5b6478',
    marginTop: 2,
    lineHeight: 16,
  },
  billingProviderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  providerBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0b53f8',
  },
  billingProviderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  paymentRecommendationCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  paymentRecommendationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  paymentRecommendationText: {
    fontSize: 11.5,
    color: '#5b6478',
    lineHeight: 17,
  },
});
