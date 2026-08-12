import React, { useEffect, useState } from 'react';
import { usePathname, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  StyleSheet,
  Platform,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  DeviceEventEmitter,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';

export interface MenuItem {
  label: string;
  path: string;
  icon: string;
  customerAllowed?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Festival Auto Posts',
    path: '/pages/festivalAutoPost/festival-auto-post',
    icon: 'calendar',
    customerAllowed: true,
  },
  {
    label: 'Blog Management',
    path: '/pages/blogs/blogs',
    icon: 'edit-3',
    customerAllowed: false,
  },
  {
    label: 'Features',
    path: '/pages/features/features',
    icon: 'zap',
    customerAllowed: false,
  },
  {
    label: 'Subscription Plans',
    path: '/pages/subscriptionPlans/subscription-plans',
    icon: 'credit-card',
    customerAllowed: false,
  },
  {
    label: 'Customers',
    path: '/pages/customers/customers',
    icon: 'users',
    customerAllowed: false,
  },
  {
    label: 'Customer Subscriptions',
    path: '/pages/customerSubscription/customer-subscriptions',
    icon: 'package',
    customerAllowed: false,
  },
  {
    label: 'My Subscription',
    path: '/pages/MySubscriptionPage/my-subscription',
    icon: 'package',
    customerAllowed: true,
  },
  {
    label: 'Contact',
    path: '/pages/contactUs/contact-us',
    icon: 'inbox',
    customerAllowed: false,
  },
  {
    label: 'Users & Access',
    path: '/pages/userList/user-access',
    icon: 'shield',
    customerAllowed: false,
  },
  {
    label: 'General Settings',
    path: '/pages/generalSetting/general-settings',
    icon: 'settings',
    customerAllowed: true,
  },
  {
    label: 'System Logs',
    path: '/pages/systemLogs/system-logs',
    icon: 'activity',
    customerAllowed: false,
  },
];

