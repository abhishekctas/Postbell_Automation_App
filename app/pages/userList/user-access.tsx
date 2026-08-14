import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import UsersManagementScreen from './users-management';
import RolesManagementScreen from '../roleList/roles-management';

export default function UserAccessScreen() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <Box className="px-5 pb-2 pt-12">
          <HStack className="mb-2 items-center justify-between">
            <Box>
              <Heading size="xl" style={{ color: '#fff' }}>
                Users & Access
              </Heading>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                Manage staff members and assign{'\n'}permission roles
              </Text>
            </Box>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Segmented Tab Bar */}
      <Box style={styles.tabContainer}>
        <HStack style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'users' && styles.tabBtnActive]}
            onPress={() => setActiveTab('users')}
          >
            <HStack className="items-center space-x-2">
              <Feather
                name="users"
                size={15}
                color={activeTab === 'users' ? '#2563EB' : '#64748b'}
              />
              <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
                Staff Users
              </Text>
            </HStack>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'roles' && styles.tabBtnActive]}
            onPress={() => setActiveTab('roles')}
          >
            <HStack className="items-center space-x-2">
              <Feather
                name="shield"
                size={15}
                color={activeTab === 'roles' ? '#2563EB' : '#64748b'}
              />
              <Text style={[styles.tabText, activeTab === 'roles' && styles.tabTextActive]}>
                Permission Roles
              </Text>
            </HStack>
          </TouchableOpacity>
        </HStack>
      </Box>

      {activeTab === 'users' ? <UsersManagementScreen /> : <RolesManagementScreen />}
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  backBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tabContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabRow: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#2563EB', fontWeight: '700' },
});
