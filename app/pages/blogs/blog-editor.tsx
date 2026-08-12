import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Switch,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  BlogPost,
  BlogFormData,
  Tag,
  TagFormData,
  FaqItem,
  FaqFormData,
  GuidesConfigFormData,
  InfoPoint,
  SeoLink,
  getBlog,
  listBlogs,
  createBlog,
  updateBlog,
  getBlogCoverImageUrl,
  getTagImageUrl,
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
  updateTagStatus,
  getAllFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  getGuidesConfig,
  updateGuidesConfig,
  CreateGuidesConfig,
} from './blogs.api';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const safeParseJson = (val: any) => {
  if (!val) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

export default function BlogEditorScreen() {
  const router = useRouter();
  const { id, blogId } = useLocalSearchParams<{ id?: string; blogId?: string }>();
  const currentBlogId = id || blogId;
  const isEditMode = !!currentBlogId;

  const scrollViewRef = useRef<ScrollView>(null);

  // Validation Error States
  const [configErrors, setConfigErrors] = useState<{ heroTitle?: string }>({});
  const [tagErrors, setTagErrors] = useState<{ title?: string }>({});
  const [faqErrors, setFaqErrors] = useState<{ question?: string; answer?: string }>({});
  const [blogErrors, setBlogErrors] = useState<{ title?: string; slug?: string; body?: string }>(
    {}
  );

  // Active Tab: 0 = Blog Configuration, 1 = Global Resources, 2 = Blog Editor
  const [activeTab, setActiveTab] = useState<number>(isEditMode ? 2 : 0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Data Collections
  const [tags, setTags] = useState<Tag[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [allBlogs, setAllBlogs] = useState<BlogPost[]>([]);

  // ─── TAB 0: BLOG CONFIGURATION STATE ──────────────────────────────────────
  const [configId, setConfigId] = useState<string>('');
  const [heroBadge, setHeroBadge] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroDesc, setHeroDesc] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [heroTagPills, setHeroTagPills] = useState('');

  const [infoBadge, setInfoBadge] = useState('');
  const [infoTitle, setInfoTitle] = useState('');
  const [infoDesc, setInfoDesc] = useState('');
  const [infoPoints, setInfoPoints] = useState<InfoPoint[]>([
    { title: '', description: '', order: 1 },
  ]);

  const [featuredBlogId, setFeaturedBlogId] = useState('');
  const [featuredLabel, setFeaturedLabel] = useState('');
  const [featuredCtaText, setFeaturedCtaText] = useState('');
  const [configStatus, setConfigStatus] = useState<number>(1);

  // ─── TAB 1: GLOBAL RESOURCES STATE ────────────────────────────────────────
  // Tag Modal
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagTitle, setTagTitle] = useState('');
  const [tagSubtitle, setTagSubtitle] = useState('');
  const [tagImage, setTagImage] = useState('');
  const [tagLinkUrl, setTagLinkUrl] = useState('');
  const [tagLinkText, setTagLinkText] = useState('');
  const [tagIsPopular, setTagIsPopular] = useState(false);

  // FAQ Modal
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqOrder, setFaqOrder] = useState('1');

  // ─── TAB 2: BLOG EDITOR STATE ──────────────────────────────────────────────
  const [blogTitle, setBlogTitle] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogBody, setBlogBody] = useState('');
  const [blogCategory, setBlogCategory] = useState('');
  const [blogReadTime, setBlogReadTime] = useState('5');
  const [blogAuthor, setBlogAuthor] = useState('');
  const [blogCoverImage, setBlogCoverImage] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<any>(null);

  const handlePickCoverImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCoverImageFile(asset);
        setBlogCoverImage(asset.uri);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick image');
    }
  };

  // Attached FAQs
  const [selectedFaqIds, setSelectedFaqIds] = useState<string[]>([]);

  // Shop Banner
  const [shopTitle, setShopTitle] = useState('');
  const [shopDesc, setShopDesc] = useState('');
  const [shopCtaText, setShopCtaText] = useState('');
  const [shopCtaUrl, setShopCtaUrl] = useState('');

  // Internal SEO Links
  const [seoLinks, setSeoLinks] = useState<SeoLink[]>([{ label: '', url: '', order: 1 }]);

  // SEO Meta
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  // Status (0 = Draft, 1 = Published)
  const [blogStatus, setBlogStatus] = useState<number>(1);

  // ─── LOAD INITIAL DATA ─────────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [tagsData, faqsData, blogsRes, configRes] = await Promise.all([
        getAllTags().catch(() => []),
        getAllFaqs().catch(() => []),
        listBlogs().catch(() => ({ data: [] })),
        getGuidesConfig().catch(() => null),
      ]);

      setTags(tagsData);
      setFaqs(faqsData);
      const bItems = (blogsRes as any)?.data || (Array.isArray(blogsRes) ? blogsRes : []);
      setAllBlogs(bItems);

      if (configRes) {
        if (configRes._id) setConfigId(configRes._id);
        if (configRes.hero) {
          setHeroBadge(configRes.hero.badge_label || '');
          setHeroTitle(configRes.hero.title || '');
          setHeroDesc(configRes.hero.description || '');
          setHeroImage(configRes.hero.image_url || '');
          setHeroTagPills(configRes.hero.tag_pills ? configRes.hero.tag_pills.join(', ') : '');
        }
        if (configRes.info_section) {
          setInfoBadge(configRes.info_section.badge_label || '');
          setInfoTitle(configRes.info_section.title || '');
          setInfoDesc(configRes.info_section.description || '');
          if (configRes.info_section.points?.length) {
            setInfoPoints(configRes.info_section.points);
          }
        }
        if (configRes.featured_blog_id) {
          const fId =
            configRes.featured_blog_id && typeof configRes.featured_blog_id === 'object'
              ? configRes.featured_blog_id._id || configRes.featured_blog_id.id
              : configRes.featured_blog_id;
          setFeaturedBlogId(fId || '');
        }
        setFeaturedLabel(configRes.featured_label || '');
        setFeaturedCtaText(configRes.featured_cta_text || '');
        if (configRes.status !== undefined) setConfigStatus(configRes.status);
      }

      // If Edit Mode, fetch blog details
      if (isEditMode && currentBlogId) {
        const blogObj = await getBlog(currentBlogId);
        if (blogObj) {
          setBlogTitle(blogObj.title || '');
          setBlogSlug(blogObj.slug || '');
          setBlogExcerpt(blogObj.excerpt || '');
          setBlogBody(blogObj.body || '');
          const catVal =
            blogObj.category && typeof blogObj.category === 'object'
              ? blogObj.category._id || blogObj.category.id
              : typeof blogObj.category === 'string'
                ? blogObj.category
                : '';
          setBlogCategory(catVal || '');
          setBlogReadTime(String(blogObj.read_time_minutes || 5));
          setBlogAuthor(blogObj.author_label || '');
          setBlogCoverImage(getBlogCoverImageUrl(blogObj.cover_image));
          setCoverImageFile(null);
          setBlogStatus(blogObj.status ?? 1);

          const faqIdsObj = safeParseJson(blogObj.faq_ids);
          if (Array.isArray(faqIdsObj) && faqIdsObj.length) {
            const ids = faqIdsObj
              .map((item: any) => (item && typeof item === 'object' ? item._id || item.id : item))
              .filter(Boolean);
            setSelectedFaqIds(ids);
          }

          const shopBannerObj =
            safeParseJson(blogObj.shop_banner) || safeParseJson(blogObj.sidebar_category);
          if (shopBannerObj && typeof shopBannerObj === 'object') {
            setShopTitle(shopBannerObj.title || shopBannerObj.label || '');
            setShopDesc(shopBannerObj.description || '');
            setShopCtaText(shopBannerObj.cta_text || '');
            setShopCtaUrl(shopBannerObj.cta_url || '');
          }

          const seoLinksObj = safeParseJson(blogObj.seo_links);
          if (Array.isArray(seoLinksObj) && seoLinksObj.length) {
            setSeoLinks(seoLinksObj);
          }

          setSeoTitle(blogObj.seo_title || '');
          setSeoDescription(blogObj.seo_description || '');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load blog page data');
    } finally {
      setLoading(false);
    }
  }, [currentBlogId, isEditMode]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadInitialData();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [loadInitialData]);

  // ─── TAB 0 HANDLERS (BLOG CONFIGURATION) ──────────────────────────────────
  const handleAddInfoPoint = () => {
    setInfoPoints((prev) => [...prev, { title: '', description: '', order: prev.length + 1 }]);
  };

  const handleRemoveInfoPoint = (idx: number) => {
    setInfoPoints((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateInfoPoint = (idx: number, key: 'title' | 'description', val: string) => {
    setInfoPoints((prev) => prev.map((pt, i) => (i === idx ? { ...pt, [key]: val } : pt)));
  };

  const handleSaveGuidesConfig = async () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    if (!heroTitle.trim()) {
      setConfigErrors({ heroTitle: 'Hero Title is required' });
      return;
    }
    setConfigErrors({});
    setSaving(true);
    try {
      const payload: GuidesConfigFormData = {
        hero: {
          badge_label: heroBadge,
          title: heroTitle,
          description: heroDesc,
          image_url: heroImage,
          tag_pills: heroTagPills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        info_section: {
          badge_label: infoBadge,
          title: infoTitle,
          description: infoDesc,
          points: infoPoints.filter((p) => p.title?.trim() || p.description?.trim()),
        },
        featured_blog_id: featuredBlogId || undefined,
        featured_label: featuredLabel,
        featured_cta_text: featuredCtaText,
        status: configStatus,
      };

      if (configId) {
        await updateGuidesConfig(payload);
      } else {
        await CreateGuidesConfig(payload);
      }
      Alert.alert('Success', 'Blog configuration saved successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save blog configuration');
    } finally {
      setSaving(false);
    }
  };

  // ─── TAB 1 HANDLERS (GLOBAL RESOURCES: TAGS & FAQS) ─────────────────────
  // Tag CRUD
  const [tagImageFile, setTagImageFile] = useState<any>(null);

  const handlePickTagImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setTagImageFile(asset);
        setTagImage(asset.uri);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to pick image');
    }
  };

  const handleOpenAddTag = () => {
    setEditingTag(null);
    setTagTitle('');
    setTagSubtitle('');
    setTagImage('');
    setTagImageFile(null);
    setTagLinkUrl('');
    setTagLinkText('');
    setTagIsPopular(false);
    setTagErrors({});
    setTagModalVisible(true);
  };

  const handleOpenEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagTitle(tag.title || '');
    setTagSubtitle(tag.subtitle || '');
    setTagImage(tag.image_url ? getTagImageUrl(tag.image_url) : '');
    setTagImageFile(null);
    setTagLinkUrl(tag.link_url || '');
    setTagLinkText(tag.link_text || '');
    setTagIsPopular(!!tag.is_popular);
    setTagErrors({});
    setTagModalVisible(true);
  };

  const handleSaveTag = async () => {
    if (!tagTitle.trim()) {
      setTagErrors({ title: 'Tag title is required' });
      return;
    }
    setTagErrors({});
    try {
      const payload: TagFormData | any = {
        title: tagTitle.trim(),
        subtitle: tagSubtitle,
        image_url: tagImage,
        image_urlFile: tagImageFile,
        link_url: tagLinkUrl,
        link_text: tagLinkText,
        is_popular: tagIsPopular,
      };
      if (editingTag) {
        await updateTag(editingTag._id || editingTag.id || '', payload);
        Alert.alert('Success', 'Tag updated successfully!');
      } else {
        await createTag(payload);
        Alert.alert('Success', 'Tag created successfully!');
      }
      setTagModalVisible(false);
      const updated = await getAllTags();
      setTags(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save tag');
    }
  };

  const handleDeleteTag = (tag: Tag) => {
    const tId = tag._id || tag.id || '';
    Alert.alert('Delete Tag', `Are you sure you want to delete tag "${tag.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTag(tId);
            setTags((prev) => prev.filter((t) => (t._id || t.id) !== tId));
            Alert.alert('Success', 'Tag deleted.');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete tag');
          }
        },
      },
    ]);
  };

  const handleToggleTagStatus = async (tag: Tag) => {
    const tId = tag._id || tag.id || '';
    try {
      await updateTagStatus(tId);
      setTags((prev) =>
        prev.map((t) => ((t._id || t.id) === tId ? { ...t, status: t.status === 1 ? 0 : 1 } : t))
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to toggle status');
    }
  };

  // FAQ CRUD
  const handleOpenAddFaq = () => {
    setEditingFaq(null);
    setFaqQuestion('');
    setFaqAnswer('');
    setFaqOrder(String(faqs.length + 1));
    setFaqErrors({});
    setFaqModalVisible(true);
  };

  const handleOpenEditFaq = (faq: FaqItem) => {
    setEditingFaq(faq);
    setFaqQuestion(faq.question || '');
    setFaqAnswer(faq.answer || '');
    setFaqOrder(String(faq.order ?? 1));
    setFaqErrors({});
    setFaqModalVisible(true);
  };

  const handleSaveFaq = async () => {
    const errs: { question?: string; answer?: string } = {};
    if (!faqQuestion.trim()) errs.question = 'Question is required';
    if (!faqAnswer.trim()) errs.answer = 'Answer is required';
    if (Object.keys(errs).length > 0) {
      setFaqErrors(errs);
      return;
    }
    setFaqErrors({});

    try {
      const payload: FaqFormData = {
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        order: parseInt(faqOrder, 10) || 1,
        blog_id: currentBlogId || 'global',
      };
      if (editingFaq) {
        await updateFaq(editingFaq._id || editingFaq.id || '', payload);
        Alert.alert('Success', 'FAQ updated successfully!');
      } else {
        await createFaq(payload);
        Alert.alert('Success', 'FAQ created successfully!');
      }
      setFaqModalVisible(false);
      const updated = await getAllFaqs();
      setFaqs(updated);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save FAQ');
    }
  };

  const handleDeleteFaq = (faq: FaqItem) => {
    const fId = faq._id || faq.id || '';
    Alert.alert('Delete FAQ', 'Are you sure you want to delete this FAQ?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFaq(fId);
            setFaqs((prev) => prev.filter((f) => (f._id || f.id) !== fId));
            Alert.alert('Success', 'FAQ deleted.');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete FAQ');
          }
        },
      },
    ]);
  };

  // ─── TAB 2 HANDLERS (BLOG EDITOR) ─────────────────────────────────────────
  const handleAutoSlug = () => {
    if (blogTitle.trim()) {
      setBlogSlug(slugify(blogTitle));
    }
  };

  const handleToggleFaqSelection = (fId: string) => {
    setSelectedFaqIds((prev) =>
      prev.includes(fId) ? prev.filter((id) => id !== fId) : [...prev, fId]
    );
  };

  const handleAddSeoLink = () => {
    setSeoLinks((prev) => [...prev, { label: '', url: '', order: prev.length + 1 }]);
  };

  const handleRemoveSeoLink = (idx: number) => {
    setSeoLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSeoLink = (idx: number, key: 'label' | 'url', val: string) => {
    setSeoLinks((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: val } : item)));
  };

  const handleSaveBlog = async (targetStatus: number) => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    const errs: { title?: string; slug?: string; body?: string } = {};
    if (!blogTitle.trim()) {
      errs.title = 'Blog Title is required';
    }
    if (!blogSlug.trim()) {
      errs.slug = 'Blog Slug is required';
    }
    if (!blogBody.trim()) {
      errs.body = 'Body Content is required';
    }

    if (Object.keys(errs).length > 0) {
      setBlogErrors(errs);
      return;
    }
    setBlogErrors({});

    setSaving(true);
    try {
      const payload: any = {
        title: blogTitle.trim(),
        slug: blogSlug.trim(),
        excerpt: blogExcerpt.trim(),
        body: blogBody.trim(),
        category: blogCategory || undefined,
        read_time_minutes: parseInt(blogReadTime, 10) || 5,
        author_label: blogAuthor.trim(),
        cover_image: blogCoverImage.trim(),
        cover_imageFile: coverImageFile,
        faq_ids: selectedFaqIds,
        shop_banner: {
          title: shopTitle,
          description: shopDesc,
          cta_text: shopCtaText,
          cta_url: shopCtaUrl,
        },
        seo_links: seoLinks.filter((l) => l.label?.trim() || l.url?.trim()),
        seo_title: seoTitle.trim(),
        seo_description: seoDescription.trim(),
        status: targetStatus,
      };

      if (isEditMode && currentBlogId) {
        await updateBlog(currentBlogId, payload);
        Alert.alert(
          'Success',
          `Blog ${targetStatus === 1 ? 'published' : 'saved as draft'} successfully!`
        );
      } else {
        await createBlog(payload);
        Alert.alert(
          'Success',
          `Blog ${targetStatus === 1 ? 'published' : 'saved as draft'} successfully!`
        );
      }

      router.push('/pages/blogs/blogs');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#193867" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading Blog Editor...</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <Box className="px-5 pb-4 pt-12">
          <HStack className="mb-2 items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-sm font-medium text-white">← Back to Blogs</Text>
            </TouchableOpacity>
            {saving && <ActivityIndicator size="small" color="#fff" />}
          </HStack>
          <Heading size="xl" style={{ color: '#fff' }}>
            {isEditMode ? 'Edit Blog Post' : 'Blog Management & Editor'}
          </Heading>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>
            Manage configuration, global tags & FAQs, and blog content
          </Text>
        </Box>

        {/* ── TABS ────────────────────────────────────────────────────────── */}
        <HStack style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 0 && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab(0);
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }}
          >
            <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
              ⚙️ Blog Config
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 1 && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab(1);
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }}
          >
            <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
              🏷️ Global Resources
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 2 && styles.tabButtonActive]}
            onPress={() => {
              setActiveTab(2);
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }}
          >
            <Text style={[styles.tabText, activeTab === 2 && styles.tabTextActive]}>
              📝 Blog Editor
            </Text>
          </TouchableOpacity>
        </HStack>
      </LinearGradient>

      {/* ── MAIN CONTENT AREA ──────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════════════════════════════════════════════════════════════
            TAB 0: BLOG CONFIGURATION
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 0 && (
          <VStack space="md">
            {/* HERO SECTION */}
            <Box style={styles.card}>
              <Heading size="md" style={styles.cardHeader}>
                Hero Section Configuration
              </Heading>
              <Text style={styles.label}>Badge Label</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Guides & Articles"
                value={heroBadge}
                onChangeText={setHeroBadge}
                maxLength={100}
              />

              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={[styles.input, configErrors.heroTitle ? styles.inputError : null]}
                placeholder="e.g. Master Postbell Platform"
                value={heroTitle}
                onChangeText={(text) => {
                  setHeroTitle(text);
                  if (configErrors.heroTitle)
                    setConfigErrors((prev) => ({ ...prev, heroTitle: undefined }));
                }}
                maxLength={200}
              />
              {configErrors.heroTitle ? (
                <Text style={styles.errorText}>{configErrors.heroTitle}</Text>
              ) : null}

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                multiline
                placeholder="Explore tutorials, best practices..."
                value={heroDesc}
                onChangeText={setHeroDesc}
                maxLength={500}
              />

              <Text style={styles.label}>Hero Image URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/banner.png"
                value={heroImage}
                onChangeText={setHeroImage}
                maxLength={500}
              />

              <Text style={styles.label}>Tag Pills (Comma Separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="Automation, Marketing, AI"
                value={heroTagPills}
                onChangeText={setHeroTagPills}
                maxLength={200}
              />
            </Box>

            {/* INFO SECTION */}
            <Box style={styles.card}>
              <Heading size="md" style={styles.cardHeader}>
                Info Section Configuration
              </Heading>
              <Text style={styles.label}>Info Badge Label</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Why Read Our Blog"
                value={infoBadge}
                onChangeText={setInfoBadge}
                maxLength={100}
              />

              <Text style={styles.label}>Info Section Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Everything you need to know"
                value={infoTitle}
                onChangeText={setInfoTitle}
                maxLength={200}
              />

              <Text style={styles.label}>Info Section Description</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                placeholder="Detailed information section summary..."
                value={infoDesc}
                onChangeText={setInfoDesc}
                maxLength={500}
              />

              {/* DYNAMIC INFO POINTS */}
              <HStack className="mb-2 mt-3 items-center justify-between">
                <Text style={{ fontWeight: '700', color: '#1e293b' }}>Info Points List</Text>
                <TouchableOpacity style={styles.smallAddBtn} onPress={handleAddInfoPoint}>
                  <Text style={styles.smallAddBtnText}>+ Add Point</Text>
                </TouchableOpacity>
              </HStack>

              {infoPoints.map((pt, idx) => (
                <Box key={idx} style={styles.subBox}>
                  <HStack className="mb-2 items-center justify-between">
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>
                      Point #{idx + 1}
                    </Text>
                    {infoPoints.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveInfoPoint(idx)}>
                        <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    )}
                  </HStack>
                  <TextInput
                    style={styles.input}
                    placeholder="Point Title"
                    value={pt.title}
                    onChangeText={(v) => handleUpdateInfoPoint(idx, 'title', v)}
                    maxLength={150}
                  />
                  <TextInput
                    style={[styles.input, { height: 50 }]}
                    multiline
                    placeholder="Point Description"
                    value={pt.description}
                    onChangeText={(v) => handleUpdateInfoPoint(idx, 'description', v)}
                    maxLength={500}
                  />
                </Box>
              ))}
            </Box>

            {/* FEATURED BLOG SECTION */}
            <Box style={styles.card}>
              <Heading size="md" style={styles.cardHeader}>
                Featured Blog Configuration
              </Heading>
              <Text style={styles.label}>Featured Label</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Recommended Read"
                value={featuredLabel}
                onChangeText={setFeaturedLabel}
                maxLength={100}
              />

              <Text style={styles.label}>Featured CTA Text</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Read Featured Guide"
                value={featuredCtaText}
                onChangeText={setFeaturedCtaText}
                maxLength={100}
              />

              <Text style={styles.label}>Select Featured Blog ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Featured Blog ID"
                value={featuredBlogId}
                onChangeText={setFeaturedBlogId}
                maxLength={100}
              />

              <HStack className="mt-3 items-center justify-between">
                <Text style={{ fontWeight: '600', color: '#334155' }}>
                  Enable Configuration Status
                </Text>
                <Switch
                  value={configStatus === 1}
                  onValueChange={(val) => setConfigStatus(val ? 1 : 0)}
                  trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                />
              </HStack>
            </Box>

            {/* SAVE BUTTON FOR CONFIG */}
            <Button style={styles.saveBtn} onPress={handleSaveGuidesConfig} disabled={saving}>
              <ButtonText style={styles.saveBtnText}>
                {saving ? 'Saving Configuration...' : 'Save Configuration'}
              </ButtonText>
            </Button>
          </VStack>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 1: GLOBAL RESOURCES (TAGS & FAQS)
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 1 && (
          <VStack space="lg">
            {/* TAGS SECTION */}
            <Box style={styles.card}>
              <HStack className="mb-3 items-center justify-between">
                <VStack>
                  <Heading size="md" style={{ color: '#1e293b' }}>
                    Global Tags
                  </Heading>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>
                    Category tags used across blogs and filtering
                  </Text>
                </VStack>
                <TouchableOpacity style={styles.smallAddBtn} onPress={handleOpenAddTag}>
                  <Text style={styles.smallAddBtnText}>+ Add Tag</Text>
                </TouchableOpacity>
              </HStack>

              {tags.length === 0 ? (
                <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 15 }}>
                  No tags added yet.
                </Text>
              ) : (
                tags.map((tag) => (
                  <Box key={tag._id || tag.id} style={styles.listItem}>
                    <HStack className="items-center justify-between">
                      <VStack style={{ flex: 1, paddingRight: 10 }}>
                        <HStack space="xs" className="items-center">
                          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 14 }}>
                            {tag.title}
                          </Text>
                          {tag.is_popular && <Text style={styles.popularBadge}>Popular</Text>}
                        </HStack>
                        {tag.subtitle ? (
                          <Text style={{ fontSize: 12, color: '#64748b' }}>{tag.subtitle}</Text>
                        ) : null}
                      </VStack>
                      <HStack space="sm" className="items-center">
                        <TouchableOpacity onPress={() => handleToggleTagStatus(tag)}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: tag.status === 1 ? '#16a34a' : '#94a3b8',
                            }}
                          >
                            {tag.status === 1 ? 'Active' : 'Draft'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleOpenEditTag(tag)}>
                          <Text style={{ color: '#2563eb', fontSize: 13, fontWeight: '600' }}>
                            Edit
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteTag(tag)}>
                          <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </HStack>
                    </HStack>
                  </Box>
                ))
              )}
            </Box>

            {/* FAQS SECTION */}
            <Box style={styles.card}>
              <HStack className="mb-3 items-center justify-between">
                <VStack>
                  <Heading size="md" style={{ color: '#1e293b' }}>
                    Global FAQs
                  </Heading>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>
                    Reusable FAQs attached to blogs
                  </Text>
                </VStack>
                <TouchableOpacity style={styles.smallAddBtn} onPress={handleOpenAddFaq}>
                  <Text style={styles.smallAddBtnText}>+ Add FAQ</Text>
                </TouchableOpacity>
              </HStack>

              {faqs.length === 0 ? (
                <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 15 }}>
                  No FAQs added yet.
                </Text>
              ) : (
                faqs.map((faq) => (
                  <Box key={faq._id || faq.id} style={styles.listItem}>
                    <VStack space="xs">
                      <HStack className="items-start justify-between">
                        <Text
                          style={{ fontWeight: '700', color: '#0f172a', flex: 1, paddingRight: 8 }}
                        >
                          Q: {faq.question}
                        </Text>
                        <HStack space="sm">
                          <TouchableOpacity onPress={() => handleOpenEditFaq(faq)}>
                            <Text style={{ color: '#2563eb', fontSize: 13, fontWeight: '600' }}>
                              Edit
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteFaq(faq)}>
                            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </HStack>
                      </HStack>
                      <Text style={{ fontSize: 13, color: '#475569' }} numberOfLines={2}>
                        A: {faq.answer}
                      </Text>
                    </VStack>
                  </Box>
                ))
              )}
            </Box>
          </VStack>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2: BLOG EDITOR
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 2 && (
          <VStack space="md">
            {/* BASIC INFO */}
            <Box style={styles.card}>
              <Heading size="md" style={styles.cardHeader}>
                Basic Information
              </Heading>

              <Text style={styles.label}>Blog Title *</Text>
              <TextInput
                style={[styles.input, blogErrors.title ? styles.inputError : null]}
                placeholder="Enter Blog Title"
                value={blogTitle}
                onChangeText={(text) => {
                  setBlogTitle(text);
                  if (blogErrors.title) setBlogErrors((prev) => ({ ...prev, title: undefined }));
                }}
                maxLength={200}
              />
              {blogErrors.title ? <Text style={styles.errorText}>{blogErrors.title}</Text> : null}

              <HStack className="mt-1 items-center justify-between">
                <Text style={styles.label}>Blog Slug *</Text>
                <TouchableOpacity onPress={handleAutoSlug}>
                  <Text style={{ fontSize: 12, color: '#2563eb', fontWeight: '600' }}>
                    Auto-Generate Slug
                  </Text>
                </TouchableOpacity>
              </HStack>
              <TextInput
                style={[styles.input, blogErrors.slug ? styles.inputError : null]}
                placeholder="enter-blog-slug"
                value={blogSlug}
                onChangeText={(text) => {
                  setBlogSlug(text);
                  if (blogErrors.slug) setBlogErrors((prev) => ({ ...prev, slug: undefined }));
                }}
                maxLength={200}
              />
              {blogErrors.slug ? <Text style={styles.errorText}>{blogErrors.slug}</Text> : null}

              <Text style={styles.label}>Excerpt (Summary)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                placeholder="Brief summary of the article..."
                value={blogExcerpt}
                onChangeText={setBlogExcerpt}
                maxLength={500}
              />

              <Text style={styles.label}>Category (Select Tag)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                <HStack space="xs">
                  {tags.map((t) => {
                    const tId = t._id || t.id || '';
                    const isSel = blogCategory === tId;
                    return (
                      <TouchableOpacity
                        key={tId}
                        style={[styles.pillBtn, isSel && styles.pillBtnSelected]}
                        onPress={() => setBlogCategory(isSel ? '' : tId)}
                      >
                        <Text style={[styles.pillText, isSel && styles.pillTextSelected]}>
                          {t.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </HStack>
              </ScrollView>

              <HStack space="md">
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.label}>Read Time (Minutes)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="5"
                    value={blogReadTime}
                    onChangeText={setBlogReadTime}
                    maxLength={5}
                  />
                </VStack>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.label}>Author Label</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Postbell Team"
                    value={blogAuthor}
                    onChangeText={setBlogAuthor}
                    maxLength={100}
                  />
                </VStack>
              </HStack>

              <Text style={styles.label}>Cover Image</Text>
              <HStack space="xs" style={{ marginBottom: 8, alignItems: 'center' }}>
                {/* <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="https://example.com/cover.jpg or choose file"
                  value={blogCoverImage}
                  onChangeText={(val) => {
                    setBlogCoverImage(val);
                    setCoverImageFile(null);
                  }}
                  maxLength={500}
                /> */}
                <TouchableOpacity
                  style={[styles.smallAddBtn, { height: 42, justifyContent: 'center' }]}
                  onPress={handlePickCoverImage}
                >
                  <Text style={styles.smallAddBtnText}>Choose File</Text>
                </TouchableOpacity>
              </HStack>
              {blogCoverImage ? (
                <Box
                  style={{
                    marginTop: 4,
                    marginBottom: 12,
                    borderRadius: 8,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                >
                  <Image
                    source={{ uri: blogCoverImage }}
                    style={{ width: '100%', height: 140, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                </Box>
              ) : null}
            </Box>

            {/* BODY CONTENT */}
            <Box style={styles.card}>
              <Heading size="md" style={styles.cardHeader}>
                Body Content
              </Heading>
              <Text style={styles.label}>Main Article Body (HTML / Text) *</Text>
              <TextInput
                style={[
                  styles.input,
                  { height: 160, textAlignVertical: 'top' },
                  blogErrors.body ? styles.inputError : null,
                ]}
                multiline
                placeholder="Write full article body content here..."
                value={blogBody}
                onChangeText={(text) => {
                  setBlogBody(text);
                  if (blogErrors.body) setBlogErrors((prev) => ({ ...prev, body: undefined }));
                }}
                maxLength={50000}
              />
              {blogErrors.body ? <Text style={styles.errorText}>{blogErrors.body}</Text> : null}
            </Box>

            {/* ATTACHED FAQS */}
            <Box style={styles.card}>
              <Heading size="md" style={styles.cardHeader}>
                Attached FAQs
              </Heading>
              <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                Select FAQs to display with this blog post:
              </Text>
              {faqs.length === 0 ? (
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                  No FAQs available in Global Resources.
                </Text>
              ) : (
                faqs.map((f) => {
                  const fId = f._id || f.id || '';
                  const isChecked = selectedFaqIds.includes(fId);
                  return (
                    <TouchableOpacity
                      key={fId}
                      style={[styles.checkRow, isChecked && styles.checkRowSelected]}
                      onPress={() => handleToggleFaqSelection(fId)}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: isChecked ? '#2563eb' : '#334155',
                          fontWeight: isChecked ? '700' : '500',
                          flex: 1,
                        }}
                      >
                        {isChecked ? '☑ ' : '☐ '} {f.question}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </Box>

            {/* SHOP BANNER */}
            <Box style={styles.card}>
              <Heading size="md" style={styles.cardHeader}>
                Shop Banner Section
              </Heading>
              <Text style={styles.label}>Banner Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Try Postbell Pro Free"
                value={shopTitle}
                onChangeText={setShopTitle}
                maxLength={150}
              />

              <Text style={styles.label}>Banner Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Automate social media posts in minutes"
                value={shopDesc}
                onChangeText={setShopDesc}
                maxLength={300}
              />

              <HStack space="md">
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.label}>CTA Button Text</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Get Started"
                    value={shopCtaText}
                    onChangeText={setShopCtaText}
                    maxLength={100}
                  />
                </VStack>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.label}>CTA URL</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://..."
                    value={shopCtaUrl}
                    onChangeText={setShopCtaUrl}
                    maxLength={500}
                  />
                </VStack>
              </HStack>
            </Box>

            {/* INTERNAL SEO LINKS */}
            <Box style={styles.card}>
              <HStack className="mb-2 items-center justify-between">
                <Heading size="md" style={{ color: '#1e293b' }}>
                  Internal SEO Links
                </Heading>
                <TouchableOpacity style={styles.smallAddBtn} onPress={handleAddSeoLink}>
                  <Text style={styles.smallAddBtnText}>+ Add Link</Text>
                </TouchableOpacity>
              </HStack>

              {seoLinks.map((link, idx) => (
                <Box key={idx} style={styles.subBox}>
                  <HStack className="mb-1 items-center justify-between">
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b' }}>
                      Link #{idx + 1}
                    </Text>
                    {seoLinks.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveSeoLink(idx)}>
                        <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    )}
                  </HStack>
                  <TextInput
                    style={styles.input}
                    placeholder="Anchor Text / Label"
                    value={link.label}
                    onChangeText={(v) => handleUpdateSeoLink(idx, 'label', v)}
                    maxLength={100}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Target URL (e.g. /pages/features)"
                    value={link.url}
                    onChangeText={(v) => handleUpdateSeoLink(idx, 'url', v)}
                    maxLength={500}
                  />
                </Box>
              ))}
            </Box>

            {/* SEO META */}
            <Box style={styles.card}>
              <Heading size="md" style={styles.cardHeader}>
                SEO Meta Data
              </Heading>
              <Text style={styles.label}>SEO Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Meta title for Google search..."
                value={seoTitle}
                onChangeText={setSeoTitle}
                maxLength={150}
              />

              <Text style={styles.label}>SEO Description</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                placeholder="Meta description snippet..."
                value={seoDescription}
                onChangeText={setSeoDescription}
                maxLength={300}
              />

              <HStack className="mt-3 items-center justify-between">
                <Text style={{ fontWeight: '600', color: '#334155' }}>Publish Status</Text>
                <HStack space="xs" className="items-center">
                  <Text
                    style={{
                      fontSize: 13,
                      color: blogStatus === 1 ? '#16a34a' : '#64748b',
                      fontWeight: '700',
                    }}
                  >
                    {blogStatus === 1 ? 'Published' : 'Draft'}
                  </Text>
                  <Switch
                    value={blogStatus === 1}
                    onValueChange={(val) => setBlogStatus(val ? 1 : 0)}
                    trackColor={{ false: '#cbd5e1', true: '#16a34a' }}
                  />
                </HStack>
              </HStack>
            </Box>

            {/* ACTION BUTTONS FOR BLOG EDITOR */}
            <HStack space="md" style={{ marginTop: 8 }}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { flex: 1, backgroundColor: '#64748b', paddingVertical: 8 },
                ]}
                onPress={() => handleSaveBlog(0)}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Draft'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { flex: 1, backgroundColor: '#16a34a', paddingVertical: 8 },
                ]}
                onPress={() => handleSaveBlog(1)}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Publishing...' : 'Publish Blog'}</Text>
              </TouchableOpacity>
            </HStack>
          </VStack>
        )}
      </ScrollView>

      {/* ── TAG MODAL ──────────────────────────────────────────────────────── */}
      <Modal
        visible={tagModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTagModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Heading size="md" style={{ color: '#0f172a', marginBottom: 12 }}>
              {editingTag ? 'Edit Tag' : 'Add New Tag'}
            </Heading>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.label}>Tag Title *</Text>
              <TextInput
                style={[styles.input, tagErrors.title ? styles.inputError : null]}
                placeholder="e.g. Technology"
                value={tagTitle}
                onChangeText={(text) => {
                  setTagTitle(text);
                  if (tagErrors.title) setTagErrors((prev) => ({ ...prev, title: undefined }));
                }}
                maxLength={100}
              />
              {tagErrors.title ? <Text style={styles.errorText}>{tagErrors.title}</Text> : null}

              <Text style={styles.label}>Tag Subtitle</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Latest Tech News"
                value={tagSubtitle}
                onChangeText={setTagSubtitle}
                maxLength={200}
              />

              <Text style={styles.label}>Tag Image</Text>
              <HStack space="xs" style={{ marginBottom: 8, alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="https://... or choose file"
                  value={tagImage}
                  onChangeText={(val) => {
                    setTagImage(val);
                    setTagImageFile(null);
                  }}
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.smallAddBtn, { height: 42, justifyContent: 'center' }]}
                  onPress={handlePickTagImage}
                >
                  <Text style={styles.smallAddBtnText}>Choose File</Text>
                </TouchableOpacity>
              </HStack>
              {tagImage ? (
                <Box
                  style={{
                    marginTop: 4,
                    marginBottom: 12,
                    borderRadius: 8,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                >
                  <Image
                    source={{ uri: getTagImageUrl(tagImage) }}
                    style={{ width: '100%', height: 100, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                </Box>
              ) : null}

              <Text style={styles.label}>Link URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                value={tagLinkUrl}
                onChangeText={setTagLinkUrl}
                maxLength={500}
              />

              <Text style={styles.label}>Link Text</Text>
              <TextInput
                style={styles.input}
                placeholder="View Articles"
                value={tagLinkText}
                onChangeText={setTagLinkText}
                maxLength={100}
              />

              <HStack className="mb-2 mt-2 items-center justify-between">
                <Text style={{ fontWeight: '600', color: '#334155' }}>Mark as Popular</Text>
                <Switch
                  value={tagIsPopular}
                  onValueChange={setTagIsPopular}
                  trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                />
              </HStack>
            </ScrollView>

            <HStack space="md" style={{ marginTop: 15 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTagModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveTag}>
                <Text style={styles.submitBtnText}>Save Tag</Text>
              </TouchableOpacity>
            </HStack>
          </View>
        </View>
      </Modal>

      {/* ── FAQ MODAL ──────────────────────────────────────────────────────── */}
      <Modal
        visible={faqModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFaqModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Heading size="md" style={{ color: '#0f172a', marginBottom: 12 }}>
              {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
            </Heading>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.label}>Question *</Text>
              <TextInput
                style={[styles.input, faqErrors.question ? styles.inputError : null]}
                placeholder="Enter FAQ Question..."
                value={faqQuestion}
                onChangeText={(text) => {
                  setFaqQuestion(text);
                  if (faqErrors.question)
                    setFaqErrors((prev) => ({ ...prev, question: undefined }));
                }}
                maxLength={300}
              />
              {faqErrors.question ? (
                <Text style={styles.errorText}>{faqErrors.question}</Text>
              ) : null}

              <Text style={styles.label}>Answer *</Text>
              <TextInput
                style={[
                  styles.input,
                  { height: 90, textAlignVertical: 'top' },
                  faqErrors.answer ? styles.inputError : null,
                ]}
                multiline
                placeholder="Enter FAQ Answer..."
                value={faqAnswer}
                onChangeText={(text) => {
                  setFaqAnswer(text);
                  if (faqErrors.answer) setFaqErrors((prev) => ({ ...prev, answer: undefined }));
                }}
                maxLength={2000}
              />
              {faqErrors.answer ? <Text style={styles.errorText}>{faqErrors.answer}</Text> : null}

              <Text style={styles.label}>Display Order</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="1"
                value={faqOrder}
                onChangeText={setFaqOrder}
                maxLength={5}
              />
            </ScrollView>

            <HStack space="md" style={{ marginTop: 15 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setFaqModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveFaq}>
                <Text style={styles.submitBtnText}>Save FAQ</Text>
              </TouchableOpacity>
            </HStack>
          </View>
        </View>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 6,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 4,
  },
  subBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  smallAddBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  smallAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  popularBadge: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  pillBtnSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pillText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  checkRow: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  checkRowSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 6,
  },
});
