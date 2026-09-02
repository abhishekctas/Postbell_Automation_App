import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  TextInput,
  Platform,
  Switch,
  Modal,
  View,
  PanResponder,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getPost,
  createPost,
  updatePost,
  getAllSocialAccountsForPost,
  generateSocialMediaPost,
  generateMarketingImageFromReference,
  analyzeReferenceMedia,
  uploadPostImage,
  getImageUrl,
  Post,
  ReferenceDetectedObject,
} from './posts.api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';

const CONTENT_TYPES = [
  { value: 'media', label: 'Media', icon: 'image' },
  { value: 'link', label: 'Link', icon: 'link' },
  { value: 'story', label: 'Story', icon: 'book-open' },
  { value: 'text', label: 'Text', icon: 'type' },
];

const SOCIAL_PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: 'facebook-square', color: '#1877f2' },
  { id: 'instagram', label: 'Instagram', icon: 'instagram', color: '#e1306c' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', color: '#25d366' },
  { id: 'twitter', label: 'Twitter', icon: 'twitter', color: '#1da1f2' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', color: '#0a66c2' },
  { id: 'snapchat', label: 'Snapchat', icon: 'snapchat', color: '#e2de07ff' },
  { id: 'google_business', label: 'Google Business', icon: 'google', color: '#313641ff' },
  { id: 'pinterest', label: 'Pinterest', icon: 'pinterest', color: '#bd081c' },
];

const getInitialScheduledDate = () => {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1);
  return nextHour;
};

