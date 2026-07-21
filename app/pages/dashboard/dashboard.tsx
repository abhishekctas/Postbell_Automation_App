import React, { useState, useEffect, useCallback } from "react";
import {
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
    View,
} from "react-native";
import { router } from "expo-router";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { useAuth } from "@/context/AuthContext";
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
import { Feather, Ionicons, FontAwesome, AntDesign, FontAwesome6 } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Text as SvgText, Rect, G } from "react-native-svg";

const { width: screenWidth } = Dimensions.get("window");

const STATIC_POST_IMAGES = [
    "https://images.unsplash.com/photo-1605276374104-edd2c0856643?w=300", // Diwali diya
    "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=300", // Fireworks
    "https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?w=300", // Lanterns
];

// Helper to format values above 1000 to K, M, etc.
function formatNumber(num: number | undefined | null): string {
    if (num === undefined || num === null) return "0";
    if (typeof num !== "number") return num;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toString();
}

// ── Stat Column Component ──────────────────────────────────────────────────
function StatColumn({
    icon,
    iconBg,
    iconColor,
    value,
    label,
}: {
    icon: string;
    iconBg: string;
    iconColor: string;
    value: number | string;
    label: string;
}) {
    return (
        <VStack style={styles.statCol} space="xs">
            <Box style={[styles.statIconContainer, { backgroundColor: iconBg }]}>
                <Feather name={icon as any} size={15} color={iconColor} />
            </Box>
            <Text style={styles.statValText}>{formatNumber(value as any)}</Text>
            <Text style={styles.statLabelText} numberOfLines={1}>{label}</Text>
        </VStack>
    );
}

