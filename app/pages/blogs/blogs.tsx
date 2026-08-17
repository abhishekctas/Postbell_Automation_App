import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Image,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import {
  listBlogs,
  deleteBlog,
  updateBlogStatus,
  getBlogCoverImageUrl,
  getAllTags,
  BlogPost,
  Tag,
} from './blogs.api';
import { router } from 'expo-router';
import HtmlTable, { HtmlTableColumn } from '@/components/HtmlTable';
import { Plus } from 'lucide-react-native';

const BLOG_ROW_ACTIONS = [
  { label: 'Edit', action: 'edit' },
  { label: 'Delete', action: 'delete', style: 'danger' },
];

function getPageNumbers(currentPage: number, lastPage: number) {
  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(lastPage, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

export default function BlogsScreen() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);

  // Form State
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showTagSelect, setShowTagSelect] = useState(false);

  const fetchTagsList = async () => {
    try {
      const res = await getAllTags();
      setTags(res);
    } catch (e) {
      console.log('Failed to fetch blog tags:', e);
    }
  };

  const fetchBlogsList = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: '10',
        });

        if (search.trim()) {
          queryParams.append('search', search.trim());
        }

        const res = (await listBlogs(queryParams.toString())) as any;
        const items = res?.data || res?.results || (Array.isArray(res) ? res : []);
        let total =
          res?.totalPages ||
          res?.pagination?.totalPages ||
          (res?.totalResults || res?.totalCount || res?.total
            ? Math.ceil((res.totalResults || res.totalCount || res.total) / 10)
            : 0);

        if (!total) {
          if (items.length >= 10) {
            total = Math.max(pg + 1, totalPages || 1);
          } else {
            total = pg;
          }
        }

        setBlogs(items);
        setTotalPages(total);
        setPage(pg);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load blogs.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchBlogsList(1);
      void fetchTagsList();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchBlogsList]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBlogsList(1);
    fetchTagsList();
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

  const handleToggleStatus = useCallback((blog: BlogPost) => {
    const id = blog._id || blog.id || '';
    if (!id) return;
    const isPublished = Number(blog.status) === 1;
    const newStatus = isPublished ? 0 : 1;

    const dialogTitle = newStatus === 1 ? 'Publish Blog' : 'Move to Draft';
    const dialogMessage =
      newStatus === 1
        ? `Are you sure you want to publish "${blog.title || 'this blog'}"?`
        : `Are you sure you want to move "${blog.title || 'this blog'}" to draft?`;
    const dialogConfirmText = newStatus === 1 ? 'Publish Blog' : 'Move to Draft';

    Alert.alert(dialogTitle, dialogMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: dialogConfirmText,
        style: newStatus === 1 ? 'default' : 'destructive',
        onPress: async () => {
          try {
            await updateBlogStatus(id);
            setBlogs((prev) =>
              prev.map((b) => ((b._id || b.id) === id ? { ...b, status: newStatus } : b))
            );
            Alert.alert('Success', 'Blog status updated successfully.');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to update blog status.');
          }
        },
      },
    ]);
  }, []);

  const blogTableColumns = useMemo<HtmlTableColumn<BlogPost>[]>(
    () => [
      {
        key: 'createdAt',
        label: 'Created At',
        width: '130px',
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
        key: 'cover_image',
        label: 'Cover',
        width: '100px',
        render: (_v, row) => {
          const coverUrl = getBlogCoverImageUrl(row.cover_image);
          if (coverUrl) {
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setViewingImage({ url: coverUrl, title: row.title || 'Blog Cover' })}
              >
                <Image
                  source={{ uri: coverUrl }}
                  style={{
                    width: 65,
                    height: 65,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            );
          }
          const title = row.title || 'Untitled Blog';
          const initials =
            title
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w: string) => w.charAt(0).toUpperCase())
              .join('') || 'BL';
          return (
            <Box
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: '#eff6ff',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#bfdbfe',
              }}
            >
              <Text style={{ color: '#1d4ed8', fontWeight: '700', fontSize: 13 }}>{initials}</Text>
            </Box>
          );
        },
      },
      {
        key: 'title',
        label: 'Blog',
        width: '220px',
        render: (_v, row) => {
          const title = row.title || 'Untitled Blog';
          return (
            <VStack style={{ justifyContent: 'center', flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                {title}
              </Text>
              {row.excerpt ? (
                <Text style={{ fontSize: 11, color: '#64748b' }} numberOfLines={1}>
                  {row.excerpt}
                </Text>
              ) : null}
            </VStack>
          );
        },
      },
      {
        key: 'slug',
        label: 'Slug',
        width: '160px',
        render: (_v, row) => (
          <Text style={{ fontSize: 12, color: '#2563eb', fontWeight: '600' }} numberOfLines={1}>
            {row.slug ? `/${row.slug}` : '—'}
          </Text>
        ),
      },
      {
        key: 'category',
        label: 'Category',
        width: '130px',
        render: (v) => {
          const catTitle =
            typeof v === 'object' && v
              ? (v as any).label || (v as any).title
              : typeof v === 'string'
                ? v
                : 'General';
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
                {catTitle || 'General'}
              </Text>
            </Box>
          );
        },
      },
      {
        key: 'status',
        label: 'Status',
        width: '130px',
        render: (v, row) => {
          const isPublished = Number(row?.status ?? v) === 1;
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleToggleStatus(row)}
              style={{
                minWidth: 95,
                paddingVertical: 2,
                borderRadius: 16,
                backgroundColor: isPublished ? '#193867' : 'transparent',
                borderWidth: 1,
                borderColor: isPublished ? '#193867' : '#2f4f4f',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-start',
              }}
            >
              <Text
                style={{
                  color: isPublished ? '#ffffff' : '#2f4f4f',
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {isPublished ? 'Published' : 'Draft'}
              </Text>
            </TouchableOpacity>
          );
        },
      },
      {
        key: 'read_time_minutes',
        label: 'Read Time',
        width: '110px',
        render: (v) => (
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>
            {v ? `${v} min` : '5 min'}
          </Text>
        ),
      },
      {
        key: 'published_at',
        label: 'Published At',
        width: '140px',
        render: (v) => {
          if (!v) return <Text style={{ fontSize: 12, color: '#94a3b8' }}>Not published</Text>;
          const d = new Date(v);
          if (isNaN(d.getTime()))
            return <Text style={{ fontSize: 12, color: '#475569' }}>{String(v)}</Text>;
          return (
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>
              {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          );
        },
      },
      {
        key: 'created_by',
        label: 'Created By',
        width: '160px',
        render: (_v, row) => {
          const u: any = (row as any).created_by;
          const name =
            typeof u === 'object' && u
              ? u.first_name || u.last_name
                ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
                : (u.name ?? u.full_name ?? u.username ?? u.email ?? '')
              : typeof u === 'string'
                ? u
                : '—';
          return (
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <Box
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: '#cbd5e1',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                  {name ? name.charAt(0).toUpperCase() : '?'}
                </Text>
              </Box>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155' }} numberOfLines={1}>
                {name || '—'}
              </Text>
            </HStack>
          );
        },
      },
    ],
    [handleToggleStatus]
  );

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
        <Box className="px-5 pb-4 pt-12">
          <HStack className="mb-2 items-center">
            <HStack space="xs">
              <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
                <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.addBtnText}>Add Blog</Text>
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
            <React.Fragment>
              <HtmlTable
                columns={blogTableColumns}
                data={blogs}
                rowActions={BLOG_ROW_ACTIONS}
                onRowAction={(action, rowId) => {
                  const b = blogs.find(
                    (x: any) =>
                      String(x._id || x.id) === String(rowId) ||
                      String(rowId).startsWith(String(x._id || x.id))
                  );
                  if (!b) return;
                  if (action === 'edit') {
                    handleOpenEdit(b);
                  } else if (action === 'delete') {
                    handleDelete(b);
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

              {totalPages > 0 && (
                <Box style={styles.paginationWrapper}>
                  <HStack space="xs" className="items-center justify-center">
                    <TouchableOpacity
                      style={[styles.pageNavBtn, page === 1 && styles.pageNavBtnDisabled]}
                      disabled={page === 1}
                      onPress={() => {
                        if (page > 1) fetchBlogsList(page - 1);
                      }}
                    >
                      <Text style={[styles.pageNavText, page === 1 && styles.pageNavTextDisabled]}>
                        ‹
                      </Text>
                    </TouchableOpacity>

                    {getPageNumbers(page, totalPages).map((p) => {
                      const isActive = p === page;
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.pageNumberBtn, isActive && styles.pageNumberBtnActive]}
                          onPress={() => fetchBlogsList(p)}
                        >
                          <Text
                            style={[styles.pageNumberText, isActive && styles.pageNumberTextActive]}
                          >
                            {p}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      style={[styles.pageNavBtn, page >= totalPages && styles.pageNavBtnDisabled]}
                      disabled={page >= totalPages}
                      onPress={() => {
                        if (page < totalPages) fetchBlogsList(page + 1);
                      }}
                    >
                      <Text
                        style={[
                          styles.pageNavText,
                          page >= totalPages && styles.pageNavTextDisabled,
                        ]}
                      >
                        ›
                      </Text>
                    </TouchableOpacity>
                  </HStack>
                </Box>
              )}
            </React.Fragment>
          )}
        </ScrollView>
      )}

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

      {/* ── IMAGE VIEWER MODAL ────────────────────────────────────────────────── */}
      <Modal
        visible={!!viewingImage}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <TouchableOpacity
          style={styles.imageViewerOverlay}
          activeOpacity={1}
          onPress={() => setViewingImage(null)}
        >
          <Box style={styles.imageViewerContainer} onStartShouldSetResponder={() => true}>
            <HStack style={styles.imageViewerHeader}>
              <Text style={styles.imageViewerTitle} numberOfLines={1}>
                {viewingImage?.title || 'Blog Cover'}
              </Text>
              <TouchableOpacity
                onPress={() => setViewingImage(null)}
                style={styles.imageViewerCloseBtn}
              >
                <Text style={styles.imageViewerCloseText}>✕</Text>
              </TouchableOpacity>
            </HStack>
            {viewingImage?.url ? (
              <Box style={{ padding: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Image
                  source={{ uri: viewingImage.url }}
                  style={styles.imageViewerImg}
                  resizeMode="contain"
                />
              </Box>
            ) : null}
          </Box>
        </TouchableOpacity>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 0 },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
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
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageViewerContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  imageViewerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageViewerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  imageViewerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  imageViewerImg: {
    width: '100%',
    height: 320,
    borderRadius: 12,
  },
  paginationWrapper: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pageNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  pageNavBtnDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.5,
  },
  pageNavText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  pageNavTextDisabled: {
    color: '#94a3b8',
  },
  pageNumberBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  pageNumberBtnActive: {
    backgroundColor: '#2563eb',
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pageNumberTextActive: {
    color: '#ffffff',
  },
});
