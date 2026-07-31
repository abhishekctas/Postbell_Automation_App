import React, { useState, useEffect, useCallback } from 'react';
import {
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
  listContactRequests,
  updateContactStatus,
  deleteContactRequest,
  ContactRequest,
} from './contact-us.api';
import { router } from 'expo-router';
import HtmlTable, { HtmlTableColumn } from '@/components/HtmlTable';
import { Feather } from '@expo/vector-icons';

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

const CONTACT_TABLE_COLUMNS: HtmlTableColumn<ContactRequest>[] = [
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
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>{dateStr}</Text>
          <Text style={{ fontSize: 11, color: '#64748b' }}>{timeStr}</Text>
        </VStack>
      );
    },
  },
  {
    key: 'updatedAt',
    label: 'Update At',
    width: '150px',
    render: (_v, row) => {
      const v = (row as any).updatedAt || row.createdAt;
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
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>{dateStr}</Text>
          <Text style={{ fontSize: 11, color: '#64748b' }}>{timeStr}</Text>
        </VStack>
      );
    },
  },
  {
    key: 'first_name',
    label: 'Name',
    width: '200px',
    render: (_v, row) => {
      const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown';
      const initials =
        name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w.charAt(0).toUpperCase())
          .join('') || 'UN';
      const bgColors = ['#dbeafe', '#e9d5ff', '#ffedd5', '#ccfbf1', '#fef3c7'];
      const textColors = ['#1e40af', '#6b21a8', '#c2410c', '#0f766e', '#b45309'];
      const charCode = name.charCodeAt(0) || 0;
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
          <VStack style={{ justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>
              {name}
            </Text>
          </VStack>
        </HStack>
      );
    },
  },
  {
    key: 'email',
    label: 'Email',
    width: '180px',
    render: (v) => (
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#2563eb' }} numberOfLines={1}>
        {v || '—'}
      </Text>
    ),
  },
  {
    key: 'subject',
    label: 'Reason',
    width: '150px',
    render: (v) => {
      const val = v || 'General Inquiry';
      return (
        <Box
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: '#e5f0ff',
            borderWidth: 1,
            borderColor: '#193867',
          }}
        >
          <Text style={{ color: '#193867', fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
            {val}
          </Text>
        </Box>
      );
    },
  },
  {
    key: 'message',
    label: 'Comment',
    width: '220px',
    render: (v) => (
      <Text style={{ fontSize: 13, color: '#475569' }} numberOfLines={2}>
        {v || '—'}
      </Text>
    ),
  },
  {
    key: 'contactStatus',
    label: 'Status',
    width: '130px',
    render: (v, row) => {
      const statusNum =
        v !== undefined
          ? Number(v)
          : (row as any).contact_status !== undefined
            ? Number((row as any).contact_status)
            : 0;
      const isResolved = statusNum === 1 || statusNum === 2;
      let label = 'Pending';
      let bg = '#fef9c3';
      let color = '#a16207';
      let border = '#fef08a';
      if (isResolved) {
        label = 'Resolved';
        bg = '#dcfce7';
        color = '#15803d';
        border = '#bbf7d0';
      }
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
  {
    key: 'updated_by_name',
    label: 'Updated By',
    width: '150px',
    render: (v, row) => {
      const name = v || (row as any).updated_by || 'System Admin';
      return (
        <HStack space="xs" className="items-center">
          <Box
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>
              {String(name).charAt(0).toUpperCase()}
            </Text>
          </Box>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#475569' }} numberOfLines={1}>
            {name}
          </Text>
        </HStack>
      );
    },
  },
];

const CONTACT_ROW_ACTIONS = [{ label: 'Delete', action: 'delete', style: 'danger' }];

export default function ContactUsScreen() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);

  const fetchRequestsList = useCallback(
    async (pg = 1, reset = true) => {
      if (reset) setLoading(true);
      try {
        const queryParams = new URLSearchParams({ page: pg.toString(), limit: '10' });
        if (search.trim()) queryParams.append('search', search.trim());
        if (filter === 'pending') queryParams.append('contactStatus', '0');
        else if (filter === 'resolved') queryParams.append('contactStatus', '1');
        const res = await listContactRequests(queryParams.toString());
        const items = res?.data || (Array.isArray(res) ? res : []);
        setRequests(items);
        const lastPage = res?.pagination?.lastPage || (items.length >= 10 ? pg + 1 : pg);
        setTotalPages(Math.max(1, lastPage));
        setPage(pg);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load support inquiries.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, filter]
  );

  useEffect(() => {
    fetchRequestsList(1, true);
  }, [search, filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequestsList(1, true);
  };

  const handleToggleStatus = async (item: ContactRequest) => {
    const id = item._id || item.id || '';
    const nextStatus = item.contactStatus === 1 ? 0 : 1;
    const label = nextStatus === 1 ? 'Resolved' : 'Pending';
    try {
      await updateContactStatus(id, nextStatus);
      setRequests((prev) =>
        prev.map((r) => ((r._id || r.id) === id ? { ...r, contactStatus: nextStatus } : r))
      );
      if (selectedRequest && (selectedRequest._id || selectedRequest.id) === id) {
        setSelectedRequest((prev) => (prev ? { ...prev, contactStatus: nextStatus } : null));
      }
      Alert.alert('Success', `Inquiry status changed to ${label}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update inquiry status.');
    }
  };

  const handleDelete = (item: ContactRequest) => {
    const id = item._id || item.id || '';
    Alert.alert('Delete Inquiry', 'Are you sure you want to delete this contact request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteContactRequest(id);
            Alert.alert('Success', 'Inquiry deleted successfully.');
            setRequests((prev) => prev.filter((r) => (r._id || r.id) !== id));
            setSelectedRequest(null);
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete inquiry.');
          }
        },
      },
    ]);
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      <LinearGradient
        colors={['#2563EB', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Box style={styles.headerGlow} />
        <Box style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <HStack className="items-center gap-0.5">
              <Feather name="arrow-left" size={16} color="#fff" />
              <Text style={styles.backBtnText}>Back</Text>
            </HStack>
          </TouchableOpacity>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <VStack style={{ flex: 1, paddingRight: 15 }}>
              <Heading style={styles.headerTitle}>Contact</Heading>
              <Text style={styles.headerSubtitle}>
                Read and resolve support and contact inquiries
              </Text>
            </VStack>
            <Box style={styles.iconContainer}>
              <Text style={styles.headerEmoji}>📩</Text>
            </Box>
          </HStack>
        </Box>
      </LinearGradient>
      <Box style={styles.mainCard}>
        <VStack space="sm" style={styles.filterSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search by name, email, or subject..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          <HStack space="sm" className="w-full">
            {(['all', 'pending', 'resolved'] as const).map((btn) => {
              const icon = btn === 'all' ? '▦' : btn === 'pending' ? '🕐' : '✓';
              const isActive = filter === btn;
              return (
                <TouchableOpacity
                  key={btn}
                  style={[
                    styles.tabBtn,
                    isActive && styles.tabBtnActive,
                    btn === 'pending' && !isActive && styles.tabBtnPending,
                    btn === 'resolved' && !isActive && styles.tabBtnResolved,
                  ]}
                  onPress={() => setFilter(btn)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      isActive && styles.tabTextActive,
                      btn === 'pending' && !isActive && styles.tabTextPending,
                      btn === 'resolved' && !isActive && styles.tabTextResolved,
                    ]}
                  >
                    {icon} {btn.charAt(0).toUpperCase() + btn.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </HStack>
        </VStack>
        {loading ? (
          <Box className="flex-1 items-center justify-center py-20">
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
            {requests.length === 0 ? (
              <Box className="items-center justify-center py-20">
                <Text style={{ color: '#64748b', fontSize: 14 }}>No inquiries found</Text>
              </Box>
            ) : (
              <React.Fragment>
                <HtmlTable
                  columns={CONTACT_TABLE_COLUMNS}
                  data={requests}
                  rowActions={CONTACT_ROW_ACTIONS}
                  onRowAction={(action, rowId) => {
                    const req = requests.find((x) => String(x._id || x.id) === String(rowId));
                    if (!req) return;
                    if (action === 'delete') handleDelete(req);
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

                {/* Previous Pagination Controls */}
                {totalPages > 0 && (
                  <Box style={styles.paginationWrapper}>
                    <HStack space="xs" className="items-center justify-center">
                      <TouchableOpacity
                        style={[styles.pageNavBtn, page === 1 && styles.pageNavBtnDisabled]}
                        disabled={page === 1}
                        onPress={() => {
                          if (page > 1) fetchRequestsList(page - 1, true);
                        }}
                      >
                        <Text
                          style={[styles.pageNavText, page === 1 && styles.pageNavTextDisabled]}
                        >
                          ‹
                        </Text>
                      </TouchableOpacity>

                      {getPageNumbers(page, totalPages).map((p) => {
                        const isActive = p === page;
                        return (
                          <TouchableOpacity
                            key={p}
                            style={[styles.pageNumberBtn, isActive && styles.pageNumberBtnActive]}
                            onPress={() => fetchRequestsList(p, true)}
                          >
                            <Text
                              style={[
                                styles.pageNumberText,
                                isActive && styles.pageNumberTextActive,
                              ]}
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
                          if (page < totalPages) fetchRequestsList(page + 1, true);
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
      </Box>
      <Modal
        visible={selectedRequest !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Box style={styles.closeIconContainer}>
              <Heading size="md">Inquiry Details</Heading>
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setSelectedRequest(null)}
              >
                <Feather name="x" size={20} color="#193867" />
              </TouchableOpacity>
            </Box>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <VStack space="md">
                <Box>
                  <Text style={styles.detailLabel}>Subject / Reason</Text>
                  <Text style={styles.detailValue}>{selectedRequest?.subject || 'No Subject'}</Text>
                </Box>
                <Box>
                  <Text style={styles.detailLabel}>Sender Details</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest?.first_name} {selectedRequest?.last_name}
                  </Text>
                  <Text className="mt-1 text-xs text-typography-500">
                    📧 {selectedRequest?.email}
                  </Text>
                  {selectedRequest?.contact_no ? (
                    <Text className="mt-0.5 text-xs text-typography-500">
                      📞 {selectedRequest?.contact_no}
                    </Text>
                  ) : null}
                </Box>
                <Box>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Box
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          selectedRequest?.contactStatus === 1 ? '#dcfce7' : '#fef9c3',
                        alignSelf: 'flex-start',
                        marginTop: 4,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selectedRequest?.contactStatus === 1 ? '#15803d' : '#a16207',
                        fontSize: 10,
                        fontWeight: '700',
                      }}
                    >
                      {selectedRequest?.contactStatus === 1 ? 'Resolved' : 'Pending'}
                    </Text>
                  </Box>
                </Box>
                <Box>
                  <Text style={styles.detailLabel}>Message / Comment</Text>
                  <Box style={styles.messageBox}>
                    <Text className="text-sm leading-5 text-typography-100">
                      {selectedRequest?.message}
                    </Text>
                  </Box>
                </Box>
              </VStack>
            </ScrollView>
            <HStack space="sm" className="mt-6">
              <Button
                style={{ flex: 1 }}
                className="rounded-xl bg-primary-700"
                onPress={() => selectedRequest && handleToggleStatus(selectedRequest)}
              >
                <ButtonText>
                  {selectedRequest?.contactStatus === 1 ? 'Mark Pending' : 'Mark Resolved'}
                </ButtonText>
              </Button>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: '#fee2e2' }]}
                onPress={() => selectedRequest && handleDelete(selectedRequest)}
              >
                <Text style={{ color: '#dc2626', fontWeight: '700' }}>Delete</Text>
              </TouchableOpacity>
            </HStack>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { height: 220, overflow: 'hidden', paddingBottom: 4 },
  headerContent: { flex: 1, paddingHorizontal: 22, paddingTop: 58 },
  headerGlow: {
    position: 'absolute',
    right: -50,
    top: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  backIcon: { color: '#fff', fontSize: 20, marginRight: 8, fontWeight: '600' },
  backBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 10 },
  headerSubtitle: { color: 'rgba(255,255,255,0.88)', fontSize: 17, lineHeight: 24 },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerEmoji: { fontSize: 64 },
  mainCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 20,
    marginTop: -20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  filterSection: {
    paddingBottom: 2,
    backgroundColor: '#fff',
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtnActive: { backgroundColor: '#193867', borderColor: '#193867' },
  tabBtnPending: { backgroundColor: '#fef9c3', borderColor: '#fef08a' },
  tabBtnResolved: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
  tabText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  tabTextActive: { color: '#ffffff' },
  tabTextPending: { color: '#a16207' },
  tabTextResolved: { color: '#15803d' },
  listContent: { paddingVertical: 16, paddingBottom: 90 },
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
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  closeIconContainer: {
    justifyContent: 'space-between',
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  closeModalBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: { fontSize: 14, color: '#1e293b', fontWeight: '600', marginTop: 2 },
  messageBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    marginTop: 4,
  },
});