// ── Post Status Badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const MAP: Record<string, { bg: string; color: string }> = {
        published: { bg: "#eff6ff", color: "#2563eb" }, // soft blue
        scheduled: { bg: "#f0fdf4", color: "#16a34a" }, // soft green matching screenshot
        draft: { bg: "#fffbeb", color: "#d97706" }, // soft amber
        partial_published: { bg: "#faf5ff", color: "#7c3aed" }, // soft purple
        failed: { bg: "#fef2f2", color: "#dc2626" }, // soft red
    };
    const meta = MAP[status] ?? { bg: "#f1f5f9", color: "#64748b" };
    return (
        <Box style={[styles.badge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>
                {status.replace("_", " ")}
            </Text>
        </Box>
    );
}

// ── Custom SVG Line Chart Component ──────────────────────────────────────────
function EngagementChart({ totalReach }: { totalReach: number }) {
    const chartWidth = screenWidth - 64; // padding horizontal margins
    const chartHeight = 130;

    const paddingLeft = 32;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 20;

    // Generate 7 days labels
    const getPast7Days = () => {
        const dates = [];
        const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
        const d = new Date();
        // Use fixed start month or dynamic
        for (let i = 6; i >= 0; i--) {
            const tempDate = new Date();
            tempDate.setDate(d.getDate() - i);
            dates.push(`${tempDate.getDate()} ${months[tempDate.getMonth()]}`);
        }
        return dates;
    };
    const dates = getPast7Days();

    // Generate 7 values representing a nice growth curve ending at the totalReach
    const multipliers = [0.35, 0.48, 0.40, 0.58, 0.50, 0.68, 1.0];
    const dataValues = multipliers.map(m => Math.round(m * totalReach));
    const maxVal = Math.max(...dataValues) * 1.15 || 100; // Add headroom for tooltip

    // Compute points coordinates
    const points = dataValues.map((val, idx) => {
        const x = paddingLeft + (idx * (chartWidth - paddingLeft - paddingRight)) / 6;
        const y = chartHeight - paddingBottom - (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
        return { x, y, val };
    });

    // Build SVG path
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        linePath += ` L ${points[i].x} ${points[i].y}`;
    }

    const fillPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`;

    // Format Y-axis labels
    const yLabels = [0, Math.round(maxVal * 0.45), Math.round(maxVal * 0.9)];

    return (
        <View style={{ height: chartHeight + 20, width: "100%", marginTop: 12 }}>
            <Svg height={chartHeight} width={chartWidth}>
                <Defs>
                    <SvgLinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#0b53f8" stopOpacity={0.2} />
                        <Stop offset="100%" stopColor="#0b53f8" stopOpacity={0.0} />
                    </SvgLinearGradient>
                </Defs>

                {/* Grid lines */}
                {yLabels.map((val, i) => {
                    const y = chartHeight - paddingBottom - (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
                    return (
                        <Path
                            key={i}
                            d={`M ${paddingLeft} ${y} L ${chartWidth - paddingRight} ${y}`}
                            stroke="#f1f5f9"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                        />
                    );
                })}

                {/* Y Axis text */}
                {yLabels.map((val, i) => {
                    const y = chartHeight - paddingBottom - (val / maxVal) * (chartHeight - paddingTop - paddingBottom);
                    return (
                        <SvgText
                            key={i}
                            x={paddingLeft - 8}
                            y={y + 3}
                            fill="#94a3b8"
                            fontSize={10}
                            fontWeight="600"
                            textAnchor="end"
                        >
                            {formatNumber(val)}
                        </SvgText>
                    );
                })}

                {/* Gradient Fill under Line */}
                <Path d={fillPath} fill="url(#chartGrad)" />

                {/* Stroke Line */}
                <Path d={linePath} fill="none" stroke="#0b53f8" strokeWidth={2.5} />

                {/* Vertex dots */}
                {points.map((p, i) => (
                    <Circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={3.5}
                        fill="#0b53f8"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                    />
                ))}

                {/* Tooltip for the peak (last point) */}
                {(() => {
                    const last = points[points.length - 1];
                    const tooltipW = 44;
                    const tooltipH = 18;
                    const tooltipX = last.x - tooltipW / 2;
                    const tooltipY = last.y - tooltipH - 8;
                    return (
                        <G>
                            <Rect
                                x={tooltipX}
                                y={tooltipY}
                                width={tooltipW}
                                height={tooltipH}
                                rx={4}
                                fill="#0b53f8"
                            />
                            <Path
                                d={`M ${last.x - 4} ${tooltipY + tooltipH} L ${last.x} ${tooltipY + tooltipH + 4} L ${last.x + 4} ${tooltipY + tooltipH} Z`}
                                fill="#0b53f8"
                            />
                            <SvgText
                                x={last.x}
                                y={tooltipY + 12}
                                fill="#ffffff"
                                fontSize={9}
                                fontWeight="700"
                                textAnchor="middle"
                            >
                                {formatNumber(last.val)}
                            </SvgText>
                        </G>
                    );
                })()}
            </Svg>

            {/* X Axis labels */}
            <View style={{ flexDirection: "row", width: chartWidth, paddingLeft: paddingLeft, paddingRight: paddingRight, justifyContent: "space-between", marginTop: 4 }}>
                {dates.map((d, i) => (
                    <Text key={i} style={{ fontSize: 10, color: "#94a3b8", fontWeight: "600", width: (chartWidth - paddingLeft - paddingRight) / 7, textAlign: "center" }}>
                        {d}
                    </Text>
                ))}
            </View>
        </View>
    );
}

// Helper to format date into 'DD MMM YYYY • HH:MM AM/PM'
const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${hours}:${minutes} ${ampm}`;

    return `${day} ${month} ${year} • ${timeStr}`;
};

// Render social media platform icons
const renderPlatformIcons = (platform: string | string[]) => {
    const list = Array.isArray(platform) ? platform : platform ? [platform] : [];
    return (
        <HStack space="xs" style={{ marginTop: 4, alignItems: "center" }}>
            {list.map((plat, idx) => {
                const name = plat.trim().toLowerCase();
                if (name.includes("facebook") || name === "fb") {
                    return <FontAwesome key={idx} name="facebook-official" size={16} color="#1877F2" style={{ marginRight: 6 }} />;
                }
                if (name.includes("instagram") || name === "ig") {
                    return <AntDesign key={idx} name="instagram" size={16} color="#E4405F" style={{ marginRight: 6 }} />;
                }
                if (name.includes("whatsapp") || name === "wa") {
                    return <FontAwesome key={idx} name="whatsapp" size={16} color="#25D366" style={{ marginRight: 6 }} />;
                }
                if (name.includes("twitter") || name === "x" || name.includes("x.com")) {
                    return <FontAwesome6 key={idx} name="x-twitter" size={14} color="#000000" style={{ marginRight: 6 }} />;
                }
                if (name.includes("linkedin") || name === "in") {
                    return <FontAwesome key={idx} name="linkedin" size={16} color="#0A66C2" style={{ marginRight: 6 }} />;
                }
                if (name.includes("youtube") || name === "yt") {
                    return <FontAwesome key={idx} name="youtube-play" size={16} color="#FF0000" style={{ marginRight: 6 }} />;
                }
                return <Feather key={idx} name="share-2" size={14} color="#64748b" style={{ marginRight: 6 }} />;
            })}
        </HStack>
    );
};

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
                <ActivityIndicator size="large" color="#0b53f8" />
                <Text className="text-typography-500 mt-3">Loading dashboard...</Text>
            </Box>
        );
    }

    // Get first name with fallback
    const firstName = user?.first_name || "";

    return (
        <Box style={styles.container}>
            {/* ── HEADER BAR ──────────────────────────────────────────────────────── */}
            <LinearGradient
                colors={["#0c55f8", "#084ad3"]}
                style={styles.header}
            >
                <HStack style={styles.headerTopRow}>
                    {/* Logo with bell icon */}
                    <HStack space="lg" style={styles.logoRow}>
                        <View style={styles.logoIconBg}>
                            {/* <Ionicons name="notifications" size={16} color="#0b53f8" /> */}
                            <Image
                                source={require("@/assets/images/logo.png")}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.logoText}>POSTBELL</Text>
                    </HStack>

                    {/* Notification bell and logout buttons */}
                    <HStack space="md" style={styles.headerRightIcons}>
                        <TouchableOpacity style={styles.headerIconButton}>
                            <Ionicons name="notifications-outline" size={20} color="white" />
                            <Box style={styles.badgeCount}>
                                <Text style={styles.badgeCountText}>3</Text>
                            </Box>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={async () => {
                                await signOut();
                                router.replace("/(auth)/login");
                            }}
                            style={styles.headerIconButton}
                        >
                            <Feather name="log-out" size={18} color="white" />
                        </TouchableOpacity>
                    </HStack>
                </HStack>

                <VStack style={styles.headerWelcomeSection} space="xs">
                    <Text style={styles.headerGreeting}>Welcome back, {firstName}! 👋</Text>
                    <Text style={styles.headerSubtitle}>Here's what's happening with your content.</Text>
                </VStack>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#0b53f8"
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

                {/* ── OVERLAPPING STATS CARD ────────────────────────────────────────── */}
                {stats && (
                    <View style={styles.statsCardWrapper}>
                        {/* Row 1 */}
                        <HStack style={styles.statsRow}>
                            <StatColumn
                                icon="file-text"
                                iconBg="#eff6ff"
                                iconColor="#3b82f6"
                                value={stats.totalPosts}
                                label="Total Posts"
                            />
                            <StatColumn
                                icon="calendar"
                                iconBg="#eff6ff"
                                iconColor="#3b82f6"
                                value={stats.scheduledPosts}
                                label="Scheduled"
                            />
                            <StatColumn
                                icon="check-square"
                                iconBg="#f0fdf4"
                                iconColor="#16a34a"
                                value={stats.publishedPosts}
                                label="Published"
                            />
                            <StatColumn
                                icon="alert-circle"
                                iconBg="#fef2f2"
                                iconColor="#ef4444"
                                value={stats.failedPosts}
                                label="Failed"
                            />
                        </HStack>

                        {/* Divider line */}
                        <View style={styles.statsDivider} />

                        {/* Row 2 */}
                        <HStack style={styles.statsRow}>
                            <StatColumn
                                icon="trending-up"
                                iconBg="#eff6ff"
                                iconColor="#3b82f6"
                                value={stats.totalUsers}
                                label="Total Users"
                            />
                            <StatColumn
                                icon="users"
                                iconBg="#eff6ff"
                                iconColor="#3b82f6"
                                value={stats.activeUsers}
                                label="Active Users"
                            />
                            <StatColumn
                                icon="edit-2"
                                iconBg="#eff6ff"
                                iconColor="#3b82f6"
                                value={stats.draftPosts}
                                label="Drafts"
                            />
                            <StatColumn
                                icon="layers"
                                iconBg="#eff6ff"
                                iconColor="#3b82f6"
                                value={stats.partialPublishedPosts}
                                label="Partial"
                            />
                        </HStack>
                    </View>
                )}

                {/* ── UPCOMING POSTS ────────────────────────────────────────────────── */}
                {recentPosts.length > 0 && (
                    <Box style={styles.sectionMargin}>
                        <HStack style={styles.sectionHeaderRow}>
                            <Heading size="md" style={styles.sectionTitle}>
                                Upcoming Posts
                            </Heading>
                            <TouchableOpacity onPress={() => router.push("/posts")}>
                                <Text style={styles.viewAllText}>View all</Text>
                            </TouchableOpacity>
                        </HStack>

                        <VStack space="sm">
                            {recentPosts.map((post, idx) => {
                                const postImage = STATIC_POST_IMAGES[idx % STATIC_POST_IMAGES.length];
                                return (
                                    <Box key={post.id} style={styles.postCard}>
                                        <HStack style={{ alignItems: "center" }}>
                                            {/* Post thumbnail */}
                                            <Image source={{ uri: postImage }} style={styles.postThumbnail} />

                                            {/* Middle Text Details */}
                                            <VStack style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={styles.postTitleText} numberOfLines={1}>
                                                    {post.title || "Untitled Post"}
                                                </Text>
                                                <Text style={styles.postDateText}>
                                                    {formatDate(post.date)}
                                                </Text>
                                                {post.platform && renderPlatformIcons(post.platform)}
                                            </VStack>

                                            {/* Right Side Options & Badge */}
                                            <VStack style={styles.postCardRight}>
                                                <TouchableOpacity activeOpacity={0.7} style={styles.moreButton}>
                                                    <Feather name="more-horizontal" size={16} color="#64748b" />
                                                </TouchableOpacity>
                                                <StatusBadge status={post.status} />
                                            </VStack>
                                        </HStack>
                                    </Box>
                                );
                            })}
                        </VStack>
                    </Box>
                )}

                {/* ── ENGAGEMENT OVERVIEW (WITH CHART) ───────────────────────────────── */}
                {stats && (
                    <Box style={styles.sectionMargin}>
                        <Box style={styles.overviewCard}>
                            <HStack style={styles.overviewHeaderRow}>
                                <Text style={styles.overviewTitle}>Engagement Overview</Text>
                                <TouchableOpacity style={styles.timeDropdown}>
                                    <Text style={styles.timeDropdownText}>Last 7 days</Text>
                                    <Feather name="chevron-down" size={12} color="#64748b" style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                            </HStack>

                            <VStack style={styles.metricsWrapper}>
                                <Text style={styles.largeMetricText}>
                                    {formatNumber(stats.totalUsers * 100)}
                                </Text>
                                <HStack style={styles.trendRow}>
                                    <Feather name="arrow-up" size={12} color="#16a34a" />
                                    <Text style={styles.trendText}>+18.6% vs last 7 days</Text>
                                </HStack>
                            </VStack>

                            {/* Dynamic SVG Line Graph */}
                            <EngagementChart totalReach={stats.totalUsers * 100} />
                        </Box>
                    </Box>
                )}

                {/* ── TOP USERS ─────────────────────────────────────────────────────── */}
                {topUsers.length > 0 && (
                    <Box style={styles.sectionMargin}>
                        <Heading size="md" style={styles.sectionTitle}>
                            Top Users
                        </Heading>
                        <VStack space="sm">
                            {topUsers.map((u) => (
                                <Box key={u.id} style={styles.userCard}>
                                    <HStack space="md" style={{ alignItems: "center" }}>
                                        <Box style={styles.avatarCircle}>
                                            <Text style={styles.avatarInitial}>
                                                {(u.name || u.email || "U")[0].toUpperCase()}
                                            </Text>
                                        </Box>
                                        <VStack style={{ flex: 1 }}>
                                            <Text style={styles.userNameText} numberOfLines={1}>
                                                {u.name || u.email}
                                            </Text>
                                            {u.companyName && (
                                                <Text style={styles.userSubText} numberOfLines={1}>
                                                    {u.companyName}
                                                </Text>
                                            )}
                                        </VStack>
                                        <VStack style={{ alignItems: "flex-end" }}>
                                            <Text style={styles.userPostCount}>
                                                {u.totalPosts ?? 0} posts
                                            </Text>
                                            <Text style={styles.userSuccessCount}>
                                                {u.publishedPosts ?? 0} pub
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
                    <Box style={styles.sectionMargin}>
                        <Heading size="md" style={styles.sectionTitle}>
                            Platform Analytics
                        </Heading>
                        <VStack space="sm">
                            {platforms.map((p) => {
                                // Determine platform accent color
                                const name = p.platform.toLowerCase();
                                let color = "#0b53f8";
                                if (name.includes("facebook") || name === "fb") color = "#1877F2";
                                else if (name.includes("instagram") || name === "ig") color = "#E4405F";
                                else if (name.includes("whatsapp") || name === "wa") color = "#25D366";
                                else if (name.includes("youtube") || name === "yt") color = "#FF0000";

                                return (
                                    <Box key={p.platform} style={styles.platformCard}>
                                        <HStack style={{ justifyContent: "space-between", alignItems: "center" }}>
                                            <Text style={styles.platformNameText}>
                                                {p.platform}
                                            </Text>
                                            <Text style={[styles.platformSuccessText, { color }]}>
                                                {p.successRate != null ? `${Math.round(p.successRate)}% success` : "—"}
                                            </Text>
                                        </HStack>
                                        <HStack style={styles.platformDetailsRow}>
                                            <Text style={styles.platformDetailsText}>Total: {p.totalPosts}</Text>
                                            <Text style={styles.platformDetailsText}>Posted: {p.postedPosts}</Text>
                                            <Text style={styles.platformDetailsText}>Users: {p.uniqueUsers}</Text>
                                        </HStack>
                                        <Box style={styles.progressBg}>
                                            <Box
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        backgroundColor: color,
                                                        width: `${Math.min(100, p.successRate ?? 0)}%` as any,
                                                    },
                                                ]}
                                            />
                                        </Box>
                                    </Box>
                                );
                            })}
                        </VStack>
                    </Box>
                )}
            </ScrollView>
        </Box>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    header: {
        paddingTop: 50,
        paddingBottom: 72,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    logoImage: {
        width: 140,
        height: 55,
    },
    logoRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    logoIconBg: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
    },
    logoText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    headerRightIcons: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    badgeCount: {
        position: "absolute",
        top: -2,
        right: -2,
        backgroundColor: "#ef4444",
        borderRadius: 8,
        width: 15,
        height: 15,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "#084ad3",
    },
    badgeCountText: {
        color: "#ffffff",
        fontSize: 8,
        fontWeight: "bold",
    },
    headerWelcomeSection: {
        paddingHorizontal: 20,
    },
    headerGreeting: {
        color: "#ffffff",
        fontSize: 22,
        fontWeight: "bold",
    },
    headerSubtitle: {
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: 13,
        fontWeight: "500",
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    errorBox: {
        backgroundColor: "#fee2e2",
        borderRadius: 12,
        padding: 14,
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#fca5a5",
    },
    statsCardWrapper: {
        backgroundColor: "#ffffff",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 20,
        marginTop: -45, // overlaps header
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    statCol: {
        flex: 1,
        alignItems: "center",
    },
    statIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    statValText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#0f172a",
    },
    statLabelText: {
        fontSize: 10,
        color: "#64748b",
        fontWeight: "600",
        textAlign: "center",
    },
    statsDivider: {
        height: 1,
        backgroundColor: "#f1f5f9",
        marginVertical: 16,
    },
    sectionMargin: {
        marginTop: 24,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#0f172a",
        marginBottom: 12,
    },
    viewAllText: {
        fontSize: 14,
        color: "#0b53f8",
        fontWeight: "600",
    },
    postCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 12,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1.5,
    },
    postThumbnail: {
        width: 52,
        height: 52,
        borderRadius: 10,
        marginRight: 12,
    },
    postThumbnailPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 10,
        marginRight: 12,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center",
    },
    postTitleText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#0f172a",
    },
    postDateText: {
        fontSize: 11,
        color: "#64748b",
        marginTop: 2,
    },
    postCardRight: {
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: 52,
    },
    moreButton: {
        padding: 4,
        marginTop: -4,
        marginRight: -4,
    },
    badge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    overviewCard: {
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: 16,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1.5,
    },
    overviewHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    overviewTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0f172a",
    },
    timeDropdown: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    timeDropdownText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#64748b",
    },
    metricsWrapper: {
        marginTop: 12,
    },
    largeMetricText: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#0f172a",
    },
    trendRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    trendText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#16a34a",
        marginLeft: 3,
    },
    userCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 12,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1.5,
    },
    avatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#eff6ff",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitial: {
        color: "#0b53f8",
        fontSize: 14,
        fontWeight: "bold",
    },
    userNameText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#0f172a",
    },
    userSubText: {
        fontSize: 11,
        color: "#64748b",
        marginTop: 1,
    },
    userPostCount: {
        fontSize: 12,
        color: "#0b53f8",
        fontWeight: "700",
        textAlign: "right",
    },
    userSuccessCount: {
        fontSize: 10,
        color: "#16a34a",
        fontWeight: "600",
        textAlign: "right",
        marginTop: 1,
    },
    platformCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 14,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1.5,
    },
    platformNameText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#0f172a",
    },
    platformSuccessText: {
        fontSize: 12,
        fontWeight: "700",
    },
    platformDetailsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    platformDetailsText: {
        fontSize: 11,
        color: "#64748b",
        fontWeight: "500",
    },
    progressBg: {
        height: 6,
        backgroundColor: "#f1f5f9",
        borderRadius: 3,
        marginTop: 10,
        overflow: "hidden",
    },
    progressFill: {
        height: 6,
        borderRadius: 3,
    },
});