export default function PostEditorScreen() {
  const { id, tab } = useLocalSearchParams<{ id?: string; tab?: string }>();
  const router = useRouter();

  const isEditing = Boolean(id);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>(
    tab === 'ai' ? 'ai' : tab === 'manual' ? 'manual' : isEditing ? 'manual' : 'ai'
  );
  const [previewTab, setPreviewTab] = useState<string>('all');

  // AI Auto Post State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProvider, setAiProvider] = useState<'auto' | 'gemini' | 'openai'>('auto');
  const [aiRefImage, setAiRefImage] = useState<string>('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{
    title?: string;
    caption?: string;
    hashtags?: string[];
    image_url?: string;
    image?: string;
    id?: string;
    _id?: string;
    variant_name?: string;
  } | null>(null);
  const [aiGeneratedPosts, setAiGeneratedPosts] = useState<any[]>([]);
  const [downloadingPostIds, setDownloadingPostIds] = useState<Set<string>>(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [aiVariantModalOpen, setAiVariantModalOpen] = useState(false);
  const [aiRefinePanelOpen, setAiRefinePanelOpen] = useState(false);
  const [aiRefinePrompt, setAiRefinePrompt] = useState('');
  const [aiRegeneratingImage, setAiRegeneratingImage] = useState(false);
  const [aiDraftPostId, setAiDraftPostId] = useState<string | null>(null);
  const [aiMergedIntoEdit, setAiMergedIntoEdit] = useState<boolean>(false);
  const [expandedHashtags, setExpandedHashtags] = useState<Record<string, boolean>>({});

  // Form State
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [postStatus, setPostStatus] = useState<'draft' | 'scheduled' | 'published'>('draft');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(getInitialScheduledDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Platforms & Accounts Selection Modal State
  const [networksModalOpen, setNetworksModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  // Existing Image Crop Modal State
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [cropImageUri, setCropImageUri] = useState<string>('');
  const [cropTargetType, setCropTargetType] = useState<
    'general' | 'platform' | 'ai' | 'manual_ref'
  >('general');
  const [cropTargetPlatform, setCropTargetPlatform] = useState<string>('');
  const [cropTargetAccountId, setCropTargetAccountId] = useState<string>('');
  const [selectedCropAspect, setSelectedCropAspect] = useState<
    'custom' | '1:1' | '4:5' | '16:9' | '9:16' | 'original'
  >('custom');
  const [cropRotation, setCropRotation] = useState<number>(0);
  const [croppingInProgress, setCroppingInProgress] = useState(false);

  // Custom Interactive Crop Overlay State
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 30,
    y: 20,
    width: 240,
    height: 240,
  });
  const [containerDim, setContainerDim] = useState<{ width: number; height: number }>({
    width: 360,
    height: 320,
  });
  const [realImgDim, setRealImgDim] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  // Calculate displayed image frame inside container (resizeMode="contain")
  const isRotated90or270 = cropRotation === 90 || cropRotation === 270;
  const curImgW = isRotated90or270 ? realImgDim.height : realImgDim.width;
  const curImgH = isRotated90or270 ? realImgDim.width : realImgDim.height;

  const currentScale =
    curImgW && curImgH ? Math.min(containerDim.width / curImgW, containerDim.height / curImgH) : 1;
  const currentDispW = curImgW ? curImgW * currentScale : containerDim.width;
  const currentDispH = curImgH ? curImgH * currentScale : containerDim.height;
  const currentOffX = (containerDim.width - currentDispW) / 2;
  const currentOffY = (containerDim.height - currentDispH) / 2;

  // PanResponders for Custom Interactive Crop Box (Whole Box & 8 Handles)
  const boxMovePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedCropAspect('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          setCropBox((prev) => {
            const minX = currentOffX;
            const maxX = Math.max(minX, currentOffX + currentDispW - prev.width);
            const minY = currentOffY;
            const maxY = Math.max(minY, currentOffY + currentDispH - prev.height);

            const newX = Math.max(minX, Math.min(maxX, prev.x + gestureState.dx));
            const newY = Math.max(minY, Math.min(maxY, prev.y + gestureState.dy));

            return { ...prev, x: newX, y: newY };
          });
        },
      }),
    [currentOffX, currentOffY, currentDispW, currentDispH]
  );

  const topLeftPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedCropAspect('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          setCropBox((prev) => {
            const newX = Math.max(
              currentOffX,
              Math.min(prev.x + prev.width - 40, prev.x + gestureState.dx)
            );
            const newY = Math.max(
              currentOffY,
              Math.min(prev.y + prev.height - 40, prev.y + gestureState.dy)
            );
            const newW = prev.width + (prev.x - newX);
            const newH = prev.height + (prev.y - newY);
            return { x: newX, y: newY, width: newW, height: newH };
          });
        },
      }),
    [currentOffX, currentOffY]
  );

  const topRightPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedCropAspect('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          setCropBox((prev) => {
            const maxW = currentOffX + currentDispW - prev.x;
            const newY = Math.max(
              currentOffY,
              Math.min(prev.y + prev.height - 40, prev.y + gestureState.dy)
            );
            const newW = Math.max(40, Math.min(maxW, prev.width + gestureState.dx));
            const newH = prev.height + (prev.y - newY);
            return { ...prev, y: newY, width: newW, height: newH };
          });
        },
      }),
    [currentOffX, currentDispW, currentOffY]
  );

  const bottomLeftPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedCropAspect('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          setCropBox((prev) => {
            const newX = Math.max(
              currentOffX,
              Math.min(prev.x + prev.width - 40, prev.x + gestureState.dx)
            );
            const maxH = currentOffY + currentDispH - prev.y;
            const newW = prev.width + (prev.x - newX);
            const newH = Math.max(40, Math.min(maxH, prev.height + gestureState.dy));
            return { ...prev, x: newX, width: newW, height: newH };
          });
        },
      }),
    [currentOffX, currentOffY, currentDispH]
  );

  const bottomRightPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedCropAspect('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          setCropBox((prev) => {
            const maxW = currentOffX + currentDispW - prev.x;
            const maxH = currentOffY + currentDispH - prev.y;
            const newW = Math.max(40, Math.min(maxW, prev.width + gestureState.dx));
            const newH = Math.max(40, Math.min(maxH, prev.height + gestureState.dy));
            return { ...prev, width: newW, height: newH };
          });
        },
      }),
    [currentOffX, currentDispW, currentOffY, currentDispH]
  );

  const topEdgePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedCropAspect('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          setCropBox((prev) => {
            const newY = Math.max(
              currentOffY,
              Math.min(prev.y + prev.height - 40, prev.y + gestureState.dy)
            );
            const newH = prev.height + (prev.y - newY);
            return { ...prev, y: newY, height: newH };
          });
        },
      }),
    [currentOffY]
  );

  const bottomEdgePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedCropAspect('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          setCropBox((prev) => {
            const maxH = currentOffY + currentDispH - prev.y;
            const newH = Math.max(40, Math.min(maxH, prev.height + gestureState.dy));
            return { ...prev, height: newH };
          });
        },
      }),
    [currentOffY, currentDispH]
  );

  const leftEdgePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedCropAspect('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          setCropBox((prev) => {
            const newX = Math.max(
              currentOffX,
              Math.min(prev.x + prev.width - 40, prev.x + gestureState.dx)
            );
            const newW = prev.width + (prev.x - newX);
            return { ...prev, x: newX, width: newW };
          });
        },
      }),
    [currentOffX]
  );

  const rightEdgePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSelectedCropAspect('custom');
        },
        onPanResponderMove: (_, gestureState) => {
          setCropBox((prev) => {
            const maxW = currentOffX + currentDispW - prev.x;
            const newW = Math.max(40, Math.min(maxW, prev.width + gestureState.dx));
            return { ...prev, width: newW };
          });
        },
      }),
    [currentOffX, currentDispW]
  );

  const handleSelectAspect = (aspect: 'custom' | '1:1' | '4:5' | '16:9' | '9:16' | 'original') => {
    setSelectedCropAspect(aspect);
    const cW = containerDim.width || 360;
    const cH = containerDim.height || 320;
    const isRot = cropRotation === 90 || cropRotation === 270;
    const w = isRot ? realImgDim.height : realImgDim.width;
    const h = isRot ? realImgDim.width : realImgDim.height;

    const scale = w && h ? Math.min(cW / w, cH / h) : 1;
    const dW = w ? w * scale : cW;
    const dH = h ? h * scale : cH;
    const oX = (cW - dW) / 2;
    const oY = (cH - dH) / 2;

    if (aspect === 'original') {
      setCropBox({ x: oX, y: oY, width: dW, height: dH });
      return;
    }

    if (aspect === 'custom') {
      const bW = dW * 0.9;
      const bH = dH * 0.9;
      setCropBox({ x: oX + (dW - bW) / 2, y: oY + (dH - bH) / 2, width: bW, height: bH });
      return;
    }

    let targetRatio = 1;
    if (aspect === '1:1') targetRatio = 1;
    else if (aspect === '4:5') targetRatio = 4 / 5;
    else if (aspect === '16:9') targetRatio = 16 / 9;
    else if (aspect === '9:16') targetRatio = 9 / 16;

    let bW = dW;
    let bH = dH;

    if (dW / dH > targetRatio) {
      bH = dH * 0.9;
      bW = bH * targetRatio;
    } else {
      bW = dW * 0.9;
      bH = bW / targetRatio;
    }

    setCropBox({
      x: oX + (dW - bW) / 2,
      y: oY + (dH - bH) / 2,
      width: bW,
      height: bH,
    });
  };

  const getLoadableImageUri = async (uri: string): Promise<string> => {
    if (!uri) return '';
    const fullUrl = getImageUrl(uri) || uri;
    if (
      Platform.OS === 'web' &&
      (fullUrl.startsWith('http://') || fullUrl.startsWith('https://'))
    ) {
      try {
        const res = await fetch(fullUrl, { mode: 'cors' });
        if (res.ok) {
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(fullUrl);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.log('Loadable URI fetch notice:', e);
      }
    }
    return fullUrl;
  };

  const openCropForExistingImage = async (
    uri: string,
    target: 'general' | 'platform' | 'ai' | 'manual_ref',
    platform?: string,
    accountId?: string
  ) => {
    if (!uri) {
      Alert.alert('No Image', 'No image available to crop.');
      return;
    }
    const resolvedUri = getImageUrl(uri) || uri;
    const loadableUri = await getLoadableImageUri(resolvedUri);
    setCropImageUri(loadableUri);
    setCropTargetType(target);
    setCropTargetPlatform(platform || '');
    setCropTargetAccountId(accountId || '');
    setSelectedCropAspect('custom');
    setCropRotation(0);

    Image.getSize(loadableUri, (w, h) => {
      setRealImgDim({ width: w, height: h });
      const cW = containerDim.width || 360;
      const cH = containerDim.height || 320;
      const scale = Math.min(cW / w, cH / h);
      const dW = w * scale;
      const dH = h * scale;
      const oX = (cW - dW) / 2;
      const oY = (cH - dH) / 2;

      const bW = dW * 0.85;
      const bH = dH * 0.85;
      setCropBox({
        x: oX + (dW - bW) / 2,
        y: oY + (dH - bH) / 2,
        width: bW,
        height: bH,
      });
    });

    setCropModalVisible(true);
  };

  const handleApplyCrop = async () => {
    if (!cropImageUri) return;
    setCroppingInProgress(true);
    try {
      const loadableUri = await getLoadableImageUri(cropImageUri);

      Image.getSize(
        loadableUri,
        async (rawW, rawH) => {
          try {
            const actions: ImageManipulator.Action[] = [];

            if (cropRotation !== 0) {
              actions.push({ rotate: cropRotation });
            }

            const isRotated90or270 = cropRotation === 90 || cropRotation === 270;
            const imgW = isRotated90or270 ? rawH : rawW;
            const imgH = isRotated90or270 ? rawW : rawH;

            const cW = containerDim.width || 360;
            const cH = containerDim.height || 320;
            const scale = Math.min(cW / imgW, cH / imgH);
            const dispW = imgW * scale;
            const dispH = imgH * scale;
            const offX = (cW - dispW) / 2;
            const offY = (cH - dispH) / 2;

            let relX = Math.max(0, cropBox.x - offX);
            let relY = Math.max(0, cropBox.y - offY);
            let relW = Math.min(dispW, cropBox.width);
            let relH = Math.min(dispH, cropBox.height);

            let originX = Math.floor(relX / scale);
            let originY = Math.floor(relY / scale);
            let cropW = Math.floor(relW / scale);
            let cropH = Math.floor(relH / scale);

            originX = Math.max(0, Math.min(originX, imgW - 1));
            originY = Math.max(0, Math.min(originY, imgH - 1));
            cropW = Math.max(1, Math.min(cropW, imgW - originX));
            cropH = Math.max(1, Math.min(cropH, imgH - originY));

            actions.push({
              crop: {
                originX,
                originY,
                width: cropW,
                height: cropH,
              },
            });

            const manipResult = await ImageManipulator.manipulateAsync(loadableUri, actions, {
              compress: 0.85,
              format: ImageManipulator.SaveFormat.JPEG,
            });

            const croppedUri = manipResult.uri;

            if (cropTargetType === 'ai') {
              setAiRefImage(croppedUri);
              resetAiReferenceAnalysis();
              runAiReferenceAnalysis(croppedUri);
              Alert.alert('Success', 'Reference image cropped successfully!');
            } else if (cropTargetType === 'manual_ref') {
              setReferenceImageUri(croppedUri);
              Alert.alert('Success', 'Reference image cropped successfully!');
            } else if (cropTargetType === 'platform' && cropTargetPlatform) {
              const platformKey = cropTargetPlatform;
              const accountId = cropTargetAccountId;
              const key = `${platformKey}:${accountId || 'default'}`;
              setUploadingPlatformImage((prev) => ({ ...prev, [key]: true, [platformKey]: true }));
              try {
                const uploadRes = await uploadPostImage(croppedUri);
                const serverUrl =
                  uploadRes?.picture ||
                  uploadRes?.imageUrl ||
                  uploadRes?.url ||
                  uploadRes?.data?.picture ||
                  uploadRes?.data?.imageUrl ||
                  uploadRes?.data?.url ||
                  croppedUri;

                handlePlatformSpecificChange(platformKey, accountId, 'mediaUrl', serverUrl);
                setPlatformOverrides((prev) => ({
                  ...prev,
                  [platformKey]: {
                    ...prev[platformKey],
                    image_url: serverUrl,
                  },
                }));
              } finally {
                setUploadingPlatformImage((prev) => ({
                  ...prev,
                  [key]: false,
                  [platformKey]: false,
                }));
              }
            } else {
              setUploadingImage(true);
              try {
                const uploadRes = await uploadPostImage(croppedUri);
                const serverUrl =
                  uploadRes?.picture ||
                  uploadRes?.imageUrl ||
                  uploadRes?.url ||
                  uploadRes?.data?.picture ||
                  uploadRes?.data?.imageUrl ||
                  uploadRes?.data?.url ||
                  croppedUri;
                const serverPath =
                  uploadRes?.picture ||
                  uploadRes?.imagePath ||
                  uploadRes?.url ||
                  uploadRes?.data?.picture ||
                  uploadRes?.data?.imagePath ||
                  uploadRes?.data?.url ||
                  croppedUri;

                setImageUrl(serverUrl);
                setImagePath(serverPath);
                setErrors((prev) => ({ ...prev, imageUrl: '' }));
              } finally {
                setUploadingImage(false);
              }
            }

            setCropModalVisible(false);
          } catch (err: any) {
            Alert.alert('Crop Error', err?.message || 'Failed to process crop.');
          } finally {
            setCroppingInProgress(false);
          }
        },
        (error) => {
          Alert.alert('Image Error', 'Could not load image dimensions for cropping.');
          setCroppingInProgress(false);
        }
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to crop image.');
      setCroppingInProgress(false);
    }
  };

  // AI Marketing Image & Reference Media Analysis State
  const [aiMarketingGenerating, setAiMarketingGenerating] = useState(false);
  const [aiMarketingImageUrl, setAiMarketingImageUrl] = useState('');
  const [aiAnalyzingRef, setAiAnalyzingRef] = useState(false);
  const [aiRefAnalysisStatus, setAiRefAnalysisStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [aiRefAnalysisSummary, setAiRefAnalysisSummary] = useState('');
  const [referenceImageUri, setReferenceImageUri] = useState<string>('');
  const [referenceImagePrompt, setReferenceImagePrompt] = useState<string>('');
  const [aiReferencePrompt, setAiReferencePrompt] = useState<string>('');
  const [referenceImageProvider, setReferenceImageProvider] = useState<
    'auto' | 'gemini' | 'openai'
  >('auto');
  const [aiReferenceDetectedObjects, setAiReferenceDetectedObjects] = useState<
    ReferenceDetectedObject[]
  >([]);
  const [aiReferenceSelectedObjectIds, setAiReferenceSelectedObjectIds] = useState<string[]>([]);
  const [aiReferenceManualObjects, setAiReferenceManualObjects] = useState<
    ReferenceDetectedObject[]
  >([]);
  const [markObjectModalOpen, setMarkObjectModalOpen] = useState<boolean>(false);
  const [markStrokes, setMarkStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [currentMarkStroke, setCurrentMarkStroke] = useState<{ x: number; y: number }[]>([]);
  const [markObjectLabel, setMarkObjectLabel] = useState<string>('');
  const [markCanvasLayout, setMarkCanvasLayout] = useState<{ width: number; height: number }>({
    width: 320,
    height: 280,
  });

  // Content Type & Platform-Specific Overrides
  const [activePlatformTab, setActivePlatformTab] = useState<string>('general');
  const [contentTypeOverrides, setContentTypeOverrides] = useState<Record<string, string>>({});
  const [platformOverrides, setPlatformOverrides] = useState<
    Record<
      string,
      {
        contentType?: string;
        caption?: string;
        link?: string;
        hashtags?: string[];
        image_url?: string;
      }
    >
  >({});
  const [platformSpecificContent, setPlatformSpecificContent] = useState<Record<string, any[]>>({});
  const [platformHashtagsInput, setPlatformHashtagsInput] = useState<Record<string, string>>({});
  const [uploadingPlatformImage, setUploadingPlatformImage] = useState<Record<string, boolean>>({});

  const handlePlatformSpecificChange = (
    platform: string,
    accountId: string,
    field: string,
    value: any
  ) => {
    setPlatformSpecificContent((prev) => {
      const platformAccs = socialAccounts.filter(
        (a) =>
          isPlatformMatch(a.platform, platform) &&
          selectedAccounts.includes(a.account_id || a.value || a.id || a._id)
      );

      let currentEntries = prev[platform] ? [...prev[platform]] : [];

      if (platformAccs.length > 0) {
        const updatedEntries = platformAccs.map((acc, idx) => {
          const accId = acc.account_id || acc.value || acc.id || acc._id;
          let item = currentEntries.find((e: any) => e.account_id === accId) || currentEntries[idx];

          if (!item) {
            const override = platformOverrides[platform] || {};
            item = {
              account_id: accId,
              caption: override.caption || caption || '',
              link: override.link || companyWebsite || '',
              hashtags:
                override.hashtags && override.hashtags.length > 0
                  ? override.hashtags
                  : hashtagsInput
                    ? hashtagsInput
                        .split(',')
                        .map((t) => t.trim().replace(/^#/, ''))
                        .filter(Boolean)
                    : [],
              mediaUrl:
                override.image_url !== undefined ? override.image_url : imageUrl || imagePath || '',
              contentType: override.contentType || contentTypeOverrides[platform] || 'media',
            };
          } else {
            item = { ...item, account_id: accId };
          }

          if (!accountId || item.account_id === accountId || (idx === 0 && !accountId)) {
            if (field.includes('.')) {
              const [parent, child] = field.split('.');
              return {
                ...item,
                [parent]: { ...(item[parent] || {}), [child]: value },
              };
            }
            return { ...item, [field]: value };
          }
          return item;
        });

        return {
          ...prev,
          [platform]: updatedEntries,
        };
      } else {
        if (currentEntries.length === 0) {
          const override = platformOverrides[platform] || {};
          currentEntries = [
            {
              account_id: accountId || '',
              caption: override.caption || caption || '',
              link: override.link || companyWebsite || '',
              hashtags:
                override.hashtags && override.hashtags.length > 0
                  ? override.hashtags
                  : hashtagsInput
                    ? hashtagsInput
                        .split(',')
                        .map((t) => t.trim().replace(/^#/, ''))
                        .filter(Boolean)
                    : [],
              mediaUrl:
                override.image_url !== undefined ? override.image_url : imageUrl || imagePath || '',
              contentType: override.contentType || contentTypeOverrides[platform] || 'media',
            },
          ];
        }

        const updatedEntries = currentEntries.map((item: any) => {
          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            return {
              ...item,
              [parent]: { ...(item[parent] || {}), [child]: value },
            };
          }
          return { ...item, [field]: value };
        });

        return {
          ...prev,
          [platform]: updatedEntries,
        };
      }
    });
  };

  // Connected Social Accounts
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewImgErrors, setPreviewImgErrors] = useState<Record<string, boolean>>({});
  const [genImgError, setGenImgError] = useState(false);
  const [platformImgErrors, setPlatformImgErrors] = useState<Record<string, boolean>>({});

  const fetchAndSetSocialAccounts = async () => {
    try {
      const res = await getAllSocialAccountsForPost();
      let accs: any[] = [];
      if (Array.isArray(res)) {
        accs = res;
      } else if (Array.isArray(res?.data)) {
        accs = res.data;
      } else if (Array.isArray(res?.data?.data)) {
        accs = res.data.data;
      }
      setSocialAccounts(accs);
      return accs;
    } catch (err) {
      console.error('Failed to load social accounts:', err);
      return [];
    }
  };

  // Fetch Post Details for Edit Mode & Fetch Social Accounts
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let loadedAccounts: any[] = [];
        try {
          loadedAccounts = await fetchAndSetSocialAccounts();
        } catch {
          // Default fallback if social accounts fetch fails
        }

        if (id) {
          const postData: Post = await getPost(id);
          setTitle(postData.title || '');
          setCaption(postData.caption || postData.generalContent?.caption || '');
          setCompanyWebsite(postData.company_website || postData.generalContent?.link || '');
          setCompanyName(postData.company_name || postData.companyName || '');
          setCompanyEmail(postData.company_email || postData.companyEmail || '');
          setCompanyPhone(postData.company_phone || '');
          setHashtagsInput((postData.hashtags || []).join(', '));
          const initialImg =
            typeof postData.image_url === 'string' && postData.image_url.trim()
              ? postData.image_url
              : postData.generalContent?.media?.[0]?.url ||
                postData.generalContent?.media?.[0]?.imagePath ||
                '';
          setImageUrl(initialImg);
          setImagePath(
            postData.image_path || postData.generalContent?.media?.[0]?.imagePath || initialImg
          );
          setGenImgError(false);

          if (
            postData.selectedNetworks &&
            Array.isArray(postData.selectedNetworks) &&
            postData.selectedNetworks.length > 0
          ) {
            setSelectedPlatforms(postData.selectedNetworks);
          }

          // Parse selectedAccounts
          const loadedAccIds: string[] = [];
          if (postData.selectedAccounts) {
            if (Array.isArray(postData.selectedAccounts)) {
              loadedAccIds.push(...postData.selectedAccounts);
            } else if (typeof postData.selectedAccounts === 'object') {
              Object.values(postData.selectedAccounts).forEach((accList) => {
                if (Array.isArray(accList)) loadedAccIds.push(...accList);
              });
            }
          }
          if (loadedAccIds.length > 0) {
            setSelectedAccounts(loadedAccIds);
          } else if (loadedAccounts.length > 0) {
            const autoSelected = loadedAccounts
              .filter((acc: any) =>
                (postData.selectedNetworks || ['facebook', 'instagram']).includes(acc.platform)
              )
              .map((acc: any) => acc.account_id || acc.value || acc.id);
            setSelectedAccounts(autoSelected);
          }

          // Parse platformSpecificContent overrides
          if (
            postData.platformSpecificContent &&
            typeof postData.platformSpecificContent === 'object'
          ) {
            setPlatformSpecificContent(postData.platformSpecificContent as Record<string, any[]>);
            const overridesMap: Record<string, any> = {};
            const initialPlatformTags: Record<string, string> = {};
            Object.entries(postData.platformSpecificContent).forEach(
              ([plat, entries]: [string, any]) => {
                const entryList = Array.isArray(entries) ? entries : [];
                if (entryList.length > 0) {
                  const first = entryList[0];
                  overridesMap[plat] = {
                    caption: first.caption || '',
                    link: first.link || '',
                    hashtags: first.hashtags || [],
                    image_url: first.mediaUrl || first.media_url || '',
                  };
                  entryList.forEach((entry: any, idx: number) => {
                    const tagKey = `${plat}:${entry.account_id || idx}`;
                    if (
                      entry.hashtags &&
                      Array.isArray(entry.hashtags) &&
                      entry.hashtags.length > 0
                    ) {
                      initialPlatformTags[tagKey] = entry.hashtags.join(', ');
                    }
                  });
                  if (
                    first.hashtags &&
                    Array.isArray(first.hashtags) &&
                    first.hashtags.length > 0
                  ) {
                    initialPlatformTags[plat] = first.hashtags.join(', ');
                  }
                }
              }
            );
            setPlatformOverrides(overridesMap);
            setPlatformHashtagsInput(initialPlatformTags);
          }

          if (postData.post_status) {
            setPostStatus(postData.post_status as any);
          }
          if (postData.scheduled_at) {
            setIsScheduled(true);
            setScheduledDate(new Date(postData.scheduled_at));
          }
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load post data.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // Image Picker for General Content
  const pickImage = async (withCrop: boolean = false) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: (ImagePicker as any).MediaType?.Images || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: withCrop,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (activeTab === 'ai') {
          setAiRefImage(uri);
        } else {
          setUploadingImage(true);
          setGenImgError(false);
          try {
            const uploadRes = await uploadPostImage(
              uri,
              result.assets[0].fileName || undefined,
              result.assets[0].mimeType || undefined
            );
            const serverUrl =
              uploadRes?.picture ||
              uploadRes?.imageUrl ||
              uploadRes?.url ||
              uploadRes?.data?.picture ||
              uploadRes?.data?.imageUrl ||
              uploadRes?.data?.url ||
              uri;
            const serverPath =
              uploadRes?.picture ||
              uploadRes?.imagePath ||
              uploadRes?.url ||
              uploadRes?.data?.picture ||
              uploadRes?.data?.imagePath ||
              uploadRes?.data?.url ||
              uri;

            setImageUrl(serverUrl);
            setImagePath(serverPath);
            setErrors((prev) => ({ ...prev, imageUrl: '' }));
          } catch (err: any) {
            Alert.alert('Upload Failed', err?.message || 'Failed to upload image to server.');
          } finally {
            setUploadingImage(false);
          }
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  // Platform-Specific Image Picker
  const pickPlatformImage = async (
    platformKey: string,
    withCrop: boolean = false,
    accountId: string = ''
  ) => {
    const key = `${platformKey}:${accountId || 'default'}`;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: (ImagePicker as any).MediaType?.Images || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: withCrop,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setUploadingPlatformImage((prev) => ({ ...prev, [key]: true, [platformKey]: true }));
        setPlatformImgErrors((prev) => ({ ...prev, [key]: false, [platformKey]: false }));
        try {
          const uploadRes = await uploadPostImage(
            uri,
            result.assets[0].fileName || undefined,
            result.assets[0].mimeType || undefined
          );
          const serverUrl =
            uploadRes?.picture ||
            uploadRes?.imageUrl ||
            uploadRes?.url ||
            uploadRes?.data?.picture ||
            uploadRes?.data?.imageUrl ||
            uploadRes?.data?.url ||
            uri;

          handlePlatformSpecificChange(platformKey, accountId, 'mediaUrl', serverUrl);
          setPlatformOverrides((prev) => ({
            ...prev,
            [platformKey]: {
              ...prev[platformKey],
              image_url: serverUrl,
            },
          }));
        } catch (err: any) {
          Alert.alert(
            'Upload Failed',
            err?.message || `Failed to upload image for ${platformKey}.`
          );
        } finally {
          setUploadingPlatformImage((prev) => ({ ...prev, [key]: false, [platformKey]: false }));
        }
      }
    } catch {
      Alert.alert('Error', `Failed to pick image for ${platformKey}.`);
    }
  };

  // Camera Image Capture for General Content
  const takeImage = async (withCrop: boolean = false) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is needed to take photos. Please enable it in settings.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: (ImagePicker as any).MediaType?.Images || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: withCrop,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setUploadingImage(true);
        setGenImgError(false);
        try {
          const uploadRes = await uploadPostImage(
            uri,
            result.assets[0].fileName || undefined,
            result.assets[0].mimeType || undefined
          );
          const serverUrl =
            uploadRes?.picture ||
            uploadRes?.imageUrl ||
            uploadRes?.url ||
            uploadRes?.data?.picture ||
            uploadRes?.data?.imageUrl ||
            uploadRes?.data?.url ||
            uri;
          const serverPath =
            uploadRes?.picture ||
            uploadRes?.imagePath ||
            uploadRes?.url ||
            uploadRes?.data?.picture ||
            uploadRes?.data?.imagePath ||
            uploadRes?.data?.url ||
            uri;
          setImageUrl(serverUrl);
          setImagePath(serverPath);
          setErrors((prev) => ({ ...prev, imageUrl: '' }));
        } catch (err: any) {
          Alert.alert('Upload Failed', err?.message || 'Failed to upload image to server.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to capture image from camera.');
    }
  };

  // Camera Image Capture for Platform-Specific
  const takePlatformImage = async (
    platformKey: string,
    withCrop: boolean = false,
    accountId: string = ''
  ) => {
    const key = `${platformKey}:${accountId || 'default'}`;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is needed to take photos. Please enable it in settings.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: (ImagePicker as any).MediaType?.Images || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: withCrop,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setUploadingPlatformImage((prev) => ({ ...prev, [key]: true, [platformKey]: true }));
        setPlatformImgErrors((prev) => ({ ...prev, [key]: false, [platformKey]: false }));
        try {
          const uploadRes = await uploadPostImage(
            uri,
            result.assets[0].fileName || undefined,
            result.assets[0].mimeType || undefined
          );
          const serverUrl =
            uploadRes?.picture ||
            uploadRes?.imageUrl ||
            uploadRes?.url ||
            uploadRes?.data?.picture ||
            uploadRes?.data?.imageUrl ||
            uploadRes?.data?.url ||
            uri;

          handlePlatformSpecificChange(platformKey, accountId, 'mediaUrl', serverUrl);
          setPlatformOverrides((prev) => ({
            ...prev,
            [platformKey]: {
              ...prev[platformKey],
              image_url: serverUrl,
            },
          }));
        } catch (err: any) {
          Alert.alert(
            'Upload Failed',
            err?.message || `Failed to upload image for ${platformKey}.`
          );
        } finally {
          setUploadingPlatformImage((prev) => ({ ...prev, [key]: false, [platformKey]: false }));
        }
      }
    } catch {
      Alert.alert('Error', `Failed to capture image for ${platformKey}.`);
    }
  };

  // Image Source Picker for General Content
  const showGeneralImagePicker = () => {
    Alert.alert('Select Image Source', 'Choose an option', [
      { text: 'Gallery', onPress: () => pickImage(false) },
      { text: 'Camera', onPress: () => takeImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Image Source Picker for Platform-Specific
  const showPlatformImagePicker = (platformKey: string, accountId: string = '') => {
    Alert.alert('Select Image Source', 'Choose an option', [
      { text: 'Gallery', onPress: () => pickPlatformImage(platformKey, false, accountId) },
      { text: 'Camera', onPress: () => takePlatformImage(platformKey, false, accountId) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // AI Generation Handler
  const handleGenerateAi = async () => {
    const trimmedPrompt = aiPrompt.trim();
    if (!trimmedPrompt) {
      setErrors((prev) => ({ ...prev, aiPrompt: 'Prompt is required to generate AI post.' }));
      Alert.alert(
        'Prompt Required',
        'Please enter a prompt describing the post you want to generate.'
      );
      return;
    }
    setErrors((prev) => ({ ...prev, aiPrompt: '' }));

    const activeRefImage = aiRefImage;
    let selectedReferenceObjects: ReferenceDetectedObject[] = [];

    if (activeRefImage) {
      selectedReferenceObjects =
        aiReferenceManualObjects.length > 0
          ? aiReferenceManualObjects
          : aiReferenceDetectedObjects.filter((obj) =>
              aiReferenceSelectedObjectIds.includes(obj.id)
            );

      if (selectedReferenceObjects.length === 0) {
        Alert.alert(
          'Object Selection Required',
          'Please select or mark at least one object before generating.'
        );
        return;
      }
    }

    setAiGenerating(true);
    try {
      const payload: any = {
        prompt: trimmedPrompt,
        provider: aiProvider,
        platform: selectedPlatforms[0] || 'facebook',
        tone: 'professional',
        language: 'en',
        variants_count: 1,
      };

      if (activeRefImage) {
        payload.reference_image = activeRefImage;
        if (aiReferencePrompt.trim()) {
          payload.reference_prompt = aiReferencePrompt.trim();
        }
        payload.reference_objects = selectedReferenceObjects;
      }

      const res = await generateSocialMediaPost(payload);
      const postsList = Array.isArray(res?.posts)
        ? res.posts
        : Array.isArray(res?.data?.posts)
          ? res.data.posts
          : Array.isArray(res)
            ? res
            : [];
      const generatedPost = postsList[0] || res?.posts?.[0] || res?.data?.posts?.[0] || res;

      if (!generatedPost || (postsList.length === 0 && !res)) {
        throw new Error('No content generated. Try again.');
      }

      const genTitle = generatedPost?.title || trimmedPrompt;
      const genCaption = generatedPost?.caption || generatedPost?.post_content || '';
      const genHashtags = generatedPost?.hashtags || [];
      const genImageUrl = generatedPost?.image_url || generatedPost?.image || '';

      const mainResult = {
        id: String(generatedPost?.id || generatedPost?._id || 'opt-1'),
        title: genTitle,
        caption: genCaption,
        hashtags: Array.isArray(genHashtags) ? genHashtags : [],
        image_url: genImageUrl,
        variant_name: generatedPost?.variant_name || 'Option 1',
      };

      setAiResult(mainResult);
      if (postsList.length > 0) {
        setAiGeneratedPosts(postsList);
      } else {
        setAiGeneratedPosts([mainResult]);
      }
      setAiVariantModalOpen(true);
    } catch (err: any) {
      Alert.alert('AI Generation Error', err.message || 'Failed to generate post using AI.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Apply AI Content into Form (Used when user clicks "Use" in AI Variant Modal)
  const applyAiContent = (postToApply?: Record<string, any>) => {
    const target: any = postToApply || aiResult;
    if (!target) return;

    const rawPlatform = String(target.platform || selectedPlatforms[0] || 'facebook').toLowerCase();
    const platform = SOCIAL_PLATFORMS.some((p) => p.id === rawPlatform) ? rawPlatform : 'facebook';

    const targetTitle = String(target.title || target.variant_name || title || 'AI Generated Post');
    const targetCaption = String(target.caption || '');
    const hashtags = Array.isArray(target.hashtags)
      ? target.hashtags.map((t: string) => String(t).trim().replace(/^#/, ''))
      : typeof target.hashtags === 'string'
        ? target.hashtags.split(',').map((t: string) => t.trim().replace(/^#/, ''))
        : [];

    setTitle(targetTitle);
    setCaption(targetCaption);
    if (hashtags.length > 0) {
      setHashtagsInput(hashtags.join(', '));
    }

    const imgToUse = String(target.image_url || target.image || imageUrl || '').trim();
    if (imgToUse) {
      setImageUrl(imgToUse);
      setImagePath(imgToUse);
      setErrors((prev) => ({ ...prev, imageUrl: '' }));
    }

    if (target.company_name) setCompanyName(target.company_name);
    if (target.company_website) setCompanyWebsite(target.company_website);
    if (target.company_email) setCompanyEmail(target.company_email);
    if (target.company_phone) setCompanyPhone(target.company_phone);

    if (!selectedPlatforms.includes(platform)) {
      setSelectedPlatforms([platform]);
    }

    // Populate platform specific entries for manual posting tab
    handlePlatformSpecificChange(platform, '', 'caption', targetCaption);
    if (imgToUse) {
      handlePlatformSpecificChange(platform, '', 'mediaUrl', imgToUse);
    }
    if (hashtags.length > 0) {
      handlePlatformSpecificChange(platform, '', 'hashtags', hashtags);
    }

    setAiMergedIntoEdit(true);
    if (target._id || target.id) {
      setAiDraftPostId(target._id || target.id);
    }

    setAiVariantModalOpen(false);
    setActiveTab('manual');
    Alert.alert(
      'Applied to Manual Post!',
      'AI content, image, and hashtags have been populated into the Manual Post tab.'
    );
  };

  // AI Refine Content Handler (Refine / Regenerate)
  const handleAiRefine = async () => {
    const trimmed = aiRefinePrompt.trim();
    if (!trimmed) {
      Alert.alert('Refine Prompt Required', 'Please describe how you want to refine the content.');
      return;
    }
    const existingCaption =
      caption || (aiGeneratedPosts.length > 0 ? String(aiGeneratedPosts[0].caption || '') : '');
    const previousPrompt = aiPrompt.trim();
    const contextCaption = existingCaption || (aiResult ? String(aiResult.caption || '') : '');

    const refinedPrompt = contextCaption
      ? `Improve this social media post based on the following feedback: "${trimmed}"\n\nOriginal caption: "${contextCaption.slice(
          0,
          300
        )}"\n\nProvide an enhanced version with better engagement.`
      : `${
          previousPrompt ? `Original request: "${previousPrompt}". ` : ''
        }User feedback: "${trimmed}". Generate a social media post based on this.`;

    setAiGenerating(true);
    try {
      const result = await generateSocialMediaPost({
        prompt: refinedPrompt,
        provider: aiProvider,
        platform: selectedPlatforms[0] || 'facebook',
        tone: 'professional',
        language: 'en',
        variants_count: 1,
        reference_image: aiRefImage || undefined,
      });
      const postsList = Array.isArray(result?.posts)
        ? result.posts
        : Array.isArray(result?.data?.posts)
          ? result.data.posts
          : Array.isArray(result)
            ? result
            : [];
      if (postsList.length === 0) {
        throw new Error('No refined content generated. Try a different approach.');
      }

      setAiGeneratedPosts(postsList);
      setAiResult(postsList[0]);
      setAiVariantModalOpen(true);
      setAiRefinePanelOpen(false);
      setAiRefinePrompt('');
      Alert.alert('Refined!', `Generated ${postsList.length} refined variation!`);
    } catch (err: any) {
      Alert.alert('Refine Error', err.message || 'Refinement failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  // AI Image-Only Regeneration Handler
  const handleAiRegenerateImage = async () => {
    const activeCaption =
      caption ||
      (aiGeneratedPosts.length > 0 ? String(aiGeneratedPosts[0].caption || '') : '') ||
      aiPrompt;
    if (!activeCaption.trim()) {
      Alert.alert(
        'Caption Required',
        'No caption available. Please add content before regenerating image.'
      );
      return;
    }
    const activeRefImg = aiRefImage;
    setAiRegeneratingImage(true);
    try {
      let newImageUrl = '';
      if (activeRefImg) {
        const res = await generateMarketingImageFromReference(activeRefImg, {
          prompt: `Generate a fresh branded social image for: ${activeCaption.slice(0, 200)}`,
          provider: aiProvider,
          company_name: companyName,
          company_website: companyWebsite,
          company_email: companyEmail,
          reference_objects:
            aiReferenceManualObjects.length > 0 ? aiReferenceManualObjects : undefined,
        });
        newImageUrl =
          res?.imageUrl ||
          res?.url ||
          res?.image_url ||
          res?.data?.imageUrl ||
          res?.data?.url ||
          '';
      } else {
        const imagePrompt = `Generate a fresh, high-quality social media image for this post: "${activeCaption.slice(
          0,
          200
        )}"`;
        const result = await generateSocialMediaPost({
          prompt: imagePrompt,
          provider: aiProvider,
          platform: selectedPlatforms[0] || 'facebook',
        });
        const postsList = Array.isArray(result?.posts)
          ? result.posts
          : Array.isArray(result?.data?.posts)
            ? result.data.posts
            : [];
        newImageUrl =
          postsList[0]?.image_url ||
          postsList[0]?.image ||
          result?.image_url ||
          result?.image ||
          '';
      }

      if (newImageUrl) {
        setAiGeneratedPosts((prev) =>
          prev.map((p, idx) =>
            idx === 0 ? { ...p, image_url: newImageUrl, image: newImageUrl } : p
          )
        );
        setAiResult((prev) => (prev ? { ...prev, image_url: newImageUrl } : null));
        setImageUrl(newImageUrl);
        setImagePath(newImageUrl);
        Alert.alert('Success', 'New image generated successfully!');
      } else {
        Alert.alert('Warning', 'AI did not return a new image. Try refining your prompt.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Image regeneration failed.');
    } finally {
      setAiRegeneratingImage(false);
    }
  };

  // Download Filename Helper (Matches control-panel reference)
  const getBaseFilename = (promptStr: string, labelStr: string) => {
    let topic = (promptStr || '').toLowerCase();
    for (let i = 0; i < 5; i++) {
      const original = topic;
      topic = topic
        .replace(/^(generate|create|write|make|design|give\s+me|show\s+me)\b/, '')
        .replace(/^(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/, '')
        .replace(
          /^(posts?|variations?|options?|versions?|images?|ideas?|captions?|copies|drafts?|results?)\b/,
          ''
        )
        .replace(/^(for|about|of|on|to|with)\b/, '')
        .replace(/^(a|an|the|new)\b/, '')
        .trim();
      if (topic === original) break;
    }
    topic = topic.replace(/\b(of|new|a|an|the)\b/g, ' ');
    let slug = topic.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (slug.length > 50) {
      slug = slug.substring(0, 50).replace(/-+$/, '');
    }
    if (!slug) slug = 'post';
    const numMatch = (labelStr || '').match(/\d+/);
    const postNum = numMatch ? numMatch[0] : '1';
    return `${slug}-post-${postNum}`;
  };

  // Copy Content & Hashtags to Clipboard
  const copyPostContent = async (post: Record<string, any>) => {
    const caption = String(post.caption || '');
    const allHashtags = Array.isArray(post.hashtags)
      ? post.hashtags.map((t: string) => `#${t.replace(/^#/, '')}`).join(' ')
      : typeof post.hashtags === 'string'
        ? post.hashtags
            .split(',')
            .map((t: string) => `#${t.trim().replace(/^#/, '')}`)
            .join(' ')
        : '';
    const fullText = allHashtags ? `${caption}\n\n${allHashtags}` : caption;

    try {
      await Clipboard.setStringAsync(fullText);
      Alert.alert('Success', 'Content & hashtags copied!');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to copy content.');
    }
  };

  // Download Text File Only (.txt)
  const downloadTextContent = async (post: Record<string, any>, label: string) => {
    try {
      const caption = String(post.caption || '');
      const allHashtags = Array.isArray(post.hashtags)
        ? post.hashtags.map((t: string) => `#${t.replace(/^#/, '')}`).join(' ')
        : typeof post.hashtags === 'string'
          ? post.hashtags
              .split(',')
              .map((t: string) => `#${t.trim().replace(/^#/, '')}`)
              .join(' ')
          : '';
      const fullText = allHashtags ? `${caption}\n\n${allHashtags}` : caption;

      const filenameBase = getBaseFilename(aiPrompt, label);

      if (Platform.OS === 'web' || typeof document !== 'undefined') {
        const txtBlob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
        const txtUrl = URL.createObjectURL(txtBlob);
        const txtLink = document.createElement('a');
        txtLink.href = txtUrl;
        txtLink.download = `${filenameBase}.txt`;
        document.body.appendChild(txtLink);
        txtLink.click();
        document.body.removeChild(txtLink);
        URL.revokeObjectURL(txtUrl);
      } else if (Platform.OS === 'android') {
        // Ask the user to pick a destination folder (one-time per session, not a share sheet)
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          Alert.alert('Permission needed', 'Please allow folder access to save the file.');
          return;
        }

        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filenameBase,
          'text/plain'
        );

        await FileSystem.writeAsStringAsync(fileUri, fullText, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      } else {
        // iOS has no direct-write API; write to cache as a fallback
        const txtUri = `${FileSystem.cacheDirectory}${filenameBase}.txt`;
        await FileSystem.writeAsStringAsync(txtUri, fullText, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      Alert.alert('Success', `${label} caption downloaded successfully!`);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', `Failed to download text content.\n\n${err?.message || err}`);
    }
  };

  // Download Single Post (Image + Text) - Exact Panel Implementation
  const downloadPost = async (post: Record<string, any>, label: string) => {
    const postId = String(post.id || post._id || label);
    if (downloadingPostIds.has(postId)) return;

    setDownloadingPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });

    try {
      const filenameBase = getBaseFilename(aiPrompt, label);

      // 1. Download image if it exists
      const img = String(post.image_url || post.image || post.imageUrl || '').trim();
      let savedImageUri: string | null = null;

      if (img) {
        const url = getImageUrl(img) || img;
        const extension = url.toLowerCase().includes('.png') ? 'png' : 'jpg';
        const localUri = `${FileSystem.cacheDirectory}${filenameBase}.${extension}`;

        const downloadResult = await FileSystem.downloadAsync(url, localUri);
        if (downloadResult.status === 200) {
          savedImageUri = downloadResult.uri;

          // Save to device gallery
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(savedImageUri);
          }
        }
      }

      // 2. Build caption + hashtags text
      const caption = String(post.caption || '');
      const allHashtags = Array.isArray(post.hashtags)
        ? post.hashtags.map((t: string) => `#${t.replace(/^#/, '')}`).join(' ')
        : typeof post.hashtags === 'string'
          ? post.hashtags
              .split(',')
              .map((t: string) => `#${t.trim().replace(/^#/, '')}`)
              .join(' ')
          : '';
      const fullText = allHashtags ? `${caption}\n\n${allHashtags}` : caption;

      // 3. Write text file (text can't go to MediaLibrary)
      const txtUri = `${FileSystem.cacheDirectory}${filenameBase}.txt`;
      await FileSystem.writeAsStringAsync(txtUri, fullText, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      Alert.alert('Success', `Successfully downloaded ${label}!`);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', `Failed to download ${label}. Please try again.`);
    } finally {
      setDownloadingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  // Download All Variations (Batch Download)
  const downloadAllPosts = async () => {
    if (downloadingAll) return;
    setDownloadingAll(true);

    try {
      const listToDownload =
        aiGeneratedPosts.length > 0 ? aiGeneratedPosts : aiResult ? [aiResult] : [];

      const { status } = await MediaLibrary.requestPermissionsAsync();

      for (let i = 0; i < listToDownload.length; i++) {
        const post = listToDownload[i];
        const label = String(post.variant_name || `Option ${i + 1}`);
        const filenameBase = getBaseFilename(aiPrompt, label);

        // 1. Download image if it exists
        const img = String(post.image_url || post.image || post.imageUrl || '').trim();
        if (img) {
          const url = getImageUrl(img) || img;
          const extension = url.toLowerCase().includes('.png') ? 'png' : 'jpg';
          const localUri = `${FileSystem.cacheDirectory}${filenameBase}.${extension}`;

          const downloadResult = await FileSystem.downloadAsync(url, localUri);
          if (downloadResult.status === 200 && status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
          }
        }

        // 2. Write caption + hashtags as .txt file (saved to cache; not shared individually in bulk mode)
        const caption = String(post.caption || '');
        const allHashtags = Array.isArray(post.hashtags)
          ? post.hashtags.map((t: string) => `#${t.replace(/^#/, '')}`).join(' ')
          : typeof post.hashtags === 'string'
            ? post.hashtags
                .split(',')
                .map((t: string) => `#${t.trim().replace(/^#/, '')}`)
                .join(' ')
            : '';
        const fullText = allHashtags ? `${caption}\n\n${allHashtags}` : caption;

        const txtUri = `${FileSystem.cacheDirectory}${filenameBase}.txt`;
        await FileSystem.writeAsStringAsync(txtUri, fullText, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      Alert.alert(
        'Success',
        'All variations downloaded successfully! Images saved to gallery, captions saved to app storage.'
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to download all variations.');
    } finally {
      setDownloadingAll(false);
    }
  };

  const resetAiReferenceAnalysis = () => {
    setAiReferenceDetectedObjects([]);
    setAiReferenceSelectedObjectIds([]);
    setAiReferenceManualObjects([]);
    setAiRefAnalysisSummary('');
    setAiRefAnalysisStatus('idle');
  };

  const runAiReferenceAnalysis = async (fileUri: string) => {
    if (!fileUri) return;
    try {
      setAiRefAnalysisStatus('loading');
      setAiAnalyzingRef(true);
      const result = await analyzeReferenceMedia(fileUri);
      const detectedObjects: ReferenceDetectedObject[] =
        result?.detected_objects || result?.data?.detected_objects || [];
      const summary: string = result?.summary || result?.data?.summary || '';

      setAiReferenceDetectedObjects(detectedObjects);
      setAiReferenceSelectedObjectIds(detectedObjects.map((obj) => obj.id));
      setAiRefAnalysisSummary(summary);
      setAiRefAnalysisStatus(detectedObjects.length > 0 ? 'ready' : 'error');

      if (detectedObjects.length === 0) {
        Alert.alert(
          'Notice',
          'No clear objects were detected. Please upload a sharper reference image.'
        );
      }
    } catch (error: any) {
      setAiRefAnalysisStatus('error');
      setAiReferenceDetectedObjects([]);
      setAiReferenceSelectedObjectIds([]);
      setAiRefAnalysisSummary('');
    } finally {
      setAiAnalyzingRef(false);
    }
  };

  // Mark Object Image URI State
  const [markObjectImageUri, setMarkObjectImageUri] = useState<string>('');

  // Reference Image Picker Handler
  const pickReferenceImage = async (target?: 'ai' | 'manual') => {
    const t = target || activeTab;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: (ImagePicker as any).MediaType?.Images || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (t === 'ai') {
          setAiRefImage(uri);
          resetAiReferenceAnalysis();
          runAiReferenceAnalysis(uri);
        } else {
          setReferenceImageUri(uri);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to pick reference image from gallery.');
    }
  };

  // Reference Image Camera Capture Handler
  const takeReferenceImage = async (target?: 'ai' | 'manual') => {
    const t = target || activeTab;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is needed to take photos. Please enable it in settings.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: (ImagePicker as any).MediaType?.Images || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (t === 'ai') {
          setAiRefImage(uri);
          resetAiReferenceAnalysis();
          runAiReferenceAnalysis(uri);
        } else {
          setReferenceImageUri(uri);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to capture reference image from camera.');
    }
  };

  // Image Source Picker for Reference Image (Gallery / Camera)
  const showReferenceImagePicker = (target?: 'ai' | 'manual') => {
    const t = target || activeTab;
    Alert.alert('Select Reference Image Source', 'Choose an option', [
      { text: 'Gallery', onPress: () => pickReferenceImage(t) },
      { text: 'Camera', onPress: () => takeReferenceImage(t) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // PanResponder for Interactive Touch Object Marking
  const markPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const w = markCanvasLayout.width || 1;
          const h = markCanvasLayout.height || 1;
          const x = Math.min(Math.max(locationX / w, 0), 1);
          const y = Math.min(Math.max(locationY / h, 0), 1);
          setCurrentMarkStroke([{ x, y }]);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const w = markCanvasLayout.width || 1;
          const h = markCanvasLayout.height || 1;
          const x = Math.min(Math.max(locationX / w, 0), 1);
          const y = Math.min(Math.max(locationY / h, 0), 1);
          setCurrentMarkStroke((prev) => {
            const last = prev[prev.length - 1];
            if (last && Math.abs(last.x - x) < 0.003 && Math.abs(last.y - y) < 0.003) {
              return prev;
            }
            return [...prev, { x, y }];
          });
        },
        onPanResponderRelease: () => {
          setCurrentMarkStroke((current) => {
            if (current.length > 1) {
              setMarkStrokes((prev) => [...prev, current]);
            }
            return [];
          });
        },
        onPanResponderTerminate: () => {
          setCurrentMarkStroke((current) => {
            if (current.length > 1) {
              setMarkStrokes((prev) => [...prev, current]);
            }
            return [];
          });
        },
      }),
    [markCanvasLayout, setCurrentMarkStroke, setMarkStrokes]
  );

  const strokeToSvgPath = (stroke: { x: number; y: number }[]) =>
    stroke
      .map(
        (p, index) =>
          `${index === 0 ? 'M' : 'L'} ${(p.x * 100).toFixed(2)} ${(p.y * 100).toFixed(2)}`
      )
      .join(' ');

  // Clear Reference Image & Associated Data
  const handleClearReferenceImage = (target?: 'ai' | 'manual') => {
    const t = target || activeTab;
    if (t === 'ai') {
      setAiRefImage('');
      setAiMarketingImageUrl('');
      setAiReferencePrompt('');
      resetAiReferenceAnalysis();
    } else {
      setReferenceImageUri('');
      setAiMarketingImageUrl('');
      setReferenceImagePrompt('');
    }
    setMarkStrokes([]);
    setCurrentMarkStroke([]);
    setMarkObjectLabel('');
    setMarkObjectModalOpen(false);
  };

  // Open Object Marking Modal
  const openMarkObjectModal = (explicitUri?: string) => {
    const targetUri = explicitUri || (activeTab === 'ai' ? aiRefImage : referenceImageUri);
    if (!targetUri) {
      Alert.alert('Reference Image Needed', 'Please attach a reference image first.');
      return;
    }
    setMarkObjectImageUri(targetUri);
    setMarkStrokes([]);
    setCurrentMarkStroke([]);
    setMarkObjectLabel('');
    setMarkObjectModalOpen(true);
  };

  // Save Manual Object Mark
  const handleSaveObjectMark = () => {
    const allStrokes = [
      ...markStrokes,
      ...(currentMarkStroke.length > 1 ? [currentMarkStroke] : []),
    ];
    const points = allStrokes.flat();
    if (points.length < 2) {
      Alert.alert(
        'Selection Required',
        'Please trace or draw a region over an object on the image.'
      );
      return;
    }

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const width = Math.max(maxX - minX, 0.02);
    const height = Math.max(maxY - minY, 0.02);
    const nextIdx = aiReferenceManualObjects.length + 1;
    const label = markObjectLabel.trim() || `Marked Object ${nextIdx}`;

    const newObject: ReferenceDetectedObject = {
      id: `manual-${Date.now()}-${nextIdx}`,
      label,
      confidence: 1,
      bbox: { x: minX, y: minY, width, height },
      description: 'Manually marked selection',
    };

    setAiReferenceManualObjects((prev) => [...prev, newObject]);
    setMarkStrokes([]);
    setCurrentMarkStroke([]);
    setMarkObjectLabel('');
    setMarkObjectModalOpen(false);
    Alert.alert('Success', `Object "${label}" marked successfully!`);
  };

  // Remove Marked Object
  const handleRemoveManualObjectMark = (objectId: string) => {
    setAiReferenceManualObjects((prev) => prev.filter((obj) => obj.id !== objectId));
  };

  // Crop Reference Image Handler
  const handleCropReferenceImage = async (target?: 'ai' | 'manual') => {
    const t = target || activeTab;
    const targetUri = t === 'ai' ? aiRefImage : referenceImageUri;
    if (!targetUri) {
      Alert.alert('Reference Image Needed', 'Please attach a reference image first.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: (ImagePicker as any).MediaType?.Images || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const croppedUri = result.assets[0].uri;
        if (t === 'ai') {
          setAiRefImage(croppedUri);
          resetAiReferenceAnalysis();
          runAiReferenceAnalysis(croppedUri);
        } else {
          setReferenceImageUri(croppedUri);
        }
        Alert.alert('Success', 'Reference image cropped successfully!');
      }
    } catch {
      Alert.alert('Error', 'Failed to crop reference image.');
    }
  };

  // AI Marketing Image from Reference Handler
  const handleGenerateAiMarketingImage = async (customUri?: string): Promise<void> => {
    const imgUri = customUri || referenceImageUri;
    if (!imgUri) {
      Alert.alert('Reference Image Needed', 'Please attach a reference image first.');
      return;
    }
    setAiMarketingGenerating(true);
    try {
      const res = await generateMarketingImageFromReference(imgUri, {
        prompt: referenceImagePrompt || aiPrompt,
        company_name: companyName,
        company_website: companyWebsite,
        company_email: companyEmail,
        provider: referenceImageProvider || aiProvider,
        reference_objects:
          aiReferenceManualObjects.length > 0 ? aiReferenceManualObjects : undefined,
      });
      const generatedUrl =
        res?.imageUrl || res?.url || res?.image_url || res?.data?.imageUrl || res?.data?.url;
      if (generatedUrl) {
        setAiMarketingImageUrl(generatedUrl);
        setImageUrl(generatedUrl);
        Alert.alert('Success', 'AI Marketing Image generated and applied to post!');
      } else {
        Alert.alert('AI Image Generation', 'Image generation completed successfully.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate AI marketing image.');
    } finally {
      setAiMarketingGenerating(false);
    }
  };

  // AI Reference Media Analysis Handler
  const handleAnalyzeReferenceMedia = async () => {
    if (!aiRefImage) {
      Alert.alert('Reference Image Needed', 'Please attach a reference image first.');
      return;
    }
    setAiAnalyzingRef(true);
    try {
      const res = await analyzeReferenceMedia(aiRefImage);
      const summary =
        res?.summary ||
        res?.data?.summary ||
        res?.message ||
        'Reference media analyzed successfully.';
      setAiRefAnalysisSummary(summary);
      if (summary) {
        setAiPrompt((prev) =>
          prev
            ? `${prev}\n\n[Reference Analysis: ${summary}]`
            : `Create a post based on reference media: ${summary}`
        );
      }
      Alert.alert('Analysis Complete', summary);
    } catch (err: any) {
      Alert.alert('Analysis Error', err.message || 'Failed to analyze reference media.');
    } finally {
      setAiAnalyzingRef(false);
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required.';
    } else if (companyName.trim().length > 100) {
      newErrors.companyName = 'Company name cannot exceed 100 characters.';
    }
    if (title.trim().length > 150) {
      newErrors.title = 'Title cannot exceed 150 characters.';
    }
    if (!caption.trim()) {
      newErrors.caption = 'Caption is required.';
    } else if (caption.trim().length > 2200) {
      newErrors.caption = 'Caption cannot exceed 2200 characters.';
    }
    if (!imageUrl) {
      newErrors.imageUrl = 'Image is required.';
    }
    if (companyWebsite.trim()) {
      if (!/^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/.*)?$/i.test(companyWebsite.trim())) {
        newErrors.companyWebsite = 'Please enter a valid URL (e.g. https://example.com).';
      } else if (companyWebsite.trim().length > 500) {
        newErrors.companyWebsite = 'Website URL cannot exceed 500 characters.';
      }
    }
    if (hashtagsInput.trim().length > 300) {
      newErrors.hashtagsInput = 'Hashtags cannot exceed 300 characters.';
    }
    if (selectedPlatforms.length === 0) {
      newErrors.platforms = 'Select at least one social platform.';
    }
    if (socialAccounts.length > 0 && selectedAccounts.length === 0) {
      newErrors.selectedAccounts = 'Please select at least one connected social account.';
    }
    if (isScheduled && scheduledDate < new Date()) {
      newErrors.schedule = 'Scheduled date/time must be in the future.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save / Publish Post
  const handleSavePost = async (targetStatus?: 'draft' | 'published' | 'scheduled') => {
    const isValid = validateForm();
    if (!isValid) {
      scrollToTop();
      return;
    }

    setSaving(true);
    try {
      const hashtagsArray = hashtagsInput
        .split(',')
        .map((h) => h.trim().replace(/^#/, ''))
        .filter(Boolean);

      const isDraft = targetStatus === 'draft';
      const finalStatus = isDraft
        ? 'draft'
        : targetStatus === 'published'
          ? 'publishing'
          : targetStatus === 'scheduled' || isScheduled
            ? 'scheduled'
            : postStatus || 'draft';

      // Group flat selectedAccounts -> { facebook: ['acc1'], instagram: ['acc2'] }
      const selectedAccountsObject: Record<string, string[]> = {};
      selectedAccounts.forEach((accId) => {
        let platform = '';
        const acc = socialAccounts.find((a) => a.account_id === accId);
        if (acc) {
          platform = acc.platform;
        }
        if (platform && selectedPlatforms.includes(platform)) {
          if (!selectedAccountsObject[platform]) selectedAccountsObject[platform] = [];
          selectedAccountsObject[platform].push(accId);
        }
      });

      const formatWebsiteUrl = (urlStr?: string) => {
        if (!urlStr || !urlStr.trim()) return undefined;
        const trimmed = urlStr.trim();
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
      };

      const formattedWebsite = formatWebsiteUrl(companyWebsite);

      // Build platformSpecificContent
      const platformSpecificContentObj: Record<string, any[]> = {};
      selectedPlatforms.forEach((platform) => {
        const platformAccs = socialAccounts.filter(
          (a) =>
            isPlatformMatch(a.platform, platform) &&
            selectedAccounts.includes(a.account_id || a.value || a.id || a._id)
        );
        const existingEntries = platformSpecificContent[platform] || [];
        const override = platformOverrides[platform] || {};

        if (platformAccs.length > 0) {
          platformSpecificContentObj[platform] = platformAccs.map((acc) => {
            const accId = acc.account_id || acc.value || acc.id || acc._id;
            const item = existingEntries.find((e: any) => e.account_id === accId) || {};

            const itemContentType =
              item.contentType || override.contentType || contentTypeOverrides[platform] || 'media';
            const itemCaption =
              item.caption !== undefined ? item.caption : override.caption || caption || '';
            const itemLink = formatWebsiteUrl(item.link || override.link) || formattedWebsite || '';
            const itemHashtags =
              item.hashtags && item.hashtags.length > 0
                ? item.hashtags
                : override.hashtags && override.hashtags.length > 0
                  ? override.hashtags
                  : hashtagsArray;
            const itemMediaUrl =
              item.mediaUrl !== undefined
                ? item.mediaUrl
                : override.image_url !== undefined
                  ? override.image_url
                  : imageUrl || '';

            return {
              account_id: accId,
              caption: itemCaption,
              link: itemLink,
              hashtags: itemHashtags,
              mediaUrl: itemMediaUrl,
              contentType: itemContentType,
              post_status: finalStatus,
            };
          });
        } else {
          const item = existingEntries[0] || {};
          const itemContentType =
            item.contentType || override.contentType || contentTypeOverrides[platform] || 'media';
          const itemCaption =
            item.caption !== undefined ? item.caption : override.caption || caption || '';
          const itemLink = formatWebsiteUrl(item.link || override.link) || formattedWebsite || '';
          const itemHashtags =
            item.hashtags && item.hashtags.length > 0
              ? item.hashtags
              : override.hashtags && override.hashtags.length > 0
                ? override.hashtags
                : hashtagsArray;
          const itemMediaUrl =
            item.mediaUrl !== undefined
              ? item.mediaUrl
              : override.image_url !== undefined
                ? override.image_url
                : imageUrl || '';

          platformSpecificContentObj[platform] = [
            {
              account_id: '',
              caption: itemCaption,
              link: itemLink,
              hashtags: itemHashtags,
              mediaUrl: itemMediaUrl,
              contentType: itemContentType,
              post_status: finalStatus,
            },
          ];
        }
      });

      const payload: any = {
        isDraft,
        title: title || caption.slice(0, 30) || 'Untitled Post',
        company_name: companyName || '',
        company_email: companyEmail || '',
        company_phone: companyPhone || '',
        company_website: formattedWebsite || '',
        caption,
        hashtags: hashtagsArray,
        selectedNetworks: selectedPlatforms,
        selectedAccounts: selectedAccountsObject,
        image_url: imageUrl || undefined,
        image_path: imagePath || imageUrl || undefined,
        generalContent: {
          caption,
          link: formattedWebsite || '',
          media: imageUrl
            ? [
                {
                  type: 'image',
                  url: imageUrl,
                  imagePath: imagePath || imageUrl,
                },
              ]
            : [],
        },
        platformSpecificContent: platformSpecificContentObj,
        post_status: finalStatus,
        ...((targetStatus === 'scheduled' || isScheduled) && {
          scheduled_at: scheduledDate.toISOString(),
          isScheduled: true,
        }),
      };

      if (isEditing && id) {
        const res = await updatePost(id, payload);
        if (
          res &&
          (res.success === false ||
            (res.code && res.code !== 200 && res.code !== 201) ||
            (res.statusCode && res.statusCode >= 400))
        ) {
          throw new Error(res.message || 'Failed to update post');
        }
        Alert.alert('Success', 'Post updated successfully!', [
          { text: 'OK', onPress: () => router.push('/pages/posts/posts') },
        ]);
      } else {
        const created = await createPost(payload);
        if (
          created &&
          (created.success === false ||
            (created.code && created.code !== 200 && created.code !== 201) ||
            (created.statusCode && created.statusCode >= 400))
        ) {
          throw new Error(created.message || 'Failed to create post');
        }
        Alert.alert('Success', 'Post created successfully!', [
          { text: 'OK', onPress: () => router.push('/pages/posts/posts') },
        ]);
      }

      router.push('/pages/posts/posts');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  };

  // ── Account & Platform Selection Handlers (Panel Reference Logic) ──
  const isPlatformMatch = (accPlatform?: string, platId?: string) => {
    if (!accPlatform || !platId) return false;
    const p1 = accPlatform.toLowerCase().trim();
    const p2 = platId.toLowerCase().trim();
    if (p1 === p2) return true;
    if ((p1 === 'twitter' || p1 === 'x') && (p2 === 'twitter' || p2 === 'x')) return true;
    if (
      (p1 === 'google' || p1 === 'google_business') &&
      (p2 === 'google' || p2 === 'google_business')
    )
      return true;
    return false;
  };

  const openNetworksModal = async () => {
    await fetchAndSetSocialAccounts();
    setNetworksModalOpen(true);
  };

  const syncPlatformSpecificContent = (accounts: string[], platforms: string[]) => {
    setPlatformSpecificContent((prev) => {
      const nextContent: Record<string, any[]> = {};
      platforms.forEach((platform) => {
        const platformAccs = socialAccounts.filter(
          (a) =>
            isPlatformMatch(a.platform, platform) &&
            accounts.includes(a.account_id || a.value || a.id || a._id)
        );

        const existingEntries = prev[platform] || [];
        const override = platformOverrides[platform] || {};

        if (platformAccs.length > 0) {
          nextContent[platform] = platformAccs.map((acc) => {
            const accId = acc.account_id || acc.value || acc.id || acc._id;
            const existing = existingEntries.find((item: any) => item.account_id === accId);
            if (existing) return existing;

            return {
              account_id: accId,
              caption: override.caption || caption || '',
              hashtags:
                override.hashtags && override.hashtags.length > 0
                  ? override.hashtags
                  : hashtagsInput
                    ? hashtagsInput
                        .split(',')
                        .map((t) => t.trim().replace(/^#/, ''))
                        .filter(Boolean)
                    : [],
              link: override.link || companyWebsite || '',
              mediaUrl:
                override.image_url !== undefined ? override.image_url : imageUrl || imagePath || '',
              contentType: override.contentType || contentTypeOverrides[platform] || 'media',
            };
          });
        } else {
          const existing = existingEntries[0];
          nextContent[platform] = [
            existing || {
              account_id: '',
              caption: override.caption || caption || '',
              hashtags:
                override.hashtags && override.hashtags.length > 0
                  ? override.hashtags
                  : hashtagsInput
                    ? hashtagsInput
                        .split(',')
                        .map((t) => t.trim().replace(/^#/, ''))
                        .filter(Boolean)
                    : [],
              link: override.link || companyWebsite || '',
              mediaUrl:
                override.image_url !== undefined ? override.image_url : imageUrl || imagePath || '',
              contentType: override.contentType || contentTypeOverrides[platform] || 'media',
            },
          ];
        }
      });
      return nextContent;
    });
  };

  const handleAccountSelection = (accounts: string[], customPlatforms?: string[]) => {
    setSelectedAccounts(accounts);
    // Derive selectedPlatforms from selectedAccounts
    const derivedPlatforms = Array.from(
      new Set(
        accounts
          .map((accId) => {
            const acc = socialAccounts.find(
              (a) => (a.account_id || a.value || a.id || a._id) === accId
            );
            return acc?.platform;
          })
          .filter(Boolean) as string[]
      )
    );
    // Keep platforms that have selected accounts, plus manual platform selections if no connected accounts exist for them
    const currentPlatforms = customPlatforms || selectedPlatforms;
    const manualOnlyPlatforms = currentPlatforms.filter(
      (p) => !socialAccounts.some((a) => isPlatformMatch(a.platform, p))
    );
    const nextPlatforms = Array.from(new Set([...derivedPlatforms, ...manualOnlyPlatforms]));
    setSelectedPlatforms(nextPlatforms);
    syncPlatformSpecificContent(accounts, nextPlatforms);
  };

  const togglePlatform = (pId: string) => {
    const platformAccounts = socialAccounts.filter((a) => isPlatformMatch(a.platform, pId));
    if (platformAccounts.length === 0) {
      const nextPlatforms = selectedPlatforms.includes(pId)
        ? selectedPlatforms.filter((x) => x !== pId)
        : [...selectedPlatforms, pId];
      setSelectedPlatforms(nextPlatforms);
      syncPlatformSpecificContent(selectedAccounts, nextPlatforms);
      return;
    }

    const platformAccIds = platformAccounts.map((a) => a.account_id || a.value || a.id || a._id);
    const allSelected = platformAccIds.every((id) => selectedAccounts.includes(id));

    let updatedAccounts: string[];
    if (allSelected) {
      updatedAccounts = selectedAccounts.filter((id) => !platformAccIds.includes(id));
    } else {
      const toAdd = platformAccIds.filter((id) => !selectedAccounts.includes(id));
      updatedAccounts = [...selectedAccounts, ...toAdd];
    }
    handleAccountSelection(updatedAccounts);
  };

  const handleDeleteNetwork = (pId: string) => {
    const platformAccounts = socialAccounts.filter((a) => isPlatformMatch(a.platform, pId));
    if (platformAccounts.length === 0) {
      const nextPlatforms = selectedPlatforms.filter((x) => x !== pId);
      setSelectedPlatforms(nextPlatforms);
      syncPlatformSpecificContent(selectedAccounts, nextPlatforms);
      return;
    }
    const platformAccIds = platformAccounts.map((a) => a.account_id || a.value || a.id || a._id);
    const updatedAccounts = selectedAccounts.filter((id) => !platformAccIds.includes(id));
    handleAccountSelection(updatedAccounts);
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#0052d4" />
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading Post Editor...</Text>
      </Box>
    );
  }

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <LinearGradient
        colors={['#1e3a8a', '#2563eb', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerGlowCircle1} />
        <View style={styles.headerGlowCircle2} />

        <Box className="px-5 pb-3 pt-12">
          <HStack className="mb-2 items-center justify-between">
            <TouchableOpacity
              onPress={() => router.push('/pages/posts/posts')}
              style={styles.backBtn}
              activeOpacity={0.85}
            >
              <HStack className="items-center space-x-1">
                <Feather name="arrow-left" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.backBtnText}>Back</Text>
              </HStack>
            </TouchableOpacity>

            <VStack style={{ alignItems: 'center' }}>
              <Heading size="lg" style={styles.headerTitle}>
                {isEditing ? 'Edit Post' : 'Create Post'}
              </Heading>
              <Text style={styles.headerSubtitle}>
                {isEditing ? 'Update content & schedule' : 'Craft AI or manual social posts'}
              </Text>
            </VStack>

            <TouchableOpacity
              style={styles.headerSaveBtn}
              onPress={() => handleSavePost('published')}
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']}
                style={styles.headerSaveBtnGradient}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={13} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.headerSaveText}>Publish</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </HStack>

          {/* Main Tab Bar (AI Auto Post vs Manual Posting) */}
          <HStack style={styles.mainTabBar} className="mt-3">
            <TouchableOpacity
              style={[styles.mainTabBtn, activeTab === 'ai' && styles.mainTabBtnActive]}
              onPress={() => setActiveTab('ai')}
              activeOpacity={0.85}
            >
              <Feather
                name="cpu"
                size={15}
                color={activeTab === 'ai' ? '#2563eb' : 'rgba(255,255,255,0.85)'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.mainTabLabel, activeTab === 'ai' && styles.mainTabLabelActive]}>
                AI Auto Post
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainTabBtn, activeTab === 'manual' && styles.mainTabBtnActive]}
              onPress={() => setActiveTab('manual')}
              activeOpacity={0.85}
            >
              <Feather
                name="edit-3"
                size={15}
                color={activeTab === 'manual' ? '#2563eb' : 'rgba(255,255,255,0.85)'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.mainTabLabel, activeTab === 'manual' && styles.mainTabLabelActive]}
              >
                Manual Posting
              </Text>
            </TouchableOpacity>
          </HStack>
        </Box>
      </LinearGradient>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* TAB 1: AI AUTO POST */}
        {/* ================================================================= */}
        {activeTab === 'ai' && (
          <VStack space="md">
            <Box style={styles.card}>
              <HStack space="xs" className="items-center"></HStack>
              <Text style={styles.cardSub}>
                Describe your post topic or campaign idea, and AI will auto-generate copy, hashtags,
                and format.
              </Text>

              {/* Prompt Input */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>AI Prompt / Campaign Idea *</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.multilineInput,
                    errors.aiPrompt ? styles.inputError : null,
                  ]}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  placeholder="e.g. Write an engaging social post for a 20% weekend discount on summer collection..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                />
                {errors.aiPrompt && <Text style={styles.errorText}>{errors.aiPrompt}</Text>}
              </VStack>

              {/* AI Model Selector */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>Select AI Model</Text>
                <HStack space="xs" className="mt-1">
                  {(['auto', 'gemini', 'openai'] as const).map((prov) => (
                    <TouchableOpacity
                      key={prov}
                      style={[
                        styles.providerChip,
                        aiProvider === prov && styles.providerChipActive,
                        { flexDirection: 'row', alignItems: 'center', gap: 5 },
                      ]}
                      onPress={() => setAiProvider(prov)}
                    >
                      {prov === 'auto' && (
                        <Feather
                          name="zap"
                          size={13}
                          color={aiProvider === prov ? '#0369a1' : '#64748b'}
                        />
                      )}
                      {prov === 'gemini' && (
                        <Ionicons
                          name="sparkles"
                          size={13}
                          color={aiProvider === prov ? '#0369a1' : '#64748b'}
                        />
                      )}
                      {prov === 'openai' && (
                        <Feather
                          name="cpu"
                          size={13}
                          color={aiProvider === prov ? '#0369a1' : '#64748b'}
                        />
                      )}
                      <Text
                        style={[
                          styles.providerChipText,
                          aiProvider === prov && styles.providerChipTextActive,
                        ]}
                      >
                        {prov === 'auto' ? 'Auto' : prov === 'gemini' ? 'Gemini' : 'OpenAI'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>

              {/* Reference Image Attachment */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>
                  Reference Image{' '}
                  <Text style={{ fontWeight: '400', color: '#64748b' }}>
                    (Optional but Recommended)
                  </Text>
                </Text>

                {aiRefImage ? (
                  <VStack space="sm" style={{ marginTop: 6 }}>
                    <Box style={styles.imagePreviewBox}>
                      <Image source={{ uri: aiRefImage }} style={styles.uploadedImage} />
                      <TouchableOpacity
                        onPress={() => handleClearReferenceImage('ai')}
                        style={styles.removeImgBtn}
                      >
                        <Feather name="trash-2" size={16} color="#fff" />
                      </TouchableOpacity>
                    </Box>

                    {/* Action Buttons: Mark Object, Crop Image, Remove */}
                    <HStack space="xs" className="mt-2 flex-wrap gap-2">
                      <TouchableOpacity
                        style={[
                          styles.actionIconBtn,
                          { backgroundColor: '#f0f9ff', borderColor: '#0284c7' },
                        ]}
                        onPress={() => openMarkObjectModal(aiRefImage)}
                      >
                        <Feather name="target" size={14} color="#0284c7" />
                        <Text style={[styles.actionIconBtnText, { color: '#0284c7' }]}>
                          Mark Object
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionIconBtn,
                          { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' },
                        ]}
                        onPress={() => handleCropReferenceImage('ai')}
                      >
                        <Feather name="crop" size={14} color="#475569" />
                        <Text style={[styles.actionIconBtnText, { color: '#475569' }]}>
                          Crop Image
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionIconBtn,
                          { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
                        ]}
                        onPress={() => handleClearReferenceImage('ai')}
                      >
                        <Feather name="trash-2" size={14} color="#ef4444" />
                        <Text style={[styles.actionIconBtnText, { color: '#ef4444' }]}>Remove</Text>
                      </TouchableOpacity>
                    </HStack>

                    {/* Reference Style Guidance Input */}
                    <VStack style={{ marginTop: 10 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#334155',
                          marginBottom: 4,
                        }}
                      >
                        Reference Style Guidance (Optional)
                      </Text>
                      <TextInput
                        style={[styles.input, { fontSize: 13, backgroundColor: '#f8fafc' }]}
                        value={aiReferencePrompt}
                        onChangeText={setAiReferencePrompt}
                        placeholder="e.g. Place the product in a luxury lifestyle setting with soft natural lighting"
                        placeholderTextColor="#94a3b8"
                      />
                    </VStack>

                    {/* Analysis Loading Indicator */}
                    {aiRefAnalysisStatus === 'loading' && (
                      <HStack space="xs" className="mt-2 items-center">
                        <ActivityIndicator size="small" color="#0052d4" />
                        <Text style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>
                          Detecting selectable objects...
                        </Text>
                      </HStack>
                    )}

                    {/* Analysis Summary */}
                    {aiRefAnalysisSummary ? (
                      <Box
                        style={{
                          backgroundColor: '#f0f9ff',
                          padding: 8,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: '#bae6fd',
                          marginTop: 6,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#0369a1', fontWeight: '500' }}>
                          {aiRefAnalysisSummary}
                        </Text>
                      </Box>
                    ) : null}

                    {/* Manually Marked Objects List */}
                    {aiReferenceManualObjects.length > 0 && (
                      <VStack style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
                          Manually marked objects
                        </Text>
                        <HStack space="xs" className="mt-1 flex-wrap gap-1">
                          {aiReferenceManualObjects.map((obj) => (
                            <Box
                              key={obj.id}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#7c3aed',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 16,
                                gap: 6,
                              }}
                            >
                              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>
                                {obj.label}
                              </Text>
                              <TouchableOpacity
                                onPress={() => handleRemoveManualObjectMark(obj.id)}
                              >
                                <Feather name="x" size={13} color="#ffffff" />
                              </TouchableOpacity>
                            </Box>
                          ))}
                        </HStack>
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                          Manual marks override auto-detected objects during generation.
                        </Text>
                      </VStack>
                    )}

                    {/* Auto-detected Objects List */}
                    {aiReferenceDetectedObjects.length > 0 && (
                      <VStack style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
                          Auto-detected objects
                        </Text>
                        <HStack space="xs" className="mt-1 flex-wrap gap-1">
                          {aiReferenceDetectedObjects.map((obj) => {
                            const isSelected = aiReferenceSelectedObjectIds.includes(obj.id);
                            const confStr =
                              typeof obj.confidence === 'number'
                                ? ` (${Math.round(obj.confidence * 100)}%)`
                                : '';
                            return (
                              <TouchableOpacity
                                key={obj.id}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 16,
                                  borderWidth: 1,
                                  borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                                  backgroundColor: isSelected ? '#2563eb' : '#f8fafc',
                                }}
                                onPress={() =>
                                  setAiReferenceSelectedObjectIds((current) =>
                                    isSelected
                                      ? current.filter((id) => id !== obj.id)
                                      : [...current, obj.id]
                                  )
                                }
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '600',
                                    color: isSelected ? '#ffffff' : '#334155',
                                  }}
                                >
                                  {obj.label}
                                  {confStr}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </HStack>
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                          These are used only when no manual marks exist.
                        </Text>
                      </VStack>
                    )}
                  </VStack>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={() => showReferenceImagePicker('ai')}
                  >
                    <Feather name="image" size={24} color="#0052d4" />
                    <Text style={styles.uploadText}>Upload Reference Image</Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: '#94a3b8',
                        marginTop: 4,
                        textAlign: 'center',
                      }}
                    >
                      Upload a product photo to help AI generate more accurate branded images
                    </Text>
                  </TouchableOpacity>
                )}
              </VStack>

              {/* Generate Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 16 }]}
                onPress={handleGenerateAi}
                disabled={aiGenerating}
              >
                {aiGenerating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="zap" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Generate AI Post</Text>
                  </>
                )}
              </TouchableOpacity>
            </Box>

            {/* AI Generated Result Preview Card & Variations with Download Functionality */}
            {(aiGeneratedPosts.length > 0 ? aiGeneratedPosts : aiResult ? [aiResult] : []).map(
              (postItem, index) => {
                const label = String(postItem.variant_name || `Option ${index + 1}`);
                const itemCap = String(postItem.caption || '');
                const itemImg = String(postItem.image_url || postItem.image || '').trim();
                const itemHashtags = Array.isArray(postItem.hashtags) ? postItem.hashtags : [];
                const itemPostId = String(postItem.id || postItem._id || label);
                const isDownloading = downloadingPostIds.has(itemPostId);

                return (
                  <Box
                    key={itemPostId + index}
                    style={[styles.card, styles.aiResultCard, { marginBottom: 12 }]}
                  >
                    <HStack className="mb-2 flex-wrap items-center justify-between gap-2">
                      <HStack space="xs" className="items-center gap-2">
                        <Heading size="xs" style={{ color: '#0052d4', fontWeight: '700' }}>
                          ✨ AI Generated Output ({label})
                        </Heading>
                      </HStack>
                      <HStack space="xs" className="items-center gap-2">
                        <TouchableOpacity
                          style={[
                            styles.downloadAllBtn,
                            (downloadingAll || isDownloading) && { opacity: 0.7 },
                          ]}
                          onPress={downloadAllPosts}
                          disabled={downloadingAll || isDownloading}
                        >
                          {downloadingAll ? (
                            <ActivityIndicator size="small" color="#166534" />
                          ) : (
                            <Feather name="download" size={14} color="#166534" />
                          )}
                          <Text style={styles.downloadAllBtnText}>
                            {downloadingAll ? 'Downloading...' : 'Download All'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.applyBtn}
                          onPress={() => applyAiContent(postItem)}
                        >
                          <Text style={styles.applyBtnText}>Apply to Composer →</Text>
                        </TouchableOpacity>
                      </HStack>
                    </HStack>

                    {itemImg ? (
                      <Box style={styles.previewImageContainer}>
                        <Image
                          source={{ uri: getImageUrl(itemImg) }}
                          style={styles.previewImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.imageDownloadOverlayBtn}
                          onPress={() => {
                            const filenameBase = getBaseFilename(aiPrompt, label);
                            const url = getImageUrl(itemImg);
                            if (Platform.OS === 'web' || typeof window !== 'undefined') {
                              fetch(url)
                                .then((r) => r.blob())
                                .then((blob) => {
                                  const a = document.createElement('a');
                                  a.href = URL.createObjectURL(blob);
                                  a.download = `${filenameBase}.jpg`;
                                  a.click();
                                  URL.revokeObjectURL(a.href);
                                })
                                .catch(() => {});
                            }
                          }}
                        >
                          <Feather name="download" size={14} color="#ffffff" />
                        </TouchableOpacity>
                      </Box>
                    ) : null}

                    {postItem.title && (
                      <Text
                        style={{
                          fontWeight: '700',
                          color: '#0f172a',
                          fontSize: 14,
                          marginBottom: 4,
                          marginTop: itemImg ? 8 : 0,
                        }}
                      >
                        {postItem.title}
                      </Text>
                    )}
                    <Text style={{ color: '#334155', fontSize: 13, lineHeight: 20 }}>
                      {itemCap}
                    </Text>
                    {itemHashtags.length > 0 && (
                      <HStack space="xs" className="mt-2 flex-wrap gap-1">
                        {itemHashtags.map((tag: string, idx: number) => (
                          <Box key={idx} style={styles.tagChip}>
                            <Text style={styles.tagText}>#{tag.replace(/^#/, '')}</Text>
                          </Box>
                        ))}
                      </HStack>
                    )}

                    {/* Per-card Actions Toolbar (Copy, Download Text, Download Post) */}
                    <HStack className="mt-3 flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-2">
                      {/* Copy Content Button */}
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => copyPostContent(postItem)}
                      >
                        <Feather name="copy" size={14} color="#475569" />
                        <Text style={styles.actionIconBtnText}>Copy Text</Text>
                      </TouchableOpacity>

                      {/* Download Content (.txt) Only Button */}
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => downloadTextContent(postItem, label)}
                      >
                        <Feather name="file-text" size={14} color="#0284c7" />
                        <Text style={[styles.actionIconBtnText, { color: '#0284c7' }]}>
                          Download Text (.txt)
                        </Text>
                      </TouchableOpacity>

                      {/* Per-card Download Post (Image + Text) Button */}
                      <TouchableOpacity
                        style={[
                          styles.actionIconBtn,
                          { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
                          (downloadingAll || isDownloading) && { opacity: 0.6 },
                        ]}
                        disabled={downloadingAll || isDownloading}
                        onPress={() => downloadPost(postItem, label)}
                      >
                        {isDownloading ? (
                          <ActivityIndicator size="small" color="#16a34a" />
                        ) : (
                          <Feather name="download" size={14} color="#16a34a" />
                        )}
                        <Text style={[styles.actionIconBtnText, { color: '#16a34a' }]}>
                          {isDownloading ? 'Downloading...' : 'Download Post'}
                        </Text>
                      </TouchableOpacity>
                    </HStack>
                  </Box>
                );
              }
            )}
          </VStack>
        )}

        {/* ================================================================= */}
        {/* TAB 2: MANUAL POSTING COMPOSER */}
        {/* ================================================================= */}
        {activeTab === 'manual' && (
          <VStack space="md">
            {/* Form Validation Global Error Banner */}
            {errors.main && (
              <Box style={styles.errorBanner}>
                <Feather name="alert-circle" size={18} color="#dc2626" style={{ marginRight: 8 }} />
                <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '600', flex: 1 }}>
                  {errors.main}
                </Text>
              </Box>
            )}

            {/* AI Refinement Banner Card (Not satisfied? Refine with AI) */}
            {(aiMergedIntoEdit || aiDraftPostId || aiResult || aiGeneratedPosts.length > 0) && (
              <Box
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#e9d5ff',
                  backgroundColor: '#faf5ff',
                  overflow: 'hidden',
                  marginBottom: 4,
                }}
              >
                <Box
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    backgroundColor: '#f3e8ff',
                    borderBottomWidth: aiRefinePanelOpen ? 1 : 0,
                    borderBottomColor: '#e9d5ff',
                  }}
                >
                  <HStack
                    space="xs"
                    className="items-center gap-2"
                    style={{ flex: 1, minWidth: 180 }}
                  >
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: '#e9d5ff',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="bulb-outline" size={18} color="#7c3aed" />
                    </Box>
                    <VStack style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#581c87' }}>
                        Not satisfied? Refine with AI
                      </Text>
                      <Text style={{ fontSize: 11, color: '#7e22ce' }}>
                        Edit prompt, enhance content, or change image
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack space="xs" className="items-center gap-2">
                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: aiRefinePanelOpen ? '#7c3aed' : '#ffffff',
                        borderWidth: 1,
                        borderColor: '#7c3aed',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onPress={() => setAiRefinePanelOpen(!aiRefinePanelOpen)}
                      activeOpacity={0.8}
                    >
                      <Feather
                        name={aiRefinePanelOpen ? 'chevron-up' : 'sliders'}
                        size={13}
                        color={aiRefinePanelOpen ? '#ffffff' : '#7c3aed'}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: aiRefinePanelOpen ? '#ffffff' : '#7c3aed',
                        }}
                      >
                        Refine Prompt
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#7c3aed',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onPress={handleAiRegenerateImage}
                      disabled={aiRegeneratingImage || aiGenerating}
                      activeOpacity={0.8}
                    >
                      {aiRegeneratingImage ? (
                        <ActivityIndicator size="small" color="#7c3aed" />
                      ) : (
                        <Feather name="image" size={13} color="#7c3aed" />
                      )}
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#7c3aed' }}>
                        {aiRegeneratingImage ? 'Generating...' : 'Change Image'}
                      </Text>
                    </TouchableOpacity>
                  </HStack>
                </Box>

                {aiRefinePanelOpen && (
                  <Box style={{ padding: 14, backgroundColor: '#faf5ff' }}>
                    <Text
                      style={{ fontSize: 12, color: '#6b21a8', fontWeight: '600', marginBottom: 6 }}
                    >
                      Describe how you want to improve the content
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          fontSize: 13,
                          backgroundColor: '#ffffff',
                          borderColor: '#d8b4fe',
                          minHeight: 60,
                          textAlignVertical: 'top',
                        },
                      ]}
                      value={aiRefinePrompt}
                      onChangeText={setAiRefinePrompt}
                      placeholder="e.g. Make the caption more engaging, add a call-to-action, use a friendlier tone..."
                      placeholderTextColor="#a855f7"
                      multiline
                    />
                    <HStack className="mt-3 justify-end gap-2">
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: '#ffffff',
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                        }}
                        onPress={() => {
                          setAiRefinePanelOpen(false);
                          setAiRefinePrompt('');
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b' }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 6,
                          borderRadius: 10,
                          backgroundColor: '#7c3aed',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          opacity: aiGenerating || !aiRefinePrompt.trim() ? 0.6 : 1,
                        }}
                        onPress={handleAiRefine}
                        disabled={aiGenerating || !aiRefinePrompt.trim()}
                      >
                        {aiGenerating ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Feather name="refresh-cw" size={13} color="#ffffff" />
                        )}
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                          {aiGenerating ? 'Refining...' : 'Regenerate'}
                        </Text>
                      </TouchableOpacity>
                    </HStack>
                  </Box>
                )}
              </Box>
            )}

            {/* 1. AI Image Generator from Reference Card */}
            <Box style={styles.card}>
              <HStack className="mb-2 items-center justify-between">
                <HStack space="xs" className="items-center gap-2">
                  <Ionicons name="sparkles" size={18} color="#2563eb" />
                  <Heading size="sm" style={styles.cardTitle}>
                    AI Image Generator from Reference
                  </Heading>
                </HStack>
                {referenceImageUri ? (
                  <TouchableOpacity onPress={() => handleClearReferenceImage('manual')}>
                    <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600' }}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </HStack>
              <Text style={styles.cardSub}>
                Upload a product or reference image, and AI will create a premium marketing poster
                with cinematic lighting and professional composition.
              </Text>

              {!referenceImageUri ? (
                <TouchableOpacity
                  style={[
                    styles.uploadBox,
                    { borderStyle: 'dashed', marginTop: 12, backgroundColor: '#f8fafc' },
                  ]}
                  onPress={() => showReferenceImagePicker('manual')}
                >
                  <HStack space="xs" className="items-center justify-center">
                    <Feather name="upload" size={22} color="#2563eb" />
                    <Feather name="camera" size={22} color="#2563eb" style={{ marginLeft: 8 }} />
                  </HStack>
                  <Text
                    style={[
                      styles.uploadText,
                      { color: '#2563eb', fontWeight: '700', marginTop: 4 },
                    ]}
                  >
                    Upload or Take Reference Image
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Select image from Gallery or capture with Camera
                  </Text>
                </TouchableOpacity>
              ) : (
                <VStack space="md" style={{ marginTop: 12 }}>
                  {/* Reference Image Preview & Action Tools */}
                  <Box style={styles.imagePreviewBox}>
                    <Image
                      source={{ uri: referenceImageUri }}
                      style={styles.uploadedImage}
                      resizeMode="cover"
                    />
                    {/* Top Overlay Action Icons: Mark Object, Crop Image, Remove */}
                    <HStack
                      space="sm"
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => openMarkObjectModal(referenceImageUri)}
                        style={{
                          padding: 6,
                          backgroundColor: '#60a5fa',
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="target" size={18} color="#ffffff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => openCropForExistingImage(referenceImageUri, 'manual_ref')}
                        style={{
                          padding: 6,
                          backgroundColor: '#1c243cff',
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="crop" size={18} color="#ffffff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleClearReferenceImage('manual')}
                        style={{
                          padding: 6,
                          backgroundColor: '#f87171',
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="trash-2" size={18} color="#ffffff" />
                      </TouchableOpacity>
                    </HStack>
                  </Box>

                  {/* Marked Objects Chips List */}
                  {aiReferenceManualObjects.length > 0 && (
                    <VStack space="xs" style={{ marginTop: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                        Marked Objects ({aiReferenceManualObjects.length}):
                      </Text>
                      <HStack style={{ flexWrap: 'wrap', gap: 6 }}>
                        {aiReferenceManualObjects.map((obj) => (
                          <Box
                            key={obj.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#f3e8ff',
                              borderWidth: 1,
                              borderColor: '#d8b4fe',
                              borderRadius: 16,
                              paddingVertical: 4,
                              paddingHorizontal: 10,
                              gap: 6,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#7e22ce' }}>
                              🏷️ {obj.label}
                            </Text>
                            <TouchableOpacity onPress={() => handleRemoveManualObjectMark(obj.id)}>
                              <Feather name="x" size={13} color="#9333ea" />
                            </TouchableOpacity>
                          </Box>
                        ))}
                      </HStack>
                    </VStack>
                  )}

                  {/* Optional Custom Reference Image Prompt */}
                  <VStack space="xs">
                    <Text style={styles.inputLabel}>Custom Image Style / Prompt (Optional)</Text>
                    <TextInput
                      style={[styles.input, { fontSize: 13 }]}
                      value={referenceImagePrompt}
                      onChangeText={setReferenceImagePrompt}
                      placeholder="e.g. Sleek luxury product display with soft volumetric lighting and modern reflections..."
                      placeholderTextColor="#94a3b8"
                      maxLength={500}
                    />
                  </VStack>

                  {/* Provider Selection */}
                  <VStack space="xs">
                    <Text style={styles.inputLabel}>AI Model Provider</Text>
                    <HStack space="xs">
                      {(['auto', 'gemini', 'openai'] as const).map((prov) => (
                        <TouchableOpacity
                          key={prov}
                          style={[
                            styles.providerChip,
                            referenceImageProvider === prov && styles.providerChipActive,
                            { flexDirection: 'row', alignItems: 'center', gap: 5 },
                          ]}
                          onPress={() => setReferenceImageProvider(prov)}
                        >
                          {prov === 'auto' && (
                            <Feather
                              name="zap"
                              size={13}
                              color={referenceImageProvider === prov ? '#0369a1' : '#64748b'}
                            />
                          )}
                          {prov === 'gemini' && (
                            <Ionicons
                              name="sparkles"
                              size={13}
                              color={referenceImageProvider === prov ? '#0369a1' : '#64748b'}
                            />
                          )}
                          {prov === 'openai' && (
                            <Feather
                              name="cpu"
                              size={13}
                              color={referenceImageProvider === prov ? '#0369a1' : '#64748b'}
                            />
                          )}
                          <Text
                            style={[
                              styles.providerChipText,
                              referenceImageProvider === prov && styles.providerChipTextActive,
                            ]}
                          >
                            {prov === 'auto' ? 'Auto' : prov === 'gemini' ? 'Gemini' : 'OpenAI'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </HStack>
                  </VStack>

                  {/* Generate AI Marketing Image Button */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: '#7c3aed' }]}
                    onPress={() => handleGenerateAiMarketingImage(referenceImageUri)}
                    disabled={aiMarketingGenerating}
                  >
                    {aiMarketingGenerating ? (
                      <HStack space="xs" className="items-center">
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.primaryBtnText}> Generating AI Marketing Image...</Text>
                      </HStack>
                    ) : (
                      <HStack space="xs" className="items-center">
                        <Ionicons
                          name="sparkles"
                          size={16}
                          color="#fff"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.primaryBtnText}>Generate Marketing Image</Text>
                      </HStack>
                    )}
                  </TouchableOpacity>

                  {/* AI Generated Marketing Image Preview */}
                  {aiMarketingImageUrl ? (
                    <Box
                      style={{
                        backgroundColor: '#f5f3ff',
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#ddd6fe',
                        marginTop: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '700',
                          color: '#6d28d9',
                          fontSize: 13,
                          marginBottom: 8,
                        }}
                      >
                        ✨ AI Generated Marketing Image
                      </Text>
                      <Box style={styles.imagePreviewBox}>
                        <Image
                          source={{ uri: aiMarketingImageUrl }}
                          style={styles.uploadedImage}
                          resizeMode="cover"
                        />
                      </Box>
                      <Box className="flex-row items-center gap-2">
                        <TouchableOpacity
                          style={[styles.primaryBtn, { backgroundColor: '#2563eb', marginTop: 10 }]}
                          onPress={() => {
                            setImageUrl(aiMarketingImageUrl);
                            Alert.alert('Applied!', 'AI generated image set as post media.');
                          }}
                        >
                          <Text style={styles.primaryBtnText}>Use This Image</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.primaryBtn,
                            {
                              backgroundColor: 'transparent',
                              borderWidth: 1,
                              borderColor: '#cbd5e1',
                              marginTop: 8,
                            },
                          ]}
                          onPress={() => {
                            setAiMarketingImageUrl('');
                            setImageUrl('');
                            setImagePath('');
                          }}
                        >
                          <Text style={[styles.primaryBtnText, { color: '#475569' }]}>Discard</Text>
                        </TouchableOpacity>
                      </Box>
                    </Box>
                  ) : null}
                </VStack>
              )}
            </Box>

            {/* 2. General Content Card */}
            <Box style={styles.card}>
              <HStack space="xs" className="items-center gap-2">
                <Feather name="edit-3" size={17} color="#2563eb" />
                <Heading size="sm" style={styles.cardTitle}>
                  General Content
                </Heading>
              </HStack>

              {/* Company Name Field */}
              <VStack style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Company Name *</Text>
                <TextInput
                  style={[styles.input, errors.companyName ? styles.inputError : null]}
                  value={companyName}
                  onChangeText={(text) => {
                    setCompanyName(text);
                    if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: '' }));
                  }}
                  placeholder="Enter company / brand name"
                  placeholderTextColor="#94a3b8"
                  maxLength={100}
                />
                {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}
              </VStack>

              {/* Caption Field */}
              <VStack style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Caption *</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.multilineInput,
                    errors.caption ? styles.inputError : null,
                  ]}
                  value={caption}
                  onChangeText={(text) => {
                    setCaption(text);
                    if (errors.caption || errors.main)
                      setErrors((prev) => ({ ...prev, caption: '', main: '' }));
                  }}
                  placeholder="Write your post caption..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  maxLength={2200}
                />
                {errors.caption && <Text style={styles.errorText}>{errors.caption}</Text>}
              </VStack>

              {/* Hashtags Field */}
              <VStack style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Hashtags (comma separated)</Text>
                <TextInput
                  style={[styles.input, errors.hashtagsInput ? styles.inputError : null]}
                  value={hashtagsInput}
                  onChangeText={(text) => {
                    setHashtagsInput(text);
                    if (errors.hashtagsInput) setErrors((prev) => ({ ...prev, hashtagsInput: '' }));
                  }}
                  placeholder="marketing, promotion, offer"
                  placeholderTextColor="#94a3b8"
                  maxLength={300}
                />
                {errors.hashtagsInput && (
                  <Text style={styles.errorText}>{errors.hashtagsInput}</Text>
                )}
                {hashtagsInput.trim().length > 0 && (
                  <HStack space="xs" className="mt-2 flex-wrap">
                    {hashtagsInput.split(',').map((tag, idx) => {
                      const trimmed = tag.trim().replace(/^#/, '');
                      if (!trimmed) return null;
                      return (
                        <Box key={idx} style={styles.tagChip}>
                          <Text style={styles.tagText}>#{trimmed}</Text>
                        </Box>
                      );
                    })}
                  </HStack>
                )}
              </VStack>

              {/* Image Uploader inside General Content */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>Image Uploader *</Text>
                {imageUrl ? (
                  <Box style={styles.imagePreviewBox}>
                    <TouchableOpacity
                      activeOpacity={genImgError ? 1 : 0.9}
                      onPress={() => {
                        if (!genImgError) {
                          setModalImageUrl(getImageUrl(imageUrl));
                        }
                      }}
                    >
                      <Image
                        source={
                          genImgError
                            ? require('@/assets/images/360_image.jpg')
                            : { uri: getImageUrl(imageUrl) }
                        }
                        style={styles.uploadedImage}
                        resizeMode="cover"
                        onError={() => setGenImgError(true)}
                      />
                    </TouchableOpacity>
                    <HStack space="xs" style={styles.imageActionOverlay}>
                      {!genImgError && (
                        <TouchableOpacity
                          style={styles.imgActionBtn}
                          onPress={() => openCropForExistingImage(imageUrl, 'general')}
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Feather name="crop" size={14} color="#fff" />
                          )}
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.imgActionBtn, { backgroundColor: '#dc2626' }]}
                        onPress={() => {
                          setImageUrl('');
                          setImagePath('');
                          setGenImgError(false);
                        }}
                        disabled={uploadingImage}
                      >
                        <Feather name="trash-2" size={14} color="#fff" />
                      </TouchableOpacity>
                    </HStack>
                  </Box>
                ) : (
                  <VStack space="xs" style={{ marginTop: 6 }}>
                    <TouchableOpacity
                      style={[styles.uploadBox, errors.imageUrl ? styles.inputError : null]}
                      onPress={showGeneralImagePicker}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <ActivityIndicator size="large" color="#0052d4" />
                      ) : (
                        <>
                          <Feather name="upload-cloud" size={28} color="#0052d4" />
                          <Text style={styles.uploadText}>Upload Image</Text>
                          <Text style={{ fontSize: 11, color: '#94a3b8' }}>Gallery or Camera</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </VStack>
                )}
                {errors.imageUrl && <Text style={styles.errorText}>{errors.imageUrl}</Text>}
              </VStack>
            </Box>

            {/* 3. Target Platforms Picker Card */}
            <Box style={styles.card}>
              <HStack className="items-center justify-between">
                <HStack space="xs" className="items-center gap-2">
                  <Feather name="share-2" size={17} color="#2563eb" />
                  <Heading size="sm" style={styles.cardTitle}>
                    Select Platforms *
                  </Heading>
                </HStack>

                <TouchableOpacity
                  onPress={() => setNetworksModalOpen(true)}
                  style={{
                    backgroundColor: '#2563EB',
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#2563EB',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Feather name="settings" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 15, color: '#fff', fontWeight: '900' }}>Platforms</Text>
                </TouchableOpacity>
              </HStack>
              {errors.platforms && <Text style={styles.errorText}>{errors.platforms}</Text>}

              {/* Selected Platform Pills Badges (Panel style) */}
              {selectedPlatforms.length > 0 && (
                <HStack space="xs" className="mt-3 flex-wrap" style={{ gap: 6 }}>
                  {selectedPlatforms.map((net) => {
                    const plat = SOCIAL_PLATFORMS.find((p) => p.id === net);
                    const platColor = plat?.color || '#0052d4';
                    const accountCount = selectedAccounts.filter((accId) =>
                      socialAccounts.find(
                        (a) =>
                          (a.account_id || a.value || a.id || a._id) === accId &&
                          isPlatformMatch(a.platform, net)
                      )
                    ).length;

                    return (
                      <TouchableOpacity
                        key={net}
                        onPress={openNetworksModal}
                        activeOpacity={0.8}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: `${platColor}15`,
                          borderColor: `${platColor}40`,
                          borderWidth: 1,
                          borderRadius: 10,
                          paddingVertical: 5,
                          paddingHorizontal: 10,
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        <FontAwesome
                          name={(plat?.icon as any) || 'share-alt'}
                          size={14}
                          color={platColor}
                        />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: platColor }}>
                          {plat?.label || net}
                        </Text>
                        {accountCount > 1 && (
                          <Box
                            style={{
                              backgroundColor: platColor,
                              borderRadius: 8,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                            }}
                          >
                            <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
                              {accountCount} accounts
                            </Text>
                          </Box>
                        )}
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteNetwork(net);
                          }}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: '#000000',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: 4,
                          }}
                        >
                          <Feather name="x" size={10} color="#fff" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </HStack>
              )}
            </Box>

            {/* 4. Platform-Specific Content Card (Displayed when platforms are selected) */}
            {selectedPlatforms.length > 0 && (
              <Box style={styles.card}>
                <HStack space="xs" className="items-center gap-2">
                  <Feather name="sliders" size={17} color="#2563eb" />
                  <Heading size="sm" style={styles.cardTitle}>
                    Platform-Specific Content
                  </Heading>
                </HStack>
                <Text style={styles.cardSub}>
                  Customize caption, link, or image specifically for each selected social platform.
                </Text>

                {/* Sub-Tabs for Selected Platforms */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.subTabList}
                  style={{ marginTop: 6 }}
                >
                  {selectedPlatforms.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.subTabBtn,
                        (activePlatformTab === p ||
                          (activePlatformTab === 'general' && selectedPlatforms[0] === p)) &&
                          styles.subTabBtnActive,
                      ]}
                      onPress={() => setActivePlatformTab(p)}
                    >
                      <Text
                        style={[
                          styles.subTabText,
                          (activePlatformTab === p ||
                            (activePlatformTab === 'general' && selectedPlatforms[0] === p)) &&
                            styles.subTabTextActive,
                        ]}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {(() => {
                  const targetPlatform =
                    activePlatformTab !== 'general' && selectedPlatforms.includes(activePlatformTab)
                      ? activePlatformTab
                      : selectedPlatforms[0];

                  if (!targetPlatform) return null;

                  const platformConfig = SOCIAL_PLATFORMS.find((p) => p.id === targetPlatform) || {
                    id: targetPlatform,
                    label: targetPlatform.charAt(0).toUpperCase() + targetPlatform.slice(1),
                    icon: 'share-alt',
                    color: '#2563eb',
                  };

                  const platformAccs = socialAccounts.filter(
                    (a) =>
                      isPlatformMatch(a.platform, targetPlatform) &&
                      selectedAccounts.includes(a.account_id || a.value || a.id || a._id)
                  );
                  const rawEntries = platformSpecificContent[targetPlatform] || [];
                  const override = platformOverrides[targetPlatform] || {};

                  let platformEntries: any[] = [];

                  if (platformAccs.length > 0) {
                    platformEntries = platformAccs.map((acc, idx) => {
                      const accId = acc.account_id || acc.value || acc.id || acc._id;
                      const existing =
                        rawEntries.find((e: any) => e.account_id === accId) || rawEntries[idx];

                      if (existing) {
                        return {
                          ...existing,
                          account_id: accId,
                        };
                      }

                      return {
                        account_id: accId,
                        caption: override.caption || caption || '',
                        link: override.link || companyWebsite || '',
                        hashtags:
                          override.hashtags && override.hashtags.length > 0
                            ? override.hashtags
                            : hashtagsInput
                              ? hashtagsInput
                                  .split(',')
                                  .map((t) => t.trim().replace(/^#/, ''))
                                  .filter(Boolean)
                              : [],
                        mediaUrl:
                          override.image_url !== undefined
                            ? override.image_url
                            : imageUrl || imagePath || '',
                        contentType:
                          override.contentType || contentTypeOverrides[targetPlatform] || 'media',
                      };
                    });
                  } else {
                    if (rawEntries.length > 0) {
                      platformEntries = rawEntries;
                    } else {
                      platformEntries = [
                        {
                          account_id: '',
                          caption: override.caption || caption || '',
                          link: override.link || companyWebsite || '',
                          hashtags:
                            override.hashtags && override.hashtags.length > 0
                              ? override.hashtags
                              : hashtagsInput
                                ? hashtagsInput
                                    .split(',')
                                    .map((t) => t.trim().replace(/^#/, ''))
                                    .filter(Boolean)
                                : [],
                          mediaUrl:
                            override.image_url !== undefined
                              ? override.image_url
                              : imageUrl || imagePath || '',
                          contentType:
                            override.contentType || contentTypeOverrides[targetPlatform] || 'media',
                        },
                      ];
                    }
                  }

                  return (
                    <VStack space="md" style={{ marginTop: 12 }}>
                      {platformEntries.map((platformContent, entryIdx) => {
                        const accountId = platformContent.account_id || '';
                        const accountInfo = socialAccounts.find(
                          (a) => (a.account_id || a.value || a.id || a._id) === accountId
                        );

                        const accountDisplayName =
                          accountInfo?.account_name ||
                          accountInfo?.name ||
                          (accountInfo?.first_name
                            ? `${accountInfo.first_name} ${accountInfo.last_name || ''}`.trim()
                            : '') ||
                          accountInfo?.username ||
                          accountId;

                        const activeCt =
                          platformContent.contentType ||
                          contentTypeOverrides[targetPlatform] ||
                          'media';
                        const entryCaption =
                          platformContent.caption !== undefined ? platformContent.caption : caption;
                        const entryLink =
                          platformContent.link !== undefined
                            ? platformContent.link
                            : companyWebsite;
                        const entryMediaUrl =
                          platformContent.mediaUrl !== undefined
                            ? platformContent.mediaUrl
                            : imageUrl;
                        const hasCustomMedia =
                          platformContent.mediaUrl !== undefined &&
                          platformContent.mediaUrl !== imageUrl;

                        const hashtagsKey = `${targetPlatform}:${accountId || entryIdx}`;
                        const hashtagsVal =
                          platformHashtagsInput[hashtagsKey] !== undefined
                            ? platformHashtagsInput[hashtagsKey]
                            : platformContent.hashtags && platformContent.hashtags.length > 0
                              ? platformContent.hashtags.join(', ')
                              : hashtagsInput;

                        const uploadKey = `${targetPlatform}:${accountId || 'default'}`;
                        const isUploading = Boolean(
                          uploadingPlatformImage[uploadKey] ||
                          uploadingPlatformImage[targetPlatform]
                        );
                        const hasImgError = Boolean(
                          platformImgErrors[uploadKey] || platformImgErrors[targetPlatform]
                        );
                        const resolvedUri = getImageUrl(entryMediaUrl);

                        return (
                          <Box
                            key={accountId || entryIdx}
                            style={{
                              borderColor: `${platformConfig.color}35`,
                              borderWidth: 1,
                              borderRadius: 12,
                              padding: 12,
                              backgroundColor: `${platformConfig.color}05`,
                              marginBottom: platformEntries.length > 1 ? 8 : 0,
                            }}
                          >
                            {/* Account Identity Header Card */}
                            {(platformEntries.length > 1 || Boolean(accountId)) && (
                              <HStack
                                className="mb-3 items-center justify-between pb-2"
                                style={{
                                  borderBottomWidth: 1,
                                  borderBottomColor: `${platformConfig.color}20`,
                                }}
                              >
                                <HStack space="xs" className="items-center" style={{ flex: 1 }}>
                                  <Box
                                    style={{
                                      backgroundColor: platformConfig.color,
                                      width: 28,
                                      height: 28,
                                      borderRadius: 14,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <FontAwesome
                                      name={(platformConfig.icon as any) || 'share-alt'}
                                      size={12}
                                      color="#fff"
                                    />
                                  </Box>
                                  <VStack style={{ flex: 1, marginLeft: 6 }}>
                                    <Text
                                      style={{ fontWeight: '700', fontSize: 13, color: '#0f172a' }}
                                    >
                                      {accountDisplayName || `${platformConfig.label} Account`}
                                    </Text>
                                    {accountInfo?.username ? (
                                      <Text style={{ fontSize: 10, color: '#64748b' }}>
                                        @{accountInfo.username}
                                      </Text>
                                    ) : accountInfo?.page_id ? (
                                      <Text style={{ fontSize: 10, color: '#64748b' }}>
                                        Page ID: {accountInfo.page_id}
                                      </Text>
                                    ) : null}
                                  </VStack>
                                </HStack>
                                <Box
                                  style={{
                                    backgroundColor: `${platformConfig.color}20`,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 8,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: '700',
                                      color: platformConfig.color,
                                    }}
                                  >
                                    Account {entryIdx + 1}
                                  </Text>
                                </Box>
                              </HStack>
                            )}

                            {/* Content Type Selector */}
                            <VStack space="xs">
                              <Text style={styles.inputLabel}>Content Type</Text>
                              <HStack space="xs" className="mt-1 flex-wrap">
                                {CONTENT_TYPES.map((ct) => {
                                  const isSelected = activeCt === ct.value;
                                  return (
                                    <TouchableOpacity
                                      key={ct.value}
                                      style={[
                                        styles.providerChip,
                                        isSelected && styles.providerChipActive,
                                      ]}
                                      onPress={() => {
                                        handlePlatformSpecificChange(
                                          targetPlatform,
                                          accountId,
                                          'contentType',
                                          ct.value
                                        );
                                        setContentTypeOverrides((prev) => ({
                                          ...prev,
                                          [targetPlatform]: ct.value,
                                        }));
                                      }}
                                    >
                                      <Text
                                        style={[
                                          styles.providerChipText,
                                          isSelected && styles.providerChipTextActive,
                                        ]}
                                      >
                                        {ct.label}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </HStack>
                            </VStack>

                            {/* Caption */}
                            <VStack space="xs" style={{ marginTop: 10 }}>
                              <Text style={styles.inputLabel}>Caption</Text>
                              <TextInput
                                style={[styles.input, styles.multilineInput]}
                                value={entryCaption}
                                onChangeText={(val) => {
                                  handlePlatformSpecificChange(
                                    targetPlatform,
                                    accountId,
                                    'caption',
                                    val
                                  );
                                  setPlatformOverrides((prev) => ({
                                    ...prev,
                                    [targetPlatform]: { ...prev[targetPlatform], caption: val },
                                  }));
                                }}
                                placeholder={`Custom caption for ${accountDisplayName || platformConfig.label}...`}
                                placeholderTextColor="#94a3b8"
                                multiline
                                numberOfLines={4}
                                maxLength={2200}
                              />
                            </VStack>

                            {/* Custom Link */}
                            <VStack space="xs" style={{ marginTop: 10 }}>
                              <Text style={styles.inputLabel}>Custom Link</Text>
                              <TextInput
                                style={styles.input}
                                value={entryLink}
                                onChangeText={(val) => {
                                  handlePlatformSpecificChange(
                                    targetPlatform,
                                    accountId,
                                    'link',
                                    val
                                  );
                                  setPlatformOverrides((prev) => ({
                                    ...prev,
                                    [targetPlatform]: { ...prev[targetPlatform], link: val },
                                  }));
                                }}
                                placeholder={`Custom link for ${accountDisplayName || platformConfig.label}...`}
                                placeholderTextColor="#94a3b8"
                                keyboardType="url"
                                autoCapitalize="none"
                                maxLength={500}
                              />
                            </VStack>

                            {/* Hashtags */}
                            <VStack space="xs" style={{ marginTop: 10 }}>
                              <Text style={styles.inputLabel}>Hashtags (comma separated)</Text>
                              <TextInput
                                style={styles.input}
                                value={hashtagsVal}
                                onChangeText={(val) => {
                                  setPlatformHashtagsInput((prev) => ({
                                    ...prev,
                                    [hashtagsKey]: val,
                                  }));
                                  const parsed = val
                                    .split(',')
                                    .map((tag) => tag.replace(/^#/, '').trim())
                                    .filter(Boolean);
                                  handlePlatformSpecificChange(
                                    targetPlatform,
                                    accountId,
                                    'hashtags',
                                    parsed
                                  );
                                  setPlatformOverrides((prev) => ({
                                    ...prev,
                                    [targetPlatform]: { ...prev[targetPlatform], hashtags: parsed },
                                  }));
                                }}
                                placeholder={`Custom hashtags for ${accountDisplayName || platformConfig.label}...`}
                                placeholderTextColor="#94a3b8"
                                maxLength={300}
                              />
                              {(() => {
                                if (!hashtagsVal || !hashtagsVal.trim()) return null;
                                const tags: string[] = hashtagsVal
                                  .split(',')
                                  .map((t: string) => t.trim().replace(/^#/, ''))
                                  .filter(Boolean);
                                if (tags.length === 0) return null;
                                return (
                                  <HStack space="xs" className="mt-2 flex-wrap">
                                    {tags.map((tag: string, idx: number) => (
                                      <Box key={idx} style={styles.tagChip}>
                                        <Text style={styles.tagText}>#{tag}</Text>
                                      </Box>
                                    ))}
                                  </HStack>
                                );
                              })()}
                            </VStack>

                            {/* Image Override */}
                            <VStack space="xs" style={{ marginTop: 10 }}>
                              <HStack className="items-center justify-between">
                                <Text style={styles.inputLabel}>Image</Text>
                                {hasCustomMedia && (
                                  <TouchableOpacity
                                    onPress={() => {
                                      handlePlatformSpecificChange(
                                        targetPlatform,
                                        accountId,
                                        'mediaUrl',
                                        imageUrl
                                      );
                                    }}
                                  >
                                    <Text
                                      style={{ fontSize: 11, color: '#2563eb', fontWeight: '600' }}
                                    >
                                      Reset to General Image
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </HStack>

                              {resolvedUri ? (
                                <Box style={styles.imagePreviewBox}>
                                  <TouchableOpacity
                                    activeOpacity={hasImgError ? 1 : 0.9}
                                    onPress={() => {
                                      if (!hasImgError) {
                                        setModalImageUrl(resolvedUri);
                                      }
                                    }}
                                  >
                                    <Image
                                      source={
                                        hasImgError
                                          ? require('@/assets/images/360_image.jpg')
                                          : { uri: resolvedUri }
                                      }
                                      style={styles.uploadedImage}
                                      resizeMode="cover"
                                      onError={() =>
                                        setPlatformImgErrors((prev) => ({
                                          ...prev,
                                          [uploadKey]: true,
                                        }))
                                      }
                                    />
                                  </TouchableOpacity>
                                  <HStack space="xs" style={styles.imageActionOverlay}>
                                    {!hasImgError && (
                                      <TouchableOpacity
                                        style={styles.imgActionBtn}
                                        onPress={() =>
                                          openCropForExistingImage(
                                            resolvedUri,
                                            'platform',
                                            targetPlatform,
                                            accountId
                                          )
                                        }
                                        disabled={isUploading}
                                      >
                                        {isUploading ? (
                                          <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                          <Feather name="crop" size={14} color="#fff" />
                                        )}
                                      </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                      style={[styles.imgActionBtn, { backgroundColor: '#dc2626' }]}
                                      onPress={() => {
                                        handlePlatformSpecificChange(
                                          targetPlatform,
                                          accountId,
                                          'mediaUrl',
                                          ''
                                        );
                                      }}
                                      disabled={isUploading}
                                    >
                                      <Feather name="trash-2" size={14} color="#fff" />
                                    </TouchableOpacity>
                                  </HStack>
                                </Box>
                              ) : (
                                <TouchableOpacity
                                  style={[styles.uploadBox, { paddingVertical: 12 }]}
                                  onPress={() => showPlatformImagePicker(targetPlatform, accountId)}
                                  disabled={isUploading}
                                >
                                  {isUploading ? (
                                    <ActivityIndicator size="small" color="#0052d4" />
                                  ) : (
                                    <>
                                      <Feather name="image" size={20} color="#0052d4" />
                                      <Text style={[styles.uploadText, { fontSize: 12 }]}>
                                        Upload Image for{' '}
                                        {accountDisplayName || targetPlatform.toUpperCase()}
                                      </Text>
                                      <Text
                                        style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}
                                      >
                                        Gallery or Camera
                                      </Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              )}
                            </VStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  );
                })()}
              </Box>
            )}

            {/* Publishing & Scheduling Section */}
            <Box style={styles.card}>
              <HStack space="xs" className="items-center gap-2">
                <Feather name="calendar" size={17} color="#2563eb" />
                <Heading size="sm" style={styles.cardTitle}>
                  Publishing & Scheduling
                </Heading>
              </HStack>

              <HStack className="mt-3 items-center justify-between">
                <VStack style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 14 }}>
                    Schedule for later
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>
                    Set automatic date & time for publishing
                  </Text>
                </VStack>
                <Switch
                  value={isScheduled}
                  onValueChange={(val) => {
                    setIsScheduled(val);
                    setPostStatus(val ? 'scheduled' : 'draft');
                  }}
                  trackColor={{ false: '#cbd5e1', true: '#0052d4' }}
                />
              </HStack>

              {isScheduled && (
                <VStack
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9',
                  }}
                >
                  <Text style={styles.inputLabel}>Scheduled Date & Time</Text>
                  {errors.schedule && <Text style={styles.errorText}>{errors.schedule}</Text>}
                  <HStack space="sm" className="mt-1">
                    <TouchableOpacity
                      style={styles.datePickerBtn}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Feather
                        name="calendar"
                        size={16}
                        color="#0052d4"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: '600' }}>
                        {scheduledDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.datePickerBtn}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Feather name="clock" size={16} color="#0052d4" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: '600' }}>
                        {scheduledDate.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </TouchableOpacity>
                  </HStack>

                  {showDatePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_e, date) => {
                        setShowDatePicker(false);
                        if (date) setScheduledDate(date);
                      }}
                    />
                  )}

                  {showTimePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_e, date) => {
                        setShowTimePicker(false);
                        if (date) setScheduledDate(date);
                      }}
                    />
                  )}
                </VStack>
              )}
            </Box>

            {/* Live Social Post Preview Panel (Per Platform & Per Account matching Control Panel) */}
            <Box style={styles.card}>
              <VStack space="xs" className="mb-3">
                <HStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <HStack space="xs" style={{ alignItems: 'center', gap: 4 }}>
                    <Feather name="eye" size={17} color="#2563eb" />
                    <Heading size="sm" style={styles.cardTitle}>
                      Preview
                    </Heading>
                  </HStack>

                  {/* Filter tabs: All, Facebook, Instagram, WhatsApp, etc. */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1, marginLeft: 10 }}
                    contentContainerStyle={{
                      gap: 4,
                      justifyContent: 'flex-end',
                      flexGrow: 1,
                      alignItems: 'center',
                    }}
                  >
                    <TouchableOpacity
                      style={[styles.miniPrevTab, previewTab === 'all' && styles.miniPrevTabActive]}
                      onPress={() => setPreviewTab('all')}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: previewTab === 'all' ? '#0052d4' : '#64748b',
                        }}
                      >
                        ALL
                      </Text>
                    </TouchableOpacity>
                    {SOCIAL_PLATFORMS.map((p) => {
                      const isSelected = previewTab === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.miniPrevTab, isSelected && styles.miniPrevTabActive]}
                          onPress={() => setPreviewTab(p.id)}
                        >
                          <FontAwesome
                            name={p.icon as any}
                            size={13}
                            color={isSelected ? p.color : '#64748b'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </HStack>
                <Text style={{ fontSize: 11, color: '#64748b' }}>
                  Per Platform & Per Account Preview
                </Text>
              </VStack>

              {/* Preview Content Listing */}
              {(() => {
                // Check if any image is uploaded (general or platform specific)
                const hasImageUploaded = Boolean(
                  imageUrl ||
                  imagePath ||
                  Object.values(platformOverrides).some((o) => Boolean(o?.image_url))
                );

                // If no platforms are selected
                if (selectedPlatforms.length === 0) {
                  return (
                    <Box
                      style={{
                        paddingVertical: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="eye-off" size={32} color="#cbd5e1" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#94a3b8',
                          marginTop: 8,
                          fontStyle: 'italic',
                          textAlign: 'center',
                        }}
                      >
                        Select target social platforms in '⚙️ Platform' modal to see preview
                      </Text>
                    </Box>
                  );
                }

                // If platforms selected but no image uploaded yet
                if (!hasImageUploaded) {
                  return (
                    <Box
                      style={{
                        paddingVertical: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="image" size={32} color="#cbd5e1" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#94a3b8',
                          marginTop: 8,
                          fontStyle: 'italic',
                          textAlign: 'center',
                        }}
                      >
                        Upload an image to see live post preview
                      </Text>
                    </Box>
                  );
                }

                // Filter active platforms to show based on previewTab
                const activeNetworks =
                  previewTab === 'all'
                    ? selectedPlatforms
                    : selectedPlatforms.filter((net) => net === previewTab);

                if (activeNetworks.length === 0) {
                  return (
                    <Box
                      style={{
                        paddingVertical: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather name="info" size={24} color="#94a3b8" />
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          marginTop: 6,
                          textAlign: 'center',
                        }}
                      >
                        Platform '{previewTab.toUpperCase()}' is not selected in target social
                        platforms.
                      </Text>
                    </Box>
                  );
                }

                return (
                  <VStack space="md">
                    {activeNetworks.map((network) => {
                      const platformConfig = SOCIAL_PLATFORMS.find((p) => p.id === network) || {
                        id: network,
                        label: network.charAt(0).toUpperCase() + network.slice(1),
                        icon: 'share-2',
                        color: '#0052d4',
                      };

                      // Get all accounts selected for this platform
                      const platformAccounts = socialAccounts.filter(
                        (a) => a.platform === network && selectedAccounts.includes(a.account_id)
                      );

                      // Helper function to render a single preview card for a given account entry or default platform preview
                      const renderCard = (acct: any | null) => {
                        const accountId =
                          acct?.account_id || acct?.value || acct?.id || acct?._id || 'default';
                        const accountName =
                          acct?.account_name ||
                          acct?.name ||
                          (acct?.first_name
                            ? `${acct.first_name} ${acct.last_name || ''}`.trim()
                            : '') ||
                          acct?.username ||
                          companyName ||
                          platformConfig.label;

                        const platformEntries = platformSpecificContent[network] || [];
                        const acctEntry = acct
                          ? platformEntries.find(
                              (e: any) =>
                                e.account_id ===
                                (acct.account_id || acct.value || acct.id || acct._id)
                            )
                          : platformEntries[0];

                        const override = platformOverrides[network] || {};

                        const acctCaption =
                          acctEntry?.caption !== undefined
                            ? acctEntry.caption
                            : override.caption || caption || '';

                        const rawAcctMediaUrl =
                          acctEntry?.mediaUrl !== undefined
                            ? acctEntry.mediaUrl
                            : override.image_url || imageUrl || imagePath || '';

                        const acctMediaUrl = getImageUrl(rawAcctMediaUrl);

                        const acctLink =
                          acctEntry?.link !== undefined
                            ? acctEntry.link
                            : override.link || companyWebsite || '';

                        const acctHashtags: string[] =
                          acctEntry?.hashtags && acctEntry.hashtags.length > 0
                            ? acctEntry.hashtags
                            : override.hashtags ||
                              hashtagsInput
                                .split(',')
                                .map((t) => t.trim().replace(/^#/, ''))
                                .filter(Boolean);

                        const activeContentType =
                          acctEntry?.contentType ||
                          override.contentType ||
                          contentTypeOverrides[network] ||
                          'media';

                        return (
                          <Box
                            key={`${network}-${accountId}`}
                            style={[
                              styles.mockFeedCard,
                              {
                                borderColor: `${platformConfig.color}40`,
                                borderWidth: 1,
                                borderRadius: 12,
                                marginBottom: 10,
                                backgroundColor: '#ffffff',
                                overflow: 'hidden',
                                padding: 12,
                              },
                            ]}
                          >
                            {/* Card Header (Panel lines 5552-5616) */}
                            <HStack
                              className="mb-2 items-center justify-between pb-2"
                              style={{ borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                            >
                              <HStack space="xs" className="items-center" style={{ flex: 1 }}>
                                <Box
                                  style={[
                                    styles.mockAvatar,
                                    {
                                      backgroundColor: platformConfig.color,
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                    },
                                  ]}
                                >
                                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                                    {accountName.slice(0, 2).toUpperCase()}
                                  </Text>
                                </Box>
                                <VStack style={{ flex: 1, marginLeft: 4 }}>
                                  <HStack space="xs" className="items-center">
                                    <Text
                                      style={{ fontWeight: '700', fontSize: 13, color: '#0f172a' }}
                                      numberOfLines={1}
                                    >
                                      {accountName}
                                    </Text>
                                    <FontAwesome
                                      name={platformConfig.icon as any}
                                      size={12}
                                      color={platformConfig.color}
                                    />
                                  </HStack>
                                  <Text style={{ fontSize: 10, color: '#64748b' }}>
                                    {acct?.username ? `@${acct.username} • ` : ''}
                                    {platformConfig.label} Preview
                                  </Text>
                                </VStack>
                              </HStack>

                              <Box
                                style={{
                                  backgroundColor: `${platformConfig.color}15`,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 10,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: '700',
                                    color: platformConfig.color,
                                  }}
                                >
                                  {platformConfig.label}
                                </Text>
                              </Box>
                            </HStack>

                            {/* Post Title / Name (If entered) */}
                            {title ? (
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: '700',
                                  color: '#0f172a',
                                  marginBottom: 6,
                                  marginTop: 2,
                                }}
                              >
                                📌 {title}
                              </Text>
                            ) : null}

                            {/* Media Image (Panel lines 5618-5642) */}
                            {acctMediaUrl && !previewImgErrors[accountId] ? (
                              <Box
                                style={{
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  marginBottom: 8,
                                  marginTop: 2,
                                }}
                              >
                                <Image
                                  source={{ uri: acctMediaUrl }}
                                  style={styles.mockPostImage}
                                  resizeMode="cover"
                                  onError={() =>
                                    setPreviewImgErrors((prev) => ({ ...prev, [accountId]: true }))
                                  }
                                />
                              </Box>
                            ) : (
                              <Box
                                style={{
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  marginBottom: 8,
                                  marginTop: 2,
                                }}
                              >
                                <Image
                                  source={require('@/assets/images/360_image.jpg')}
                                  style={styles.mockPostImage}
                                  resizeMode="cover"
                                />
                              </Box>
                            )}

                            {/* Post Description / Caption (Panel lines 5644-5664) */}
                            <Text
                              style={{
                                fontSize: 13,
                                color: acctCaption ? '#1e293b' : '#94a3b8',
                                fontStyle: acctCaption ? 'normal' : 'italic',
                                lineHeight: 18,
                                marginBottom: 6,
                              }}
                            >
                              {acctCaption || 'Your post description / caption will appear here...'}
                            </Text>

                            {/* Website Link Banner */}
                            {acctLink ? (
                              <View
                                style={{
                                  backgroundColor: '#eff6ff',
                                  borderWidth: 1,
                                  borderColor: '#bfdbfe',
                                  paddingHorizontal: 8,
                                  paddingVertical: 5,
                                  borderRadius: 6,
                                  marginBottom: 6,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                }}
                              >
                                <Feather
                                  name="link"
                                  size={12}
                                  color="#2563eb"
                                  style={{ marginRight: 5 }}
                                />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: '#1d4ed8',
                                    fontWeight: '600',
                                    flex: 1,
                                  }}
                                  numberOfLines={1}
                                >
                                  {acctLink}
                                </Text>
                              </View>
                            ) : null}

                            {/* Hashtags Chips (Panel lines 5665-5686) */}
                            {acctHashtags.length > 0 && (
                              <HStack space="xs" className="mb-2 flex-wrap">
                                {acctHashtags.map((tag: string, idx: number) => (
                                  <Text
                                    key={idx}
                                    style={{
                                      fontSize: 11,
                                      color: platformConfig.color,
                                      fontWeight: '600',
                                      marginRight: 4,
                                    }}
                                  >
                                    #{tag.replace(/^#/, '')}
                                  </Text>
                                ))}
                              </HStack>
                            )}

                            {/* Action Bar Footer (Panel lines 5689-5736) */}
                            <View
                              style={{
                                borderTopWidth: 1,
                                borderTopColor: '#f1f5f9',
                                paddingTop: 6,
                                marginTop: 4,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <HStack space="sm" className="items-center">
                                <FontAwesome name="heart-o" size={13} color="#64748b" />
                                <FontAwesome
                                  name="comment-o"
                                  size={13}
                                  color="#64748b"
                                  style={{ marginLeft: 8 }}
                                />
                                <FontAwesome
                                  name="share"
                                  size={13}
                                  color="#64748b"
                                  style={{ marginLeft: 8 }}
                                />
                              </HStack>
                              <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '600' }}>
                                {acctMediaUrl ? '1 image' : `${activeContentType} post`}
                              </Text>
                            </View>
                          </Box>
                        );
                      };

                      if (platformAccounts.length > 0) {
                        return (
                          <VStack key={network} space="xs">
                            {platformAccounts.map((acct) => renderCard(acct))}
                          </VStack>
                        );
                      }

                      // If no specific account checkbox selected yet, render platform default preview card with form values
                      return renderCard(null);
                    })}
                  </VStack>
                );
              })()}
            </Box>

            {/* Save & Action Buttons Bar */}
            <VStack space="sm" style={{ marginTop: 8, marginBottom: 40 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#0052d4' }]}
                onPress={() => handleSavePost(isScheduled ? 'scheduled' : 'draft')}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isEditing ? 'Save Changes' : isScheduled ? 'Schedule Post' : 'Save as Draft'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#16a34a' }]}
                onPress={() => handleSavePost('published')}
                disabled={saving}
              >
                <Feather name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Publish Post Now</Text>
              </TouchableOpacity>
            </VStack>
          </VStack>
        )}
      </ScrollView>

      {/* Platforms & Accounts Selection Modal */}
      <Modal
        visible={networksModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setNetworksModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPress={() => setNetworksModalOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.optionsModalCard}>
            <HStack className="mb-3 items-center justify-between">
              <Heading size="md" style={{ color: '#0f172a', fontWeight: '800', fontSize: 18 }}>
                Select Platforms & Accounts
              </Heading>
              <TouchableOpacity
                style={{ padding: 5, backgroundColor: '#15203cff', borderRadius: 24 }}
                onPress={() => setNetworksModalOpen(false)}
              >
                <Feather name="x" size={20} color="#ffffff" />
              </TouchableOpacity>
            </HStack>

            {/* Select All Accounts Master Switch */}
            {socialAccounts.length > 0 ? (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 4,
                  marginBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#e2e8f0',
                }}
                onPress={() => {
                  const allAccIds = socialAccounts.map(
                    (a) => a.account_id || a.value || a.id || a._id
                  );
                  if (selectedAccounts.length === allAccIds.length) {
                    handleAccountSelection([]);
                  } else {
                    handleAccountSelection(allAccIds);
                  }
                }}
              >
                <Feather
                  name={
                    selectedAccounts.length === socialAccounts.length
                      ? 'check-square'
                      : selectedAccounts.length > 0
                        ? 'minus-square'
                        : 'square'
                  }
                  size={18}
                  color="#2563eb"
                  style={{ marginRight: 8 }}
                />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                  Select All Accounts ({socialAccounts.length})
                </Text>
              </TouchableOpacity>
            ) : null}

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {socialAccounts.length === 0 ? (
                <Box style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#64748b', fontSize: 14 }}>
                    No social media accounts available
                  </Text>
                </Box>
              ) : (
                SOCIAL_PLATFORMS.map((plat) => {
                  const platformAccounts = socialAccounts.filter((a) =>
                    isPlatformMatch(a.platform, plat.id)
                  );
                  if (platformAccounts.length === 0) return null;

                  const platformAccIds = platformAccounts.map(
                    (a) => a.account_id || a.value || a.id || a._id
                  );
                  const selectedForPlatform = platformAccIds.filter((id) =>
                    selectedAccounts.includes(id)
                  );
                  const isAllSelected =
                    platformAccIds.length > 0 &&
                    selectedForPlatform.length === platformAccIds.length;
                  const isPartiallySelected = selectedForPlatform.length > 0 && !isAllSelected;

                  return (
                    <Box
                      key={plat.id}
                      style={{
                        marginBottom: 14,
                      }}
                    >
                      {/* Platform Group Header Bar */}
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: `${plat.color}10`,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          marginBottom: 4,
                        }}
                        onPress={() => togglePlatform(plat.id)}
                      >
                        <HStack space="xs" className="items-center" style={{ flex: 1 }}>
                          <Feather
                            name={
                              isAllSelected
                                ? 'check-square'
                                : isPartiallySelected
                                  ? 'minus-square'
                                  : 'square'
                            }
                            size={16}
                            color={plat.color}
                            style={{ marginRight: 8 }}
                          />
                          <FontAwesome
                            name={plat.icon as any}
                            size={15}
                            color={plat.color}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '800',
                              color: plat.color,
                              letterSpacing: 0.5,
                              textTransform: 'uppercase',
                            }}
                          >
                            {plat.label}
                          </Text>
                        </HStack>
                        <Text
                          style={{
                            fontSize: 11,
                            color: '#64748b',
                            fontWeight: '600',
                          }}
                        >
                          {selectedForPlatform.length}/{platformAccounts.length} selected
                        </Text>
                      </TouchableOpacity>

                      {/* Account Items List under Platform */}
                      <VStack space="xs">
                        {platformAccounts.map((acc) => {
                          const accId = acc.account_id || acc.value || acc.id || acc._id;
                          const isAccChecked = selectedAccounts.includes(accId);
                          const displayName =
                            acc.account_name ||
                            (acc.first_name
                              ? `${acc.first_name} ${acc.last_name || ''}`.trim()
                              : '') ||
                            acc.username ||
                            plat.label;

                          const subtitle = acc.page_id
                            ? `Page: ${acc.page_id}`
                            : acc.waba_id
                              ? `WABA: ${acc.waba_id}`
                              : acc.username
                                ? acc.username.startsWith('@')
                                  ? acc.username
                                  : `@${acc.username}`
                                : '';

                          return (
                            <TouchableOpacity
                              key={accId}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingVertical: 8,
                                paddingHorizontal: 8,
                                borderRadius: 8,
                                marginVertical: 1,
                              }}
                              onPress={() => {
                                const updated = isAccChecked
                                  ? selectedAccounts.filter((id) => id !== accId)
                                  : [...selectedAccounts, accId];
                                handleAccountSelection(updated);
                              }}
                            >
                              <HStack space="sm" className="items-center" style={{ flex: 1 }}>
                                {/* Account Avatar Circle */}
                                <Box
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: plat.color,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 10,
                                  }}
                                >
                                  <FontAwesome name={plat.icon as any} size={16} color="#ffffff" />
                                </Box>
                                <VStack style={{ flex: 1 }}>
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      color: '#0f172a',
                                      fontWeight: '700',
                                    }}
                                    numberOfLines={1}
                                  >
                                    {displayName}
                                  </Text>
                                  {subtitle ? (
                                    <Text
                                      style={{ fontSize: 11, color: '#64748b' }}
                                      numberOfLines={1}
                                    >
                                      {subtitle}
                                    </Text>
                                  ) : null}
                                </VStack>
                              </HStack>

                              <Feather
                                name={isAccChecked ? 'check-square' : 'square'}
                                size={18}
                                color={isAccChecked ? plat.color : '#cbd5e1'}
                                style={{ marginLeft: 8 }}
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </VStack>
                    </Box>
                  );
                })
              )}
            </ScrollView>

            {/* Modal Footer Buttons */}
            <HStack
              className="items-center justify-between"
              style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}
            >
              <TouchableOpacity
                onPress={() => setNetworksModalOpen(false)}
                style={{ paddingVertical: 8, paddingHorizontal: 16 }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: '#475569',
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    borderRadius: 20,
                    paddingVertical: 7,
                    paddingHorizontal: 18,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#1e293b',
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
                onPress={() => setNetworksModalOpen(false)}
              >
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
                  Done ({selectedAccounts.length} account{selectedAccounts.length === 1 ? '' : 's'})
                </Text>
              </TouchableOpacity>
            </HStack>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={!!modalImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setModalImageUrl(null)}
      >
        <TouchableOpacity
          style={styles.imageViewerOverlay}
          activeOpacity={1}
          onPress={() => setModalImageUrl(null)}
        >
          <Box style={styles.imageViewerContentBox}>
            <TouchableOpacity
              style={styles.imageViewerCloseBtn}
              onPress={() => setModalImageUrl(null)}
              activeOpacity={0.7}
            >
              <Feather name="x" size={20} color="#ffffff" />
            </TouchableOpacity>
            {modalImageUrl ? (
              <Image
                source={{ uri: modalImageUrl }}
                style={styles.imageViewerImg}
                resizeMode="contain"
              />
            ) : null}
          </Box>
        </TouchableOpacity>
      </Modal>

      {/* Mark Object on Reference Image Modal */}
      <Modal
        visible={markObjectModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setMarkObjectModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              overflow: 'hidden',
              padding: 16,
              maxHeight: '90%',
            }}
          >
            {/* Modal Header */}
            <HStack className="mb-3 items-center justify-between">
              <HStack space="xs" className="items-center gap-2">
                <Feather name="target" size={18} color="#2563eb" />
                <Heading size="sm" style={{ color: '#0f172a', fontWeight: '800', fontSize: 16 }}>
                  Mark Object on Reference Image
                </Heading>
              </HStack>
              <TouchableOpacity
                style={{ padding: 4, backgroundColor: '#f1f5f9', borderRadius: 20 }}
                onPress={() => setMarkObjectModalOpen(false)}
              >
                <Feather name="x" size={18} color="#475569" />
              </TouchableOpacity>
            </HStack>

            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
              Trace or drag with your finger over the object on the reference image to mark it.
            </Text>

            {/* Canvas Drawing Image Area */}
            <View
              style={{
                width: '100%',
                height: 280,
                backgroundColor: '#0f172a',
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width > 0 && height > 0) {
                  setMarkCanvasLayout({ width, height });
                }
              }}
              {...markPanResponder.panHandlers}
            >
              <Image
                source={{
                  uri: markObjectImageUri || (activeTab === 'ai' ? aiRefImage : referenceImageUri),
                }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
              {/* SVG Drawing Canvas Overlay */}
              <Svg
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {/* Saved / Finished Strokes */}
                {markStrokes.map((stroke, idx) => (
                  <Path
                    key={`stroke-${idx}`}
                    d={strokeToSvgPath(stroke)}
                    fill="none"
                    stroke="#9c27b0"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {/* Current Active Stroke */}
                {currentMarkStroke.length > 0 && (
                  <Path
                    d={strokeToSvgPath(currentMarkStroke)}
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </Svg>
            </View>

            {/* Object Label Input */}
            <VStack space="xs" style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                Object Label (Optional)
              </Text>
              <TextInput
                style={[styles.input, { fontSize: 13, backgroundColor: '#f8fafc' }]}
                value={markObjectLabel}
                onChangeText={setMarkObjectLabel}
                placeholder="e.g. main product, bottle, box, logo"
                placeholderTextColor="#94a3b8"
              />
            </VStack>

            {/* Modal Actions */}
            <HStack className="items-center justify-between" style={{ marginTop: 16 }}>
              <TouchableOpacity
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                }}
                onPress={() => {
                  setMarkStrokes([]);
                  setCurrentMarkStroke([]);
                  setMarkObjectModalOpen(false);
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Cancel</Text>
              </TouchableOpacity>

              <HStack space="xs">
                {markStrokes.length > 0 && (
                  <TouchableOpacity
                    style={{
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: '#fef2f2',
                      marginRight: 6,
                    }}
                    onPress={() => setMarkStrokes([])}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626' }}>
                      Reset Mark
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{
                    paddingVertical: 9,
                    paddingHorizontal: 18,
                    borderRadius: 8,
                    backgroundColor:
                      markStrokes.length > 0 || currentMarkStroke.length > 0
                        ? '#2563eb'
                        : '#94a3b8',
                  }}
                  disabled={markStrokes.length === 0 && currentMarkStroke.length === 0}
                  onPress={handleSaveObjectMark}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
                    Save Mark
                  </Text>
                </TouchableOpacity>
              </HStack>
            </HStack>
          </View>
        </View>
      </Modal>

      {/* Existing Image Crop Modal */}
      <Modal
        visible={cropModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCropModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '95%',
              maxWidth: 440,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 18,
              maxHeight: '90%',
            }}
          >
            {/* Modal Header */}
            <HStack
              style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}
            >
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Feather name="crop" size={18} color="#0b53f8" />
                <Heading style={{ fontSize: 17, fontWeight: '700', color: '#0f172a' }}>
                  Crop & Adjust Image
                </Heading>
              </HStack>
              <TouchableOpacity
                onPress={() => setCropModalVisible(false)}
                style={{ padding: 6, backgroundColor: '#f1f5f9', borderRadius: 20 }}
              >
                <Feather name="x" size={18} color="#64748b" />
              </TouchableOpacity>
            </HStack>

            {/* Image Preview Container */}
            <View
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width > 0 && height > 0) {
                  setContainerDim({ width, height });
                }
              }}
              style={{
                width: '100%',
                height: 320,
                backgroundColor: '#090d16',
                borderRadius: 12,
                overflow: 'hidden',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 14,
                position: 'relative',
              }}
            >
              {cropImageUri ? (
                <Image
                  source={{ uri: cropImageUri }}
                  style={{
                    width: '100%',
                    height: '100%',
                    transform: [{ rotate: `${cropRotation}deg` }],
                  }}
                  resizeMode="contain"
                />
              ) : null}

              {/* Draggable & Resizable Custom Crop Overlay Box (8 Handles) */}
              <View
                style={{
                  position: 'absolute',
                  left: cropBox.x,
                  top: cropBox.y,
                  width: cropBox.width,
                  height: cropBox.height,
                  borderWidth: 2,
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                }}
                {...boxMovePan.panHandlers}
              >
                {/* Rule of Thirds Grid Lines */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: '33.33%',
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  }}
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: '66.66%',
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  }}
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: '33.33%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  }}
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: '66.66%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                  }}
                />

                {/* --- 4 Edge Midpoint Handles --- */}
                {/* Top Edge Handle */}
                <View
                  {...topEdgePan.panHandlers}
                  style={{
                    position: 'absolute',
                    top: -9,
                    left: '50%',
                    marginLeft: -15,
                    width: 30,
                    height: 18,
                    borderRadius: 4,
                    backgroundColor: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    elevation: 5,
                  }}
                />
                {/* Bottom Edge Handle */}
                <View
                  {...bottomEdgePan.panHandlers}
                  style={{
                    position: 'absolute',
                    bottom: -9,
                    left: '50%',
                    marginLeft: -15,
                    width: 30,
                    height: 18,
                    borderRadius: 4,
                    backgroundColor: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    elevation: 5,
                  }}
                />
                {/* Left Edge Handle */}
                <View
                  {...leftEdgePan.panHandlers}
                  style={{
                    position: 'absolute',
                    left: -9,
                    top: '50%',
                    marginTop: -15,
                    width: 18,
                    height: 30,
                    borderRadius: 4,
                    backgroundColor: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    elevation: 5,
                  }}
                />
                {/* Right Edge Handle */}
                <View
                  {...rightEdgePan.panHandlers}
                  style={{
                    position: 'absolute',
                    right: -9,
                    top: '50%',
                    marginTop: -15,
                    width: 18,
                    height: 30,
                    borderRadius: 4,
                    backgroundColor: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    elevation: 5,
                  }}
                />

                {/* --- 4 Corner Handles --- */}
                {/* Top-Left Corner Handle */}
                <View
                  {...topLeftPan.panHandlers}
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: -10,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    elevation: 5,
                  }}
                />
                {/* Top-Right Corner Handle */}
                <View
                  {...topRightPan.panHandlers}
                  style={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    elevation: 5,
                  }}
                />
                {/* Bottom-Left Corner Handle */}
                <View
                  {...bottomLeftPan.panHandlers}
                  style={{
                    position: 'absolute',
                    bottom: -10,
                    left: -10,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    elevation: 5,
                  }}
                />
                {/* Bottom-Right Corner Handle */}
                <View
                  {...bottomRightPan.panHandlers}
                  style={{
                    position: 'absolute',
                    bottom: -10,
                    right: -10,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: '#ffffff',
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    elevation: 5,
                  }}
                />
              </View>
            </View>

            {/* Aspect Ratio & Custom Controls */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 }}>
              Select Aspect Ratio / Custom Mode:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14 }}
            >
              <HStack space="xs">
                {(
                  [
                    { key: 'custom', label: 'Custom (Free)' },
                    { key: '1:1', label: '1:1 Square' },
                    { key: '4:5', label: '4:5 Portrait' },
                    { key: '16:9', label: '16:9 Landscape' },
                    { key: '9:16', label: '9:16 Reel/Story' },
                    { key: 'original', label: 'Original' },
                  ] as const
                ).map((ratio) => {
                  const isSelected = selectedCropAspect === ratio.key;
                  return (
                    <TouchableOpacity
                      key={ratio.key}
                      onPress={() => handleSelectAspect(ratio.key)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? '#0b53f8' : '#cbd5e1',
                        backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? '#0b53f8' : '#475569',
                        }}
                      >
                        {ratio.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HStack>
            </ScrollView>

            {/* Rotate Controls */}
            <HStack
              style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                Rotate Image:
              </Text>
              <HStack space="xs">
                <TouchableOpacity
                  onPress={() => setCropRotation((prev) => (prev - 90 + 360) % 360)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Feather name="rotate-ccw" size={14} color="#475569" />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>-90°</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCropRotation((prev) => (prev + 90) % 360)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Feather name="rotate-cw" size={14} color="#475569" />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>+90°</Text>
                </TouchableOpacity>
              </HStack>
            </HStack>

            {/* Modal Actions */}
            <HStack style={{ justifyContent: 'flex-end' }} space="sm">
              <TouchableOpacity
                onPress={() => setCropModalVisible(false)}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: '#f1f5f9',
                }}
                disabled={croppingInProgress}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApplyCrop}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 18,
                  borderRadius: 8,
                  backgroundColor: '#0b53f8',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
                disabled={croppingInProgress}
              >
                {croppingInProgress ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#ffffff" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
                      Apply Crop & Save
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </HStack>
          </View>
        </View>
      </Modal>

      {/* AI Variant Modal (Popup) */}
      <Modal
        visible={aiVariantModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAiVariantModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 12,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 540,
              height: 600,
              backgroundColor: '#ffffff',
              borderRadius: 20,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Modal Header */}
            <Box
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: '#f8fafc',
                borderBottomWidth: 1,
                borderBottomColor: '#e2e8f0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <HStack space="xs" className="items-center gap-2.5" style={{ flex: 1 }}>
                <Box
                  style={{
                    borderRadius: 10,
                    backgroundColor: '#eff6ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="sparkles" size={20} color="#2563eb" />
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Heading size="sm" style={{ color: '#0f172a', fontWeight: '800', fontSize: 16 }}>
                    Choose AI Variant
                  </Heading>
                  <Text
                    style={{ fontSize: 11, color: '#64748b', lineHeight: 16 }}
                    numberOfLines={1}
                  >
                    Pick a variation to load into Manual Post, download, or refine.
                  </Text>
                </VStack>
              </HStack>

              <HStack space="xs" className="items-center gap-2">
                {aiGeneratedPosts.length > 1 && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f0fdf4',
                      borderWidth: 1,
                      borderColor: '#16a34a',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 14,
                      gap: 4,
                    }}
                    onPress={downloadAllPosts}
                    disabled={downloadingAll}
                  >
                    {downloadingAll ? (
                      <ActivityIndicator size="small" color="#16a34a" />
                    ) : (
                      <Feather name="download" size={13} color="#16a34a" />
                    )}
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>
                      {downloadingAll ? 'Downloading...' : 'Download All'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={{ padding: 6, backgroundColor: '#f1f5f9', borderRadius: 20 }}
                  onPress={() => setAiVariantModalOpen(false)}
                >
                  <Feather name="x" size={18} color="#475569" />
                </TouchableOpacity>
              </HStack>
            </Box>

            {/* Modal Body / Variants List */}
            <ScrollView style={{ padding: 12, flex: 1 }} showsVerticalScrollIndicator={false}>
              {(aiGeneratedPosts.length > 0 ? aiGeneratedPosts : aiResult ? [aiResult] : []).map(
                (postItem, index) => {
                  const label = String(postItem.variant_name || `Option ${index + 1}`);
                  const itemCap = String(postItem.caption || '');
                  const itemImg = String(postItem.image_url || postItem.image || '').trim();
                  const itemHashtags = Array.isArray(postItem.hashtags)
                    ? postItem.hashtags
                    : typeof postItem.hashtags === 'string'
                      ? postItem.hashtags.split(',').map((t: string) => t.trim())
                      : [];
                  const itemPostId = String(postItem.id || postItem._id || label);
                  const isDownloading = downloadingPostIds.has(itemPostId);
                  const isExpanded = !!expandedHashtags[itemPostId];

                  return (
                    <Box
                      key={itemPostId + index}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        padding: 12,
                        // marginBottom: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      {/* Image Preview with overlay download */}
                      {itemImg ? (
                        <Box
                          style={{
                            width: '100%',
                            height: 190,
                            borderRadius: 12,
                            overflow: 'hidden',
                            position: 'relative',
                            backgroundColor: '#f1f5f9',
                            marginBottom: 12,
                          }}
                        >
                          <TouchableOpacity
                            activeOpacity={0.9}
                            style={{ width: '100%', height: '100%' }}
                            onPress={() => setModalImageUrl(getImageUrl(itemImg) || itemImg)}
                          >
                            <Image
                              source={{ uri: getImageUrl(itemImg) || itemImg }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>

                          {/* Quick Download Overlay Button */}
                          <TouchableOpacity
                            style={{
                              position: 'absolute',
                              bottom: 8,
                              right: 8,
                              backgroundColor: 'rgba(15, 23, 42, 0.75)',
                              borderRadius: 20,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onPress={() => downloadPost(postItem, label)}
                          >
                            <Feather name="download" size={13} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '600' }}>
                              Save Image
                            </Text>
                          </TouchableOpacity>
                        </Box>
                      ) : null}

                      {/* Header Badge */}
                      <HStack className="mb-2 items-center justify-between">
                        <Box
                          style={{
                            backgroundColor: '#eff6ff',
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderRadius: 12,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>
                            ✨ {label}
                          </Text>
                        </Box>
                        {postItem.platform ? (
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: '#64748b',
                              textTransform: 'capitalize',
                            }}
                          >
                            {postItem.platform}
                          </Text>
                        ) : null}
                      </HStack>

                      {/* Title & Caption */}
                      {postItem.title ? (
                        <Text
                          style={{
                            fontWeight: '700',
                            color: '#0f172a',
                            fontSize: 14,
                            marginBottom: 4,
                          }}
                        >
                          {postItem.title}
                        </Text>
                      ) : null}
                      <Text style={{ color: '#334155', fontSize: 13, lineHeight: 20 }}>
                        {itemCap}
                      </Text>

                      {/* Hashtags */}
                      {itemHashtags.length > 0 && (
                        <VStack style={{ marginTop: 8 }}>
                          <HStack space="xs" className="flex-wrap gap-1">
                            {(isExpanded ? itemHashtags : itemHashtags.slice(0, 8)).map(
                              (tag: string, idx: number) => (
                                <Box
                                  key={idx}
                                  style={{
                                    backgroundColor: '#f8fafc',
                                    borderWidth: 1,
                                    borderColor: '#e2e8f0',
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    borderRadius: 12,
                                  }}
                                >
                                  <Text
                                    style={{ fontSize: 11, color: '#475569', fontWeight: '500' }}
                                  >
                                    #{String(tag).replace(/^#/, '')}
                                  </Text>
                                </Box>
                              )
                            )}
                            {itemHashtags.length > 8 && (
                              <TouchableOpacity
                                onPress={() =>
                                  setExpandedHashtags((prev) => ({
                                    ...prev,
                                    [itemPostId]: !prev[itemPostId],
                                  }))
                                }
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: '#2563eb',
                                    fontWeight: '700',
                                    alignSelf: 'center',
                                    paddingHorizontal: 4,
                                  }}
                                >
                                  {isExpanded ? 'Show Less' : `+${itemHashtags.length - 8} more`}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </HStack>
                        </VStack>
                      )}

                      {/* Per-card Toolbar Actions */}
                      <HStack className="mt-3 flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                        {/* Copy Text Button */}
                        <TouchableOpacity
                          style={[
                            styles.actionIconBtn,
                            { paddingHorizontal: 10, paddingVertical: 6 },
                          ]}
                          onPress={() => copyPostContent(postItem)}
                        >
                          <Feather name="copy" size={13} color="#475569" />
                          <Text style={[styles.actionIconBtnText, { fontSize: 11 }]}>
                            Copy Text
                          </Text>
                        </TouchableOpacity>

                        {/* Download Text (.txt) Button */}
                        <TouchableOpacity
                          style={[
                            styles.actionIconBtn,
                            { paddingHorizontal: 10, paddingVertical: 6 },
                          ]}
                          onPress={() => downloadTextContent(postItem, label)}
                        >
                          <Feather name="file-text" size={13} color="#0284c7" />
                          <Text
                            style={[styles.actionIconBtnText, { color: '#0284c7', fontSize: 11 }]}
                          >
                            .txt
                          </Text>
                        </TouchableOpacity>

                        {/* Download Post (Image + Text) Button */}
                        <TouchableOpacity
                          style={[
                            styles.actionIconBtn,
                            {
                              borderColor: '#16a34a',
                              backgroundColor: '#f0fdf4',
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            },
                            (downloadingAll || isDownloading) && { opacity: 0.6 },
                          ]}
                          disabled={downloadingAll || isDownloading}
                          onPress={() => downloadPost(postItem, label)}
                        >
                          {isDownloading ? (
                            <ActivityIndicator size="small" color="#16a34a" />
                          ) : (
                            <Feather name="download" size={13} color="#16a34a" />
                          )}
                          <Text
                            style={[styles.actionIconBtnText, { color: '#16a34a', fontSize: 11 }]}
                          >
                            Download Post
                          </Text>
                        </TouchableOpacity>

                        {/* Use / Apply Button (Transfers content to Manual Post tab) */}
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#2563eb',
                            paddingHorizontal: 14,
                            paddingVertical: 6,
                            borderRadius: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          onPress={() => applyAiContent(postItem)}
                        >
                          <Feather name="check-circle" size={13} color="#ffffff" />
                          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                            Use
                          </Text>
                        </TouchableOpacity>
                      </HStack>
                    </Box>
                  );
                }
              )}
            </ScrollView>

            {/* Refine / Regenerate Expandable Panel */}
            {aiRefinePanelOpen && (
              <Box
                style={{
                  padding: 12,
                  backgroundColor: '#fffbeb',
                  borderTopWidth: 1,
                  borderTopColor: '#fef3c7',
                }}
              >
                <Text
                  style={{ fontSize: 12, color: '#92400e', fontWeight: '700', marginBottom: 6 }}
                >
                  💡 Tell AI how to refine (tone, length, offer, or style):
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      fontSize: 13,
                      backgroundColor: '#ffffff',
                      borderColor: '#fde68a',
                      minHeight: 52,
                    },
                  ]}
                  value={aiRefinePrompt}
                  onChangeText={setAiRefinePrompt}
                  placeholder='e.g. "Make it shorter and punchier", "Add a limited-time weekend offer"'
                  placeholderTextColor="#a16207"
                  multiline
                />
                <HStack className="mt-3 justify-end gap-2">
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: '#d97706',
                      backgroundColor: '#ffffff',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onPress={handleAiRegenerateImage}
                    disabled={aiRegeneratingImage || aiGenerating}
                  >
                    {aiRegeneratingImage ? (
                      <ActivityIndicator size="small" color="#d97706" />
                    ) : (
                      <Feather name="image" size={13} color="#d97706" />
                    )}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#d97706' }}>
                      {aiRegeneratingImage ? 'Generating...' : 'New Image Only'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: '#d97706',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onPress={handleAiRefine}
                    disabled={aiGenerating || !aiRefinePrompt.trim()}
                  >
                    {aiGenerating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Feather name="refresh-cw" size={13} color="#ffffff" />
                    )}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                      {aiGenerating ? 'Refining...' : 'Regenerate'}
                    </Text>
                  </TouchableOpacity>
                </HStack>
              </Box>
            )}

            {/* Modal Footer / Refine Section Bar */}
            <Box
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: '#fffbeb',
                borderTopWidth: 1,
                borderTopColor: '#fef3c7',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <HStack
                space="xs"
                className="items-center gap-1.5"
                style={{ flex: 1, minWidth: 200 }}
              >
                <Ionicons name="bulb-outline" size={16} color="#d97706" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400e' }}>
                  Not satisfied? Refine with AI
                </Text>
              </HStack>

              <HStack space="xs" className="items-center gap-2">
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: aiRefinePanelOpen ? '#d97706' : '#ffffff',
                    borderWidth: 1,
                    borderColor: '#d97706',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onPress={() => setAiRefinePanelOpen(!aiRefinePanelOpen)}
                >
                  <Feather
                    name={aiRefinePanelOpen ? 'chevron-down' : 'sliders'}
                    size={13}
                    color={aiRefinePanelOpen ? '#ffffff' : '#d97706'}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: aiRefinePanelOpen ? '#ffffff' : '#d97706',
                    }}
                  >
                    {aiRefinePanelOpen ? 'Hide Refine' : 'Refine / Regenerate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    backgroundColor: '#ffffff',
                  }}
                  onPress={() => setAiVariantModalOpen(false)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Close</Text>
                </TouchableOpacity>
              </HStack>
            </Box>
          </View>
        </View>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  cropModalContainer: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  cropModalImagePreviewContainer: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropActionOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cropActionOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  cancelModalBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  headerGradient: {
    paddingBottom: 4,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGlowCircle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerGlowCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '400',
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  headerSaveBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  headerSaveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  mainTabBar: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  mainTabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mainTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  mainTabLabelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 50,
  },
  cardTitle: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 4,
  },
  cardSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#0f172a',
    fontSize: 14,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  providerChipActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  providerChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  providerChipTextActive: {
    color: '#0369a1',
    fontWeight: '700',
  },
  uploadBox: {
    height: 110,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#0052d4',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 6,
  },
  imagePreviewBox: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  uploadedImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  removeImgBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    padding: 8,
    borderRadius: 20,
  },
  imageActionOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  imgActionBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    padding: 8,
    borderRadius: 20,
  },
  primaryBtn: {
    backgroundColor: '#0052d4',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  aiResultCard: {
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  applyBtn: {
    backgroundColor: '#0052d4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  downloadAllBtn: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  downloadAllBtnText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  actionIconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  previewImageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#e2e8f0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageDownloadOverlayBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  tagText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '600',
  },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  platformPillActive: {
    backgroundColor: '#0052d4',
    borderColor: '#0052d4',
  },
  platformPillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 6,
  },
  platformPillLabelActive: {
    color: '#fff',
  },
  accountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subTabList: {
    paddingVertical: 8,
    gap: 6,
  },
  subTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 4,
  },
  subTabBtnActive: {
    backgroundColor: '#0052d4',
    borderColor: '#0052d4',
  },
  subTabText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  miniPrevTab: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPrevTabActive: {
    backgroundColor: '#dbeafe',
  },
  mockFeedCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mockAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0052d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockPostImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  mockImagePlaceholder: {
    height: 120,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
    marginRight: 4,
  },
  accountPillActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  accountPillText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  accountPillTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  optionsModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  imageViewerContentBox: {
    position: 'relative',
    width: '100%',
    maxHeight: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  imageViewerCloseBtn: {
    position: 'absolute',
    top: -12,
    right: -12,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  imageViewerImg: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});
