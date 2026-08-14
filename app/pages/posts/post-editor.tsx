import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  TextInput,
  Platform,
  Switch,
  Modal,
  View,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getPost,
  createPost,
  updatePost,
  publishPostNow,
  getAllSocialAccountsForPost,
  generateSocialMediaPost,
  generateMarketingImageFromReference,
  analyzeReferenceMedia,
  uploadPostImage,
  Post,
} from './posts.api';

const CONTENT_TYPES = [
  { value: 'media', label: 'Media', icon: 'image' },
  { value: 'link', label: 'Link', icon: 'link' },
  { value: 'story', label: 'Story', icon: 'book-open' },
  { value: 'text', label: 'Text', icon: 'type' },
];

const SOCIAL_PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: 'facebook-square', color: '#1877f2' },
  { id: 'instagram', label: 'Instagram', icon: 'instagram', color: '#e1306c' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', color: '#25d366' },
  // { id: 'twitter', label: 'Twitter', icon: 'twitter', color: '#1da1f2' },
  // { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', color: '#0a66c2' },
  // { id: 'youtube', label: 'YouTube', icon: 'youtube-play', color: '#ff0000' },
];

const getInitialScheduledDate = () => {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1);
  return nextHour;
};

export default function PostEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const isEditing = Boolean(id);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('manual');
  const [previewTab, setPreviewTab] = useState<string>('all');

  // AI Auto Post State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState<'auto' | 'gemini' | 'openai'>('auto');
  const [aiRefImage, setAiRefImage] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{
    title?: string;
    caption?: string;
    hashtags?: string[];
  } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [postStatus, setPostStatus] = useState<'draft' | 'scheduled' | 'published'>('draft');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(getInitialScheduledDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Platforms & Accounts Selection Modal State
  const [networksModalOpen, setNetworksModalOpen] = useState(false);

  // AI Marketing Image & Reference Media Analysis State
  const [aiMarketingGenerating, setAiMarketingGenerating] = useState(false);
  const [aiMarketingImageUrl, setAiMarketingImageUrl] = useState('');
  const [aiAnalyzingRef, setAiAnalyzingRef] = useState(false);
  const [aiRefAnalysisSummary, setAiRefAnalysisSummary] = useState('');
  const [referenceImageUri, setReferenceImageUri] = useState<string>('');
  const [referenceImagePrompt, setReferenceImagePrompt] = useState<string>('');
  const [referenceImageProvider, setReferenceImageProvider] = useState<
    'auto' | 'gemini' | 'openai'
  >('auto');

  // Content Type & Platform-Specific Overrides
  const [activePlatformTab, setActivePlatformTab] = useState<string>('general');
  const [contentTypeOverrides, setContentTypeOverrides] = useState<Record<string, string>>({});
  const [platformOverrides, setPlatformOverrides] = useState<
    Record<
      string,
      {
        contentType?: string;
        caption?: string;
        link?: string;
        hashtags?: string[];
        image_url?: string;
      }
    >
  >({});
  const [platformHashtagsInput, setPlatformHashtagsInput] = useState<Record<string, string>>({});
  const [uploadingPlatformImage, setUploadingPlatformImage] = useState<Record<string, boolean>>({});

  // Connected Social Accounts
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch Post Details for Edit Mode & Fetch Social Accounts
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let loadedAccounts: any[] = [];
        try {
          const accountsRes = await getAllSocialAccountsForPost();
          if (Array.isArray(accountsRes)) {
            loadedAccounts = accountsRes;
          } else if (accountsRes?.data && Array.isArray(accountsRes.data)) {
            loadedAccounts = accountsRes.data;
          }
          setSocialAccounts(loadedAccounts);
        } catch {
          // Default fallback if social accounts fetch fails
        }

        if (id) {
          const postData: Post = await getPost(id);
          setTitle(postData.title || '');
          setCaption(postData.caption || postData.generalContent?.caption || '');
          setCompanyWebsite(postData.company_website || postData.generalContent?.link || '');
          setCompanyName(postData.company_name || postData.companyName || '');
          setCompanyEmail(postData.company_email || postData.companyEmail || '');
          setCompanyPhone(postData.company_phone || '');
          setHashtagsInput((postData.hashtags || []).join(', '));
          setImageUrl(
            typeof postData.image_url === 'string'
              ? postData.image_url
              : postData.generalContent?.media?.[0]?.url || ''
          );
          setImagePath(postData.image_path || postData.generalContent?.media?.[0]?.imagePath || '');

          if (
            postData.selectedNetworks &&
            Array.isArray(postData.selectedNetworks) &&
            postData.selectedNetworks.length > 0
          ) {
            setSelectedPlatforms(postData.selectedNetworks);
          }

          // Parse selectedAccounts
          const loadedAccIds: string[] = [];
          if (postData.selectedAccounts) {
            if (Array.isArray(postData.selectedAccounts)) {
              loadedAccIds.push(...postData.selectedAccounts);
            } else if (typeof postData.selectedAccounts === 'object') {
              Object.values(postData.selectedAccounts).forEach((accList) => {
                if (Array.isArray(accList)) loadedAccIds.push(...accList);
              });
            }
          }
          if (loadedAccIds.length > 0) {
            setSelectedAccounts(loadedAccIds);
          } else if (loadedAccounts.length > 0) {
            const autoSelected = loadedAccounts
              .filter((acc) =>
                (postData.selectedNetworks || ['facebook', 'instagram']).includes(acc.platform)
              )
              .map((acc) => acc.account_id);
            setSelectedAccounts(autoSelected);
          }

          // Parse platformSpecificContent overrides
          if (
            postData.platformSpecificContent &&
            typeof postData.platformSpecificContent === 'object'
          ) {
            const overridesMap: Record<string, any> = {};
            const initialPlatformTags: Record<string, string> = {};
            Object.entries(postData.platformSpecificContent).forEach(
              ([plat, entries]: [string, any]) => {
                const entryList = Array.isArray(entries) ? entries : [];
                if (entryList.length > 0) {
                  const first = entryList[0];
                  overridesMap[plat] = {
                    caption: first.caption || '',
                    link: first.link || '',
                    hashtags: first.hashtags || [],
                    image_url: first.mediaUrl || first.media_url || '',
                  };
                  if (
                    first.hashtags &&
                    Array.isArray(first.hashtags) &&
                    first.hashtags.length > 0
                  ) {
                    initialPlatformTags[plat] = first.hashtags.join(', ');
                  }
                }
              }
            );
            setPlatformOverrides(overridesMap);
            setPlatformHashtagsInput(initialPlatformTags);
          }

          if (postData.post_status) {
            setPostStatus(postData.post_status as any);
          }
          if (postData.scheduled_at) {
            setIsScheduled(true);
            setScheduledDate(new Date(postData.scheduled_at));
          }
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load post data.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // Image Picker for General Content
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: (ImagePicker as any).MediaType?.Images || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (activeTab === 'ai') {
          setAiRefImage(uri);
        } else {
          setUploadingImage(true);
          try {
            const uploadRes = await uploadPostImage(
              uri,
              result.assets[0].fileName || undefined,
              result.assets[0].mimeType || undefined
            );
            const serverUrl = uploadRes?.imageUrl || uploadRes?.url || uploadRes?.picture || uri;
            const serverPath = uploadRes?.imagePath || uploadRes?.url || uploadRes?.picture || uri;

            setImageUrl(serverUrl);
            setImagePath(serverPath);
            setErrors((prev) => ({ ...prev, imageUrl: '' }));
          } catch {
            setImageUrl(uri);
            setErrors((prev) => ({ ...prev, imageUrl: '' }));
          } finally {
            setUploadingImage(false);
          }
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  // Platform-Specific Image Picker
  const pickPlatformImage = async (platformKey: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: (ImagePicker as any).MediaType?.Images || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setUploadingPlatformImage((prev) => ({ ...prev, [platformKey]: true }));
        try {
          const uploadRes = await uploadPostImage(
            uri,
            result.assets[0].fileName || undefined,
            result.assets[0].mimeType || undefined
          );
          const serverUrl = uploadRes?.imageUrl || uploadRes?.url || uploadRes?.picture || uri;
          setPlatformOverrides((prev) => ({
            ...prev,
            [platformKey]: {
              ...prev[platformKey],
              image_url: serverUrl,
            },
          }));
        } catch {
          setPlatformOverrides((prev) => ({
            ...prev,
            [platformKey]: {
              ...prev[platformKey],
              image_url: uri,
            },
          }));
        } finally {
          setUploadingPlatformImage((prev) => ({ ...prev, [platformKey]: false }));
        }
      }
    } catch {
      Alert.alert('Error', `Failed to pick image for ${platformKey}.`);
    }
  };

  // AI Generation Handler
  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) {
      setErrors((prev) => ({ ...prev, aiPrompt: 'Prompt is required to generate AI post.' }));
      return;
    }
    setErrors((prev) => ({ ...prev, aiPrompt: '' }));
    setAiGenerating(true);
    try {
      const res = await generateSocialMediaPost({
        prompt: aiPrompt,
        provider: aiProvider,
        platform: selectedPlatforms[0] || 'facebook',
      });
      const generatedPost = res?.posts?.[0] || res?.data?.posts?.[0] || res;
      const genTitle = generatedPost?.title || aiPrompt;
      const genCaption = generatedPost?.caption || generatedPost?.post_content || '';
      const genHashtags = generatedPost?.hashtags || [];

      setAiResult({
        title: genTitle,
        caption: genCaption,
        hashtags: Array.isArray(genHashtags) ? genHashtags : [],
      });
    } catch (err: any) {
      Alert.alert('AI Generation Error', err.message || 'Failed to generate post using AI.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Apply AI Content into Form
  const applyAiContent = () => {
    if (!aiResult) return;
    if (aiResult.title) setTitle(aiResult.title);
    if (aiResult.caption) setCaption(aiResult.caption);
    if (aiResult.hashtags && aiResult.hashtags.length > 0) {
      setHashtagsInput(aiResult.hashtags.join(', '));
    }
    setActiveTab('manual');
    Alert.alert('Applied!', 'AI content has been transferred to the Manual Post Composer.');
  };

  // Reference Image Picker Handler
  const pickReferenceImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: (ImagePicker as any).MediaType?.Images || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setReferenceImageUri(uri);
        setAiRefImage(uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick reference image from gallery.');
    }
  };

  // AI Marketing Image from Reference Handler
  const handleGenerateAiMarketingImage = async (customUri?: string): Promise<void> => {
    const imgUri = customUri || referenceImageUri || aiRefImage;
    if (!imgUri) {
      Alert.alert('Reference Image Needed', 'Please attach a reference image first.');
      return;
    }
    setAiMarketingGenerating(true);
    try {
      const res = await generateMarketingImageFromReference(imgUri, {
        prompt: referenceImagePrompt || aiPrompt,
        company_name: companyName,
        company_website: companyWebsite,
        company_email: companyEmail,
        provider: referenceImageProvider || aiProvider,
      });
      const generatedUrl =
        res?.imageUrl || res?.url || res?.image_url || res?.data?.imageUrl || res?.data?.url;
      if (generatedUrl) {
        setAiMarketingImageUrl(generatedUrl);
        setImageUrl(generatedUrl);
        Alert.alert('Success', 'AI Marketing Image generated and applied to post!');
      } else {
        Alert.alert('AI Image Generation', 'Image generation completed successfully.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate AI marketing image.');
    } finally {
      setAiMarketingGenerating(false);
    }
  };

  // AI Reference Media Analysis Handler
  const handleAnalyzeReferenceMedia = async () => {
    if (!aiRefImage) {
      Alert.alert('Reference Image Needed', 'Please attach a reference image first.');
      return;
    }
    setAiAnalyzingRef(true);
    try {
      const res = await analyzeReferenceMedia(aiRefImage);
      const summary =
        res?.summary ||
        res?.data?.summary ||
        res?.message ||
        'Reference media analyzed successfully.';
      setAiRefAnalysisSummary(summary);
      if (summary) {
        setAiPrompt((prev) =>
          prev
            ? `${prev}\n\n[Reference Analysis: ${summary}]`
            : `Create a post based on reference media: ${summary}`
        );
      }
      Alert.alert('Analysis Complete', summary);
    } catch (err: any) {
      Alert.alert('Analysis Error', err.message || 'Failed to analyze reference media.');
    } finally {
      setAiAnalyzingRef(false);
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required.';
    } else if (companyName.trim().length > 100) {
      newErrors.companyName = 'Company name cannot exceed 100 characters.';
    }
    if (title.trim().length > 150) {
      newErrors.title = 'Title cannot exceed 150 characters.';
    }
    if (!caption.trim()) {
      newErrors.caption = 'Caption is required.';
    } else if (caption.trim().length > 2200) {
      newErrors.caption = 'Caption cannot exceed 2200 characters.';
    }
    if (!imageUrl) {
      newErrors.imageUrl = 'Image is required.';
    }
    if (companyWebsite.trim()) {
      if (!/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/i.test(companyWebsite.trim())) {
        newErrors.companyWebsite = 'Please enter a valid URL (e.g. https://example.com).';
      } else if (companyWebsite.trim().length > 500) {
        newErrors.companyWebsite = 'Website URL cannot exceed 500 characters.';
      }
    }
    if (hashtagsInput.trim().length > 300) {
      newErrors.hashtagsInput = 'Hashtags cannot exceed 300 characters.';
    }
    if (selectedPlatforms.length === 0) {
      newErrors.platforms = 'Select at least one social platform.';
    }
    if (socialAccounts.length > 0 && selectedAccounts.length === 0) {
      newErrors.selectedAccounts = 'Please select at least one connected social account.';
    }
    if (isScheduled && scheduledDate < new Date()) {
      newErrors.schedule = 'Scheduled date/time must be in the future.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save / Publish Post
  const handleSavePost = async (targetStatus?: 'draft' | 'published' | 'scheduled') => {
    const isValid = validateForm();
    if (!isValid) {
      scrollToTop();
      return;
    }

    setSaving(true);
    try {
      const hashtagsArray = hashtagsInput
        .split(',')
        .map((h) => h.trim().replace(/^#/, ''))
        .filter(Boolean);

      const isDraft = targetStatus === 'draft';
      const finalStatus = targetStatus || (isScheduled ? 'scheduled' : postStatus);

      // Group flat selectedAccounts -> { facebook: ['acc1'], instagram: ['acc2'] }
      const selectedAccountsObject: Record<string, string[]> = {};
      selectedAccounts.forEach((accId) => {
        let platform = '';
        const acc = socialAccounts.find((a) => a.account_id === accId);
        if (acc) {
          platform = acc.platform;
        }
        if (platform && selectedPlatforms.includes(platform)) {
          if (!selectedAccountsObject[platform]) selectedAccountsObject[platform] = [];
          selectedAccountsObject[platform].push(accId);
        }
      });

      const formatWebsiteUrl = (urlStr?: string) => {
        if (!urlStr || !urlStr.trim()) return undefined;
        const trimmed = urlStr.trim();
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
      };

      const formattedWebsite = formatWebsiteUrl(companyWebsite);

      // Build platformSpecificContent
      const platformSpecificContentObj: Record<string, any[]> = {};
      selectedPlatforms.forEach((platform) => {
        const platformAccs = socialAccounts.filter(
          (a) => a.platform === platform && selectedAccounts.includes(a.account_id)
        );
        const override = platformOverrides[platform] || {};
        const platformContentType =
          override.contentType || contentTypeOverrides[platform] || 'media';

        const platformLink = formatWebsiteUrl(override.link) || formattedWebsite;

        const platformHashtags =
          override.hashtags && override.hashtags.length > 0 ? override.hashtags : hashtagsArray;

        const platformMediaUrl =
          override.image_url !== undefined ? override.image_url : imageUrl || '';

        if (platformAccs.length > 0) {
          platformSpecificContentObj[platform] = platformAccs.map((acc) => ({
            account_id: acc.account_id,
            caption: override.caption || caption || '',
            link: platformLink || '',
            hashtags: platformHashtags,
            mediaUrl: platformMediaUrl,
            contentType: platformContentType,
            post_status: finalStatus,
          }));
        } else {
          platformSpecificContentObj[platform] = [
            {
              account_id: '',
              caption: override.caption || caption || '',
              link: platformLink || '',
              hashtags: platformHashtags,
              mediaUrl: platformMediaUrl,
              contentType: platformContentType,
              post_status: finalStatus,
            },
          ];
        }
      });

      const payload: any = {
        isDraft,
        title: title || caption.slice(0, 30) || 'Untitled Post',
        company_name: companyName || '',
        company_email: companyEmail || '',
        company_phone: companyPhone || '',
        company_website: formattedWebsite || '',
        caption,
        hashtags: hashtagsArray,
        selectedNetworks: selectedPlatforms,
        selectedAccounts: selectedAccountsObject,
        image_url: imageUrl || undefined,
        image_path: imagePath || imageUrl || undefined,
        generalContent: {
          caption,
          link: formattedWebsite || '',
          media: imageUrl
            ? [
                {
                  type: 'image',
                  url: imageUrl,
                  imagePath: imagePath || imageUrl,
                },
              ]
            : [],
        },
        platformSpecificContent: platformSpecificContentObj,
        post_status: finalStatus,
        ...(isScheduled && {
          scheduled_at: scheduledDate.toISOString(),
          isScheduled: true,
        }),
      };

      if (isEditing && id) {
        await updatePost(id, payload);
        if (targetStatus === 'published') {
          await publishPostNow(id);
        }
        Alert.alert('Success', 'Post updated successfully!');
      } else {
        const created = await createPost(payload);
        const newId = created?._id || created?.id || created?.data?._id;
        if (targetStatus === 'published' && newId) {
          await publishPostNow(newId);
        }
        Alert.alert('Success', 'Post created successfully!');
      }

      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (pId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(pId) ? prev.filter((x) => x !== pId) : [...prev, pId]
    );
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#0052d4" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading Post Editor...</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <Box style={styles.header} className="px-5 pb-4 pt-14">
        <HStack className="items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Heading size="lg" style={{ color: '#fff', fontWeight: '700' }}>
            {isEditing ? 'Edit Post' : 'Add New Post'}
          </Heading>
          <TouchableOpacity
            style={styles.headerSaveBtn}
            onPress={() => handleSavePost('published')}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.headerSaveText}>Publish</Text>
            )}
          </TouchableOpacity>
        </HStack>

        {/* Main Tab Bar (AI Auto Post vs Manual Posting) */}
        <HStack style={styles.mainTabBar} className="mt-4">
          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === 'ai' && styles.mainTabBtnActive]}
            onPress={() => setActiveTab('ai')}
          >
            <Feather
              name="cpu"
              size={16}
              color={activeTab === 'ai' ? '#0052d4' : '#fff'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.mainTabLabel, activeTab === 'ai' && styles.mainTabLabelActive]}>
              AI Auto Post
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === 'manual' && styles.mainTabBtnActive]}
            onPress={() => setActiveTab('manual')}
          >
            <Feather
              name="edit-3"
              size={16}
              color={activeTab === 'manual' ? '#0052d4' : '#fff'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.mainTabLabel, activeTab === 'manual' && styles.mainTabLabelActive]}
            >
              Manual Posting
            </Text>
          </TouchableOpacity>
        </HStack>
      </Box>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* TAB 1: AI AUTO POST */}
        {/* ================================================================= */}
        {activeTab === 'ai' && (
          <VStack space="md">
            <Box style={styles.card}>
              <HStack space="xs" className="items-center">
                <Ionicons name="sparkles" size={18} color="#2563eb" />
                <Heading size="sm" style={styles.cardTitle}>
                  Generate Post with AI
                </Heading>
              </HStack>
              <Text style={styles.cardSub}>
                Describe your post topic or campaign idea, and AI will auto-generate copy, hashtags,
                and format.
              </Text>

              {/* Prompt Input */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>AI Prompt / Campaign Idea *</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.multilineInput,
                    errors.aiPrompt ? styles.inputError : null,
                  ]}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  placeholder="e.g. Write an engaging social post for a 20% weekend discount on summer collection..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                />
                {errors.aiPrompt && <Text style={styles.errorText}>{errors.aiPrompt}</Text>}
              </VStack>

              {/* AI Model Selector */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>Select AI Model</Text>
                <HStack space="xs" className="mt-1">
                  {(['auto', 'gemini', 'openai'] as const).map((prov) => (
                    <TouchableOpacity
                      key={prov}
                      style={[
                        styles.providerChip,
                        aiProvider === prov && styles.providerChipActive,
                        { flexDirection: 'row', alignItems: 'center', gap: 5 },
                      ]}
                      onPress={() => setAiProvider(prov)}
                    >
                      {prov === 'auto' && (
                        <Feather
                          name="zap"
                          size={13}
                          color={aiProvider === prov ? '#0369a1' : '#64748b'}
                        />
                      )}
                      {prov === 'gemini' && (
                        <Ionicons
                          name="sparkles"
                          size={13}
                          color={aiProvider === prov ? '#0369a1' : '#64748b'}
                        />
                      )}
                      {prov === 'openai' && (
                        <Feather
                          name="cpu"
                          size={13}
                          color={aiProvider === prov ? '#0369a1' : '#64748b'}
                        />
                      )}
                      <Text
                        style={[
                          styles.providerChipText,
                          aiProvider === prov && styles.providerChipTextActive,
                        ]}
                      >
                        {prov === 'auto' ? 'Auto' : prov === 'gemini' ? 'Gemini' : 'OpenAI'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>

              {/* Reference Image Attachment */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>
                  Optional Reference Image (AI Marketing Image Generator)
                </Text>
                {aiRefImage ? (
                  <Box style={styles.imagePreviewBox}>
                    <Image source={{ uri: aiRefImage }} style={styles.uploadedImage} />
                    <TouchableOpacity onPress={() => setAiRefImage('')} style={styles.removeImgBtn}>
                      <Feather name="trash-2" size={16} color="#fff" />
                    </TouchableOpacity>
                  </Box>
                ) : (
                  <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                    <Feather name="image" size={24} color="#0052d4" />
                    <Text style={styles.uploadText}>Attach Reference Image</Text>
                  </TouchableOpacity>
                )}

                {aiRefImage ? (
                  <VStack space="xs" style={{ marginTop: 10 }}>
                    <HStack space="xs">
                      <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: '#0284c7', flex: 1 }]}
                        onPress={handleAnalyzeReferenceMedia}
                        disabled={aiAnalyzingRef}
                      >
                        {aiAnalyzingRef ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Feather
                              name="search"
                              size={14}
                              color="#fff"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.primaryBtnText, { fontSize: 12 }]}>
                              Analyze Media
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: '#1f1e22ff', flex: 1 }]}
                        onPress={() => handleGenerateAiMarketingImage()}
                        disabled={aiMarketingGenerating}
                      >
                        {aiMarketingGenerating ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Feather
                              name="image"
                              size={14}
                              color="#fff"
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.primaryBtnText, { fontSize: 12 }]}>
                              Generate AI Image
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </HStack>

                    {aiRefAnalysisSummary ? (
                      <Box
                        style={{
                          backgroundColor: '#f0f9ff',
                          padding: 8,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: '#bae6fd',
                          marginTop: 4,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: '#0369a1', fontWeight: '600' }}>
                          🔍 Analysis Summary: {aiRefAnalysisSummary}
                        </Text>
                      </Box>
                    ) : null}
                  </VStack>
                ) : null}
              </VStack>

              {/* Generate Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 16 }]}
                onPress={handleGenerateAi}
                disabled={aiGenerating}
              >
                {aiGenerating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="zap" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Generate AI Post</Text>
                  </>
                )}
              </TouchableOpacity>
            </Box>

            {/* AI Generated Result Preview Card */}
            {aiResult && (
              <Box style={[styles.card, styles.aiResultCard]}>
                <HStack className="mb-2 items-center justify-between">
                  <Heading size="xs" style={{ color: '#0052d4', fontWeight: '700' }}>
                    ✨ AI Generated Output
                  </Heading>
                  <TouchableOpacity style={styles.applyBtn} onPress={applyAiContent}>
                    <Text style={styles.applyBtnText}>Apply to Composer →</Text>
                  </TouchableOpacity>
                </HStack>

                {aiResult.title && (
                  <Text
                    style={{ fontWeight: '700', color: '#0f172a', fontSize: 14, marginBottom: 4 }}
                  >
                    {aiResult.title}
                  </Text>
                )}
                <Text style={{ color: '#334155', fontSize: 13, lineHeight: 20 }}>
                  {aiResult.caption}
                </Text>
                {aiResult.hashtags && aiResult.hashtags.length > 0 && (
                  <HStack space="xs" className="mt-2 flex-wrap">
                    {aiResult.hashtags.map((tag, idx) => (
                      <Box key={idx} style={styles.tagChip}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </Box>
                    ))}
                  </HStack>
                )}
              </Box>
            )}
          </VStack>
        )}

        {/* ================================================================= */}
        {/* TAB 2: MANUAL POSTING COMPOSER */}
        {/* ================================================================= */}
        {activeTab === 'manual' && (
          <VStack space="md">
            {/* Form Validation Global Error Banner */}
            {errors.main && (
              <Box style={styles.errorBanner}>
                <Feather name="alert-circle" size={18} color="#dc2626" style={{ marginRight: 8 }} />
                <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '600', flex: 1 }}>
                  {errors.main}
                </Text>
              </Box>
            )}

            {/* 1. AI Image Generator from Reference Card */}
            <Box style={styles.card}>
              <HStack className="mb-2 items-center justify-between">
                <HStack space="xs" className="items-center gap-2">
                  <Ionicons name="sparkles" size={18} color="#2563eb" />
                  <Heading size="sm" style={styles.cardTitle}>
                    AI Image Generator from Reference
                  </Heading>
                </HStack>
                {referenceImageUri || aiRefImage ? (
                  <TouchableOpacity
                    onPress={() => {
                      setReferenceImageUri('');
                      setAiRefImage('');
                      setAiMarketingImageUrl('');
                    }}
                  >
                    <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600' }}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </HStack>
              <Text style={styles.cardSub}>
                Upload a product or reference image, and AI will create a premium marketing poster
                with cinematic lighting and professional composition.
              </Text>

              {!(referenceImageUri || aiRefImage) ? (
                <TouchableOpacity
                  style={[
                    styles.uploadBox,
                    { borderStyle: 'dashed', marginTop: 12, backgroundColor: '#f8fafc' },
                  ]}
                  onPress={pickReferenceImage}
                >
                  <Feather name="upload" size={24} color="#2563eb" />
                  <Text style={[styles.uploadText, { color: '#2563eb', fontWeight: '700' }]}>
                    Upload Reference Image
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Select image to generate AI marketing poster
                  </Text>
                </TouchableOpacity>
              ) : (
                <VStack space="md" style={{ marginTop: 12 }}>
                  {/* Reference Image Preview */}
                  <Box style={styles.imagePreviewBox}>
                    <Image
                      source={{ uri: referenceImageUri || aiRefImage }}
                      style={styles.uploadedImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImgBtn}
                      onPress={() => {
                        setReferenceImageUri('');
                        setAiRefImage('');
                        setAiMarketingImageUrl('');
                      }}
                    >
                      <Feather name="trash-2" size={16} color="#fff" />
                    </TouchableOpacity>
                  </Box>

                  {/* Optional Custom Reference Image Prompt */}
                  <VStack space="xs">
                    <Text style={styles.inputLabel}>Custom Image Style / Prompt (Optional)</Text>
                    <TextInput
                      style={[styles.input, { fontSize: 13 }]}
                      value={referenceImagePrompt}
                      onChangeText={setReferenceImagePrompt}
                      placeholder="e.g. Sleek luxury product display with soft volumetric lighting and modern reflections..."
                      placeholderTextColor="#94a3b8"
                      maxLength={500}
                    />
                  </VStack>

                  {/* Provider Selection */}
                  <VStack space="xs">
                    <Text style={styles.inputLabel}>AI Model Provider</Text>
                    <HStack space="xs">
                      {(['auto', 'gemini', 'openai'] as const).map((prov) => (
                        <TouchableOpacity
                          key={prov}
                          style={[
                            styles.providerChip,
                            referenceImageProvider === prov && styles.providerChipActive,
                            { flexDirection: 'row', alignItems: 'center', gap: 5 },
                          ]}
                          onPress={() => setReferenceImageProvider(prov)}
                        >
                          {prov === 'auto' && (
                            <Feather
                              name="zap"
                              size={13}
                              color={referenceImageProvider === prov ? '#0369a1' : '#64748b'}
                            />
                          )}
                          {prov === 'gemini' && (
                            <Ionicons
                              name="sparkles"
                              size={13}
                              color={referenceImageProvider === prov ? '#0369a1' : '#64748b'}
                            />
                          )}
                          {prov === 'openai' && (
                            <Feather
                              name="cpu"
                              size={13}
                              color={referenceImageProvider === prov ? '#0369a1' : '#64748b'}
                            />
                          )}
                          <Text
                            style={[
                              styles.providerChipText,
                              referenceImageProvider === prov && styles.providerChipTextActive,
                            ]}
                          >
                            {prov === 'auto' ? 'Auto' : prov === 'gemini' ? 'Gemini' : 'OpenAI'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </HStack>
                  </VStack>

                  {/* Generate AI Marketing Image Button */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: '#7c3aed' }]}
                    onPress={() => handleGenerateAiMarketingImage(referenceImageUri || aiRefImage)}
                    disabled={aiMarketingGenerating}
                  >
                    {aiMarketingGenerating ? (
                      <HStack space="xs" className="items-center">
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.primaryBtnText}> Generating AI Marketing Image...</Text>
                      </HStack>
                    ) : (
                      <HStack space="xs" className="items-center">
                        <Ionicons
                          name="sparkles"
                          size={16}
                          color="#fff"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.primaryBtnText}>Generate AI Marketing Poster</Text>
                      </HStack>
                    )}
                  </TouchableOpacity>

                  {/* AI Generated Marketing Image Preview */}
                  {aiMarketingImageUrl ? (
                    <Box
                      style={{
                        backgroundColor: '#f5f3ff',
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#ddd6fe',
                        marginTop: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '700',
                          color: '#6d28d9',
                          fontSize: 13,
                          marginBottom: 8,
                        }}
                      >
                        ✨ AI Generated Marketing Image
                      </Text>
                      <Box style={styles.imagePreviewBox}>
                        <Image
                          source={{ uri: aiMarketingImageUrl }}
                          style={styles.uploadedImage}
                          resizeMode="cover"
                        />
                      </Box>
                      <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: '#2563eb', marginTop: 10 }]}
                        onPress={() => {
                          setImageUrl(aiMarketingImageUrl);
                          Alert.alert('Applied!', 'AI generated image set as post media.');
                        }}
                      >
                        <Text style={styles.primaryBtnText}>Use This Image in Post ✓</Text>
                      </TouchableOpacity>
                    </Box>
                  ) : null}
                </VStack>
              )}
            </Box>

            {/* 2. General Content Card */}
            <Box style={styles.card}>
              <HStack space="xs" className="items-center gap-2">
                <Feather name="edit-3" size={17} color="#2563eb" />
                <Heading size="sm" style={styles.cardTitle}>
                  General Content
                </Heading>
              </HStack>

              {/* Company Name Field */}
              <VStack style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Company Name *</Text>
                <TextInput
                  style={[styles.input, errors.companyName ? styles.inputError : null]}
                  value={companyName}
                  onChangeText={(text) => {
                    setCompanyName(text);
                    if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: '' }));
                  }}
                  placeholder="Enter company / brand name"
                  placeholderTextColor="#94a3b8"
                  maxLength={100}
                />
                {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}
              </VStack>

              {/* Caption Field */}
              <VStack style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Caption *</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.multilineInput,
                    errors.caption ? styles.inputError : null,
                  ]}
                  value={caption}
                  onChangeText={(text) => {
                    setCaption(text);
                    if (errors.caption || errors.main)
                      setErrors((prev) => ({ ...prev, caption: '', main: '' }));
                  }}
                  placeholder="Write your post caption..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  maxLength={2200}
                />
                {errors.caption && <Text style={styles.errorText}>{errors.caption}</Text>}
              </VStack>

              {/* Hashtags Field */}
              <VStack style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Hashtags (comma separated)</Text>
                <TextInput
                  style={[styles.input, errors.hashtagsInput ? styles.inputError : null]}
                  value={hashtagsInput}
                  onChangeText={(text) => {
                    setHashtagsInput(text);
                    if (errors.hashtagsInput) setErrors((prev) => ({ ...prev, hashtagsInput: '' }));
                  }}
                  placeholder="marketing, promotion, offer"
                  placeholderTextColor="#94a3b8"
                  maxLength={300}
                />
                {errors.hashtagsInput && (
                  <Text style={styles.errorText}>{errors.hashtagsInput}</Text>
                )}
                {hashtagsInput.trim().length > 0 && (
                  <HStack space="xs" className="mt-2 flex-wrap">
                    {hashtagsInput.split(',').map((tag, idx) => {
                      const trimmed = tag.trim().replace(/^#/, '');
                      if (!trimmed) return null;
                      return (
                        <Box key={idx} style={styles.tagChip}>
                          <Text style={styles.tagText}>#{trimmed}</Text>
                        </Box>
                      );
                    })}
                  </HStack>
                )}
              </VStack>

              {/* Image Uploader inside General Content */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>Image Uploader *</Text>
                {imageUrl ? (
                  <Box style={styles.imagePreviewBox}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.uploadedImage}
                      resizeMode="cover"
                    />
                    <HStack space="xs" style={styles.imageActionOverlay}>
                      <TouchableOpacity style={styles.imgActionBtn} onPress={pickImage}>
                        <Feather name="refresh-cw" size={14} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.imgActionBtn, { backgroundColor: '#dc2626' }]}
                        onPress={() => setImageUrl('')}
                      >
                        <Feather name="trash-2" size={14} color="#fff" />
                      </TouchableOpacity>
                    </HStack>
                  </Box>
                ) : (
                  <VStack space="xs" style={{ marginTop: 6 }}>
                    <TouchableOpacity
                      style={[styles.uploadBox, errors.imageUrl ? styles.inputError : null]}
                      onPress={pickImage}
                    >
                      <Feather name="upload-cloud" size={28} color="#0052d4" />
                      <Text style={styles.uploadText}>Choose Image from Gallery</Text>
                      <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                        Supports JPG, PNG, WEBP
                      </Text>
                    </TouchableOpacity>
                  </VStack>
                )}
                {errors.imageUrl && <Text style={styles.errorText}>{errors.imageUrl}</Text>}
              </VStack>
            </Box>

            {/* 3. Target Platforms Picker Card */}
            <Box style={styles.card}>
              <HStack className="items-center justify-between">
                <HStack space="xs" className="items-center gap-2">
                  <Feather name="share-2" size={17} color="#2563eb" />
                  <Heading size="sm" style={styles.cardTitle}>
                    Select Target Social Platforms *
                  </Heading>
                </HStack>
              </HStack>
              {errors.platforms && <Text style={styles.errorText}>{errors.platforms}</Text>}

              <HStack space="xs" className="mt-3 flex-wrap">
                {SOCIAL_PLATFORMS.map((plat) => {
                  const isSelected = selectedPlatforms.includes(plat.id);
                  return (
                    <TouchableOpacity
                      key={plat.id}
                      style={[styles.platformPill, isSelected && styles.platformPillActive]}
                      onPress={() => togglePlatform(plat.id)}
                    >
                      <FontAwesome
                        name={plat.icon as any}
                        size={16}
                        color={isSelected ? '#fff' : plat.color}
                      />
                      <Text
                        style={[
                          styles.platformPillLabel,
                          isSelected && styles.platformPillLabelActive,
                        ]}
                      >
                        {plat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HStack>

              {/* Connected Accounts Selection */}
              {socialAccounts.length > 0 && (
                <VStack
                  style={{
                    marginTop: 14,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: '#64748b',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Select Connected Accounts ({selectedAccounts.length}/{socialAccounts.length})
                  </Text>
                  {errors.selectedAccounts && (
                    <Text style={styles.errorText}>{errors.selectedAccounts}</Text>
                  )}
                  <HStack space="xs" className="flex-wrap">
                    {socialAccounts.map((acc) => {
                      const isAccSelected = selectedAccounts.includes(acc.account_id);
                      return (
                        <TouchableOpacity
                          key={acc.account_id}
                          style={[styles.accountPill, isAccSelected && styles.accountPillActive]}
                          onPress={() => {
                            setSelectedAccounts((prev) =>
                              prev.includes(acc.account_id)
                                ? prev.filter((id) => id !== acc.account_id)
                                : [...prev, acc.account_id]
                            );
                          }}
                        >
                          <Feather
                            name={isAccSelected ? 'check-circle' : 'circle'}
                            size={13}
                            color={isAccSelected ? '#0052d4' : '#94a3b8'}
                            style={{ marginRight: 5 }}
                          />
                          <Text
                            style={[
                              styles.accountPillText,
                              isAccSelected && styles.accountPillTextActive,
                            ]}
                          >
                            {acc.account_name || acc.username || acc.platform}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </HStack>
                </VStack>
              )}
            </Box>

            <TouchableOpacity
              onPress={() => setNetworksModalOpen(true)}
              style={{
                backgroundColor: '#2563EB',
                height: 42,
                paddingHorizontal: 18,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Feather name="settings" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 15, color: '#fff', fontWeight: '900' }}>
                Platform Configuration
              </Text>
            </TouchableOpacity>

            {/* 4. Platform-Specific Content Card (Displayed when platforms are selected) */}
            {selectedPlatforms.length > 0 && (
              <Box style={styles.card}>
                <HStack space="xs" className="items-center gap-2">
                  <Feather name="sliders" size={17} color="#2563eb" />
                  <Heading size="sm" style={styles.cardTitle}>
                    Platform-Specific Content
                  </Heading>
                </HStack>
                <Text style={styles.cardSub}>
                  Customize caption, link, or image specifically for each selected social platform.
                </Text>

                {/* Sub-Tabs for Selected Platforms */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.subTabList}
                  style={{ marginTop: 10 }}
                >
                  {selectedPlatforms.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.subTabBtn,
                        (activePlatformTab === p ||
                          (activePlatformTab === 'general' && selectedPlatforms[0] === p)) &&
                          styles.subTabBtnActive,
                      ]}
                      onPress={() => setActivePlatformTab(p)}
                    >
                      <Text
                        style={[
                          styles.subTabText,
                          (activePlatformTab === p ||
                            (activePlatformTab === 'general' && selectedPlatforms[0] === p)) &&
                            styles.subTabTextActive,
                        ]}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {(() => {
                  const targetPlatform =
                    activePlatformTab !== 'general' && selectedPlatforms.includes(activePlatformTab)
                      ? activePlatformTab
                      : selectedPlatforms[0];

                  if (!targetPlatform) return null;

                  const currentOverride = platformOverrides[targetPlatform] || {};
                  const activeCt =
                    currentOverride.contentType || contentTypeOverrides[targetPlatform] || 'media';

                  return (
                    <VStack space="sm" style={{ marginTop: 12 }}>
                      {/* Content Type Selector */}
                      <VStack space="xs">
                        <Text style={styles.inputLabel}>
                          Content Type ({targetPlatform.toUpperCase()})
                        </Text>
                        <HStack space="xs" className="mt-1 flex-wrap">
                          {CONTENT_TYPES.map((ct) => {
                            const isSelected = activeCt === ct.value;
                            return (
                              <TouchableOpacity
                                key={ct.value}
                                style={[
                                  styles.providerChip,
                                  isSelected && styles.providerChipActive,
                                ]}
                                onPress={() => {
                                  setContentTypeOverrides((prev) => ({
                                    ...prev,
                                    [targetPlatform]: ct.value,
                                  }));
                                  setPlatformOverrides((prev) => ({
                                    ...prev,
                                    [targetPlatform]: {
                                      ...prev[targetPlatform],
                                      contentType: ct.value,
                                    },
                                  }));
                                }}
                              >
                                <Text
                                  style={[
                                    styles.providerChipText,
                                    isSelected && styles.providerChipTextActive,
                                  ]}
                                >
                                  {ct.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </HStack>
                      </VStack>

                      {/* Platform Specific Caption */}
                      <VStack space="xs" style={{ marginTop: 8 }}>
                        <Text style={styles.inputLabel}>
                          {targetPlatform.toUpperCase()} Caption
                        </Text>
                        <TextInput
                          style={[styles.input, styles.multilineInput]}
                          value={currentOverride.caption ?? caption}
                          onChangeText={(val) => {
                            setPlatformOverrides((prev) => ({
                              ...prev,
                              [targetPlatform]: {
                                ...prev[targetPlatform],
                                caption: val,
                              },
                            }));
                          }}
                          placeholder={`Custom caption for ${targetPlatform}...`}
                          placeholderTextColor="#94a3b8"
                          multiline
                          numberOfLines={4}
                          maxLength={2200}
                        />
                      </VStack>

                      {/* Platform Specific Custom Link  */}
                      <VStack space="xs" style={{ marginTop: 8 }}>
                        <Text style={styles.inputLabel}>
                          {targetPlatform.toUpperCase()} Custom Link
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={currentOverride.link ?? companyWebsite}
                          onChangeText={(val) => {
                            setPlatformOverrides((prev) => ({
                              ...prev,
                              [targetPlatform]: {
                                ...prev[targetPlatform],
                                link: val,
                              },
                            }));
                          }}
                          placeholder={`Custom link for ${targetPlatform}`}
                          placeholderTextColor="#94a3b8"
                          keyboardType="url"
                          autoCapitalize="none"
                          maxLength={500}
                        />
                      </VStack>

                      {/* Platform Specific Hashtags */}
                      <VStack space="xs" style={{ marginTop: 8 }}>
                        <Text style={styles.inputLabel}>
                          {targetPlatform.toUpperCase()} Hashtags (comma separated)
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={
                            platformHashtagsInput[targetPlatform] !== undefined
                              ? platformHashtagsInput[targetPlatform]
                              : currentOverride.hashtags && currentOverride.hashtags.length > 0
                                ? currentOverride.hashtags.join(', ')
                                : hashtagsInput
                          }
                          onChangeText={(val) => {
                            setPlatformHashtagsInput((prev) => ({
                              ...prev,
                              [targetPlatform]: val,
                            }));
                            const parsed = val
                              .split(',')
                              .map((tag) => tag.replace(/^#/, '').trim())
                              .filter(Boolean);
                            setPlatformOverrides((prev) => ({
                              ...prev,
                              [targetPlatform]: {
                                ...prev[targetPlatform],
                                hashtags: parsed,
                              },
                            }));
                          }}
                          placeholder={`Custom hashtags for ${targetPlatform}...`}
                          placeholderTextColor="#94a3b8"
                          maxLength={300}
                        />
                        {(() => {
                          const rawVal =
                            platformHashtagsInput[targetPlatform] !== undefined
                              ? platformHashtagsInput[targetPlatform]
                              : currentOverride.hashtags && currentOverride.hashtags.length > 0
                                ? currentOverride.hashtags.join(', ')
                                : hashtagsInput;
                          if (!rawVal || !rawVal.trim()) return null;
                          const tags = rawVal
                            .split(',')
                            .map((t) => t.trim().replace(/^#/, ''))
                            .filter(Boolean);
                          if (tags.length === 0) return null;
                          return (
                            <HStack space="xs" className="mt-2 flex-wrap">
                              {tags.map((tag, idx) => (
                                <Box key={idx} style={styles.tagChip}>
                                  <Text style={styles.tagText}>#{tag}</Text>
                                </Box>
                              ))}
                            </HStack>
                          );
                        })()}
                      </VStack>

                      {/* Platform Specific Image Override */}
                      <VStack space="xs" style={{ marginTop: 8 }}>
                        <HStack className="items-center justify-between">
                          <Text style={styles.inputLabel}>
                            {targetPlatform.toUpperCase()} Image
                          </Text>
                          {currentOverride.image_url !== undefined &&
                            currentOverride.image_url !== imageUrl &&
                            Boolean(imageUrl) && (
                              <TouchableOpacity
                                onPress={() => {
                                  setPlatformOverrides((prev) => {
                                    const updated = { ...prev[targetPlatform] };
                                    delete updated.image_url;
                                    return { ...prev, [targetPlatform]: updated };
                                  });
                                }}
                              >
                                <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '600' }}>
                                  Reset to General Image
                                </Text>
                              </TouchableOpacity>
                            )}
                        </HStack>

                        {(() => {
                          const displayPlatformImg =
                            currentOverride.image_url !== undefined
                              ? currentOverride.image_url
                              : imageUrl;
                          const isUploading = Boolean(uploadingPlatformImage[targetPlatform]);

                          if (displayPlatformImg) {
                            return (
                              <Box style={styles.imagePreviewBox}>
                                <Image
                                  source={{ uri: displayPlatformImg }}
                                  style={styles.uploadedImage}
                                  resizeMode="cover"
                                />
                                <HStack space="xs" style={styles.imageActionOverlay}>
                                  <TouchableOpacity
                                    style={styles.imgActionBtn}
                                    onPress={() => pickPlatformImage(targetPlatform)}
                                    disabled={isUploading}
                                  >
                                    {isUploading ? (
                                      <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                      <Feather name="refresh-cw" size={14} color="#fff" />
                                    )}
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.imgActionBtn, { backgroundColor: '#dc2626' }]}
                                    onPress={() => {
                                      setPlatformOverrides((prev) => ({
                                        ...prev,
                                        [targetPlatform]: {
                                          ...prev[targetPlatform],
                                          image_url: '',
                                        },
                                      }));
                                    }}
                                  >
                                    <Feather name="trash-2" size={14} color="#fff" />
                                  </TouchableOpacity>
                                </HStack>
                              </Box>
                            );
                          }

                          return (
                            <TouchableOpacity
                              style={[styles.uploadBox, { paddingVertical: 12 }]}
                              onPress={() => pickPlatformImage(targetPlatform)}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <ActivityIndicator size="small" color="#0052d4" />
                              ) : (
                                <>
                                  <Feather name="image" size={20} color="#0052d4" />
                                  <Text style={[styles.uploadText, { fontSize: 12 }]}>
                                    Upload Image for {targetPlatform.toUpperCase()}
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          );
                        })()}
                      </VStack>
                    </VStack>
                  );
                })()}
              </Box>
            )}

            {/* Publishing & Scheduling Section */}
            <Box style={styles.card}>
              <HStack space="xs" className="items-center gap-2">
                <Feather name="calendar" size={17} color="#2563eb" />
                <Heading size="sm" style={styles.cardTitle}>
                  Publishing & Scheduling
                </Heading>
              </HStack>

              <HStack className="mt-3 items-center justify-between">
                <VStack style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 14 }}>
                    Schedule for later
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>
                    Set automatic date & time for publishing
                  </Text>
                </VStack>
                <Switch
                  value={isScheduled}
                  onValueChange={(val) => {
                    setIsScheduled(val);
                    setPostStatus(val ? 'scheduled' : 'draft');
                  }}
                  trackColor={{ false: '#cbd5e1', true: '#0052d4' }}
                />
              </HStack>

              {isScheduled && (
                <VStack
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9',
                  }}
                >
                  <Text style={styles.inputLabel}>Scheduled Date & Time</Text>
                  {errors.schedule && <Text style={styles.errorText}>{errors.schedule}</Text>}
                  <HStack space="sm" className="mt-1">
                    <TouchableOpacity
                      style={styles.datePickerBtn}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Feather
                        name="calendar"
                        size={16}
                        color="#0052d4"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: '600' }}>
                        {scheduledDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.datePickerBtn}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Feather name="clock" size={16} color="#0052d4" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: '600' }}>
                        {scheduledDate.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </TouchableOpacity>
                  </HStack>

                  {showDatePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_e, date) => {
                        setShowDatePicker(false);
                        if (date) setScheduledDate(date);
                      }}
                    />
                  )}

                  {showTimePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_e, date) => {
                        setShowTimePicker(false);
                        if (date) setScheduledDate(date);
                      }}
                    />
                  )}
                </VStack>
              )}
            </Box>

            {/* Live Social Post Preview Panel (Per Platform & Per Account matching Control Panel) */}
            <Box style={styles.card}>
              <VStack space="xs" className="mb-3">
                <HStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <HStack space="xs" style={{ alignItems: 'center', gap: 4 }}>
                    <Feather name="eye" size={17} color="#2563eb" />
                    <Heading size="sm" style={styles.cardTitle}>
                      Preview
                    </Heading>
                  </HStack>

                  {/* Filter tabs: All, Facebook, Instagram, WhatsApp, etc. */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1, marginLeft: 10 }}
                    contentContainerStyle={{
                      gap: 4,
                      justifyContent: 'flex-end',
                      flexGrow: 1,
                      alignItems: 'center',
                    }}
                  >
                    <TouchableOpacity
                      style={[styles.miniPrevTab, previewTab === 'all' && styles.miniPrevTabActive]}
                      onPress={() => setPreviewTab('all')}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: previewTab === 'all' ? '#0052d4' : '#64748b',
                        }}
                      >
                        ALL
                      </Text>
                    </TouchableOpacity>
                    {SOCIAL_PLATFORMS.map((p) => {
                      const isSelected = previewTab === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.miniPrevTab, isSelected && styles.miniPrevTabActive]}
                          onPress={() => setPreviewTab(p.id)}
                        >
                          <FontAwesome
                            name={p.icon as any}
                            size={13}
                            color={isSelected ? p.color : '#64748b'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </HStack>
                <Text style={{ fontSize: 11, color: '#64748b' }}>
                  Per Platform & Per Account Preview
                </Text>
              </VStack>

              {/* Preview Content Listing */}
              {(() => {
                // Check if any image is uploaded (general or platform specific)
                const hasImageUploaded = Boolean(
                  imageUrl ||
                  imagePath ||
                  Object.values(platformOverrides).some((o) => Boolean(o?.image_url))
                );

                // If no platforms are selected
                if (selectedPlatforms.length === 0) {
                  return (
                    <Box
                      style={{
                        paddingVertical: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="eye-off" size={32} color="#cbd5e1" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#94a3b8',
                          marginTop: 8,
                          fontStyle: 'italic',
                          textAlign: 'center',
                        }}
                      >
                        Select target social platforms in '⚙️ Platform' modal to see preview
                      </Text>
                    </Box>
                  );
                }

                // If platforms selected but no image uploaded yet
                if (!hasImageUploaded) {
                  return (
                    <Box
                      style={{
                        paddingVertical: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="image" size={32} color="#cbd5e1" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#94a3b8',
                          marginTop: 8,
                          fontStyle: 'italic',
                          textAlign: 'center',
                        }}
                      >
                        Upload an image to see live post preview
                      </Text>
                    </Box>
                  );
                }

                // Filter active platforms to show based on previewTab
                const activeNetworks =
                  previewTab === 'all'
                    ? selectedPlatforms
                    : selectedPlatforms.filter((net) => net === previewTab);

                if (activeNetworks.length === 0) {
                  return (
                    <Box
                      style={{
                        paddingVertical: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="info" size={24} color="#94a3b8" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          marginTop: 6,
                          textAlign: 'center',
                        }}
                      >
                        Platform '{previewTab.toUpperCase()}' is not selected in target social
                        platforms.
                      </Text>
                    </Box>
                  );
                }

                return (
                  <VStack space="md">
                    {activeNetworks.map((network) => {
                      const platformConfig = SOCIAL_PLATFORMS.find((p) => p.id === network) || {
                        id: network,
                        label: network.charAt(0).toUpperCase() + network.slice(1),
                        icon: 'share-2',
                        color: '#0052d4',
                      };

                      // Get all accounts selected for this platform
                      const platformAccounts = socialAccounts.filter(
                        (a) => a.platform === network && selectedAccounts.includes(a.account_id)
                      );

                      // Helper function to render a single preview card for a given account entry or default platform preview
                      const renderCard = (acct: any | null) => {
                        const accountId = acct?.account_id || 'default';
                        const accountName =
                          acct?.account_name ||
                          (acct?.first_name
                            ? `${acct.first_name} ${acct.last_name || ''}`.trim()
                            : '') ||
                          acct?.username ||
                          companyName ||
                          platformConfig.label;

                        const override = platformOverrides[network] || {};
                        const acctCaption = override.caption || caption || '';
                        const acctMediaUrl = override.image_url || imageUrl || imagePath || '';
                        const acctLink = override.link || companyWebsite || '';
                        const acctHashtags: string[] =
                          override.hashtags ||
                          hashtagsInput
                            .split(',')
                            .map((t) => t.trim().replace(/^#/, ''))
                            .filter(Boolean);

                        const activeContentType =
                          override.contentType || contentTypeOverrides[network] || 'media';

                        return (
                          <Box
                            key={`${network}-${accountId}`}
                            style={[
                              styles.mockFeedCard,
                              {
                                borderColor: `${platformConfig.color}40`,
                                borderWidth: 1,
                                borderRadius: 12,
                                marginBottom: 10,
                                backgroundColor: '#ffffff',
                                overflow: 'hidden',
                                padding: 12,
                              },
                            ]}
                          >
                            {/* Card Header (Panel lines 5552-5616) */}
                            <HStack
                              className="mb-2 items-center justify-between pb-2"
                              style={{ borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                            >
                              <HStack space="xs" className="items-center" style={{ flex: 1 }}>
                                <Box
                                  style={[
                                    styles.mockAvatar,
                                    {
                                      backgroundColor: platformConfig.color,
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                    },
                                  ]}
                                >
                                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                                    {accountName.slice(0, 2).toUpperCase()}
                                  </Text>
                                </Box>
                                <VStack style={{ flex: 1, marginLeft: 4 }}>
                                  <HStack space="xs" className="items-center">
                                    <Text
                                      style={{ fontWeight: '700', fontSize: 13, color: '#0f172a' }}
                                      numberOfLines={1}
                                    >
                                      {accountName}
                                    </Text>
                                    <FontAwesome
                                      name={platformConfig.icon as any}
                                      size={12}
                                      color={platformConfig.color}
                                    />
                                  </HStack>
                                  <Text style={{ fontSize: 10, color: '#64748b' }}>
                                    {acct?.username ? `@${acct.username} • ` : ''}
                                    {platformConfig.label} Preview
                                  </Text>
                                </VStack>
                              </HStack>

                              <Box
                                style={{
                                  backgroundColor: `${platformConfig.color}15`,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 10,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: '700',
                                    color: platformConfig.color,
                                  }}
                                >
                                  {platformConfig.label}
                                </Text>
                              </Box>
                            </HStack>

                            {/* Post Title / Name (If entered) */}
                            {title ? (
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: '700',
                                  color: '#0f172a',
                                  marginBottom: 6,
                                  marginTop: 2,
                                }}
                              >
                                📌 {title}
                              </Text>
                            ) : null}

                            {/* Media Image (Panel lines 5618-5642) */}
                            {acctMediaUrl ? (
                              <Box
                                style={{
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  marginBottom: 8,
                                  marginTop: 2,
                                }}
                              >
                                <Image
                                  source={{ uri: acctMediaUrl }}
                                  style={styles.mockPostImage}
                                  resizeMode="cover"
                                />
                              </Box>
                            ) : (
                              <Box
                                style={{
                                  height: 120,
                                  borderRadius: 8,
                                  backgroundColor: '#f8fafc',
                                  borderWidth: 1,
                                  borderColor: '#e2e8f0',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginBottom: 8,
                                  marginTop: 2,
                                }}
                              >
                                <Feather name="image" size={26} color="#cbd5e1" />
                                <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                  No image attached
                                </Text>
                              </Box>
                            )}

                            {/* Post Description / Caption (Panel lines 5644-5664) */}
                            <Text
                              style={{
                                fontSize: 13,
                                color: acctCaption ? '#1e293b' : '#94a3b8',
                                fontStyle: acctCaption ? 'normal' : 'italic',
                                lineHeight: 18,
                                marginBottom: 6,
                              }}
                            >
                              {acctCaption || 'Your post description / caption will appear here...'}
                            </Text>

                            {/* Website Link Banner */}
                            {acctLink ? (
                              <View
                                style={{
                                  backgroundColor: '#eff6ff',
                                  borderWidth: 1,
                                  borderColor: '#bfdbfe',
                                  paddingHorizontal: 8,
                                  paddingVertical: 5,
                                  borderRadius: 6,
                                  marginBottom: 6,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                }}
                              >
                                <Feather
                                  name="link"
                                  size={12}
                                  color="#2563eb"
                                  style={{ marginRight: 5 }}
                                />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: '#1d4ed8',
                                    fontWeight: '600',
                                    flex: 1,
                                  }}
                                  numberOfLines={1}
                                >
                                  {acctLink}
                                </Text>
                              </View>
                            ) : null}

                            {/* Hashtags Chips (Panel lines 5665-5686) */}
                            {acctHashtags.length > 0 && (
                              <HStack space="xs" className="mb-2 flex-wrap">
                                {acctHashtags.map((tag: string, idx: number) => (
                                  <Text
                                    key={idx}
                                    style={{
                                      fontSize: 11,
                                      color: platformConfig.color,
                                      fontWeight: '600',
                                      marginRight: 4,
                                    }}
                                  >
                                    #{tag.replace(/^#/, '')}
                                  </Text>
                                ))}
                              </HStack>
                            )}

                            {/* Action Bar Footer (Panel lines 5689-5736) */}
                            <View
                              style={{
                                borderTopWidth: 1,
                                borderTopColor: '#f1f5f9',
                                paddingTop: 6,
                                marginTop: 4,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <HStack space="sm" className="items-center">
                                <FontAwesome name="heart-o" size={13} color="#64748b" />
                                <FontAwesome
                                  name="comment-o"
                                  size={13}
                                  color="#64748b"
                                  style={{ marginLeft: 8 }}
                                />
                                <FontAwesome
                                  name="share"
                                  size={13}
                                  color="#64748b"
                                  style={{ marginLeft: 8 }}
                                />
                              </HStack>
                              <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '600' }}>
                                {acctMediaUrl ? '1 image' : `${activeContentType} post`}
                              </Text>
                            </View>
                          </Box>
                        );
                      };

                      if (platformAccounts.length > 0) {
                        return (
                          <VStack key={network} space="xs">
                            {platformAccounts.map((acct) => renderCard(acct))}
                          </VStack>
                        );
                      }

                      // If no specific account checkbox selected yet, render platform default preview card with form values
                      return renderCard(null);
                    })}
                  </VStack>
                );
              })()}
            </Box>

            {/* Save & Action Buttons Bar */}
            <VStack space="sm" style={{ marginTop: 8, marginBottom: 40 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#0052d4' }]}
                onPress={() => handleSavePost(isScheduled ? 'scheduled' : 'draft')}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isEditing ? 'Save Changes' : isScheduled ? 'Schedule Post' : 'Save as Draft'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#16a34a' }]}
                onPress={() => handleSavePost('published')}
                disabled={saving}
              >
                <Feather name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Publish Post Now</Text>
              </TouchableOpacity>
            </VStack>
          </VStack>
        )}
      </ScrollView>

      {/* Platforms & Accounts Selection Modal */}
      <Modal
        visible={networksModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setNetworksModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPress={() => setNetworksModalOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.optionsModalCard}>
            <HStack className="mb-4 items-center justify-between">
              <HStack space="xs" className="items-center gap-2">
                <Feather name="share-2" size={18} color="#2563eb" />
                <Heading size="md" style={{ color: '#0f172a', fontWeight: '700' }}>
                  Select Platforms & Accounts
                </Heading>
              </HStack>
              <TouchableOpacity onPress={() => setNetworksModalOpen(false)}>
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </HStack>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {SOCIAL_PLATFORMS.map((plat) => {
                const isSelected = selectedPlatforms.includes(plat.id);
                const platformAccounts = socialAccounts.filter((a) => a.platform === plat.id);

                return (
                  <Box
                    key={plat.id}
                    style={{
                      marginBottom: 14,
                      paddingBottom: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: '#f1f5f9',
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onPress={() => togglePlatform(plat.id)}
                    >
                      <HStack space="sm" className="items-center">
                        <FontAwesome name={plat.icon as any} size={18} color={plat.color} />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                          {plat.label}
                        </Text>
                      </HStack>
                      <Switch
                        value={isSelected}
                        onValueChange={() => togglePlatform(plat.id)}
                        trackColor={{ false: '#cbd5e1', true: '#0052d4' }}
                      />
                    </TouchableOpacity>

                    {isSelected && platformAccounts.length > 0 && (
                      <VStack style={{ marginTop: 8, paddingLeft: 24 }} space="xs">
                        <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>
                          Select Accounts:
                        </Text>
                        {platformAccounts.map((acc) => {
                          const isAccChecked = selectedAccounts.includes(acc.account_id);
                          return (
                            <TouchableOpacity
                              key={acc.account_id}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 4,
                              }}
                              onPress={() => {
                                setSelectedAccounts((prev) =>
                                  prev.includes(acc.account_id)
                                    ? prev.filter((id) => id !== acc.account_id)
                                    : [...prev, acc.account_id]
                                );
                              }}
                            >
                              <Feather
                                name={isAccChecked ? 'check-square' : 'square'}
                                size={16}
                                color={isAccChecked ? '#0052d4' : '#94a3b8'}
                                style={{ marginRight: 8 }}
                              />
                              <Text style={{ fontSize: 13, color: '#334155', fontWeight: '500' }}>
                                {acc.account_name || acc.username || acc.platform}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </VStack>
                    )}
                  </Box>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 16 }]}
              onPress={() => setNetworksModalOpen(false)}
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0052d4',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerSaveBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  mainTabBar: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  mainTabBtnActive: {
    backgroundColor: '#ffffff',
  },
  mainTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  mainTabLabelActive: {
    color: '#0052d4',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 4,
  },
  cardSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#0f172a',
    fontSize: 14,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  providerChipActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  providerChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  providerChipTextActive: {
    color: '#0369a1',
    fontWeight: '700',
  },
  uploadBox: {
    height: 110,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#0052d4',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 6,
  },
  imagePreviewBox: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  uploadedImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  removeImgBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    padding: 8,
    borderRadius: 20,
  },
  imageActionOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  imgActionBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    padding: 8,
    borderRadius: 20,
  },
  primaryBtn: {
    backgroundColor: '#0052d4',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  aiResultCard: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  applyBtn: {
    backgroundColor: '#0052d4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  tagChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  tagText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '600',
  },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  platformPillActive: {
    backgroundColor: '#0052d4',
    borderColor: '#0052d4',
  },
  platformPillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 6,
  },
  platformPillLabelActive: {
    color: '#fff',
  },
  accountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subTabList: {
    paddingVertical: 8,
    gap: 6,
  },
  subTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 4,
  },
  subTabBtnActive: {
    backgroundColor: '#0052d4',
    borderColor: '#0052d4',
  },
  subTabText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  miniPrevTab: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPrevTabActive: {
    backgroundColor: '#dbeafe',
  },
  mockFeedCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mockAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0052d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockPostImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  mockImagePlaceholder: {
    height: 120,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
    marginRight: 4,
  },
  accountPillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  accountPillText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  accountPillTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  optionsModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
});
