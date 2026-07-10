import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { useAuth } from "@/auth/AuthContext";
import {
  getDashboardStats,
  getRecentPosts,
  getTopUsers,
  getPlatformAnalytics,
  DashboardStats,
  RecentPost,
  TopUser,
  PlatformAnalytics,
} from "./dashboard.api";
import { LinearGradient } from "expo-linear-gradient";

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  color = "#193867",
  bg = "#eff6ff",
  onPress,
}: {
  title: string;
  value: number | string;
  color?: string;
  bg?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[styles.statCard, { backgroundColor: bg }]}
    >
      <Text style={[styles.statValue, { color }]}>{value ?? "—"}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

// ── Post Status Badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { bg: string; color: string }> = {
    published: { bg: "#dcfce7", color: "#15803d" },
    scheduled: { bg: "#dbeafe", color: "#1d4ed8" },
    draft: { bg: "#fef9c3", color: "#a16207" },
    partial_published: { bg: "#ede9fe", color: "#6d28d9" },
    failed: { bg: "#fee2e2", color: "#dc2626" },
  };
  const meta = MAP[status] ?? { bg: "#f1f5f9", color: "#64748b" };
  return (
    <Box
      style={[
        styles.badge,
        { backgroundColor: meta.bg },
      ]}
    >
      <Text style={[styles.badgeText, { color: meta.color }]}>
        {status.replace("_", " ")}
      </Text>
    </Box>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, onRefresh }: { title: string; onRefresh?: () => void }) {
  return (
    <HStack className="justify-between items-center mb-3">
      <Heading size="sm" className="text-typography-800 font-bold">
        {title}
      </Heading>
      {onRefresh && (
        <TouchableOpacity onPress={onRefresh}>
          <Text className="text-primary-700 text-sm font-medium">↺ Refresh</Text>
        </TouchableOpacity>
      )}
    </HStack>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [platforms, setPlatforms] = useState<PlatformAnalytics[]>([]);
  const [error, setError] = useState<string | null>(null);

  const greeting = (() => {
    const h = new Date().getHours();
    const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const name = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();
    return name ? `${g}, ${name}` : g;
  })();

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [s, posts, users, plat] = await Promise.all([
        getDashboardStats(),
        getRecentPosts(8),
        getTopUsers(5),
        getPlatformAnalytics(),
      ]);
      setStats(s);
      setRecentPosts(Array.isArray(posts) ? posts : []);
      setTopUsers(Array.isArray(users) ? users : []);
      setPlatforms(Array.isArray(plat) ? plat : []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-background-0">
        <ActivityIndicator size="large" color="#193867" />
        <Text className="text-typography-500 mt-3">Loading dashboard...</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-background-50">
      {/* ── HEADER BAR ──────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#0f2444", "#193867"]}
        style={styles.header}
      >
        <HStack className="justify-between items-center px-5 pt-14 pb-5">
          <VStack space="xs">
            <Text style={styles.headerGreeting}>{greeting} 👋</Text>
            <Heading size="lg" style={styles.headerTitle}>
              Dashboard
            </Heading>
          </VStack>
          <TouchableOpacity
            onPress={async () => {
              await signOut();
              router.replace("/");
            }}
            style={styles.signOutBtn}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </HStack>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#193867"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── ERROR ─────────────────────────────────────────────────────────── */}
        {error && (
          <Box style={styles.errorBox}>
            <Text className="text-error-700 text-sm">{error}</Text>
          </Box>
        )}

        {/* ── STATS GRID ────────────────────────────────────────────────────── */}
        {stats && (
          <Box>
            <SectionHeader title="Overview" />
            <Box style={styles.statsGrid}>
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                color="#193867"
                bg="#eff6ff"
              />
              <StatCard
                title="Active Users"
                value={stats.activeUsers}
                color="#15803d"
                bg="#dcfce7"
              />
              <StatCard
                title="Total Posts"
                value={stats.totalPosts}
                color="#6d28d9"
                bg="#ede9fe"
              />
              <StatCard
                title="Published"
                value={stats.publishedPosts}
                color="#0369a1"
                bg="#e0f2fe"
              />
              <StatCard
                title="Scheduled"
                value={stats.scheduledPosts}
                color="#1d4ed8"
                bg="#dbeafe"
              />
              <StatCard
                title="Drafts"
                value={stats.draftPosts}
                color="#a16207"
                bg="#fef9c3"
              />
              <StatCard
                title="Partial"
                value={stats.partialPublishedPosts}
                color="#7c3aed"
                bg="#f5f3ff"
              />
              <StatCard
                title="Failed"
                value={stats.failedPosts}
                color="#dc2626"
                bg="#fee2e2"
              />
            </Box>
          </Box>
        )}

        {/* ── RECENT POSTS ──────────────────────────────────────────────────── */}
        {recentPosts.length > 0 && (
          <Box className="mt-6">
            <SectionHeader title="Recent Posts" />
            <VStack space="sm">
              {recentPosts.map((post) => (
                <Box key={post.id} style={styles.postCard}>
                  <HStack className="justify-between items-start">
                    <VStack space="xs" style={styles.postTextWrap}>
                      <Text
                        className="text-typography-800 font-semibold text-sm"
                        numberOfLines={1}
                      >
                        {post.title || "Untitled Post"}
                      </Text>
                      <Text className="text-typography-400 text-xs">
                        {post.date
                          ? new Date(post.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </Text>
                    </VStack>
                    <StatusBadge status={post.status} />
                  </HStack>
                  {post.platform && (
                    <Text className="text-typography-500 text-xs mt-1">
                      📱{" "}
                      {Array.isArray(post.platform)
                        ? post.platform.join(", ")
                        : post.platform}
                    </Text>
                  )}
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* ── TOP USERS ─────────────────────────────────────────────────────── */}
        {topUsers.length > 0 && (
          <Box className="mt-6">
            <SectionHeader title="Top Users" />
            <VStack space="sm">
              {topUsers.map((u, i) => (
                <Box key={u.id} style={styles.userCard}>
                  <HStack space="md" className="items-center">
                    <Box style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>
                        {(u.name || u.email || "U")[0].toUpperCase()}
                      </Text>
                    </Box>
                    <VStack space="xs" style={styles.userInfo}>
                      <Text className="text-typography-800 font-semibold text-sm">
                        {u.name || u.email}
                      </Text>
                      {u.companyName && (
                        <Text className="text-typography-400 text-xs">
                          {u.companyName}
                        </Text>
                      )}
                    </VStack>
                    <VStack space="xs" className="items-end">
                      <Text className="text-primary-700 font-bold text-sm">
                        {u.totalPosts ?? 0} posts
                      </Text>
                      <Text className="text-success-600 text-xs">
                        {u.publishedPosts ?? 0} published
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* ── PLATFORM ANALYTICS ────────────────────────────────────────────── */}
        {platforms.length > 0 && (
          <Box className="mt-6 mb-4">
            <SectionHeader title="Platform Analytics" />
            <VStack space="sm">
              {platforms.map((p) => (
                <Box key={p.platform} style={styles.platformCard}>
                  <HStack className="justify-between items-center">
                    <Text className="text-typography-800 font-semibold text-sm capitalize">
                      {p.platform}
                    </Text>
                    <Text className="text-primary-700 font-bold text-sm">
                      {p.successRate != null
                        ? `${Math.round(p.successRate)}% success`
                        : "—"}
                    </Text>
                  </HStack>
                  <HStack className="justify-between mt-2">
                    <Text className="text-typography-400 text-xs">
                      Total: {p.totalPosts}
                    </Text>
                    <Text className="text-typography-400 text-xs">
                      Posted: {p.postedPosts}
                    </Text>
                    <Text className="text-typography-400 text-xs">
                      Users: {p.uniqueUsers}
                    </Text>
                  </HStack>
                  {/* Progress bar */}
                  <Box style={styles.progressBg}>
                    <Box
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, p.successRate ?? 0)}%` as any,
                        },
                      ]}
                    />
                  </Box>
                </Box>
              ))}
            </VStack>
          </Box>
        )}
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  headerGreeting: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  headerTitle: { color: "#ffffff" },
  signOutBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  signOutText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 30,
  },
  statTitle: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 4,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  postCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  postTextWrap: { flex: 1, marginRight: 10 },
  userCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#193867",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  userInfo: { flex: 1 },
  platformCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  progressBg: {
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#193867",
    borderRadius: 4,
  },
});
