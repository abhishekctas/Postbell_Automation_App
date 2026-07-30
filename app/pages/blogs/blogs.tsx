import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { LinearGradient } from 'expo-linear-gradient';
import {
  listBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  updateBlogStatus,
  getAllTags,
  BlogPost,
  Tag,
} from './blogs.api';
import { router } from 'expo-router';
import HtmlTable, { HtmlTableColumn } from '@/components/HtmlTable';

const BLOG_TABLE_COLUMNS: HtmlTableColumn<BlogPost>[] = [
  {
    key: 'createdAt',
    label: 'Created At',
    width: '150px',
    render: (v) => {
      if (!v) return '—';
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      const dateStr = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return (
        <VStack style={{ justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a' }}>{dateStr}</Text>
          <Text style={{ fontSize: 11, color: '#64748b' }}>{timeStr}</Text>
        </VStack>
      );
    },
  },
  {
    key: 'title',
    label: 'Title',
    width: '220px',
    render: (_v, row) => {
      const title = row.title || 'Untitled Blog';
      const initials =
        title
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w: string) => w.charAt(0).toUpperCase())
          .join('') || 'BL';
      const bgColors = ['#dbeafe', '#e9d5ff', '#ffedd5', '#ccfbf1', '#fef3c7'];
      const textColors = ['#1e40af', '#6b21a8', '#c2410c', '#0f766e', '#b45309'];
      const charCode = title.charCodeAt(0) || 0;
      const colorIdx = charCode % bgColors.length;
      return (
        <HStack space="sm" className="items-center">
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: bgColors[colorIdx],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: textColors[colorIdx], fontWeight: '700', fontSize: 13 }}>
              {initials}
            </Text>
          </Box>
          <VStack style={{ justifyContent: 'center', flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
              {title}
            </Text>
            {row.slug ? (
              <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '500' }} numberOfLines={1}>
                /{row.slug}
              </Text>
            ) : null}
          </VStack>
        </HStack>
      );
    },
  },
  {
    key: 'category',
    label: 'Category',
    width: '140px',
    render: (v) => {
      const catTitle =
        typeof v === 'object' && v ? (v as any).title : typeof v === 'string' ? v : 'General';
      return (
        <Box
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: '#eff6ff',
            borderWidth: 1,
            borderColor: '#bfdbfe',
          }}
        >
          <Text style={{ color: '#1d4ed8', fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
            {catTitle}
          </Text>
        </Box>
      );
    },
  },
  {
    key: 'excerpt',
    label: 'Excerpt',
    width: '220px',
    render: (v) => (
      <Text style={{ fontSize: 13, color: '#475569' }} numberOfLines={2}>
        {v || '—'}
      </Text>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: '130px',
    render: (v) => {
      const isPublished = Number(v) === 1;
      const label = isPublished ? 'Published' : 'Draft';
      const bg = isPublished ? '#dcfce7' : '#fef3c7';
      const color = isPublished ? '#15803d' : '#b45309';
      const border = isPublished ? '#bbf7d0' : '#fde68a';
      return (
        <Box
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Text style={{ color: color, fontWeight: '700', fontSize: 11 }}>• {label}</Text>
        </Box>
      );
    },
  },
];

const BLOG_ROW_ACTIONS = [
  { label: 'Edit', action: 'edit' },
  { label: 'Delete', action: 'delete', style: 'danger' },
];

