import React from 'react';
import { Stack, usePathname, Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import GlobalTabBar from '@/components/GlobalTabBar';

export default function PagesLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // "My Subscription" page is strictly for customer logins only
  if (
    (pathname.includes('MySubscriptionPage') || pathname.includes('my-subscription')) &&
    user?.loginType !== 'customer'
  ) {
    return <Redirect href="/(tabs)" />;
  }

  // Restricted page access based on user role/type
  if (user?.loginType === 'customer') {
    const customerAllowedPages = [
      '/pages/festivalAutoPost',
      '/pages/generalSetting',
      '/pages/customerGeneralSetting',
      '/pages/MySubscriptionPage',
      '/pages/festival-auto-post',
      '/pages/general-settings',
      '/pages/customer-general-setting',
      '/pages/my-subscription',
      '/pages/posts',
    ];
    // Check if the current pathname is allowed for customer
    const isAllowed = customerAllowedPages.some(
      (allowed) =>
        pathname === allowed || pathname.startsWith(allowed + '/') || pathname.startsWith(allowed)
    );
    if (!isAllowed) {
      return <Redirect href="/(tabs)" />;
    }
  } else if (user?.isSuperAdmin !== true) {
    // Role-based access check for non-superadmin users
    const sectionList = user?.section_list || user?.roleData?.section_list;
    const sectionMatrix = user?.sectionMatrix || user?.role_id?.sectionMatrix;

    if ((sectionList && sectionList.length > 0) || (sectionMatrix && sectionMatrix.length > 0)) {
      const folderName = pathname.replace(/^\/+/, '').split('/')[1]?.toLowerCase() || '';
      const fileName = pathname.replace(/^\/+/, '').split('/').pop()?.toLowerCase() || '';

      const checkMatch = (sectionName: string, sectionTitle: string = '') => {
        const sName = sectionName.toLowerCase();
        const sTitle = sectionTitle.toLowerCase();
        return (
          (sName &&
            (sName.includes(folderName) ||
              folderName.includes(sName) ||
              sName.includes(fileName) ||
              fileName.includes(sName) ||
              (sName.includes('user') && folderName.includes('user')) ||
              (sName.includes('role') && folderName.includes('role')))) ||
          (sTitle &&
            (sTitle.includes(folderName) ||
              folderName.includes(sTitle) ||
              (sTitle.includes('user') && folderName.includes('user')) ||
              (sTitle.includes('role') && folderName.includes('role'))))
        );
      };

      let hasAccess = true;
      if (sectionList && Array.isArray(sectionList) && sectionList.length > 0) {
        hasAccess = sectionList.some((sec: any) => {
          const isAccessable = sec.isAccessable !== false && sec.status !== 0;
          const viewPerm = sec.permissions ? sec.permissions.view !== false : true;
          return (
            isAccessable && viewPerm && checkMatch(String(sec.name || ''), String(sec.title || ''))
          );
        });
      } else if (sectionMatrix && Array.isArray(sectionMatrix) && sectionMatrix.length > 0) {
        hasAccess = sectionMatrix.some((matrix: any) => {
          const secName = String(
            matrix.section_name ||
              matrix.sectionId?.name ||
              matrix.sectionId?.title ||
              matrix.sectionId ||
              ''
          );
          const secTitle = String(matrix.sectionId?.title || '');
          const perms = matrix.permissions || [];
          const canView = Array.isArray(perms)
            ? perms.length === 0 || perms.includes('view')
            : true;
          return canView && checkMatch(secName, secTitle);
        });
      }

      if (!hasAccess && folderName && folderName !== 'posts') {
        return <Redirect href="/(tabs)" />;
      }
    }
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalTabBar />
    </>
  );
}
