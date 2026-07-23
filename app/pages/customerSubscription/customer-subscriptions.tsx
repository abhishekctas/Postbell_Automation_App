import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  View,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { LinearGradient } from "expo-linear-gradient";
import { listSubscriptions, cancelSubscription, Subscription } from "./customer-subscriptions.api";
import { getCustomerDetails, Customer } from "../customers/customers.api";
import { router } from "expo-router";
import HtmlTable, { HtmlTableColumn } from "@/components/HtmlTable";
import {
  Calendar,
  CreditCard,
  X,
  User,
  CheckCircle,
  TrendingUp,
  Package,
  Clock,
  BarChart3,
  Sparkles,
  Zap,
} from "lucide-react-native";

const formatDate = (raw?: string) => {
  if (!raw) return "—";
  const date = new Date(raw);
  if (isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

function renderStatusChip(v: any) {
  const normalizedStatus = typeof v === "string" ? v.toLowerCase().trim() : v;

  const isActive = normalizedStatus === "active" || normalizedStatus === 1;
  const isExpired = normalizedStatus === "expired" || normalizedStatus === 0;
  const isCancelled = normalizedStatus === "cancelled" || normalizedStatus === 2;

  let label = "Unknown";
  let bg = "#f1f5f9";
  let border = "#64748b";
  let color = "#64748b";

  if (isActive) {
    label = "Active";
    bg = "#dcfce7";
    color = "#15803d";
    border = "#bbf7d0";
  } else if (isExpired) {
    label = "Expired";
    bg = "#f1f5f9";
    border = "#e2e8f0";
    color = "#64748b";
  } else if (isCancelled) {
    label = "Cancelled";
    bg = "#fee2e2";
    border = "#fca5a5";
    color = "#dc2626";
  }

  return (
    <Box
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <Text style={{ color: color, fontWeight: "700", fontSize: 11 }}>
        • {label}
      </Text>
    </Box>
  );
}

function MetaItem({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <Box style={{ width: "48%", marginVertical: 6 }}>
      <HStack space="xs" className="items-center mb-1">
        {icon}
        <Text
          style={{
            fontSize: 10,
            fontWeight: "600",
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
      </HStack>
      <Text style={{ fontSize: 13, fontWeight: "700", color: valueColor || "#1e293b" }}>
        {value}
      </Text>
    </Box>
  );
}

const SUB_TABLE_COLUMNS: HtmlTableColumn<Subscription>[] = [
  // 👤 USER
  {
    key: "user_name",
    label: "User",
    width: "220px",
    render: (_v, row) => {
      let name =
        row.user_name ||
        row.customerName ||
        "";

      if (!name && row.customer_id && typeof row.customer_id === "object") {
        name = `${row.customer_id.first_name || ""} ${row.customer_id.last_name || ""}`.trim();
      }

      if (!name && (row as any).user_id && typeof (row as any).user_id === "object") {
        const u = (row as any).user_id;
        name = `${u.first_name || u.name || ""} ${u.last_name || ""}`.trim();
      }

      if (!name) {
        name = row.user_email || row.customerEmail || row.customer_id?.email || "—";
      }

      const email = row.user_email || row.customerEmail || row.customer_id?.email || "—";
      const avatarUrl = row.user_avatar || row.customer_id?.avatar;
      const initials =
        name !== "—"
          ? name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w.charAt(0).toUpperCase())
            .join("")
          : "—";

      return (
        <HStack space="sm" className="items-center">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
            />
          ) : (
            <Box
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#25376a",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>
                {initials}
              </Text>
            </Box>
          )}
          <VStack style={{ justifyContent: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#1e293b" }} numberOfLines={1}>
              {name}
            </Text>
            <Text style={{ fontSize: 11, color: "#64748b" }} numberOfLines={1}>
              {email}
            </Text>
          </VStack>
        </HStack>
      );
    },
  },

  // 📦 PLAN
  {
    key: "plan_name",
    label: "Plan",
    width: "130px",
    render: (_v, row) => {
      const planName = row.plan_name || row.plan_id?.name || "Standard Plan";
      return (
        <Box
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: "#e5f0ff",
            borderWidth: 1,
            borderColor: "#193867",
          }}
        >
          <Text style={{ color: "#193867", fontWeight: "700", fontSize: 12 }}>
            {planName}
          </Text>
        </Box>
      );
    },
  },

  // 💳 BILLING
  {
    key: "billing_cycle",
    label: "Billing",
    width: "110px",
    render: (_v, row) => {
      const cycle = (row.billing_cycle || row.plan_id?.billing_cycle || "monthly").toLowerCase();
      const isMonthly = cycle === "monthly";
      return (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: isMonthly ? "#2563eb" : "#059669",
            textTransform: "capitalize",
          }}
        >
          {cycle === "annual" || cycle === "yearly" ? "Annual" : "Monthly"}
        </Text>
      );
    },
  },

  // 📊 STATUS
  {
    key: "status",
    label: "Status",
    width: "120px",
    render: (v) => renderStatusChip(v),
  },

  // 🔄 AUTO RENEW
  {
    key: "auto_renew",
    label: "Auto Renew",
    width: "110px",
    render: (_v, row) => {
      const isAutoRenew = row.auto_renew !== false;
      return (
        <Box
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: isAutoRenew ? "#e8f5e9" : "#f1f5f9",
            borderWidth: 1,
            borderColor: isAutoRenew ? "#193867" : "#839cbe",
          }}
        >
          <Text
            style={{
              color: isAutoRenew ? "#193867" : "#839cbe",
              fontWeight: "700",
              fontSize: 12,
            }}
          >
            {isAutoRenew ? "Yes" : "No"}
          </Text>
        </Box>
      );
    },
  },

  // 📅 START DATE
  {
    key: "start_date",
    label: "Start",
    width: "130px",
    render: (_v, row) => {
      const dateStr = formatDate(row.start_date || row.starts_at);
      return (
        <HStack space="xs" className="items-center">
          <Calendar size={14} color="#64748b" />
          <Text style={{ fontSize: 13, fontWeight: "500", color: "#334155" }}>
            {dateStr}
          </Text>
        </HStack>
      );
    },
  },

  // 📅 END DATE
  {
    key: "end_date",
    label: "End",
    width: "130px",
    render: (_v, row) => {
      const isCancelled = row.status === 2 || row.status === "cancelled";
      const raw = isCancelled && row.cancelled_at ? row.cancelled_at : (row.end_date || row.ends_at);
      const dateStr = formatDate(raw);
      return (
        <HStack space="xs" className="items-center">
          <Calendar size={14} color="#64748b" />
          <Text style={{ fontSize: 13, fontWeight: "500", color: "#334155" }}>
            {dateStr}
          </Text>
        </HStack>
      );
    },
  },

  // 🕒 CREATED
  {
    key: "createdAt",
    label: "Created",
    width: "130px",
    render: (_v, row) => {
      const dateStr = formatDate(row.createdAt || row.updatedAt);
      return (
        <HStack space="xs" className="items-center">
          <Calendar size={14} color="#64748b" />
          <Text style={{ fontSize: 13, fontWeight: "500", color: "#334155" }}>
            {dateStr}
          </Text>
        </HStack>
      );
    },
  },
];

