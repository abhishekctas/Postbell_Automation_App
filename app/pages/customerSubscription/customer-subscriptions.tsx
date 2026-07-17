import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { LinearGradient } from "expo-linear-gradient";
import { listSubscriptions, cancelSubscription, Subscription } from "./customer-subscriptions.api";
import { router } from "expo-router";
import HtmlTable, { HtmlTableColumn } from "@/components/HtmlTable";

const SUB_TABLE_COLUMNS: HtmlTableColumn[] = [
  {
    key: "customer_id",
    label: "Customer",
    width: "180px",
    render: (_v, row) => {
      if (row.customer_id) return `${row.customer_id.first_name || ""} ${row.customer_id.last_name || ""}`.trim();
      return row.customerEmail || "Unknown";
    },
  },
  {
    key: "plan_id",
    label: "Plan",
    width: "160px",
    render: (_v, row) => {
      const name = row.plan_id?.name || "Standard Plan";
      const price = row.plan_price ?? row.plan_id?.price_per_month ?? 0;
      const cycle = row.plan_id?.billing_cycle || "monthly";
      return `${name} (₹${price}/${cycle})`;
    },
  },
  {
    key: "starts_at",
    label: "Period",
    width: "180px",
    render: (_v, row) => {
      const start = row.starts_at ? new Date(row.starts_at).toLocaleDateString("en-IN") : "—";
      const end = row.ends_at ? new Date(row.ends_at).toLocaleDateString("en-IN") : "—";
      return `${start} to ${end}`;
    },
  },
  {
    key: "status",
    label: "Status",
    width: "100px",
    render: (v) => {
      const val = typeof v === "string" ? v.toLowerCase() : "active";
      const map: Record<string, { bg: string; color: string; text: string }> = {
        active: { bg: "#dcfce7", color: "#15803d", text: "Active" },
        cancelled: { bg: "#fee2e2", color: "#dc2626", text: "Cancelled" },
      };
      const meta = map[val] || { bg: "#f1f5f9", color: "#64748b", text: val };
      return `<span style="display:inline-block;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:700;background:${meta.bg};color:${meta.color};">${meta.text}</span>`;
    },
  },
];

const SUB_ROW_ACTIONS = [
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
        // Backend returns either direct array or { data, pagination }
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

  const handleCancelSubscription = (item: Subscription) => {
    const id = item._id || item.id || "";
    const customerName =
      item.customer_id
        ? `${item.customer_id.first_name} ${item.customer_id.last_name}`
        : item.customerEmail || "Customer";

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

  const getStatusStyle = (status: any) => {
    const val = typeof status === "string" ? status.toLowerCase() : "active";
    switch (val) {
      case "active":
        return { bg: "#dcfce7", color: "#15803d" };
      case "cancelled":
        return { bg: "#fee2e2", color: "#dc2626" };
      default:
        return { bg: "#f1f5f9", color: "#64748b" };
    }
  };

  return (
    <Box className="flex-1 bg-background-50">
      <LinearGradient colors={["#0f2444", "#193867"]} style={styles.header}>
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
                if (action === "cancel") {
                  const s = subscriptions.find((x) => (x._id || x.id) === rowId);
                  if (s) handleCancelSubscription(s);
                }
              }}
            />
          )}
          {loadingMore && (
            <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} />
          )}
        </ScrollView>
      )}
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
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
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
  planSection: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 8,
  },
  cancelBtn: {
    backgroundColor: "#fff5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  cancelBtnText: { fontSize: 12, fontWeight: "600", color: "#dc2626" },
});
