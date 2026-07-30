import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Modal,
  View,
  Linking,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  getGeneralSettings,
  createOrUpdateGeneralSettings,
  GeneralSettings,
} from './general-settings.api';
import {
  getCustomerDetails,
  updateCustomer,
  uploadCustomerProfileImage,
} from '../customers/customers.api';
import { useAuth } from '@/context/AuthContext';
import AiLogoGeneratorModal from './steps/AiLogoGenerate';

export interface SetupWizardData {
  company_name: string;
  company_website: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  company_logo: string;
  social_media_auth: {
    instagram: { connection_status: string; connected_account_name: string; last_synced?: string };
    facebook: { connection_status: string; connected_account_name: string; last_synced?: string };
    whatsapp: { connection_status: string; connected_account_name: string; last_synced?: string };
    linkedin: { connection_status: string; connected_account_name: string; last_synced?: string };
    twitter: { connection_status: string; connected_account_name: string; last_synced?: string };
  };
  social_links: {
    instagram_url: string;
    facebook_url: string;
    whatsapp_number: string;
    linkedin_url: string;
    twitter_url: string;
  };
  branding_preferences: {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_theme: string;
    content_language: string;
    brand_tone: string;
    default_cta: string;
    default_hashtags: string[];
  };
  ai_config: {
    gemini_api_key: string;
    gemini_model: string;
    openai_api_key: string;
    openai_model: string;
    active_step_tab: string;
  };
}

const initialData: SetupWizardData = {
  company_name: '',
  company_website: '',
  company_email: '',
  company_phone: '',
  company_address: '',
  company_logo: '',
  social_media_auth: {
    instagram: {
      connection_status: 'connected',
      connected_account_name: '@postbell_official',
      last_synced: 'Just now',
    },
    facebook: {
      connection_status: 'connected',
      connected_account_name: 'Postbell Official Page',
      last_synced: '5m ago',
    },
    whatsapp: {
      connection_status: 'connected',
      connected_account_name: '+1 (555) 019-2834',
      last_synced: '1h ago',
    },
    linkedin: {
      connection_status: 'disconnected',
      connected_account_name: '',
      last_synced: 'Never',
    },
    twitter: {
      connection_status: 'disconnected',
      connected_account_name: '',
      last_synced: 'Never',
    },
  },
  social_links: {
    instagram_url: 'https://instagram.com/postbell',
    facebook_url: 'https://facebook.com/postbell',
    whatsapp_number: '+15550192834',
    linkedin_url: '',
    twitter_url: '',
  },
  branding_preferences: {
    primary_color: '#0b53f8',
    secondary_color: '#3b82f6',
    accent_color: '#ec4899',
    background_theme: 'light',
    content_language: 'English',
    brand_tone: 'Professional',
    default_cta: 'Learn More',
    default_hashtags: ['postbell', 'automation', 'socialmedia'],
  },
  ai_config: {
    gemini_api_key: '',
    gemini_model: 'gemini-1.5-flash',
    openai_api_key: '',
    openai_model: 'gpt-4o-mini',
    active_step_tab: 'prerequisites',
  },
};