const SUB_ROW_ACTIONS = [
  { label: "View Details", action: "view", style: "normal" },
  { label: "Cancel", action: "cancel", style: "danger" },
];

export default function CustomerSubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "cancelled" | "expired">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // View Subscription Details Modal States
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  const fetchSubscriptionsList = useCallback(
    async (pg = 1, reset = true) => {
      if (reset) setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: "10",
        });

        if (search.trim()) {
          queryParams.append("search", search.trim());
        }

        if (filter !== "all") {
          queryParams.append("status", filter);
        }

        const res = await listSubscriptions(queryParams.toString());
        const items = Array.isArray(res) ? res : res?.data || [];

        if (reset) {
          setSubscriptions(items);
        } else {
          setSubscriptions((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load subscriptions.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, filter],
  );

  useEffect(() => {
    fetchSubscriptionsList(1, true);
  }, [search, filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptionsList(1, true);
  };

  const handleViewSubscriptionDetails = async (sub: Subscription) => {
    setSelectedSubscription(sub);
    setCustomerDetails(null);
    setViewDialogOpen(true);
    setLoadingCustomer(true);

    try {
      const uId =
        (typeof (sub as any).user_id === "object" ? (sub as any).user_id?._id || (sub as any).user_id?.id : (sub as any).user_id) ||
        (typeof sub.customer_id === "object" ? sub.customer_id?._id || (sub.customer_id as any)?.id : sub.customer_id) ||
        sub._id ||
        sub.id ||
        "";

      if (uId) {
        const data = await getCustomerDetails(uId);
        setCustomerDetails(data);
      }
    } catch (e: any) {
      console.log("Error fetching customer details for modal:", e);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleCancelSubscription = (item: Subscription) => {
    const id = item._id || item.id || "";
    const customerName =
      item.user_name ||
      (item.customer_id
        ? `${item.customer_id.first_name} ${item.customer_id.last_name}`
        : item.customerEmail || "Customer");

    Alert.alert(
      "Cancel Subscription",
      `Are you sure you want to cancel the subscription for ${customerName}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSubscription(id);
              Alert.alert("Success", "Subscription cancelled successfully.");
              setSubscriptions((prev) =>
                prev.map((s) => ((s._id || s.id) === id ? { ...s, status: "cancelled" } : s)),
              );
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to cancel subscription.");
            }
          },
        },
      ],
    );
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="mb-2">
            <Text className="text-white text-sm font-medium">← Back</Text>
          </TouchableOpacity>
          <Heading size="xl" style={{ color: "#fff" }}>
            Customer Subscriptions
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            Monitor billing states and cancel active subscription plans
          </Text>
        </Box>
      </LinearGradient>

      {/* Search and Filters */}
      <VStack space="sm" style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer name or email..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        <HStack space="xs" className="w-full">
          {(["all", "active", "cancelled", "expired"] as const).map((btn) => (
            <TouchableOpacity
              key={btn}
              style={[styles.tabBtn, filter === btn && styles.tabBtnActive]}
              onPress={() => setFilter(btn)}
            >
              <Text style={[styles.tabText, filter === btn && styles.tabTextActive]}>
                {btn.charAt(0).toUpperCase() + btn.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </HStack>
      </VStack>

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
          {subscriptions.length === 0 ? (
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">No subscriptions found</Text>
            </Box>
          ) : (
            <HtmlTable
              columns={SUB_TABLE_COLUMNS}
              data={subscriptions}
              rowActions={SUB_ROW_ACTIONS}
              onRowAction={(action, rowId) => {
                const s = subscriptions.find((x) => String(x._id || x.id) === String(rowId));
                if (!s) return;

                if (action === "view") {
                  handleViewSubscriptionDetails(s);
                } else if (action === "cancel") {
                  handleCancelSubscription(s);
                }
              }}
              iconOnlyActions={true}
              tableContainerStyle={{ borderWidth: 0, shadowColor: "transparent", backgroundColor: "transparent", elevation: 0, marginHorizontal: 0, marginVertical: 0 }}
              headerRowStyle={{ backgroundColor: "#f8fafc", borderBottomWidth: 1.5, borderBottomColor: "#e2e8f0" }}
              headerCellTextStyle={{ color: "#1e3a8a", fontWeight: "700", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}
              rowStyle={{ borderBottomWidth: 1, borderBottomColor: "#f1f5f9", backgroundColor: "#ffffff" }}
            />
          )}
          {loadingMore && (
            <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} />
          )}
        </ScrollView>
      )}

      {/* ── Subscription Details Modal Popup ─────────────────────────── */}
      <Modal
        visible={viewDialogOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header Banner */}
            <View style={styles.modalHeader}>
              <HStack space="sm" className="items-center">
                <Box style={styles.headerIconBg}>
                  <CreditCard size={20} color="#193867" />
                </Box>
                <VStack>
                  <Text style={styles.modalTitle}>Subscription Details</Text>
                  <Text style={styles.modalSubtitle}>Full plan & usage information</Text>
                </VStack>
              </HStack>

              <TouchableOpacity onPress={() => setViewDialogOpen(false)} style={styles.closeBtn}>
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Modal Content Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {loadingCustomer ? (
                <Box className="py-10 items-center justify-center">
                  <ActivityIndicator size="large" color="#193867" />
                  <Text style={{ marginTop: 10, color: "#64748b", fontSize: 13 }}>
                    Loading customer details...
                  </Text>
                </Box>
              ) : (
                <VStack space="md" style={{ paddingBottom: 24 }}>
                  {/* User info card */}
                  {customerDetails && (
                    <Box style={styles.detailsCard}>
                      <HStack space="md" className="items-center">
                        <Box style={styles.avatarCircle}>
                          <User size={22} color="#193867" />
                        </Box>
                        <VStack>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1e293b" }}>
                            {customerDetails.first_name || ""} {customerDetails.last_name || ""}
                          </Text>
                          <Text style={{ fontSize: 13, color: "#64748b" }}>
                            {customerDetails.email || "No email"}
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  )}

                  {/* Active plan card */}
                  {selectedSubscription && (
                    <Box style={styles.detailsCard}>
                      <VStack space="sm">
                        <HStack className="items-center justify-between">
                          <Text style={{ fontSize: 17, fontWeight: "700", color: "#1e293b" }}>
                            {selectedSubscription.plan_name || selectedSubscription.plan_id?.name || "Standard Plan"}
                          </Text>
                          {renderStatusChip(selectedSubscription.status)}
                        </HStack>

                        <Text style={{ fontSize: 13, color: "#64748b", textTransform: "capitalize" }}>
                          {(selectedSubscription.billing_cycle || selectedSubscription.plan_id?.billing_cycle || "monthly")} plan
                          {(selectedSubscription.plan_price || selectedSubscription.plan_id?.price_per_month) ? (
                            ` · ₹${selectedSubscription.plan_price || selectedSubscription.plan_id?.price_per_month}/${selectedSubscription.billing_cycle === 'annual' ? 'year' : 'month'}`
                          ) : ""}
                        </Text>
                      </VStack>

                      <View style={styles.divider} />

                      {/* Metadata Grid */}
                      <View style={styles.metaGrid}>
                        <MetaItem
                          icon={<User size={14} color="#94a3b8" />}
                          label="Full Name"
                          value={
                            customerDetails
                              ? `${customerDetails.first_name || ""} ${customerDetails.last_name || ""}`.trim()
                              : selectedSubscription.user_name || "N/A"
                          }
                        />

                        <MetaItem
                          icon={<CreditCard size={14} color="#94a3b8" />}
                          label="Contact No"
                          value={customerDetails?.contact_no ? String(customerDetails.contact_no) : "N/A"}
                        />

                        <MetaItem
                          icon={<CheckCircle size={14} color="#94a3b8" />}
                          label="Email Verified"
                          value={customerDetails?.is_email_verified ? "Yes" : "No"}
                          valueColor={customerDetails?.is_email_verified ? "#059669" : "#dc2626"}
                        />

                        <MetaItem
                          icon={<TrendingUp size={14} color="#94a3b8" />}
                          label="Status"
                          value={customerDetails?.status === 1 ? "Active" : "Deactive"}
                          valueColor={customerDetails?.status === 1 ? "#059669" : "#dc2626"}
                        />

                        <MetaItem
                          icon={<Package size={14} color="#94a3b8" />}
                          label="Social Accounts"
                          value={String(customerDetails?.social_accounts_count ?? 0)}
                        />

                        <MetaItem
                          icon={<Calendar size={14} color="#94a3b8" />}
                          label="Start Date"
                          value={formatDate(selectedSubscription.start_date || selectedSubscription.starts_at)}
                        />

                        <MetaItem
                          icon={<Clock size={14} color="#94a3b8" />}
                          label="End Date"
                          value={formatDate(selectedSubscription.end_date || selectedSubscription.ends_at)}
                        />

                        {customerDetails?.address && (
                          <MetaItem
                            icon={<User size={14} color="#94a3b8" />}
                            label="Address"
                            value={
                              `${customerDetails.address.address_line_1 || ''}${customerDetails.address.city ? ', ' + customerDetails.address.city : ''
                                }`.trim() || "N/A"
                            }
                          />
                        )}

                        <MetaItem
                          icon={<Calendar size={14} color="#94a3b8" />}
                          label="Created On"
                          value={formatDate(customerDetails?.createdAt || selectedSubscription.createdAt)}
                        />
                      </View>
                    </Box>
                  )}

                  {/* Usage Statistics Card */}
                  {customerDetails?.postUsage && (
                    <Box style={styles.detailsCard}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 10 }}>
                        Usage Statistics
                      </Text>
                      <View style={styles.metaGrid}>
                        <MetaItem
                          icon={<Package size={14} color="#94a3b8" />}
                          label="Posts This Month"
                          value={`${customerDetails.postUsage.posts_used_this_month || 0}/${customerDetails.postUsage.plan_snapshot?.posts_per_month || 0}`}
                        />

                        <MetaItem
                          icon={<BarChart3 size={14} color="#94a3b8" />}
                          label="Posts Today"
                          value={`${customerDetails.postUsage.posts_used_today || 0}/${customerDetails.postUsage.plan_snapshot?.posts_per_day || 0}`}
                        />

                        <MetaItem
                          icon={<Sparkles size={14} color="#94a3b8" />}
                          label="AI Content Today"
                          value={`${customerDetails.postUsage.ai_content_used_today || 0}/${customerDetails.postUsage.plan_snapshot?.ai_content_generation_limit || 0}`}
                        />

                        <MetaItem
                          icon={<Zap size={14} color="#94a3b8" />}
                          label="Plan Snapshot"
                          value={customerDetails.postUsage.plan_snapshot?.name || "N/A"}
                        />
                      </View>
                    </Box>
                  )}
                </VStack>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  filterSection: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tabBtnActive: {
    backgroundColor: "#193867",
    borderColor: "#193867",
  },
  tabText: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  tabTextActive: { color: "#ffffff" },
  listContent: { padding: 16, paddingBottom: 90 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    backgroundColor: "#193867",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  modalBody: {
    padding: 16,
  },
  detailsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.07)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 12,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
