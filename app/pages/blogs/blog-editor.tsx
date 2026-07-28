import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BlogPost,
  BlogFormData,
  Tag,
  TagFormData,
  FaqItem,
  FaqFormData,
  GuidesListingConfig,
  GuidesConfigFormData,
  InfoPoint,
  SeoLink,
  getBlog,
  listBlogs,
  createBlog,
  updateBlog,
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

export default function BlogEditorScreen() {
  const router = useRouter();
  const { id, blogId } = useLocalSearchParams<{ id?: string; blogId?: string }>();
  const currentBlogId = id || blogId;
  const isEditMode = !!currentBlogId;

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
            typeof configRes.featured_blog_id === 'object'
              ? configRes.featured_blog_id._id
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
            typeof blogObj.category === 'object' ? blogObj.category._id : blogObj.category;
          setBlogCategory(catVal || '');
          setBlogReadTime(String(blogObj.read_time_minutes || 5));
          setBlogAuthor(blogObj.author_label || '');
          setBlogCoverImage(blogObj.cover_image || '');
          setBlogStatus(blogObj.status ?? 1);

          if (blogObj.faq_ids?.length) {
            const ids = blogObj.faq_ids.map((item: any) =>
              typeof item === 'object' ? item._id : item
            );
            setSelectedFaqIds(ids);
          }

          if (blogObj.shop_banner) {
            setShopTitle(blogObj.shop_banner.title || '');
            setShopDesc(blogObj.shop_banner.description || '');
            setShopCtaText(blogObj.shop_banner.cta_text || '');
            setShopCtaUrl(blogObj.shop_banner.cta_url || '');
          }

          if (blogObj.seo_links?.length) {
            setSeoLinks(blogObj.seo_links);
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
    loadInitialData();
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
  const handleOpenAddTag = () => {
    setEditingTag(null);
    setTagTitle('');
    setTagSubtitle('');
    setTagImage('');
    setTagLinkUrl('');
    setTagLinkText('');
    setTagIsPopular(false);
    setTagModalVisible(true);
  };

  const handleOpenEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagTitle(tag.title || '');
    setTagSubtitle(tag.subtitle || '');
    setTagImage(tag.image_url || '');
    setTagLinkUrl(tag.link_url || '');
    setTagLinkText(tag.link_text || '');
    setTagIsPopular(!!tag.is_popular);
    setTagModalVisible(true);
  };

  const handleSaveTag = async () => {
    if (!tagTitle.trim()) {
      Alert.alert('Validation Error', 'Tag title is required');
      return;
    }
    try {
      const payload: TagFormData = {
        title: tagTitle.trim(),
        subtitle: tagSubtitle,
        image_url: tagImage,
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
    setFaqModalVisible(true);
  };

  const handleOpenEditFaq = (faq: FaqItem) => {
    setEditingFaq(faq);
    setFaqQuestion(faq.question || '');
    setFaqAnswer(faq.answer || '');
    setFaqOrder(String(faq.order ?? 1));
    setFaqModalVisible(true);
  };

  const handleSaveFaq = async () => {
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      Alert.alert('Validation Error', 'Question and Answer are required.');
      return;
    }
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
    if (!blogTitle.trim()) {
      Alert.alert('Validation Error', 'Blog Title is required.');
      return;
    }
    if (!blogSlug.trim()) {
      Alert.alert('Validation Error', 'Blog Slug is required.');
      return;
    }

    setSaving(true);
    try {
      const payload: BlogFormData = {
        title: blogTitle.trim(),
        slug: blogSlug.trim(),
        excerpt: blogExcerpt.trim(),
        body: blogBody.trim(),
        category: blogCategory || undefined,
        read_time_minutes: parseInt(blogReadTime, 10) || 5,
        author_label: blogAuthor.trim(),
        cover_image: blogCoverImage.trim(),
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
      <LinearGradient colors={['#193867', '#0F2647']} style={styles.header}>
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
            onPress={() => setActiveTab(0)}
          >
            <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
              ⚙️ Blog Config
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 1 && styles.tabButtonActive]}
            onPress={() => setActiveTab(1)}
          >
            <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
              🏷️ Global Resources
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 2 && styles.tabButtonActive]}
            onPress={() => setActiveTab(2)}
          >
            <Text style={[styles.tabText, activeTab === 2 && styles.tabTextActive]}>
              📝 Blog Editor
            </Text>
          </TouchableOpacity>
        </HStack>
      </LinearGradient>

      {/* ── MAIN CONTENT AREA ──────────────────────────────────────────────── */}
      <ScrollView
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
              />

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Master Postbell Platform"
                value={heroTitle}
                onChangeText={setHeroTitle}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                multiline
                placeholder="Explore tutorials, best practices..."
                value={heroDesc}
                onChangeText={setHeroDesc}
              />

              <Text style={styles.label}>Hero Image URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/banner.png"
                value={heroImage}
                onChangeText={setHeroImage}
              />

              <Text style={styles.label}>Tag Pills (Comma Separated)</Text>
              <TextInput
                style={styles.input}
                placeholder="Automation, Marketing, AI"
                value={heroTagPills}
                onChangeText={setHeroTagPills}
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
              />

              <Text style={styles.label}>Info Section Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Everything you need to know"
                value={infoTitle}
                onChangeText={setInfoTitle}
              />

              <Text style={styles.label}>Info Section Description</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                placeholder="Detailed information section summary..."
                value={infoDesc}
                onChangeText={setInfoDesc}
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
                  />
                  <TextInput
                    style={[styles.input, { height: 50 }]}
                    multiline
                    placeholder="Point Description"
                    value={pt.description}
                    onChangeText={(v) => handleUpdateInfoPoint(idx, 'description', v)}
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
              />

              <Text style={styles.label}>Featured CTA Text</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Read Featured Guide"
                value={featuredCtaText}
                onChangeText={setFeaturedCtaText}
              />

              <Text style={styles.label}>Select Featured Blog ID</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Featured Blog ID"
                value={featuredBlogId}
                onChangeText={setFeaturedBlogId}
              />

              <HStack className="mt-3 items-center justify-between">
                <Text style={{ fontWeight: '600', color: '#334155' }}>
                  Enable Configuration Status
                </Text>
                <Switch
                  value={configStatus === 1}
                  onValueChange={(val) => setConfigStatus(val ? 1 : 0)}
                  trackColor={{ false: '#cbd5e1', true: '#193867' }}
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
                style={styles.input}
                placeholder="Enter Blog Title"
                value={blogTitle}
                onChangeText={setBlogTitle}
              />

              <HStack className="mt-1 items-center justify-between">
                <Text style={styles.label}>Blog Slug *</Text>
                <TouchableOpacity onPress={handleAutoSlug}>
                  <Text style={{ fontSize: 12, color: '#2563eb', fontWeight: '600' }}>
                    Auto-Generate Slug
                  </Text>
                </TouchableOpacity>
              </HStack>
              <TextInput
                style={styles.input}
                placeholder="enter-blog-slug"
                value={blogSlug}
                onChangeText={setBlogSlug}
              />

              <Text style={styles.label}>Excerpt (Summary)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                placeholder="Brief summary of the article..."
                value={blogExcerpt}
                onChangeText={setBlogExcerpt}
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
                  />
                </VStack>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.label}>Author Label</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Postbell Team"
                    value={blogAuthor}
                    onChangeText={setBlogAuthor}
                  />
                </VStack>
              </HStack>

              <Text style={styles.label}>Cover Image URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/cover.jpg"
                value={blogCoverImage}
                onChangeText={setBlogCoverImage}
              />
            </Box>

            {/* BODY CONTENT */}
            <Box style={styles.card}>
              <Heading size="md" style={styles.cardHeader}>
                Body Content
              </Heading>
              <Text style={styles.label}>Main Article Body (HTML / Text)</Text>
              <TextInput
                style={[styles.input, { height: 160, textAlignVertical: 'top' }]}
                multiline
                placeholder="Write full article body content here..."
                value={blogBody}
                onChangeText={setBlogBody}
              />
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
                          color: isChecked ? '#193867' : '#334155',
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
              />

              <Text style={styles.label}>Banner Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Automate social media posts in minutes"
                value={shopDesc}
                onChangeText={setShopDesc}
              />

              <HStack space="md">
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.label}>CTA Button Text</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Get Started"
                    value={shopCtaText}
                    onChangeText={setShopCtaText}
                  />
                </VStack>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.label}>CTA URL</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://..."
                    value={shopCtaUrl}
                    onChangeText={setShopCtaUrl}
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
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Target URL (e.g. /pages/features)"
                    value={link.url}
                    onChangeText={(v) => handleUpdateSeoLink(idx, 'url', v)}
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
              />

              <Text style={styles.label}>SEO Description</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                placeholder="Meta description snippet..."
                value={seoDescription}
                onChangeText={setSeoDescription}
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
                style={[styles.saveBtn, { flex: 1, backgroundColor: '#64748b' }]}
                onPress={() => handleSaveBlog(0)}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Draft'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { flex: 1, backgroundColor: '#16a34a' }]}
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
                style={styles.input}
                placeholder="e.g. Technology"
                value={tagTitle}
                onChangeText={setTagTitle}
              />

              <Text style={styles.label}>Tag Subtitle</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Latest Tech News"
                value={tagSubtitle}
                onChangeText={setTagSubtitle}
              />

              <Text style={styles.label}>Tag Image URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                value={tagImage}
                onChangeText={setTagImage}
              />

              <Text style={styles.label}>Link URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                value={tagLinkUrl}
                onChangeText={setTagLinkUrl}
              />

              <Text style={styles.label}>Link Text</Text>
              <TextInput
                style={styles.input}
                placeholder="View Articles"
                value={tagLinkText}
                onChangeText={setTagLinkText}
              />

              <HStack className="mb-2 mt-2 items-center justify-between">
                <Text style={{ fontWeight: '600', color: '#334155' }}>Mark as Popular</Text>
                <Switch
                  value={tagIsPopular}
                  onValueChange={setTagIsPopular}
                  trackColor={{ false: '#cbd5e1', true: '#193867' }}
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
                style={styles.input}
                placeholder="Enter FAQ Question..."
                value={faqQuestion}
                onChangeText={setFaqQuestion}
              />

              <Text style={styles.label}>Answer *</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                multiline
                placeholder="Enter FAQ Answer..."
                value={faqAnswer}
                onChangeText={setFaqAnswer}
              />

              <Text style={styles.label}>Display Order</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="1"
                value={faqOrder}
                onChangeText={setFaqOrder}
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
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  tabTextActive: {
    color: '#193867',
    fontWeight: '700',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    color: '#0f172a',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 4,
  },
  subBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  smallAddBtn: {
    backgroundColor: '#193867',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#193867',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  listItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  popularBadge: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillBtn: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
  },
  pillBtnSelected: {
    backgroundColor: '#193867',
  },
  pillText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: '#ffffff',
  },
  checkRow: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  checkRowSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#193867',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