export default function CustomerSetupWizard() {
  const { user, updateUser } = useAuth();
  const [activeStep, setActiveStep] = useState<number>(0);
  const [setupData, setSetupData] = useState<SetupWizardData>(initialData);
  const [hashtagsText, setHashtagsText] = useState('postbell, automation, socialmedia');

  // Customer Profile State
  const [custProfileImage, setCustProfileImage] = useState(user?.image || '');
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [custFirstName, setCustFirstName] = useState(user?.first_name || '');
  const [custLastName, setCustLastName] = useState(user?.last_name || '');
  const [custEmail, setCustEmail] = useState(user?.email || '');
  const [custPhone, setCustPhone] = useState(user?.contact_no ? String(user.contact_no) : '');
  const [custGender, setCustGender] = useState<number>(user?.gender || 1);
  const [custAddressLine1, setCustAddressLine1] = useState('');
  const [custCity, setCustCity] = useState('');
  const [custState, setCustState] = useState('');
  const [custPincode, setCustPincode] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // AI Logo Generator Modal State
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [logoCompanyName, setLogoCompanyName] = useState('');
  const [logoIndustry, setLogoIndustry] = useState('Technology');
  const [logoStyle, setLogoStyle] = useState('Minimalist');
  const [logoColorTheme, setLogoColorTheme] = useState('Royal Blue');
  const [logoPrompt, setLogoPrompt] = useState('');
  const [logoSlogan, setLogoSlogan] = useState('');
  const [generatedLogos, setGeneratedLogos] = useState<string[]>([]);
  const [selectedLogoIndex, setSelectedLogoIndex] = useState<number | null>(null);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);

  // AI Config State
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionLatency, setConnectionLatency] = useState<number | null>(null);

  useEffect(() => {
    const custId = user?.id || user?._id;
    if (user?.image) {
      setCustProfileImage(user.image);
    }
    if (custId) {
      getCustomerDetails(custId)
        .then((data) => {
          if (data) {
            if (data.first_name) setCustFirstName(data.first_name);
            if (data.last_name) setCustLastName(data.last_name);
            if (data.email) setCustEmail(data.email);
            if (data.contact_no) setCustPhone(String(data.contact_no));
            if (data.gender) setCustGender(data.gender);
            if (data.image) setCustProfileImage(data.image);
            if (data.address) {
              setCustAddressLine1(data.address.address_line_1 || '');
              setCustCity(data.address.city || '');
              setCustState(data.address.state || '');
              setCustPincode(data.address.pincode || '');
            }
          }
        })
        .catch(() => {});
    }

    getGeneralSettings()
      .then((data) => {
        if (data) {
          setSetupData((prev) => ({
            ...prev,
            company_name: data.company_name || prev.company_name,
            company_email: data.company_email || prev.company_email,
            company_phone: data.company_phone || prev.company_phone,
            company_address: data.company_address || prev.company_address,
            company_website: data.website || prev.company_website,
            company_logo: data.logo_url || prev.company_logo,
            social_links: {
              facebook_url: data.social_links?.facebook_url || prev.social_links.facebook_url,
              instagram_url: data.social_links?.instagram_url || prev.social_links.instagram_url,
              twitter_url: data.social_links?.twitter_url || prev.social_links.twitter_url,
              linkedin_url: data.social_links?.linkedin_url || prev.social_links.linkedin_url,
              whatsapp_number: data.whatsapp_no || prev.social_links.whatsapp_number,
            },
            branding_preferences: {
              ...prev.branding_preferences,
              default_hashtags: data.default_hashtags || prev.branding_preferences.default_hashtags,
            },
            ai_config: {
              ...prev.ai_config,
              gemini_api_key: data.gemini_api_key || prev.ai_config.gemini_api_key,
              openai_api_key: data.openai_api_key || prev.ai_config.openai_api_key,
            },
          }));
          if (data.default_hashtags && data.default_hashtags.length > 0) {
            setHashtagsText(data.default_hashtags.join(', '));
          }
        }
      })
      .catch(() => {});
  }, [user]);

  const handlePickAndUploadProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Permission to access photo gallery is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingProfileImage(true);

        const formData = new FormData();
        const filename = asset.uri.split('/').pop() || 'profile-image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image', {
          uri: asset.uri,
          name: filename,
          type,
        } as any);

        if (asset.base64) {
          formData.append('base64', asset.base64);
        }

        const res = await uploadCustomerProfileImage(formData);
        const uploadedUrl = res?.data?.image || res?.image || res?.data?.url || asset.uri;

        setCustProfileImage(uploadedUrl);
        if (updateUser) {
          await updateUser({ image: uploadedUrl });
        }
        Alert.alert('Success', 'Profile image uploaded successfully!');
      }
    } catch (err: any) {
      console.error('Profile image upload failed:', err);
      Alert.alert('Error', err.message || 'Failed to upload profile image.');
    } finally {
      setUploadingProfileImage(false);
    }
  };

  const handlePickLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Permission to access gallery is required.');
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
        setSetupData((prev) => ({ ...prev, company_logo: uri }));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick logo.');
    }
  };

  const handleGenerateAiLogo = () => {
    const compName = logoCompanyName || setupData.company_name;
    if (!compName.trim() && !logoPrompt.trim()) {
      Alert.alert('Input Required', 'Please enter company name or logo prompt.');
      return;
    }
    setIsGeneratingLogo(true);
    setSelectedLogoIndex(null);

    setTimeout(() => {
      const seedName = encodeURIComponent(compName || logoPrompt || 'brand');
      const styleSeed = encodeURIComponent(logoStyle);
      const colorSeed = encodeURIComponent(logoColorTheme);

      const variation1 = `https://api.dicebear.com/7.x/identicon/png?seed=${seedName}_v1&backgroundColor=0b53f8,3b82f6`;
      const variation2 = `https://api.dicebear.com/7.x/shapes/png?seed=${seedName}_${styleSeed}_v2&backgroundColor=ec4899,8b5cf6`;
      const variation3 = `https://api.dicebear.com/7.x/bottts/png?seed=${seedName}_${colorSeed}_v3&backgroundColor=10b981,059669`;

      setGeneratedLogos([variation1, variation2, variation3]);
      setSelectedLogoIndex(0);
      setIsGeneratingLogo(false);
    }, 1200);
  };

  const handleApplySelectedLogo = () => {
    if (selectedLogoIndex !== null && generatedLogos[selectedLogoIndex]) {
      setSetupData((prev) => ({ ...prev, company_logo: generatedLogos[selectedLogoIndex] }));
      setAiModalVisible(false);
      Alert.alert('Success', 'AI Logo applied to company profile successfully!');
    } else {
      Alert.alert('Selection Required', 'Please select a generated logo option.');
    }
  };

  const handleTestAiConnection = () => {
    setTestingConnection(true);
    setConnectionStatus('idle');
    const startTime = Date.now();
    setTimeout(() => {
      const latency = Date.now() - startTime;
      setConnectionLatency(latency);
      if (setupData.ai_config.openai_api_key || setupData.ai_config.gemini_api_key) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
      setTestingConnection(false);
    }, 1200);
  };

  const handleSaveProfile = async () => {
    const custId = user?.id || user?._id;
    if (!custId) {
      Alert.alert('Error', 'User ID not found.');
      return;
    }
    if (!custFirstName.trim() || !custLastName.trim()) {
      Alert.alert('Validation Error', 'First and last name are required.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateCustomer(custId, {
        first_name: custFirstName,
        last_name: custLastName,
        gender: custGender,
        address: {
          address_line_1: custAddressLine1,
          city: custCity,
          state: custState,
          pincode: custPincode,
          contact_no: custPhone,
        },
      });
      if (updateUser) {
        await updateUser({
          first_name: custFirstName,
          last_name: custLastName,
          contact_no: custPhone,
          gender: custGender,
        });
      }
      Alert.alert('Success', 'My profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveWorkspaceSetup = async () => {
    if (!setupData.company_name.trim()) {
      Alert.alert('Validation Error', 'Company name is required.');
      return;
    }

    setSavingConfig(true);
    try {
      const hashtagsArray = hashtagsText
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const payload: Partial<GeneralSettings> = {
        company_name: setupData.company_name,
        company_email: setupData.company_email,
        company_phone: setupData.company_phone,
        company_address: setupData.company_address,
        website: setupData.company_website,
        logo_url: setupData.company_logo,
        social_links: {
          facebook_url: setupData.social_links.facebook_url,
          instagram_url: setupData.social_links.instagram_url,
          twitter_url: setupData.social_links.twitter_url,
          linkedin_url: setupData.social_links.linkedin_url,
        },
        whatsapp_no: setupData.social_links.whatsapp_number,
        default_hashtags: hashtagsArray,
        gemini_api_key: setupData.ai_config.gemini_api_key,
        openai_api_key: setupData.ai_config.openai_api_key,
      };

      await createOrUpdateGeneralSettings(payload);
      Alert.alert('Success', 'Workspace setup completed successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save setup configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const wizardSteps = [
    { key: 0, label: 'My Profile', icon: 'user' as const },
    { key: 1, label: 'Company', icon: 'briefcase' as const },
    { key: 2, label: 'Auth', icon: 'shield' as const },
    { key: 3, label: 'Links', icon: 'share-2' as const },
    { key: 4, label: 'Branding', icon: 'sliders' as const },
    { key: 5, label: 'AI Config', icon: 'cpu' as const },
    { key: 6, label: 'Review', icon: 'check-circle' as const },
  ];

  return (
    <VStack space="md" style={{ flex: 1 }}>
      {/* Step Tabs Navigation Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepScrollContent}
        style={{ maxHeight: 46 }}
      >
        {wizardSteps.map((tab) => {
          const isActive = activeStep === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.stepTab, isActive && styles.stepTabActive]}
              onPress={() => setActiveStep(tab.key)}
              activeOpacity={0.8}
            >
              <Feather
                name={tab.icon}
                size={14}
                color={isActive ? '#ffffff' : '#64748b'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.stepTabText, isActive && styles.stepTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* STEP 0: MY PROFILE */}
      {activeStep === 0 && (
        <Box style={styles.card}>
          <HStack style={styles.cardHeader}>
            <Box style={styles.cardIconBox}>
              <Feather name="user" size={18} color="#0b53f8" />
            </Box>
            <VStack style={{ flex: 1 }}>
              <Heading style={styles.cardTitle}>My Personal Profile</Heading>
              <Text style={styles.cardSubtitle}>Manage personal account details and address</Text>
            </VStack>
          </HStack>

          <VStack space="md" style={styles.formStack}>
            {/* Profile Avatar Image Upload Section */}
            <VStack space="xs" style={{ alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.label}>Profile Picture</Text>
              <Box style={styles.profileAvatarBox}>
                {custProfileImage ? (
                  <Image
                    source={{ uri: custProfileImage }}
                    style={styles.profileAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Box style={styles.profileAvatarPlaceholder}>
                    <Text style={styles.profileAvatarInitial}>
                      {(custFirstName || 'C').charAt(0).toUpperCase()}
                    </Text>
                  </Box>
                )}
                {uploadingProfileImage && (
                  <Box style={styles.profileAvatarOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                  </Box>
                )}
              </Box>

              <TouchableOpacity
                style={styles.uploadProfilePicBtn}
                onPress={handlePickAndUploadProfileImage}
                disabled={uploadingProfileImage}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={13} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.uploadProfilePicText}>
                  {uploadingProfileImage
                    ? 'Uploading...'
                    : custProfileImage
                      ? 'Change Picture'
                      : 'Upload Picture'}
                </Text>
              </TouchableOpacity>
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={custFirstName}
                onChangeText={setCustFirstName}
                placeholder="First Name"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={custLastName}
                onChangeText={setCustLastName}
                placeholder="Last Name"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#f1f5f9' }]}
                value={custEmail}
                editable={false}
                placeholder="Email"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={custPhone}
                onChangeText={setCustPhone}
                keyboardType="phone-pad"
                placeholder="Phone Number"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Gender</Text>
              <HStack space="sm">
                {[
                  { id: 1, label: 'Male' },
                  { id: 2, label: 'Female' },
                  { id: 3, label: 'Other' },
                ].map((g) => {
                  const isSel = custGender === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => setCustGender(g.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: isSel ? '#0b53f8' : '#cbd5e1',
                        backgroundColor: isSel ? '#eff6ff' : '#ffffff',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: isSel ? '#0b53f8' : '#64748b',
                        }}
                      >
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HStack>
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Address Line 1</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={custAddressLine1}
                onChangeText={setCustAddressLine1}
                multiline
                numberOfLines={3}
                placeholder="Street address or location"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <HStack space="sm">
              <VStack space="xs" style={{ flex: 1 }}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={custCity}
                  onChangeText={setCustCity}
                  placeholder="City"
                  placeholderTextColor="#94a3b8"
                />
              </VStack>
              <VStack space="xs" style={{ flex: 1 }}>
                <Text style={styles.label}>Pincode</Text>
                <TextInput
                  style={styles.input}
                  value={custPincode}
                  onChangeText={setCustPincode}
                  keyboardType="number-pad"
                  placeholder="Pincode"
                  placeholderTextColor="#94a3b8"
                />
              </VStack>
            </HStack>

            <VStack space="xs">
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                value={custState}
                onChangeText={setCustState}
                placeholder="State"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
              style={[styles.primaryBtn, savingProfile && styles.btnDisabled]}
            >
              {savingProfile ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <HStack style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Feather
                    name="check-circle"
                    size={18}
                    color="#ffffff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.primaryBtnText}>Update Profile</Text>
                </HStack>
              )}
            </TouchableOpacity>
          </VStack>
        </Box>
      )}

      {/* STEP 1: COMPANY INFORMATION */}
      {activeStep === 1 && (
        <Box style={styles.card}>
          <HStack style={styles.cardHeader}>
            <Box style={styles.cardIconBox}>
              <Feather name="briefcase" size={18} color="#0b53f8" />
            </Box>
            <VStack style={{ flex: 1 }}>
              <Heading style={styles.cardTitle}>Company Information</Heading>
              <Text style={styles.cardSubtitle}>Basic organizational profile & branding logo</Text>
            </VStack>
          </HStack>

          <VStack space="md" style={styles.formStack}>
            <VStack space="xs">
              <Text style={styles.label}>Company Name *</Text>
              <TextInput
                style={styles.input}
                value={setupData.company_name}
                onChangeText={(v) => setSetupData((p) => ({ ...p, company_name: v }))}
                placeholder="Enter company name"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Company Email</Text>
              <TextInput
                style={styles.input}
                value={setupData.company_email}
                onChangeText={(v) => setSetupData((p) => ({ ...p, company_email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter email address"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Company Phone</Text>
              <TextInput
                style={styles.input}
                value={setupData.company_phone}
                onChangeText={(v) => setSetupData((p) => ({ ...p, company_phone: v }))}
                keyboardType="phone-pad"
                placeholder="Enter contact number"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Website URL</Text>
              <TextInput
                style={styles.input}
                value={setupData.company_website}
                onChangeText={(v) => setSetupData((p) => ({ ...p, company_website: v }))}
                autoCapitalize="none"
                placeholder="https://example.com"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Company Address</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={setupData.company_address}
                onChangeText={(v) => setSetupData((p) => ({ ...p, company_address: v }))}
                multiline
                numberOfLines={3}
                placeholder="Enter company address"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Company Logo</Text>
              <Box style={styles.logoContainer}>
                <VStack space="md">
                  <HStack style={{ alignItems: 'center' }} space="md">
                    <Box style={styles.logoPreviewBox}>
                      {setupData.company_logo ? (
                        <Image
                          source={{ uri: setupData.company_logo }}
                          style={styles.logoImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Feather name="image" size={26} color="#94a3b8" />
                      )}
                    </Box>
                    <VStack style={{ flex: 1 }} space="xs">
                      <HStack space="xs">
                        <TouchableOpacity
                          style={styles.uploadLogoBtn}
                          onPress={handlePickLogo}
                          activeOpacity={0.8}
                        >
                          <Feather
                            name="upload"
                            size={13}
                            color="#ffffff"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.uploadLogoText}>
                            {setupData.company_logo ? 'Change' : 'Upload Logo'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.aiLogoBtn}
                          onPress={() => {
                            setLogoPrompt(setupData.company_name || 'Modern Brand Icon');
                            setAiModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Feather
                            name="zap"
                            size={13}
                            color="#ffffff"
                            style={{ marginRight: 4 }}
                          />
                          <Text style={styles.aiLogoText}>Generate with AI</Text>
                        </TouchableOpacity>
                      </HStack>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>
                        PNG, JPG or SVG max 2MB. Use AI to auto-generate a sleek logo.
                      </Text>
                    </VStack>
                  </HStack>
                </VStack>
              </Box>
            </VStack>

            <TouchableOpacity
              onPress={() => setActiveStep(2)}
              activeOpacity={0.85}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Next: Social Auth →</Text>
            </TouchableOpacity>
          </VStack>
        </Box>
      )}

      {/* STEP 2: AUTH (Connected Platforms) */}
      {activeStep === 2 && (
        <Box style={styles.card}>
          <HStack style={styles.cardHeader}>
            <Box style={styles.cardIconBox}>
              <Feather name="shield" size={18} color="#0b53f8" />
            </Box>
            <VStack style={{ flex: 1 }}>
              <Heading style={styles.cardTitle}>Connected Platforms</Heading>
              <Text style={styles.cardSubtitle}>
                Manage authenticated social accounts & connections
              </Text>
            </VStack>
          </HStack>

          <VStack space="md" style={styles.formStack}>
            {[
              {
                key: 'instagram',
                label: 'Instagram Business',
                icon: 'instagram' as const,
                color: '#E4405F',
                desc: 'Publish posts, stories & reels',
              },
              {
                key: 'facebook',
                label: 'Facebook Page',
                icon: 'facebook' as const,
                color: '#1877F2',
                desc: 'Auto-share updates to page feed',
              },
              {
                key: 'whatsapp',
                label: 'WhatsApp Business API',
                icon: 'message-circle' as const,
                color: '#25D366',
                desc: 'Send customer automated messages',
              },
              {
                key: 'linkedin',
                label: 'LinkedIn Company',
                icon: 'linkedin' as const,
                color: '#0A66C2',
                desc: 'Publish B2B articles & posts',
              },
              {
                key: 'twitter',
                label: 'Twitter / X Profile',
                icon: 'twitter' as const,
                color: '#1DA1F2',
                desc: 'Broadcast real-time tweets',
              },
            ].map((platform) => {
              const info = (setupData.social_media_auth as any)[platform.key] || {};
              const isConnected = info.connection_status === 'connected';

              return (
                <Box key={platform.key} style={styles.socialAuthBox}>
                  <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <HStack space="sm" style={{ alignItems: 'center', flex: 1 }}>
                      <Box
                        style={[styles.platformIconBox, { backgroundColor: `${platform.color}15` }]}
                      >
                        <Feather name={platform.icon} size={18} color={platform.color} />
                      </Box>
                      <VStack style={{ flex: 1 }}>
                        <HStack space="xs" style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                            {platform.label}
                          </Text>
                          <Box
                            style={{
                              backgroundColor: isConnected ? '#dcfce7' : '#f1f5f9',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: isConnected ? '#16a34a' : '#64748b',
                              }}
                            >
                              {isConnected ? 'ACTIVE' : 'OFFLINE'}
                            </Text>
                          </Box>
                        </HStack>
                        <Text style={{ fontSize: 11, color: '#64748b' }} numberOfLines={1}>
                          {isConnected
                            ? info.connected_account_name || 'Connected Account'
                            : platform.desc}
                        </Text>
                      </VStack>
                    </HStack>

                    <TouchableOpacity
                      onPress={() => {
                        setSetupData((prev) => ({
                          ...prev,
                          social_media_auth: {
                            ...prev.social_media_auth,
                            [platform.key]: {
                              connection_status: isConnected ? 'disconnected' : 'connected',
                              connected_account_name: isConnected
                                ? ''
                                : `@${setupData.company_name.toLowerCase().replace(/\s+/g, '') || 'account'}`,
                              last_synced: isConnected ? 'Never' : 'Just now',
                            },
                          },
                        }));
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: isConnected ? '#fee2e2' : '#0b53f8',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: isConnected ? '#dc2626' : '#ffffff',
                        }}
                      >
                        {isConnected ? 'Disconnect' : 'Connect'}
                      </Text>
                    </TouchableOpacity>
                  </HStack>
                </Box>
              );
            })}

            <TouchableOpacity
              onPress={() => setActiveStep(3)}
              activeOpacity={0.85}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Next: Profile URLs →</Text>
            </TouchableOpacity>
          </VStack>
        </Box>
      )}

      {/* STEP 3: LINKS (Profile URLs) */}
      {activeStep === 3 && (
        <Box style={styles.card}>
          <HStack style={styles.cardHeader}>
            <Box style={styles.cardIconBox}>
              <Feather name="share-2" size={18} color="#0b53f8" />
            </Box>
            <VStack style={{ flex: 1 }}>
              <Heading style={styles.cardTitle}>Profile URLs</Heading>
              <Text style={styles.cardSubtitle}>Public channel & website profile links</Text>
            </VStack>
          </HStack>

          <VStack space="md" style={styles.formStack}>
            <VStack space="xs">
              <Text style={styles.label}>Website URL</Text>
              <TextInput
                style={styles.input}
                value={setupData.company_website}
                onChangeText={(v) => setSetupData((p) => ({ ...p, company_website: v }))}
                autoCapitalize="none"
                placeholder="https://yourdomain.com"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Instagram Profile URL</Text>
              <TextInput
                style={styles.input}
                value={setupData.social_links.instagram_url}
                onChangeText={(v) =>
                  setSetupData((p) => ({
                    ...p,
                    social_links: { ...p.social_links, instagram_url: v },
                  }))
                }
                autoCapitalize="none"
                placeholder="https://instagram.com/yourhandle"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Facebook Page URL</Text>
              <TextInput
                style={styles.input}
                value={setupData.social_links.facebook_url}
                onChangeText={(v) =>
                  setSetupData((p) => ({
                    ...p,
                    social_links: { ...p.social_links, facebook_url: v },
                  }))
                }
                autoCapitalize="none"
                placeholder="https://facebook.com/yourpage"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Twitter / X URL</Text>
              <TextInput
                style={styles.input}
                value={setupData.social_links.twitter_url}
                onChangeText={(v) =>
                  setSetupData((p) => ({
                    ...p,
                    social_links: { ...p.social_links, twitter_url: v },
                  }))
                }
                autoCapitalize="none"
                placeholder="https://x.com/yourhandle"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>LinkedIn Page URL</Text>
              <TextInput
                style={styles.input}
                value={setupData.social_links.linkedin_url}
                onChangeText={(v) =>
                  setSetupData((p) => ({
                    ...p,
                    social_links: { ...p.social_links, linkedin_url: v },
                  }))
                }
                autoCapitalize="none"
                placeholder="https://linkedin.com/company/yourbrand"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>WhatsApp Number</Text>
              <TextInput
                style={styles.input}
                value={setupData.social_links.whatsapp_number}
                onChangeText={(v) =>
                  setSetupData((p) => ({
                    ...p,
                    social_links: { ...p.social_links, whatsapp_number: v },
                  }))
                }
                keyboardType="phone-pad"
                placeholder="+15550192834"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <TouchableOpacity
              onPress={() => setActiveStep(4)}
              activeOpacity={0.85}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Next: Branding & Voice →</Text>
            </TouchableOpacity>
          </VStack>
        </Box>
      )}

      {/* STEP 4: BRANDING (Brand Colors, Voice & Content) */}
      {activeStep === 4 && (
        <Box style={styles.card}>
          <HStack style={styles.cardHeader}>
            <Box style={styles.cardIconBox}>
              <Feather name="sliders" size={18} color="#0b53f8" />
            </Box>
            <VStack style={{ flex: 1 }}>
              <Heading style={styles.cardTitle}>Brand Colors & Voice</Heading>
              <Text style={styles.cardSubtitle}>
                Configure color swatches, AI tone & content language
              </Text>
            </VStack>
          </HStack>

          <VStack space="md" style={styles.formStack}>
            {/* Brand Colors Swatches */}
            <VStack space="xs">
              <Text style={styles.label}>Primary Brand Color</Text>
              <HStack space="xs" style={{ alignItems: 'center' }}>
                {['#0b53f8', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#0f172a'].map((hex) => {
                  const isSel = setupData.branding_preferences.primary_color === hex;
                  return (
                    <TouchableOpacity
                      key={hex}
                      onPress={() =>
                        setSetupData((p) => ({
                          ...p,
                          branding_preferences: { ...p.branding_preferences, primary_color: hex },
                        }))
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: hex,
                        borderWidth: isSel ? 3 : 1,
                        borderColor: isSel ? '#0f172a' : '#cbd5e1',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSel && <Feather name="check" size={14} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 6, height: 38, paddingVertical: 6 }]}
                  value={setupData.branding_preferences.primary_color}
                  onChangeText={(v) =>
                    setSetupData((p) => ({
                      ...p,
                      branding_preferences: { ...p.branding_preferences, primary_color: v },
                    }))
                  }
                  placeholder="#0b53f8"
                  placeholderTextColor="#94a3b8"
                />
              </HStack>
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Secondary Accent Color</Text>
              <HStack space="xs" style={{ alignItems: 'center' }}>
                {['#3b82f6', '#06b6d4', '#f43f5e', '#84cc16', '#a855f7', '#64748b'].map((hex) => {
                  const isSel = setupData.branding_preferences.secondary_color === hex;
                  return (
                    <TouchableOpacity
                      key={hex}
                      onPress={() =>
                        setSetupData((p) => ({
                          ...p,
                          branding_preferences: { ...p.branding_preferences, secondary_color: hex },
                        }))
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: hex,
                        borderWidth: isSel ? 3 : 1,
                        borderColor: isSel ? '#0f172a' : '#cbd5e1',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSel && <Feather name="check" size={14} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 6, height: 38, paddingVertical: 6 }]}
                  value={setupData.branding_preferences.secondary_color}
                  onChangeText={(v) =>
                    setSetupData((p) => ({
                      ...p,
                      branding_preferences: { ...p.branding_preferences, secondary_color: v },
                    }))
                  }
                  placeholder="#3b82f6"
                  placeholderTextColor="#94a3b8"
                />
              </HStack>
            </VStack>

            {/* Voice & Tone */}
            <VStack space="xs">
              <Text style={styles.label}>Brand Voice & Tone</Text>
              <HStack space="xs" style={{ flexWrap: 'wrap', gap: 6 }}>
                {[
                  'Professional',
                  'Casual',
                  'Friendly',
                  'Formal',
                  'Energetic',
                  'Playful',
                  'Premium',
                ].map((t) => {
                  const isSel = setupData.branding_preferences.brand_tone === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() =>
                        setSetupData((p) => ({
                          ...p,
                          branding_preferences: { ...p.branding_preferences, brand_tone: t },
                        }))
                      }
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isSel
                          ? setupData.branding_preferences.primary_color
                          : '#cbd5e1',
                        backgroundColor: isSel
                          ? setupData.branding_preferences.primary_color
                          : '#ffffff',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: isSel ? '#ffffff' : '#475569',
                        }}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HStack>
            </VStack>

            {/* Content Language */}
            <VStack space="xs">
              <Text style={styles.label}>Default Content Language</Text>
              <HStack space="xs" style={{ flexWrap: 'wrap', gap: 6 }}>
                {['English', 'Hindi', 'Gujarati', 'Spanish', 'French'].map((lang) => {
                  const isSel = setupData.branding_preferences.content_language === lang;
                  return (
                    <TouchableOpacity
                      key={lang}
                      onPress={() =>
                        setSetupData((p) => ({
                          ...p,
                          branding_preferences: {
                            ...p.branding_preferences,
                            content_language: lang,
                          },
                        }))
                      }
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSel ? '#0b53f8' : '#cbd5e1',
                        backgroundColor: isSel ? '#eff6ff' : '#ffffff',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: isSel ? '#0b53f8' : '#64748b',
                        }}
                      >
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HStack>
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Default Call to Action (CTA)</Text>
              <TextInput
                style={styles.input}
                value={setupData.branding_preferences.default_cta}
                onChangeText={(v) =>
                  setSetupData((p) => ({
                    ...p,
                    branding_preferences: { ...p.branding_preferences, default_cta: v },
                  }))
                }
                placeholder="e.g. Learn More, Shop Now, Sign Up"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            <VStack space="xs">
              <Text style={styles.label}>Default Hashtags (comma separated)</Text>
              <TextInput
                style={styles.input}
                value={hashtagsText}
                onChangeText={setHashtagsText}
                placeholder="e.g. postbell, automation, socialmedia"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            {/* AI Post Preview Card */}
            <Box
              style={{
                backgroundColor: '#f8fafc',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <HStack space="xs" style={{ alignItems: 'center', marginBottom: 6 }}>
                <Feather name="eye" size={14} color="#0b53f8" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0b53f8' }}>
                  AI Brand Voice Live Preview
                </Text>
              </HStack>
              <Text style={{ fontSize: 12, color: '#334155', fontStyle: 'italic', lineHeight: 18 }}>
                "{setupData.company_name || 'Postbell'} helps you elevate your social media presence
                with {setupData.branding_preferences.brand_tone.toLowerCase()} messaging."
              </Text>
              <HStack
                style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: setupData.branding_preferences.primary_color,
                  }}
                >
                  👉 {setupData.branding_preferences.default_cta}
                </Text>
                <Text style={{ fontSize: 10, color: '#64748b' }}>
                  {hashtagsText
                    .split(',')
                    .map((t) => `#${t.trim()}`)
                    .slice(0, 3)
                    .join(' ')}
                </Text>
              </HStack>
            </Box>

            <TouchableOpacity
              onPress={() => setActiveStep(5)}
              activeOpacity={0.85}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Next: AI Config →</Text>
            </TouchableOpacity>
          </VStack>
        </Box>
      )}

      {/* STEP 5: AI CONFIG (Step-by-Step Configuration) */}
      {activeStep === 5 && (
        <Box style={styles.card}>
          <HStack style={styles.cardHeader}>
            <Box style={styles.cardIconBox}>
              <Feather name="cpu" size={18} color="#0b53f8" />
            </Box>
            <VStack style={{ flex: 1 }}>
              <Heading style={styles.cardTitle}>AI Configuration</Heading>
              <Text style={styles.cardSubtitle}>
                Prerequisites, API Keys, Verification & Troubleshooting
              </Text>
            </VStack>
          </HStack>

          {/* AI Config Sub-Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 38, marginBottom: 12 }}
          >
            {[
              { id: 'prerequisites', label: '1. Prerequisites' },
              { id: 'openai', label: '2. OpenAI Setup' },
              { id: 'gemini', label: '3. Gemini Setup' },
              { id: 'verify', label: '4. Verification' },
              { id: 'troubleshoot', label: '5. Troubleshooting' },
              { id: 'security', label: '6. Security' },
              { id: 'billing', label: '7. Billing' },
            ].map((st) => {
              const isSel = setupData.ai_config.active_step_tab === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  onPress={() =>
                    setSetupData((p) => ({
                      ...p,
                      ai_config: { ...p.ai_config, active_step_tab: st.id },
                    }))
                  }
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    marginRight: 6,
                    backgroundColor: isSel ? '#0b53f8' : '#f1f5f9',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: isSel ? '#ffffff' : '#475569',
                    }}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <VStack space="md" style={styles.formStack}>
            {/* SUB-TAB 1: PREREQUISITES */}
            {setupData.ai_config.active_step_tab === 'prerequisites' && (
              <VStack space="sm">
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                  AI Integration Prerequisites
                </Text>
                {[
                  'Active OpenAI or Google Gemini account with API permissions.',
                  'Generated API keys with read/write access for chat & vision models.',
                  'Billing enabled on developer console to prevent rate limit limits.',
                  'Stable internet connection for latency verification.',
                ].map((item, idx) => (
                  <HStack key={idx} space="xs" style={{ alignItems: 'center' }}>
                    <Feather name="check-circle" size={14} color="#16a34a" />
                    <Text style={{ fontSize: 12, color: '#334155' }}>{item}</Text>
                  </HStack>
                ))}
              </VStack>
            )}

            {/* SUB-TAB 2: OPENAI SETUP */}
            {setupData.ai_config.active_step_tab === 'openai' && (
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>OpenAI API Key</Text>
                  <HStack space="xs" style={{ alignItems: 'center' }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={setupData.ai_config.openai_api_key}
                      onChangeText={(v) =>
                        setSetupData((p) => ({
                          ...p,
                          ai_config: { ...p.ai_config, openai_api_key: v },
                        }))
                      }
                      secureTextEntry={!showOpenAIKey}
                      placeholder="sk-..."
                      placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity
                      onPress={() => setShowOpenAIKey(!showOpenAIKey)}
                      style={{ padding: 10, backgroundColor: '#f1f5f9', borderRadius: 10 }}
                    >
                      <Feather name={showOpenAIKey ? 'eye-off' : 'eye'} size={16} color="#64748b" />
                    </TouchableOpacity>
                  </HStack>
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>OpenAI Model Selection</Text>
                  <HStack space="xs">
                    {['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'].map((m) => {
                      const isSel = setupData.ai_config.openai_model === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() =>
                            setSetupData((p) => ({
                              ...p,
                              ai_config: { ...p.ai_config, openai_model: m },
                            }))
                          }
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: isSel ? '#0b53f8' : '#cbd5e1',
                            backgroundColor: isSel ? '#eff6ff' : '#ffffff',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: isSel ? '#0b53f8' : '#64748b',
                            }}
                          >
                            {m}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </HStack>
                </VStack>
              </VStack>
            )}

            {/* SUB-TAB 3: GEMINI SETUP */}
            {setupData.ai_config.active_step_tab === 'gemini' && (
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Google Gemini API Key</Text>
                  <HStack space="xs" style={{ alignItems: 'center' }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={setupData.ai_config.gemini_api_key}
                      onChangeText={(v) =>
                        setSetupData((p) => ({
                          ...p,
                          ai_config: { ...p.ai_config, gemini_api_key: v },
                        }))
                      }
                      secureTextEntry={!showGeminiKey}
                      placeholder="AIzaSy..."
                      placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity
                      onPress={() => setShowGeminiKey(!showGeminiKey)}
                      style={{ padding: 10, backgroundColor: '#f1f5f9', borderRadius: 10 }}
                    >
                      <Feather name={showGeminiKey ? 'eye-off' : 'eye'} size={16} color="#64748b" />
                    </TouchableOpacity>
                  </HStack>
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Gemini Model Selection</Text>
                  <HStack space="xs">
                    {['gemini-1.5-flash', 'gemini-1.5-pro'].map((m) => {
                      const isSel = setupData.ai_config.gemini_model === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() =>
                            setSetupData((p) => ({
                              ...p,
                              ai_config: { ...p.ai_config, gemini_model: m },
                            }))
                          }
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: isSel ? '#0b53f8' : '#cbd5e1',
                            backgroundColor: isSel ? '#eff6ff' : '#ffffff',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: isSel ? '#0b53f8' : '#64748b',
                            }}
                          >
                            {m}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </HStack>
                </VStack>
              </VStack>
            )}

            {/* SUB-TAB 4: VERIFICATION */}
            {setupData.ai_config.active_step_tab === 'verify' && (
              <VStack space="md" style={{ alignItems: 'center', paddingVertical: 10 }}>
                <TouchableOpacity
                  onPress={handleTestAiConnection}
                  disabled={testingConnection}
                  style={{
                    backgroundColor: '#0b53f8',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  {testingConnection ? (
                    <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 6 }} />
                  ) : (
                    <Feather
                      name="refresh-cw"
                      size={14}
                      color="#ffffff"
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
                    {testingConnection ? 'Testing Connection...' : 'Test AI API Keys'}
                  </Text>
                </TouchableOpacity>

                {connectionStatus === 'success' && (
                  <Box
                    style={{
                      backgroundColor: '#dcfce7',
                      borderRadius: 10,
                      padding: 12,
                      width: '100%',
                      alignItems: 'center',
                    }}
                  >
                    <Feather name="check-circle" size={20} color="#16a34a" />
                    <Text
                      style={{ fontSize: 13, fontWeight: '700', color: '#16a34a', marginTop: 4 }}
                    >
                      API Connection Verified!
                    </Text>
                    <Text style={{ fontSize: 11, color: '#15803d' }}>
                      Latency: {connectionLatency}ms • All models operational
                    </Text>
                  </Box>
                )}

                {connectionStatus === 'error' && (
                  <Box
                    style={{
                      backgroundColor: '#fee2e2',
                      borderRadius: 10,
                      padding: 12,
                      width: '100%',
                      alignItems: 'center',
                    }}
                  >
                    <Feather name="alert-triangle" size={20} color="#dc2626" />
                    <Text
                      style={{ fontSize: 13, fontWeight: '700', color: '#dc2626', marginTop: 4 }}
                    >
                      No API Key Provided
                    </Text>
                    <Text style={{ fontSize: 11, color: '#991b1b' }}>
                      Please enter an OpenAI or Gemini API key in setup tabs.
                    </Text>
                  </Box>
                )}
              </VStack>
            )}

            {/* SUB-TAB 5: TROUBLESHOOTING */}
            {setupData.ai_config.active_step_tab === 'troubleshoot' && (
              <VStack space="xs">
                {[
                  {
                    code: '401 Unauthorized',
                    fix: 'Check if the API key was copied correctly without trailing spaces.',
                  },
                  {
                    code: '429 Rate Limit',
                    fix: "Verify that your API quota or credit limit hasn't expired.",
                  },
                  {
                    code: 'Quota Exceeded',
                    fix: 'Enable billing on OpenAI / Google AI Studio developer console.',
                  },
                ].map((tb, idx) => (
                  <Box
                    key={idx}
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>
                      ⚠️ {tb.code}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{tb.fix}</Text>
                  </Box>
                ))}
              </VStack>
            )}

            {/* SUB-TAB 6: SECURITY */}
            {setupData.ai_config.active_step_tab === 'security' && (
              <VStack space="xs">
                <Box
                  style={{
                    backgroundColor: '#eff6ff',
                    padding: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#bfdbfe',
                  }}
                >
                  <HStack space="xs" style={{ alignItems: 'center' }}>
                    <Feather name="lock" size={14} color="#0b53f8" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0b53f8' }}>
                      AES-256 Encrypted Storage
                    </Text>
                  </HStack>
                  <Text style={{ fontSize: 11, color: '#1e40af', marginTop: 4 }}>
                    Your API keys are encrypted at rest using AES-256 and never logged or exposed in
                    client bundles.
                  </Text>
                </Box>
              </VStack>
            )}

            {/* SUB-TAB 7: BILLING */}
            {setupData.ai_config.active_step_tab === 'billing' && (
              <VStack space="xs">
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
                  Estimated Usage & Billing
                </Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>
                  Postbell uses light token prompts (~250 tokens/post). Estimated cost is under
                  $0.05 / 100 generated posts.
                </Text>
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://platform.openai.com/account/billing')}
                  style={{ marginTop: 6 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0b53f8' }}>
                    Manage OpenAI Billing Console ↗
                  </Text>
                </TouchableOpacity>
              </VStack>
            )}

            <TouchableOpacity
              onPress={() => setActiveStep(6)}
              activeOpacity={0.85}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Next: Review Setup →</Text>
            </TouchableOpacity>
          </VStack>
        </Box>
      )}

      {/* STEP 6: REVIEW & FINISH */}
      {activeStep === 6 && (
        <Box style={styles.card}>
          <HStack style={styles.cardHeader}>
            <Box style={styles.cardIconBox}>
              <Feather name="check-circle" size={18} color="#0b53f8" />
            </Box>
            <VStack style={{ flex: 1 }}>
              <Heading style={styles.cardTitle}>Review & Activate</Heading>
              <Text style={styles.cardSubtitle}>
                Review workspace setup summary before activation
              </Text>
            </VStack>
          </HStack>

          <VStack space="md" style={styles.formStack}>
            <Box style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>🏢 Company Profile</Text>
              <Text style={styles.summaryValue}>Name: {setupData.company_name || '—'}</Text>
              <Text style={styles.summaryValue}>Email: {setupData.company_email || '—'}</Text>
              <Text style={styles.summaryValue}>Phone: {setupData.company_phone || '—'}</Text>
              <Text style={styles.summaryValue}>Website: {setupData.company_website || '—'}</Text>
            </Box>

            <Box style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>🔗 Connected Platforms & Links</Text>
              <Text style={styles.summaryValue}>
                Instagram: {setupData.social_links.instagram_url || '—'}
              </Text>
              <Text style={styles.summaryValue}>
                Facebook: {setupData.social_links.facebook_url || '—'}
              </Text>
              <Text style={styles.summaryValue}>
                WhatsApp: {setupData.social_links.whatsapp_number || '—'}
              </Text>
            </Box>

            <Box style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>🎨 Branding & Voice</Text>
              <Text style={styles.summaryValue}>
                Tone: {setupData.branding_preferences.brand_tone}
              </Text>
              <Text style={styles.summaryValue}>
                Primary Color: {setupData.branding_preferences.primary_color}
              </Text>
              <Text style={styles.summaryValue}>
                CTA: {setupData.branding_preferences.default_cta}
              </Text>
            </Box>

            <TouchableOpacity
              onPress={handleSaveWorkspaceSetup}
              disabled={savingConfig}
              activeOpacity={0.85}
              style={[styles.primaryBtn, savingConfig && styles.btnDisabled]}
            >
              {savingConfig ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <HStack style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Feather
                    name="check-circle"
                    size={18}
                    color="#ffffff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.primaryBtnText}>Activate & Complete Setup</Text>
                </HStack>
              )}
            </TouchableOpacity>
          </VStack>
        </Box>
      )}

      {/* AI LOGO GENERATOR MODAL */}
      <AiLogoGeneratorModal
        open={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onLogoSelected={(filename, previewUrl) => {
          setSetupData((prev) => ({ ...prev, company_logo: previewUrl }));
        }}
        initialCompanyName={setupData.company_name}
      />
    </VStack>
  );
}

const styles = StyleSheet.create({
  stepScrollContent: {
    paddingRight: 10,
  },
  stepTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  stepTabActive: {
    backgroundColor: '#0b53f8',
    borderColor: '#0b53f8',
  },
  stepTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  stepTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },

  formStack: {
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },

  logoContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  logoPreviewBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  uploadLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b53f8',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  uploadLogoText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  aiLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  aiLogoText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  socialAuthBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  platformIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0b53f8',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 2,
  },

  primaryBtn: {
    backgroundColor: '#0b53f8',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    elevation: 5,
  },
  profileAvatarBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#0b53f8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    marginVertical: 6,
    position: 'relative',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitial: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0b53f8',
  },
  profileAvatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadProfilePicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b53f8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 2,
  },
  uploadProfilePicText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
