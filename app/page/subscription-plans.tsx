import React, { useState, useEffect, useCallback } from "react";
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
  Switch,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { LinearGradient } from "expo-linear-gradient";
import {
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  updateStatusPlan,
  SubscriptionPlan,
} from "./subscription-plans.api";
import { router } from "expo-router";

export default function SubscriptionPlansScreen() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [name, setName] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [pricePerMonth, setPricePerMonth] = useState("");
  const [pricePerYear, setPricePerYear] = useState("");
  const [annualDiscount, setAnnualDiscount] = useState("");
  const [postsPerMonth, setPostsPerMonth] = useState("");
  const [postsPerDay, setPostsPerDay] = useState("");
  const [aiLimit, setAiLimit] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isPopularMonthly, setIsPopularMonthly] = useState(false);
  const [isPopularAnnual, setIsPopularAnnual] = useState(false);
  const [status, setStatus] = useState<number>(1); // 1 = Active, 0 = Inactive

  const fetchPlansList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listSubscriptionPlans();
      // The API response might be { success: true, data: [...] } or direct array
      const items = Array.isArray(res) ? res : res?.data || [];
      setPlans(items);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load subscription plans.");
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
    setName("");
    setBillingCycle("monthly");
    setPricePerMonth("");
    setPricePerYear("");
    setAnnualDiscount("");
    setPostsPerMonth("");
    setPostsPerDay("");
    setAiLimit("");
    setDescription("");
    setFeatures("");
    setSortOrder("0");
    setIsPopularMonthly(false);
    setIsPopularAnnual(false);
    setStatus(1);
    setModalVisible(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setName(plan.name || "");
    setBillingCycle(plan.billing_cycle || "monthly");
    setPricePerMonth(plan.price_per_month ? String(plan.price_per_month) : "");
    setPricePerYear(plan.price_per_year ? String(plan.price_per_year) : "");
    setAnnualDiscount(plan.annual_discount_percentage ? String(plan.annual_discount_percentage) : "");
    setPostsPerMonth(plan.posts_per_month ? String(plan.posts_per_month) : "");
    setPostsPerDay(plan.posts_per_day ? String(plan.posts_per_day) : "");
    setAiLimit(plan.ai_content_generation_limit ? String(plan.ai_content_generation_limit) : "");
    setDescription(plan.description || "");
    setFeatures(plan.features?.join(", ") || "");
    setSortOrder(plan.sort_order ? String(plan.sort_order) : "0");
    setIsPopularMonthly(plan.is_popular_monthly || false);
    setIsPopularAnnual(plan.is_popular_annual || false);
    setStatus(plan.status ?? 1);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Plan name is required.");
      return;
    }
    if (!pricePerMonth.trim()) {
      Alert.alert("Validation Error", "Price per month is required.");
      return;
    }

    try {
      const featuresArray = features
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const payload: Partial<SubscriptionPlan> = {
        name,
        billing_cycle: billingCycle,
        price_per_month: Number(pricePerMonth),
        price_per_year: pricePerYear.trim() ? Number(pricePerYear) : undefined,
        annual_discount_percentage: annualDiscount.trim() ? Number(annualDiscount) : 0,
        posts_per_month: postsPerMonth.trim() ? Number(postsPerMonth) : 0,
        posts_per_day: postsPerDay.trim() ? Number(postsPerDay) : 0,
        ai_content_generation_limit: aiLimit.trim() ? Number(aiLimit) : 0,
        features: featuresArray,
        description,
        sort_order: Number(sortOrder),
        is_popular_monthly: isPopularMonthly,
        is_popular_annual: isPopularAnnual,
        status,
      };

      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan._id || editingPlan.id || "", payload);
        Alert.alert("Success", "Subscription plan updated successfully!");
      } else {
        await createSubscriptionPlan(payload);
        Alert.alert("Success", "Subscription plan created successfully!");
      }

      setModalVisible(false);
      fetchPlansList();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save subscription plan.");
    }
  };

  const handleToggleStatus = async (plan: SubscriptionPlan) => {
    const id = plan._id || plan.id || "";
    const nextStatus = plan.status === 1 ? 0 : 1;
    try {
      await updateStatusPlan(id, nextStatus);
      setPlans((prev) =>
        prev.map((p) => ((p._id || p.id) === id ? { ...p, status: nextStatus } : p)),
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update plan status.");
    }
  };

  const handleDelete = (plan: SubscriptionPlan) => {
    const id = plan._id || plan.id || "";
    Alert.alert("Delete Plan", `Are you sure you want to delete the plan "${plan.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSubscriptionPlan(id);
            Alert.alert("Success", "Plan deleted successfully.");
            setPlans((prev) => prev.filter((p) => (p._id || p.id) !== id));
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete plan.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: SubscriptionPlan }) => {
    const isAct = item.status === 1;

    return (
      <Box style={styles.card}>
        <HStack className="justify-between items-start">
          <VStack space="xs" style={{ flex: 1, marginRight: 8 }}>
            <HStack space="sm" className="items-center">
              <Text className="text-typography-800 font-bold text-base">{item.name}</Text>
              {(item.is_popular_monthly || item.is_popular_annual) && (
                <Box style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>POPULAR</Text>
                </Box>
              )}
            </HStack>
            <Text className="text-typography-500 text-sm mt-1">
              ₹{item.price_per_month} / month {item.price_per_year ? `• ₹${item.price_per_year} / year` : ""}
            </Text>
            {item.description ? (
              <Text className="text-typography-400 text-xs italic mt-1">{item.description}</Text>
            ) : null}

            <VStack space="xs" className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Text style={styles.limitText}>📤 Posts: {item.posts_per_month}/mo ({item.posts_per_day}/day)</Text>
              <Text style={styles.limitText}>🤖 AI content generations: {item.ai_content_generation_limit}/mo</Text>
              {item.features?.length > 0 && (
                <Text style={[styles.limitText, { marginTop: 4, fontWeight: "600" }]}>
                  ✔ {item.features.join(", ")}
                </Text>
              )}
            </VStack>
          </VStack>
          <VStack space="sm" className="items-end">
            <Box style={[styles.statusBadge, { backgroundColor: isAct ? "#dcfce7" : "#fee2e2" }]}>
              <Text style={{ color: isAct ? "#15803d" : "#dc2626", fontSize: 10, fontWeight: "700" }}>
                {isAct ? "Active" : "Inactive"}
              </Text>
            </Box>
            <TouchableOpacity style={styles.statusToggleAction} onPress={() => handleToggleStatus(item)}>
              <Text style={styles.statusToggleActionText}>{isAct ? "Deactivate" : "Activate"}</Text>
            </TouchableOpacity>
          </VStack>
        </HStack>

        <HStack space="sm" className="mt-4 justify-end">
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
            <Text style={styles.actionBtnText}>✏ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item)}>
            <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>🗑 Delete</Text>
          </TouchableOpacity>
        </HStack>
      </Box>
    );
  };

  return (
    <Box className="flex-1 bg-background-50">
      <LinearGradient colors={["#0f2444", "#193867"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <HStack className="justify-between items-center mb-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-white text-sm font-medium">← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Text style={styles.addBtnText}>+ Add Plan</Text>
            </TouchableOpacity>
          </HStack>
          <Heading size="xl" style={{ color: "#fff" }}>
            Subscription Plans
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            Manage service packages, pricing structures, and utility caps
          </Text>
        </Box>
      </LinearGradient>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#193867" />
          }
          ListEmptyComponent={
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">No subscription plans found</Text>
            </Box>
          }
          renderItem={renderItem}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Heading size="md" className="mb-4">
              {editingPlan ? "Edit Plan" : "Add Plan"}
            </Heading>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Plan Name *</Text>
                  <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="e.g. Starter Plan" />
                </VStack>

                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Billing Cycle</Text>
                    <HStack space="xs">
                      {(["monthly", "annual"] as const).map((bc) => (
                        <TouchableOpacity
                          key={bc}
                          style={[styles.cycleBtn, billingCycle === bc && styles.cycleBtnActive]}
                          onPress={() => setBillingCycle(bc)}
                        >
                          <Text style={[styles.cycleText, billingCycle === bc && styles.cycleTextActive]}>
                            {bc.charAt(0).toUpperCase() + bc.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </HStack>
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Price / Month *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={pricePerMonth}
                      onChangeText={setPricePerMonth}
                      keyboardType="numeric"
                      placeholder="e.g. 299"
                    />
                  </VStack>
                </HStack>

                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Price / Year</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={pricePerYear}
                      onChangeText={setPricePerYear}
                      keyboardType="numeric"
                      placeholder="e.g. 2990"
                    />
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Discount %</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={annualDiscount}
                      onChangeText={setAnnualDiscount}
                      keyboardType="numeric"
                      placeholder="e.g. 15"
                    />
                  </VStack>
                </HStack>

                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Posts / Month</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={postsPerMonth}
                      onChangeText={setPostsPerMonth}
                      keyboardType="numeric"
                      placeholder="e.g. 30"
                    />
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Posts / Day</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={postsPerDay}
                      onChangeText={setPostsPerDay}
                      keyboardType="numeric"
                      placeholder="e.g. 2"
                    />
                  </VStack>
                </HStack>

                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>AI generation Limit</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={aiLimit}
                      onChangeText={setAiLimit}
                      keyboardType="numeric"
                      placeholder="e.g. 100"
                    />
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Sort Order</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={sortOrder}
                      onChangeText={setSortOrder}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </VStack>
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Features (comma separated)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={features}
                    onChangeText={setFeatures}
                    placeholder="e.g. Calendar View, Custom Templates"
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.modalInput, { minHeight: 60 }]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholder="Description notes..."
                  />
                </VStack>

                <HStack className="justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <VStack>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155" }}>Popular (Monthly)</Text>
                    <Text style={{ fontSize: 11, color: "#64748b" }}>Highlight on pricing grid</Text>
                  </VStack>
                  <Switch value={isPopularMonthly} onValueChange={setIsPopularMonthly} />
                </HStack>

                <HStack className="justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <VStack>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155" }}>Popular (Annual)</Text>
                    <Text style={{ fontSize: 11, color: "#64748b" }}>Highlight on annual grid</Text>
                  </VStack>
                  <Switch value={isPopularAnnual} onValueChange={setIsPopularAnnual} />
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Status *</Text>
                  <HStack space="sm">
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 1 && styles.statusToggleBtnActive]}
                      onPress={() => setStatus(1)}
                    >
                      <Text style={[styles.statusToggleText, status === 1 && styles.statusToggleTextActive]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 0 && styles.statusToggleBtnActiveDanger]}
                      onPress={() => setStatus(0)}
                    >
                      <Text style={[styles.statusToggleText, status === 0 && styles.statusToggleTextActiveDanger]}>Inactive</Text>
                    </TouchableOpacity>
                  </HStack>
                </VStack>
              </VStack>
            </ScrollView>

            <HStack space="sm" className="mt-6">
              <Button style={{ flex: 1 }} className="bg-primary-700 rounded-xl" onPress={handleSave}>
                <ButtonText>Save</ButtonText>
              </Button>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </HStack>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
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
  popularBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  popularBadgeText: { fontSize: 8, fontWeight: "800", color: "#d97706" },
  limitText: { fontSize: 11, color: "#475569" },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusToggleAction: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f8fafc",
  },
  statusToggleActionText: { fontSize: 10, color: "#475569", fontWeight: "600" },
  actionBtn: {
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  actionBtnDanger: {
    backgroundColor: "#fff5f5",
    borderColor: "#fecaca",
  },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#193867" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  label: { fontSize: 11, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  cycleBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  cycleBtnActive: {
    backgroundColor: "#e0f2fe",
    borderColor: "#7dd3fc",
  },
  cycleText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  cycleTextActive: { color: "#0369a1" },
  statusToggleBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  statusToggleBtnActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  statusToggleBtnActiveDanger: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
  },
  statusToggleText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  statusToggleTextActive: { color: "#15803d" },
  statusToggleTextActiveDanger: { color: "#dc2626" },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
  },
  cancelBtnText: { color: "#475569", fontWeight: "700", fontSize: 14 },
});