export default function BlogsScreen() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showTagSelect, setShowTagSelect] = useState(false);
  const [status, setStatus] = useState<number>(1); // 1 = Published, 0 = Draft

  const fetchTagsList = async () => {
    try {
      const res = await getAllTags();
      setTags(res);
    } catch (e) {
      console.log('Failed to fetch blog tags:', e);
    }
  };

  const fetchBlogsList = useCallback(
    async (pg = 1, reset = true) => {
      if (reset) setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: '10',
        });

        if (search.trim()) {
          queryParams.append('search', search.trim());
        }

        const res = (await listBlogs(queryParams.toString())) as any;
        const items = res?.data || (Array.isArray(res) ? res : res?.results || []);

        if (reset) {
          setBlogs(items);
        } else {
          setBlogs((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load blogs.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search]
  );

  useEffect(() => {
    fetchTagsList();
    fetchBlogsList(1, true);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBlogsList(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchBlogsList(page + 1, false);
  };

  const handleOpenAdd = () => {
    router.push('/pages/blogs/blog-editor');
  };

  const handleOpenEdit = (blog: BlogPost) => {
    const blogId = blog._id || blog.id || '';
    router.push({
      pathname: '/pages/blogs/blog-editor',
      params: { id: blogId },
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title is required.');
      return;
    }
    if (!slug.trim()) {
      Alert.alert('Validation Error', 'Slug is required.');
      return;
    }

    try {
      const payload: Partial<BlogPost> = {
        title,
        slug,
        excerpt,
        body,
        status,
        category: selectedTag?._id || selectedTag?.id || undefined,
      };

      if (editingBlog) {
        await updateBlog(editingBlog._id || editingBlog.id || '', payload);
        Alert.alert('Success', 'Blog post updated successfully!');
      } else {
        await createBlog(payload);
        Alert.alert('Success', 'Blog post created successfully!');
      }

      setModalVisible(false);
      fetchBlogsList(1, true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save blog post.');
    }
  };

  const handleToggleStatus = async (blog: BlogPost) => {
    const id = blog._id || blog.id || '';
    try {
      await updateBlogStatus(id);
      setBlogs((prev) =>
        prev.map((b) => ((b._id || b.id) === id ? { ...b, status: b.status === 1 ? 0 : 1 } : b))
      );
      Alert.alert('Success', 'Blog status changed successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to toggle status.');
    }
  };

  const handleDelete = (blog: BlogPost) => {
    const id = blog._id || blog.id || '';
    Alert.alert('Delete Blog', `Are you sure you want to delete the blog "${blog.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBlog(id);
            Alert.alert('Success', 'Blog deleted successfully.');
            setBlogs((prev) => prev.filter((b) => (b._id || b.id) !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete blog.');
          }
        },
      },
    ]);
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <Box className="px-5 pb-4 pt-14">
          <HStack className="mb-2 items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-sm font-medium text-white">← Back</Text>
            </TouchableOpacity>
            <HStack space="xs">
              <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
                <Text style={styles.addBtnText}>+ Add Blog</Text>
              </TouchableOpacity>
            </HStack>
          </HStack>
          <HStack className="items-start justify-between">
            <VStack style={{ flex: 1, paddingRight: 12 }}>
              <Heading size="xl" style={{ color: '#fff' }}>
                Blog Management
              </Heading>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                Create and edit articles, guidelines, and content pages
              </Text>
            </VStack>
            <Box style={styles.headerIllustration}>
              <Text style={{ fontSize: 30 }}>📝</Text>
              <Text style={styles.sparkleTopLeft}>✨</Text>
              <Text style={styles.sparkleBottomRight}>✨</Text>
              <Text style={styles.bubbleTopRight}>💬</Text>
            </Box>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Search Input */}
      <Box style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </Box>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#193867" />
          }
        >
          {blogs.length === 0 ? (
            <Box className="items-center justify-center py-20">
              <Text className="text-base text-typography-400">No blog articles found</Text>
            </Box>
          ) : (
            <HtmlTable
              columns={BLOG_TABLE_COLUMNS}
              data={blogs}
              rowActions={BLOG_ROW_ACTIONS}
              onRowAction={(action, rowId) => {
                if (action === 'edit') {
                  const b = blogs.find((x) => String(x._id || x.id) === String(rowId));
                  if (b) handleOpenEdit(b);
                } else if (action === 'delete') {
                  const b = blogs.find((x) => String(x._id || x.id) === String(rowId));
                  if (b) handleDelete(b);
                }
              }}
              iconOnlyActions={true}
              tableContainerStyle={{
                borderWidth: 0,
                shadowColor: 'transparent',
                backgroundColor: 'transparent',
                elevation: 0,
                marginHorizontal: 0,
                marginVertical: 0,
              }}
              headerRowStyle={{
                backgroundColor: '#f8fafc',
                borderBottomWidth: 1.5,
                borderBottomColor: '#e2e8f0',
              }}
              headerCellTextStyle={{
                color: '#1e3a8a',
                fontWeight: '700',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
              rowStyle={{
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
                backgroundColor: '#ffffff',
              }}
            />
          )}
          {loadingMore && (
            <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} />
          )}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Heading size="md" className="mb-4">
              {editingBlog ? 'Edit Blog' : 'Add Blog'}
            </Heading>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Title *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={title}
                    onChangeText={(val) => {
                      setTitle(val);
                      setSlug(
                        val
                          .toLowerCase()
                          .trim()
                          .replace(/[^\w\s-]/g, '')
                          .replace(/[\s_-]+/g, '-')
                          .replace(/^-+|-+$/g, '')
                      );
                    }}
                    placeholder="Article title"
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Slug *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={slug}
                    onChangeText={setSlug}
                    placeholder="article-slug"
                  />
                </VStack>

                {/* Tag Selection */}
                <VStack space="xs">
                  <Text style={styles.label}>Category / Tag</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setShowTagSelect(true)}>
                    <Text style={styles.selectBtnText}>
                      {selectedTag ? selectedTag.title : 'No category selected'}
                    </Text>
                  </TouchableOpacity>
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Excerpt</Text>
                  <TextInput
                    style={[styles.modalInput, { minHeight: 45 }]}
                    value={excerpt}
                    onChangeText={setExcerpt}
                    multiline
                    placeholder="Short summary preview"
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Body content</Text>
                  <TextInput
                    style={[styles.modalInput, { minHeight: 120 }]}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    placeholder="Enter HTML or text body content..."
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Status *</Text>
                  <HStack space="sm">
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 1 && styles.statusToggleBtnActive]}
                      onPress={() => setStatus(1)}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          status === 1 && styles.statusToggleTextActive,
                        ]}
                      >
                        Published
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusToggleBtn,
                        status === 0 && styles.statusToggleBtnActiveDanger,
                      ]}
                      onPress={() => setStatus(0)}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          status === 0 && styles.statusToggleTextActiveDanger,
                        ]}
                      >
                        Draft
                      </Text>
                    </TouchableOpacity>
                  </HStack>
                </VStack>
              </VStack>
            </ScrollView>

            <HStack space="sm" className="mt-6">
              <Button
                style={{ flex: 1 }}
                className="rounded-xl bg-primary-700"
                onPress={handleSave}
              >
                <ButtonText>Save</ButtonText>
              </Button>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </HStack>
          </Box>
        </Box>
      </Modal>

      {/* Category / Tag Selection Modal */}
      <Modal
        visible={showTagSelect}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTagSelect(false)}
      >
        <Box style={styles.modalOverlay}>
          <Box style={[styles.modalContainer, { maxWidth: 300 }]}>
            <Heading size="sm" className="mb-4">
              Select Category
            </Heading>
            <FlatList
              data={tags}
              keyExtractor={(t, idx) => t._id || t.id || String(idx)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.selectItem}
                  onPress={() => {
                    setSelectedTag(item);
                    setShowTagSelect(false);
                  }}
                >
                  <Text style={styles.selectBtnText}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeSelectBtn} onPress={() => setShowTagSelect(false)}>
              <Text style={{ fontWeight: '700', color: '#64748b' }}>Close</Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 16 },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  headerIllustration: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sparkleTopLeft: {
    position: 'absolute',
    top: -4,
    left: 2,
    fontSize: 12,
    opacity: 0.8,
  },
  sparkleBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    fontSize: 12,
    opacity: 0.8,
  },
  bubbleTopRight: {
    position: 'absolute',
    top: -6,
    right: -6,
    fontSize: 16,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  listContent: { padding: 16, paddingBottom: 90 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusToggleAction: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f8fafc',
  },
  statusToggleActionText: { fontSize: 10, color: '#475569', fontWeight: '600' },
  actionBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionBtnDanger: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
  },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#1d4ed8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  selectBtn: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  selectBtnText: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  statusToggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  statusToggleBtnActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  statusToggleBtnActiveDanger: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  statusToggleText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  statusToggleTextActive: { color: '#15803d', fontWeight: '700' },
  statusToggleTextActiveDanger: { color: '#dc2626', fontWeight: '700' },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  cancelBtnText: { color: '#475569', fontWeight: '700', fontSize: 14 },
  selectItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeSelectBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
});
