import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import {
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  updateStatusPlan,
  SubscriptionPlan,
} from './subscription-plans.api';
import { router } from 'expo-router';
import HtmlTable, { HtmlTableColumn } from '@/components/HtmlTable';
import StatusConfirmDialog from '@/components/common/StatusConfirmDialog';
import {
  Star,
  Rocket,
  Gem,
  Crown,
  Sparkles,
  Plus,
  Search,
  Save,
  ArrowLeft,
  Tag,
  FileText,
  Layers,
  ListPlus,
  AlignLeft,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  FileClock,
  ChevronDown,
  Check,
  Eye,
} from 'lucide-react-native';

const PLAN_NAMES = ['Basic', 'Starter', 'Professional', 'Premium', 'Enterprise'] as const;

const PLAN_ROW_ACTIONS = [
  { label: 'Details', action: 'details' },
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

const CrownIllustration = () => {
  return (
    <Box style={{ position: 'relative', width: 90, height: 60 }}>
      {/* Background card */}
      <Box
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 8,
          width: 80,
          height: 50,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        {/* Blue circle with crown */}
        <Box
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#2563eb',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 6,
          }}
        >
          <Crown size={12} color="#ffffff" />
        </Box>
        {/* Mock text lines */}
        <VStack space="xs" style={{ flex: 1 }}>
          <Box style={{ height: 4, backgroundColor: '#bfdbfe', borderRadius: 2, width: '100%' }} />
          <Box style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, width: '80%' }} />
          <Box style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, width: '60%' }} />
        </VStack>
      </Box>
      {/* Sparkles around */}
      <Box style={{ position: 'absolute', top: -10, left: -10 }}>
        <Sparkles size={14} color="#60a5fa" />
      </Box>
      <Box style={{ position: 'absolute', bottom: 0, right: 0 }}>
        <Sparkles size={10} color="#93c5fd" />
      </Box>
    </Box>
  );
};

const EditIllustration = () => {
  return (
    <Box style={{ position: 'relative', width: 90, height: 60 }}>
      {/* Clipboard card */}
      <Box
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 8,
          padding: 6,
          width: 50,
          height: 60,
          alignSelf: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {/* Clipboard clip top */}
        <Box
          style={{
            position: 'absolute',
            top: -6,
            left: 17,
            width: 16,
            height: 6,
            backgroundColor: '#bfdbfe',
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
          }}
        />
        {/* Crown icon inside circle */}
        <Box
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#2563eb',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
            marginBottom: 4,
            alignSelf: 'center',
          }}
        >
          <Crown size={10} color="#ffffff" />
        </Box>
        {/* Micro lines */}
        <Box
          style={{
            height: 2,
            backgroundColor: '#e2e8f0',
            width: '80%',
            alignSelf: 'center',
            marginBottom: 2,
          }}
        />
        <Box style={{ height: 2, backgroundColor: '#e2e8f0', width: '60%', alignSelf: 'center' }} />
      </Box>
      {/* Sparkles */}
      <Box style={{ position: 'absolute', top: 0, left: 0 }}>
        <Sparkles size={12} color="#60a5fa" />
      </Box>
      <Box style={{ position: 'absolute', bottom: 0, right: 5 }}>
        <Sparkles size={10} color="#93c5fd" />
      </Box>
    </Box>
  );
};

const FormInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  icon: IconComponent,
  multiline = false,
  style = {},
  error,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
  icon?: any;
  multiline?: boolean;
  style?: any;
  error?: string;
}) => {
  return (
    <VStack space="xs" style={[{ flex: 1 }, style]}>
      <Text style={styles.label}>{label}</Text>
      <Box style={{ position: 'relative', justifyContent: 'center' }}>
        {IconComponent && (
          <Box style={{ position: 'absolute', left: 12, zIndex: 10, alignSelf: 'center' }}>
            {typeof IconComponent === 'string' ? (
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#2563eb' }}>
                {IconComponent}
              </Text>
            ) : (
              <IconComponent size={16} color="#2563eb" />
            )}
          </Box>
        )}
        <TextInput
          style={[
            styles.modalInput,
            IconComponent ? { paddingLeft: 38 } : {},
            multiline ? { minHeight: 60, textAlignVertical: 'top', paddingTop: 8 } : { height: 44 },
            error ? { borderColor: '#dc2626' } : {},
          ]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          multiline={multiline}
        />
      </Box>
      {error ? <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>{error}</Text> : null}
    </VStack>
  );
};

export default function SubscriptionPlansScreen() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search, filter and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [name, setName] = useState<string>('Basic');
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [pricePerMonth, setPricePerMonth] = useState('');
  const [postsPerMonth, setPostsPerMonth] = useState('');
  const [postsPerDay, setPostsPerDay] = useState('');
  const [aiLimit, setAiLimit] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isPopularMonthly, setIsPopularMonthly] = useState(false);
  const [isPopularAnnual, setIsPopularAnnual] = useState(false);
  const [status, setStatus] = useState<number>(1); // 1 = Active, 0 = Inactive

  // Validation Errors State & Modal Scroll Ref
  const [errors, setErrors] = useState<Record<string, string>>({});
  const modalScrollRef = useRef<ScrollView>(null);

  // Details Modal State
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<SubscriptionPlan | null>(
    null
  );

  const handleOpenDetails = (plan: SubscriptionPlan) => {
    setSelectedPlanForDetails(plan);
    setDetailsModalVisible(true);
  };

  // Status confirm dialog state
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [selectedPlanForStatus, setSelectedPlanForStatus] = useState<SubscriptionPlan | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const handleOpenStatusConfirm = (plan: SubscriptionPlan) => {
    setSelectedPlanForStatus(plan);
    setStatusConfirmOpen(true);
  };

  const PLAN_TABLE_COLUMNS: HtmlTableColumn[] = [
    {
      key: 'name',
      label: 'Plan Name',
      width: '200px',
      render: (v, row: SubscriptionPlan) => {
        const nameLower = String(v).toLowerCase();
        let IconComponent = Sparkles;
        let iconColor = '#2563eb';
        let bgColor = '#eff6ff';
        const isPopular = row.is_popular_monthly || row.is_popular_annual;

        if (nameLower.includes('starter') || nameLower.includes('start')) {
          IconComponent = Rocket;
          iconColor = '#8b5cf6';
          bgColor = '#f5f3ff';
        } else if (nameLower.includes('basic') || nameLower.includes('base')) {
          IconComponent = Gem;
          iconColor = '#06b6d4';
          bgColor = '#ecfeff';
        } else if (nameLower.includes('premium')) {
          IconComponent = Crown;
          iconColor = '#f97316';
          bgColor = '#fff7ed';
        } else if (nameLower.includes('popular') || isPopular) {
          IconComponent = Star;
          iconColor = '#eab308';
          bgColor = '#fef9c3';
        }

        return (
          <TouchableOpacity onPress={() => handleOpenDetails(row)}>
            <HStack space="sm" className="items-center">
              <VStack className="items-center justify-center">
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: bgColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComponent size={16} color={iconColor} />
                </Box>
                {isPopular && (
                  <Box
                    style={{
                      backgroundColor: '#fef3c7',
                      paddingHorizontal: 4,
                      borderRadius: 4,
                      marginTop: 2,
                    }}
                  >
                    <Text style={{ fontSize: 7, fontWeight: '800', color: '#d97706' }}>
                      POPULAR
                    </Text>
                  </Box>
                )}
              </VStack>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563eb' }}>{v}</Text>
            </HStack>
          </TouchableOpacity>
        );
      },
    },
    {
      key: 'price_per_month',
      label: 'Price/Month',
      width: '120px',
      render: (v) => (
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e293b' }}>₹{v}</Text>
      ),
    },
    {
      key: 'price_per_year',
      label: 'Price/Year',
      width: '110px',
      render: (v) => (
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b' }}>
          {v ? `₹${v}` : '—'}
        </Text>
      ),
    },
    {
      key: 'posts_per_month',
      label: 'Posts/Mo',
      width: '100px',
      render: (v) => <Text style={{ fontSize: 13, color: '#475569' }}>{v ?? 0}</Text>,
    },
    {
      key: 'posts_per_day',
      label: 'Posts/Day',
      width: '110px',
      render: (v) => <Text style={{ fontSize: 13, color: '#475569' }}>{v ?? 0}</Text>,
    },
    {
      key: 'ai_content_generation_limit',
      label: 'AI Limit',
      width: '100px',
      render: (v) => <Text style={{ fontSize: 13, color: '#475569' }}>{v ?? 0}</Text>,
    },
    {
      key: 'features',
      label: 'Features',
      width: '110px',
      render: (v, row: SubscriptionPlan) => {
        const featList = Array.isArray(v) ? v : row.features || [];
        if (!featList.length) {
          return <Text style={{ fontSize: 12, color: '#94a3b8' }}>—</Text>;
        }
        return (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#eff6ff',
              borderWidth: 1,
              borderColor: '#bfdbfe',
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              alignSelf: 'flex-start',
            }}
            onPress={() => handleOpenDetails(row)}
          >
            <Eye size={12} color="#1d4ed8" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1d4ed8' }}>
              View ({featList.length})
            </Text>
          </TouchableOpacity>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (v, row: SubscriptionPlan) => {
        const isAct = v === 1;
        const bg = isAct ? '#eff6ff' : '#f8fafc';
        const color = isAct ? '#2563eb' : '#64748b';
        const border = isAct ? '#bfdbfe' : '#e2e8f0';
        return (
          <TouchableOpacity onPress={() => handleOpenStatusConfirm(row)}>
            <Box
              style={{
                backgroundColor: bg,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
              }}
            >
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: color,
                  marginRight: 6,
                }}
              />
              <Text style={{ fontSize: 11, fontWeight: '700', color }}>
                {isAct ? 'Active' : 'Inactive'}
              </Text>
            </Box>
          </TouchableOpacity>
        );
      },
    },
  ];

  const handleConfirmStatusToggle = async () => {
    if (!selectedPlanForStatus) return;
    const plan = selectedPlanForStatus;
    const id = plan._id || plan.id || '';
    const nextStatus = plan.status === 1 ? 0 : 1;
    setStatusLoading(true);
    try {
      if (updateStatusPlan) {
        await updateStatusPlan(id, nextStatus);
      } else {
        await updateSubscriptionPlan(id, { status: nextStatus });
      }
      setPlans((prev) =>
        prev.map((p) => ((p._id || p.id) === id ? { ...p, status: nextStatus } : p))
      );
      setStatusConfirmOpen(false);
      setSelectedPlanForStatus(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update plan status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const scrollToTopModal = () => {
    modalScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (errors.name && newName.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  };

  const handlePriceChange = (val: string) => {
    setPricePerMonth(val);
    if (errors.price_per_month && val.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.price_per_month;
        return next;
      });
    }
  };

  const handlePostsPerMonthChange = (val: string) => {
    setPostsPerMonth(val);
    if (errors.posts_per_month && val.trim()) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.posts_per_month;
        return next;
      });
    }
  };

  // Reset page when search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const fetchPlansList = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await listSubscriptionPlans()) as any;
      const items = Array.isArray(res) ? res : res?.data || res?.results || res?.plans || [];
      setPlans(items);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load subscription plans.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlansList();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlansList();
  };

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setName('Basic');
    setShowNameDropdown(false);
    setBillingCycle('monthly');
    setPricePerMonth('');
    setPostsPerMonth('');
    setPostsPerDay('');
    setAiLimit('');
    setDescription('');
    setFeatures([]);
    setFeatureInput('');
    setSortOrder('0');
    setIsPopularMonthly(false);
    setIsPopularAnnual(false);
    setStatus(1);
    setErrors({});
    setModalVisible(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setName(plan.name || 'Basic');
    setShowNameDropdown(false);
    setBillingCycle(plan.billing_cycle || 'monthly');
    setPricePerMonth(plan.price_per_month ? String(plan.price_per_month) : '');
    setPostsPerMonth(plan.posts_per_month ? String(plan.posts_per_month) : '');
    setPostsPerDay(plan.posts_per_day ? String(plan.posts_per_day) : '');
    setAiLimit(plan.ai_content_generation_limit ? String(plan.ai_content_generation_limit) : '');
    setDescription(plan.description || '');
    setFeatures(Array.isArray(plan.features) ? plan.features : []);
    setFeatureInput('');
    setSortOrder(plan.sort_order ? String(plan.sort_order) : '0');
    setIsPopularMonthly(plan.is_popular_monthly || false);
    setIsPopularAnnual(plan.is_popular_annual || false);
    setStatus(plan.status ?? 1);
    setErrors({});
    setModalVisible(true);
  };

  const handleAddFeature = () => {
    const value = featureInput.trim();
    if (!value) return;
    if (!features.includes(value)) {
      setFeatures((prev) => [...prev, value]);
    }
    setFeatureInput('');
    if (errors.features) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.features;
        return next;
      });
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (updated.length === 0 && !featureInput.trim()) {
        // Keep or validate later
      }
      return updated;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Plan name is required.';
    }
    if (!pricePerMonth.trim()) {
      errs.price_per_month = 'Price per month is required.';
    } else if (Number(pricePerMonth) < 0) {
      errs.price_per_month = 'Price must be 0 or greater.';
    }
    if (!postsPerMonth.trim()) {
      errs.posts_per_month = 'Posts per month is required.';
    } else if (Number(postsPerMonth) < 0) {
      errs.posts_per_month = 'Must be 0 or greater.';
    }
    if (features.length === 0 && !featureInput.trim()) {
      errs.features = 'At least one feature is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      scrollToTopModal();
      return;
    }

    try {
      let finalFeatures = [...features];
      if (featureInput.trim() && !finalFeatures.includes(featureInput.trim())) {
        finalFeatures.push(featureInput.trim());
      }

      const payload: Partial<SubscriptionPlan> = {
        name,
        billing_cycle: billingCycle,
        price_per_month: Number(pricePerMonth),
        posts_per_month: postsPerMonth.trim() ? Number(postsPerMonth) : 0,
        posts_per_day: postsPerDay.trim() ? Number(postsPerDay) : 0,
        ai_content_generation_limit: aiLimit.trim() ? Number(aiLimit) : 0,
        features: finalFeatures,
        description,
        sort_order: Number(sortOrder),
        is_popular_monthly: isPopularMonthly,
        is_popular_annual: isPopularAnnual,
        status,
      };

      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan._id || editingPlan.id || '', payload);
        Alert.alert('Success', 'Subscription plan updated successfully!');
      } else {
        await createSubscriptionPlan(payload);
        Alert.alert('Success', 'Subscription plan created successfully!');
      }

      setModalVisible(false);
      fetchPlansList();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save subscription plan.');
    }
  };

  const handleDelete = (plan: SubscriptionPlan) => {
    const id = plan._id || plan.id || '';
    Alert.alert('Delete Plan', `Are you sure you want to delete the plan "${plan.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubscriptionPlan(id);
            Alert.alert('Success', 'Plan deleted successfully.');
            setPlans((prev) => prev.filter((p) => (p._id || p.id) !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete plan.');
          }
        },
      },
    ]);
  };

  // Filter plans based on search and status
  const filteredPlans = plans.filter((plan) => {
    if (!plan) return false;
    const planName = String(plan.name || '').toLowerCase();
    const matchesSearch = planName.includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? plan.status === 1
          : plan.status === 0;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedPlans = filteredPlans.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = getPageNumbers(safePage, totalPages);

    return (
      <HStack className="mb-2 mt-4 items-center justify-center" space="sm">
        <TouchableOpacity
          disabled={safePage === 1}
          onPress={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: safePage === 1 ? 0.4 : 1,
          }}
        >
          <ChevronLeft size={16} color="#475569" />
        </TouchableOpacity>

        {pageNumbers.map((p) => {
          const isActive = safePage === p;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setCurrentPage(p)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: isActive ? '#2563eb' : 'transparent',
                borderWidth: isActive ? 0 : 1,
                borderColor: '#e2e8f0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: isActive ? '#ffffff' : '#475569',
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {p}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          disabled={safePage === totalPages}
          onPress={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: safePage === totalPages ? 0.4 : 1,
          }}
        >
          <ChevronRight size={16} color="#475569" />
        </TouchableOpacity>
      </HStack>
    );
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      <LinearGradient colors={['#0d53fc', '#1d68f6']} style={styles.header}>
        <Box className="px-5 pb-3">
          <HStack className="mb-2 items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <ArrowLeft size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add Plan</Text>
            </TouchableOpacity>
          </HStack>
          <HStack className="items-center justify-between">
            <VStack style={{ flex: 1, marginRight: 16 }}>
              <Heading
                size="xl"
                style={{ color: '#fff', fontWeight: '800', fontSize: 24, marginBottom: 4 }}
              >
                Subscription Plans
              </Heading>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                Manage service packages, pricing structures, and utility caps
              </Text>
            </VStack>
            <CrownIllustration />
          </HStack>
        </Box>
      </LinearGradient>

      {/* Main Container Card */}
      <Box style={styles.mainCard}>
        {/* Search & Filter Bar */}
        <HStack space="sm" className="mb-3 items-center">
          <Box style={{ flex: 1, position: 'relative' }}>
            <Box style={{ position: 'absolute', left: 12, top: 12, zIndex: 10 }}>
              <Search size={16} color="#94a3b8" />
            </Box>
            <TextInput
              style={{
                height: 40,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                paddingLeft: 36,
                paddingRight: 12,
                backgroundColor: '#f8fafc',
                fontSize: 13,
                color: '#1e293b',
              }}
              placeholder="Search plans..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 12, top: 12, zIndex: 10 }}
              >
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </Box>
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderWidth: 1,
              borderColor: statusFilter === 'all' ? '#e2e8f0' : '#2563eb',
              borderRadius: 10,
              backgroundColor: statusFilter === 'all' ? '#f8fafc' : '#eff6ff',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
            onPress={() => {
              setStatusFilter((prev) => {
                if (prev === 'all') return 'active';
                if (prev === 'active') return 'inactive';
                return 'all';
              });
            }}
          >
            <SlidersHorizontal size={16} color={statusFilter === 'all' ? '#475569' : '#2563eb'} />
            {statusFilter !== 'all' && (
              <Box
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#2563eb',
                }}
              />
            )}
          </TouchableOpacity>
        </HStack>

        {statusFilter !== 'all' && (
          <Box className="mb-3 flex-row items-center">
            <Box
              style={{
                backgroundColor: '#2563eb15',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#2563eb' }}>
                Filter: {statusFilter === 'active' ? 'Active Plans' : 'Inactive Plans'}
              </Text>
              <TouchableOpacity onPress={() => setStatusFilter('all')} style={{ marginLeft: 6 }}>
                <X size={12} color="#2563eb" />
              </TouchableOpacity>
            </Box>
          </Box>
        )}

        {loading ? (
          <Box className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#2563eb" />
          </Box>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
            }
          >
            {filteredPlans.length === 0 ? (
              <Box className="items-center justify-center py-20">
                <Text style={{ color: '#64748b', fontSize: 14 }}>No subscription plans found</Text>
              </Box>
            ) : (
              <HtmlTable
                columns={PLAN_TABLE_COLUMNS}
                data={paginatedPlans}
                rowActions={PLAN_ROW_ACTIONS}
                onRowAction={(action, rowId) => {
                  const p = plans.find(
                    (x: any) =>
                      String(x._id || x.id) === String(rowId) ||
                      String(rowId).startsWith(String(x._id || x.id))
                  );
                  if (!p) return;
                  if (action === 'details' || action === 'view') {
                    handleOpenDetails(p);
                  } else if (action === 'edit') {
                    handleOpenEdit(p);
                  } else if (action === 'toggle-status' || action === 'status') {
                    handleOpenStatusConfirm(p);
                  } else if (action === 'delete') {
                    handleDelete(p);
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
                }}
                rowStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  marginBottom: 8,
                  borderWidth: 1.5,
                  borderColor: '#f1f5f9',
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.03,
                  shadowRadius: 3,
                  elevation: 1,
                }}
                rowEvenStyle={{}}
                rowOddStyle={{}}
                cellStyle={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                }}
              />
            )}
            {renderPagination()}
          </ScrollView>
        )}
      </Box>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Box style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <LinearGradient colors={['#0d53fc', '#1d68f6']} style={styles.header}>
            <Box className="px-5 pb-2 pt-0">
              <HStack className="mb-2 items-center justify-between">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <ArrowLeft size={16} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>Back</Text>
                </TouchableOpacity>
              </HStack>
              <HStack className="items-center justify-between">
                <VStack style={{ flex: 1, marginRight: 16 }}>
                  <Heading
                    size="xl"
                    style={{ color: '#fff', fontWeight: '800', fontSize: 24, marginBottom: 4 }}
                  >
                    {editingPlan ? 'Edit Plan' : 'Add Plan'}
                  </Heading>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>
                    {editingPlan
                      ? 'Update your subscription plan details and preferences'
                      : 'Create a new subscription plan with specific rules'}
                  </Text>
                </VStack>
                <EditIllustration />
              </HStack>
            </Box>
          </LinearGradient>

          {/* Form container */}
          <Box style={[styles.mainCard, { flex: 1, paddingBottom: 0 }]}>
            <ScrollView
              ref={modalScrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <VStack space="lg">
                <VStack space="xs" style={{ zIndex: 20 }}>
                  <Text style={styles.label}>Plan Name *</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowNameDropdown((prev) => !prev)}
                    style={[
                      styles.modalInput,
                      {
                        height: 44,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingLeft: 38,
                        paddingRight: 12,
                        borderColor: errors.name ? '#dc2626' : '#e2e8f0',
                      },
                    ]}
                  >
                    <Box
                      style={{ position: 'absolute', left: 12, zIndex: 10, alignSelf: 'center' }}
                    >
                      <Tag size={16} color="#2563eb" />
                    </Box>
                    <Text
                      style={{
                        fontSize: 14,
                        color: name ? '#1e293b' : '#94a3b8',
                        fontWeight: '500',
                      }}
                    >
                      {name || 'Select Plan Name'}
                    </Text>
                    <ChevronDown
                      size={16}
                      color="#64748b"
                      style={{ transform: [{ rotate: showNameDropdown ? '180deg' : '0deg' }] }}
                    />
                  </TouchableOpacity>
                  {errors.name ? (
                    <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                      {errors.name}
                    </Text>
                  ) : null}

                  {showNameDropdown && (
                    <Box
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        marginTop: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5,
                        overflow: 'hidden',
                      }}
                    >
                      {(PLAN_NAMES.includes(name as any) || !name
                        ? [...PLAN_NAMES]
                        : [name, ...PLAN_NAMES]
                      ).map((planName) => {
                        const isSelected = name === planName;
                        return (
                          <TouchableOpacity
                            key={planName}
                            activeOpacity={0.7}
                            onPress={() => {
                              handleNameChange(planName);
                              setShowNameDropdown(false);
                            }}
                            style={{
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                              borderBottomWidth: 1,
                              borderBottomColor: '#f1f5f9',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: isSelected ? '700' : '500',
                                color: isSelected ? '#2563eb' : '#334155',
                              }}
                            >
                              {planName}
                            </Text>
                            {isSelected && <Check size={16} color="#2563eb" />}
                          </TouchableOpacity>
                        );
                      })}
                    </Box>
                  )}
                </VStack>

                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Billing Cycle</Text>
                    <Box
                      style={{
                        height: 44,
                        backgroundColor: '#f1f5f9',
                        borderRadius: 10,
                        flexDirection: 'row',
                        padding: 3,
                        alignItems: 'center',
                      }}
                    >
                      {(['monthly', 'annual'] as const).map((bc) => {
                        const isActive = billingCycle === bc;
                        return (
                          <TouchableOpacity
                            key={bc}
                            style={{
                              flex: 1,
                              height: '100%',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 8,
                              backgroundColor: isActive ? '#2563eb' : 'transparent',
                            }}
                            onPress={() => setBillingCycle(bc)}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: isActive ? '#ffffff' : '#475569',
                              }}
                            >
                              {bc.charAt(0).toUpperCase() + bc.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </Box>
                  </VStack>

                  <FormInput
                    label="Price / Month *"
                    value={pricePerMonth}
                    onChangeText={handlePriceChange}
                    keyboardType="numeric"
                    placeholder="e.g. 19"
                    icon="₹"
                    error={errors.price_per_month}
                  />
                </HStack>

                <HStack space="md">
                  <FormInput
                    label="Posts / Month *"
                    value={postsPerMonth}
                    onChangeText={handlePostsPerMonthChange}
                    keyboardType="numeric"
                    placeholder="e.g. 150"
                    icon={FileText}
                    error={errors.posts_per_month}
                  />

                  <FormInput
                    label="Posts / Day"
                    value={postsPerDay}
                    onChangeText={setPostsPerDay}
                    keyboardType="numeric"
                    placeholder="e.g. 5"
                    icon={FileClock}
                  />
                </HStack>

                <HStack space="md">
                  <FormInput
                    label="AI Generation Limit"
                    value={aiLimit}
                    onChangeText={setAiLimit}
                    keyboardType="numeric"
                    placeholder="e.g. 20"
                    icon={Sparkles}
                  />

                  <FormInput
                    label="Sort Order"
                    value={sortOrder}
                    onChangeText={setSortOrder}
                    keyboardType="numeric"
                    placeholder="2"
                    icon={Layers}
                  />
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Features *</Text>
                  <HStack space="sm" style={{ alignItems: 'center' }}>
                    <Box style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
                      <Box
                        style={{ position: 'absolute', left: 12, zIndex: 10, alignSelf: 'center' }}
                      >
                        <ListPlus size={16} color="#2563eb" />
                      </Box>
                      <TextInput
                        style={[
                          styles.modalInput,
                          { paddingLeft: 38, height: 44 },
                          errors.features ? { borderColor: '#dc2626' } : {},
                        ]}
                        value={featureInput}
                        onChangeText={setFeatureInput}
                        placeholder="Type feature and press Enter or Add…"
                        placeholderTextColor="#94a3b8"
                        onSubmitEditing={handleAddFeature}
                        returnKeyType="done"
                      />
                    </Box>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleAddFeature}
                      style={{
                        height: 44,
                        paddingHorizontal: 16,
                        backgroundColor: '#2563eb',
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Add</Text>
                    </TouchableOpacity>
                  </HStack>
                  {errors.features ? (
                    <Text style={{ fontSize: 12, color: '#dc2626', marginTop: 3 }}>
                      {errors.features}
                    </Text>
                  ) : null}

                  {features.length > 0 && (
                    <HStack style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {features.map((f, i) => (
                        <Box
                          key={i}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#eff6ff',
                            borderWidth: 1,
                            borderColor: '#bfdbfe',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 20,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: '#1d4ed8',
                              marginRight: 6,
                            }}
                          >
                            {f}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveFeature(i)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <X size={12} color="#1d4ed8" />
                          </TouchableOpacity>
                        </Box>
                      ))}
                    </HStack>
                  )}
                </VStack>

                <FormInput
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Subscription plan summary..."
                  icon={AlignLeft}
                  multiline={true}
                />

                <HStack className="items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <VStack>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                      Popular (Monthly)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>
                      Highlight on pricing grid
                    </Text>
                  </VStack>
                  <Switch
                    value={isPopularMonthly}
                    onValueChange={setIsPopularMonthly}
                    trackColor={{ false: '#cbd5e1', true: '#bfdbfe' }}
                    thumbColor={isPopularMonthly ? '#2563eb' : '#f1f5f9'}
                  />
                </HStack>

                <HStack className="items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <VStack>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                      Popular (Annual)
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Highlight on annual grid</Text>
                  </VStack>
                  <Switch
                    value={isPopularAnnual}
                    onValueChange={setIsPopularAnnual}
                    trackColor={{ false: '#cbd5e1', true: '#bfdbfe' }}
                    thumbColor={isPopularAnnual ? '#2563eb' : '#f1f5f9'}
                  />
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Status *</Text>
                  <HStack space="sm">
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 10,
                        backgroundColor: status === 1 ? '#ecfdf5' : '#f1f5f9',
                        borderWidth: status === 1 ? 1.5 : 1,
                        borderColor: status === 1 ? '#10b981' : '#e2e8f0',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => setStatus(1)}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: status === 1 ? '#047857' : '#475569',
                        }}
                      >
                        Active
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 10,
                        backgroundColor: status === 0 ? '#fef2f2' : '#f1f5f9',
                        borderWidth: status === 0 ? 1.5 : 1,
                        borderColor: status === 0 ? '#ef4444' : '#e2e8f0',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => setStatus(0)}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: status === 0 ? '#b91c1c' : '#475569',
                        }}
                      >
                        Inactive
                      </Text>
                    </TouchableOpacity>
                  </HStack>
                </VStack>
              </VStack>
            </ScrollView>

            {/* Bottom Actions sticky footer */}
            <HStack
              space="md"
              style={{
                paddingVertical: 16,
                borderTopWidth: 1,
                borderTopColor: '#f1f5f9',
                backgroundColor: '#ffffff',
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#eff6ff',
                  borderRadius: 12,
                }}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: '#2563eb', fontWeight: '700', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1.5,
                  height: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#2563eb',
                  borderRadius: 12,
                  shadowColor: '#2563eb',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 4,
                }}
                onPress={handleSave}
              >
                <Save size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>Save Plan</Text>
              </TouchableOpacity>
            </HStack>
          </Box>
        </Box>
      </Modal>

      <StatusConfirmDialog
        open={statusConfirmOpen}
        onClose={() => {
          if (!statusLoading) {
            setStatusConfirmOpen(false);
            setSelectedPlanForStatus(null);
          }
        }}
        onConfirm={handleConfirmStatusToggle}
        loading={statusLoading}
        itemName={selectedPlanForStatus?.name}
        targetStatus={selectedPlanForStatus?.status === 1 ? 0 : 1}
        title={
          selectedPlanForStatus?.status === 1
            ? 'Deactivate Subscription Plan'
            : 'Activate Subscription Plan'
        }
        message={`Are you sure you want to ${selectedPlanForStatus?.status === 1 ? 'deactivate' : 'activate'} the plan "${selectedPlanForStatus?.name}"?`}
        confirmText={selectedPlanForStatus?.status === 1 ? 'Deactivate' : 'Activate'}
      />

      {/* Plan Details Modal Popup */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <Box style={styles.modalOverlay}>
          <Box style={styles.detailsModalContainer}>
            {selectedPlanForDetails && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <HStack className="mb-4 items-center justify-between">
                  <HStack space="md" className="items-center" style={{ flex: 1, marginRight: 12 }}>
                    <Box style={[styles.detailsBadge, { backgroundColor: '#eff6ff' }]}>
                      <Crown size={22} color="#2563eb" />
                    </Box>
                    <VStack style={{ flex: 1 }}>
                      <HStack className="items-center space-x-2">
                        <Text style={styles.detailsTitle}>{selectedPlanForDetails.name}</Text>
                        <Box
                          style={[
                            styles.statusBadgeMini,
                            selectedPlanForDetails.status === 1
                              ? styles.statusActiveBg
                              : styles.statusInactiveBg,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              selectedPlanForDetails.status === 1
                                ? styles.statusActiveText
                                : styles.statusInactiveText,
                            ]}
                          >
                            {selectedPlanForDetails.status === 1 ? 'Active' : 'Inactive'}
                          </Text>
                        </Box>
                      </HStack>
                      <Text style={styles.detailsSubtitle}>
                        {selectedPlanForDetails.billing_cycle === 'annual'
                          ? 'Annual billing'
                          : 'Monthly billing'}
                      </Text>
                    </VStack>
                  </HStack>

                  <TouchableOpacity
                    onPress={() => setDetailsModalVisible(false)}
                    style={styles.closeBtnCircle}
                  >
                    <X size={18} color="#64748b" />
                  </TouchableOpacity>
                </HStack>

                {/* Description */}
                {selectedPlanForDetails.description ? (
                  <Box style={styles.detailsDescBox}>
                    <Text style={styles.detailsDescText}>{selectedPlanForDetails.description}</Text>
                  </Box>
                ) : null}

                {/* Pricing Cards */}
                <HStack space="sm" className="mb-4">
                  <Box style={styles.pricingCard}>
                    <Text style={styles.pricingCardLabel}>PRICE PER MONTH</Text>
                    <Text style={styles.pricingCardValue}>
                      ₹{selectedPlanForDetails.price_per_month ?? 0}
                    </Text>
                    <Text style={styles.pricingCardSub}>/ month</Text>
                  </Box>

                  {selectedPlanForDetails.price_per_year ? (
                    <Box style={styles.pricingCard}>
                      <Text style={styles.pricingCardLabel}>PRICE PER YEAR</Text>
                      <Text style={styles.pricingCardValue}>
                        ₹{selectedPlanForDetails.price_per_year}
                      </Text>
                      <Text style={styles.pricingCardSub}>
                        ≈ ₹{Math.round(selectedPlanForDetails.price_per_year / 12)}/mo
                      </Text>
                    </Box>
                  ) : null}
                </HStack>

                {/* Quotas & Limits Section */}
                <VStack space="sm" className="mb-4">
                  <Text style={styles.sectionHeaderLabel}>QUOTAS & LIMITS</Text>

                  <Box style={styles.quotaGrid}>
                    <HStack className="items-center justify-between border-b border-slate-100 py-2">
                      <HStack space="xs" className="items-center">
                        <FileText size={14} color="#2563eb" />
                        <Text style={styles.quotaLabel}>Posts Per Month</Text>
                      </HStack>
                      <Text style={styles.quotaValue}>
                        {selectedPlanForDetails.posts_per_month ?? 0}
                      </Text>
                    </HStack>

                    <HStack className="items-center justify-between border-b border-slate-100 py-2">
                      <HStack space="xs" className="items-center">
                        <FileClock size={14} color="#2563eb" />
                        <Text style={styles.quotaLabel}>Posts Per Day</Text>
                      </HStack>
                      <Text style={styles.quotaValue}>
                        {selectedPlanForDetails.posts_per_day ?? 0}
                      </Text>
                    </HStack>

                    <HStack className="items-center justify-between border-b border-slate-100 py-2">
                      <HStack space="xs" className="items-center">
                        <Sparkles size={14} color="#2563eb" />
                        <Text style={styles.quotaLabel}>AI Generation Limit</Text>
                      </HStack>
                      <Text style={styles.quotaValue}>
                        {selectedPlanForDetails.ai_content_generation_limit ?? 0} /day
                      </Text>
                    </HStack>

                    <HStack className="items-center justify-between py-2">
                      <HStack space="xs" className="items-center">
                        <Layers size={14} color="#2563eb" />
                        <Text style={styles.quotaLabel}>Sort Order</Text>
                      </HStack>
                      <Text style={styles.quotaValue}>
                        {selectedPlanForDetails.sort_order ?? 0}
                      </Text>
                    </HStack>
                  </Box>
                </VStack>

                {/* Features Included */}
                <VStack space="sm" className="mb-4">
                  <Text style={styles.sectionHeaderLabel}>FEATURES INCLUDED</Text>

                  {selectedPlanForDetails.features && selectedPlanForDetails.features.length > 0 ? (
                    <VStack space="xs">
                      {selectedPlanForDetails.features.map((feat, idx) => (
                        <HStack key={idx} space="xs" className="items-start py-1">
                          <Box style={styles.checkIconBox}>
                            <Check size={12} color="#16a34a" />
                          </Box>
                          <Text style={styles.featureItemText}>{feat}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  ) : (
                    <Text style={styles.noFeaturesText}>No features listed.</Text>
                  )}
                </VStack>

                {/* Popularity badges if any */}
                {(selectedPlanForDetails.is_popular_monthly ||
                  selectedPlanForDetails.is_popular_annual) && (
                  <HStack space="xs" className="mb-4">
                    {selectedPlanForDetails.is_popular_monthly && (
                      <Box style={styles.popularTag}>
                        <Star size={12} color="#d97706" />
                        <Text style={styles.popularTagText}>Popular Monthly</Text>
                      </Box>
                    )}
                    {selectedPlanForDetails.is_popular_annual && (
                      <Box style={styles.popularTag}>
                        <Crown size={12} color="#d97706" />
                        <Text style={styles.popularTagText}>Popular Annual</Text>
                      </Box>
                    )}
                  </HStack>
                )}

                {/* Modal Footer / Close Button */}
                <TouchableOpacity
                  style={styles.detailsModalCloseBtn}
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <Text style={styles.detailsModalCloseText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 40,
    paddingBottom: 25,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0b5cf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  detailsModalContainer: {
    width: '100%',
    maxWidth: 450,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  detailsBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailsSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  statusBadgeMini: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusActiveBg: {
    backgroundColor: '#dcfce7',
  },
  statusInactiveBg: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#15803d',
  },
  statusInactiveText: {
    color: '#b91c1c',
  },
  closeBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsDescBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailsDescText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
  },
  pricingCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pricingCardValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e3a8a',
  },
  pricingCardSub: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.8,
  },
  quotaGrid: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  quotaLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  quotaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  checkIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginTop: 1,
  },
  featureItemText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  noFeaturesText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  popularTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  popularTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    marginLeft: 4,
  },
  detailsModalCloseBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  detailsModalCloseText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
