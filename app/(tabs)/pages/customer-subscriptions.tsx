import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { LinearGradient } from "expo-linear-gradient";
import { listSubscriptions, cancelSubscription, Subscription } from "./customer-subscriptions.api";
import { router } from "expo-router";

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

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchSubscriptionsList(page + 1, false);
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

  const renderItem = ({ item }: { item: Subscription }) => {
    const statusMeta = getStatusStyle(item.status);
    const customerName = item.customer_id
      ? `${item.customer_id.first_name} ${item.customer_id.last_name}`
      : "Unknown Customer";
    const customerEmail = item.customer_id?.email || item.customerEmail || "";
    const planName = item.plan_id?.name || "Standard Plan";
    const planCycle = item.plan_id?.billing_cycle || "monthly";
    const price = item.plan_price ?? item.plan_id?.price_per_month ?? 0;

    const startDate = item.starts_at ? new Date(item.starts_at).toLocaleDateString("en-IN") : "—";
    const endDate = item.ends_at ? new Date(item.ends_at).toLocaleDateString("en-IN") : "—";

    return (
      <Box style={styles.card}>
        <HStack className="justify-between items-start mb-2">
          <VStack space="xs" style={{ flex: 1, marginRight: 8 }}>
            <Text className="text-typography-900 font-bold text-base">{customerName}</Text>
            <Text className="text-typography-500 text-sm">{customerEmail}</Text>
          </VStack>
          <Box style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}>
            <Text style={{ color: statusMeta.color, fontSize: 10, fontWeight: "700", textTransform: "capitalize" }}>
              {item.status || "Active"}
            </Text>
          </Box>
        </HStack>

        <Box style={styles.planSection}>
          <Text className="text-typography-900 font-semibold text-sm">
            Plan: {planName} ({price} / {planCycle})
          </Text>
          <Text className="text-typography-500 text-xs mt-1">
            Period: {startDate} to {endDate}
          </Text>
        </Box>

        {item.status === "active" && (
          <HStack className="mt-4 justify-end">
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelSubscription(item)}>
              <Text style={styles.cancelBtnText}>✕ Cancel Subscription</Text>
            </TouchableOpacity>
          </HStack>
        )}
      </Box>
    );
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
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#193867" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">No subscriptions found</Text>
            </Box>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} /> : null
          }
          renderItem={renderItem}
        />
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