export default function GlobalTabBar() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('toggleDrawer', () => {
      setDrawerOpen((prev) => !prev);
    });
    return () => sub.remove();
  }, []);

  const handleTabPress = (tabIndex: number) => {
    if (tabIndex === 0) {
      router.push('/(tabs)');
    } else if (tabIndex === 1) {
      router.push('/(tabs)/posts');
    } else if (tabIndex === 2) {
      // Plus button redirects to Add Post page directly
      router.push('/pages/posts/post-editor');
    } else if (tabIndex === 3) {
      router.push('/(tabs)/profile');
    } else if (tabIndex === 4) {
      // Open drawer menu
      setDrawerOpen(true);
    }
  };

  const getIsActive = (tabIndex: number) => {
    if (tabIndex === 0) {
      return (
        pathname === '/' ||
        pathname === '/(tabs)' ||
        pathname === '/(tabs)/index' ||
        pathname.includes('/dashboard')
      );
    }
    if (tabIndex === 1) {
      return (
        (pathname.includes('/posts') || pathname === '/(tabs)/posts') &&
        !pathname.includes('post-editor') &&
        !pathname.includes('post-details')
      );
    }
    if (tabIndex === 2) {
      return pathname.includes('post-editor');
    }
    if (tabIndex === 3) {
      return pathname.includes('/profile');
    }
    if (tabIndex === 4) {
      return drawerOpen;
    }
    return false;
  };

  const handleNavigate = (path: string) => {
    setDrawerOpen(false);
    router.push(path as any);
  };

  const isHideTabBar = pathname.includes('editor') || pathname.includes('details');
  const activeColor = '#0b53f8';
  const inactiveColor = '#80889B';

  const isCustomer = user?.loginType === 'customer';
  const isSuperAdmin = user?.isSuperAdmin === true;

  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    // "My Subscription" is strictly for Customer login only
    if (
      item.label === 'My Subscription' ||
      item.path.includes('MySubscriptionPage') ||
      item.path.includes('my-subscription')
    ) {
      return isCustomer;
    }
    if (isCustomer) {
      return item.customerAllowed;
    }
    if (isSuperAdmin) {
      return true;
    }

    const sectionList = user?.section_list || user?.roleData?.section_list;
    const sectionMatrix = user?.sectionMatrix || user?.role_id?.sectionMatrix;

    const folderName = item.path.split('/')[2]?.toLowerCase() || '';
    const fileName = item.path.split('/').pop()?.toLowerCase() || '';
    const labelName = item.label.toLowerCase();

    const checkMatch = (sectionName: string, sectionTitle: string = '') => {
      const sName = sectionName.toLowerCase();
      const sTitle = sectionTitle.toLowerCase();
      return (
        (sName &&
          (sName.includes(folderName) ||
            folderName.includes(sName) ||
            sName.includes(fileName) ||
            fileName.includes(sName))) ||
        (sTitle &&
          (sTitle.includes(folderName) || sTitle.includes(labelName) || labelName.includes(sTitle)))
      );
    };

    if (sectionList && Array.isArray(sectionList) && sectionList.length > 0) {
      const hasAccess = sectionList.some((sec: any) => {
        const isAccessable = sec.isAccessable !== false && sec.status !== 0;
        const viewPerm = sec.permissions ? sec.permissions.view !== false : true;
        return (
          isAccessable && viewPerm && checkMatch(String(sec.name || ''), String(sec.title || ''))
        );
      });
      return hasAccess;
    }

    if (sectionMatrix && Array.isArray(sectionMatrix) && sectionMatrix.length > 0) {
      const hasAccess = sectionMatrix.some((matrix: any) => {
        const secName = String(
          matrix.section_name ||
            matrix.sectionId?.name ||
            matrix.sectionId?.title ||
            matrix.sectionId ||
            ''
        );
        const secTitle = String(matrix.sectionId?.title || '');
        const perms = matrix.permissions || [];
        const canView = Array.isArray(perms) ? perms.length === 0 || perms.includes('view') : true;
        return canView && checkMatch(secName, secTitle);
      });
      return hasAccess;
    }

    return true;
  });

  return (
    <>
      {/* Floating Bottom Tab Bar */}
      {!isHideTabBar && (
        <View
          style={[
            styles.tabBarContainer,
            {
              bottom: Platform.OS === 'ios' ? insets.bottom / 2 + 8 : 4,
              paddingBottom: Platform.OS === 'ios' ? insets.bottom / 2 : 0,
            },
          ]}
        >
          {/* Tab 0: Dashboard */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabPress(0)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={getIsActive(0) ? 'home' : 'home-outline'}
              size={22}
              color={getIsActive(0) ? activeColor : inactiveColor}
            />
            <Text
              style={[styles.tabLabel, { color: getIsActive(0) ? activeColor : inactiveColor }]}
            >
              Dashboard
            </Text>
          </TouchableOpacity>

          {/* Tab 1: Posts */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabPress(1)}
            activeOpacity={0.7}
          >
            <Feather name="edit" size={21} color={getIsActive(1) ? activeColor : inactiveColor} />
            <Text
              style={[styles.tabLabel, { color: getIsActive(1) ? activeColor : inactiveColor }]}
            >
              Posts
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Floating Plus Button */}
          <View style={styles.plusButtonOuter}>
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() => handleTabPress(2)}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={26} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Tab 3: Profile */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabPress(3)}
            activeOpacity={0.7}
          >
            <Feather name="user" size={21} color={getIsActive(3) ? activeColor : inactiveColor} />
            <Text
              style={[styles.tabLabel, { color: getIsActive(3) ? activeColor : inactiveColor }]}
            >
              Profile
            </Text>
          </TouchableOpacity>

          {/* Tab 4: Menu */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabPress(4)}
            activeOpacity={0.7}
          >
            <Feather name="menu" size={22} color={getIsActive(4) ? activeColor : inactiveColor} />
            <Text
              style={[styles.tabLabel, { color: getIsActive(4) ? activeColor : inactiveColor }]}
            >
              Menu
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Slide-Up Drawer Modal */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <Box style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdropTouch} onPress={() => setDrawerOpen(false)} />
          <Box
            style={[
              styles.drawerContainer,
              {
                paddingBottom: 16,
                marginBottom: Platform.OS === 'ios' ? 85 + insets.bottom : 75,
              },
            ]}
          >
            <Box style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Navigation Menu</Text>
              <TouchableOpacity onPress={() => setDrawerOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </Box>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.drawerList}>
              {visibleMenuItems.map((item) => (
                <TouchableOpacity
                  key={item.path}
                  style={styles.drawerItem}
                  onPress={() => handleNavigate(item.path)}
                  activeOpacity={0.7}
                >
                  <HStack space="md" className="items-center">
                    <Box style={styles.menuIconBox}>
                      <Feather name={item.icon as any} size={18} color="#0b53f8" />
                    </Box>
                    <Text style={styles.drawerItemText}>{item.label}</Text>
                  </HStack>
                  <Feather name="chevron-right" size={16} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Box>
        </Box>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    height: 65,
    borderRadius: 16,
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    zIndex: 99999,
    elevation: 12,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  plusButtonOuter: {
    width: 68,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -5,
  },
  plusButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0b53f8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0b53f8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '85%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  drawerList: {
    marginBottom: 12,
  },
  drawerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  closeButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});
