import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'your-secret-key-here';
// Pre-derive key and IV to avoid CryptoJS calling native crypto.getRandomValues
// which is not available natively in React Native/Expo environments.
const derivedKey = CryptoJS.SHA256(ENCRYPTION_KEY);
const staticIv = CryptoJS.enc.Utf8.parse('1234567890123654');

export interface StoredUser {
  _id?: string;
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  contact_no?: string | number;
  address?: string;
  role_id?: string;
  status?: number;
  isSuperAdmin?: boolean;
  avatar?: string;
  role_name?: string;
  sectionMatrix?: any[];
  token?: string;
  loginType?: string;
  preferred_language?: 'en' | 'hi' | 'gu';
}

/**
 * Encrypts data using AES encryption
 */
export const encryptData = (data: any): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      derivedKey,
      { iv: staticIv },
    ).toString();
    return encrypted;
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts data using AES decryption
 */
export const decryptData = (encryptedData: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, derivedKey, { iv: staticIv });
    const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error);
    return null;
  }
};

/**
 * Stores user data securely in AsyncStorage
 */
export const setSecureUserData = async (userData: StoredUser): Promise<void> => {
  try {
    const encryptedData = encryptData(userData);
    await AsyncStorage.setItem('userData', encryptedData);
    if (userData.token) {
      await AsyncStorage.setItem('jwt_access_token', userData.token);
    }
  } catch (error) {
    console.error('Failed to store user data:', error);
    throw new Error('Failed to store user data');
  }
};

/**
 * Retrieves and decrypts user data from AsyncStorage
 */
export const getSecureUserData = async (): Promise<StoredUser | null> => {
  try {
    const encryptedData = await AsyncStorage.getItem('userData');
    if (!encryptedData) return null;
    return decryptData(encryptedData);
  } catch (error) {
    console.error('Failed to retrieve user data:', error);
    return null;
  }
};

/**
 * Gets the logged-in user ID from stored user data
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  const userData = await getSecureUserData();
  return userData?._id || userData?.id || null;
};

/**
 * Gets the logged-in user details
 */
export const getCurrentUserDetails = async (): Promise<StoredUser | null> => {
  return await getSecureUserData();
};

/**
 * Clears user data from AsyncStorage
 */
export const clearSecureUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('jwt_access_token');
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
};

/**
 * Updates specific user data fields
 */
export const updateSecureUserData = async (updates: Partial<StoredUser>): Promise<void> => {
  const currentData = await getSecureUserData();
  if (!currentData) {
    throw new Error('No user data found to update');
  }
  const updatedData = { ...currentData, ...updates };
  await setSecureUserData(updatedData);
};

/**
 * Stores user data after successful login
 */
export const storeUserAfterLogin = async (userData: StoredUser): Promise<void> => {
  try {
    await setSecureUserData(userData);
  } catch (error) {
    console.error('❌ Failed to store user data after login:', error);
    throw new Error('Failed to store user data after login');
  }
};
