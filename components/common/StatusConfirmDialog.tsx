import React from 'react';
import { Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Feather } from '@expo/vector-icons';

export interface StatusConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  itemPreview?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  targetStatus?: 0 | 1 | 'active' | 'deactive' | 'delete';
  headerIcon?: keyof typeof Feather.glyphMap;
  confirmColor?: string;
  customBrandColor?: string;
}

export default function StatusConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  itemPreview,
  confirmText,
  cancelText = 'Cancel',
  loading = false,
  targetStatus = 1,
  headerIcon,
  confirmColor,
  customBrandColor,
}: StatusConfirmDialogProps) {
  const isActivating = targetStatus === 1 || targetStatus === 'active';
  const isDelete = targetStatus === 'delete';

  const defaultTitle = isDelete ? 'Delete Item' : isActivating ? 'Active Item' : 'Deactive Item';

  const defaultMessage = isDelete
    ? 'This action cannot be undone. Are you sure you want to delete this item?'
    : isActivating
      ? 'Are you sure you want to active this item?'
      : 'Are you sure you want to deactive this item?';

  const defaultConfirmText = isDelete ? 'Delete' : isActivating ? 'Active' : 'Deactive';

  const iconName: keyof typeof Feather.glyphMap =
    headerIcon || (isDelete ? 'trash-2' : isActivating ? 'check-circle' : 'alert-circle');

  const mainColor = customBrandColor || confirmColor || (isDelete ? '#dc2626' : '#2563eb');
  const lightBgColor = isDelete ? '#fef2f2' : '#eff6ff';
  const borderColor = isDelete ? '#fecaca' : '#bfdbfe';

  const displayTitle = title || defaultTitle;
  const displayMessage = message || defaultMessage;
  const displayConfirmText = confirmText || defaultConfirmText;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!loading) onClose();
      }}
    >
      <Box style={styles.overlay}>
        <Box style={styles.dialogContainer}>
          {/* Header with Icon */}
          <HStack style={styles.headerStack}>
            <Box style={[styles.iconAvatar, { backgroundColor: lightBgColor }]}>
              <Feather name={iconName} size={22} color={mainColor} />
            </Box>
            <Text style={styles.titleText}>{displayTitle}</Text>
          </HStack>

          {/* Message */}
          <VStack style={{ marginTop: 12 }}>
            <Text style={styles.messageText}>{displayMessage}</Text>

            {itemName ? (
              <Box style={[styles.itemPreviewCard, { backgroundColor: lightBgColor, borderColor }]}>
                <Text style={styles.previewLabel}>ITEM</Text>
                <Text style={styles.previewNameText} numberOfLines={2}>
                  {itemName}
                </Text>
              </Box>
            ) : itemPreview ? (
              <Box style={[styles.itemPreviewCard, { backgroundColor: lightBgColor, borderColor }]}>
                <Text style={styles.previewLabel}>PREVIEW</Text>
                <Text style={styles.previewNameText} numberOfLines={2}>
                  {itemPreview}
                </Text>
              </Box>
            ) : null}
          </VStack>

          {/* Actions */}
          <HStack style={styles.actionStack}>
            <TouchableOpacity disabled={loading} style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={loading}
              style={[styles.confirmButton, { backgroundColor: mainColor }]}
              onPress={onConfirm}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmButtonText}>{displayConfirmText}</Text>
              )}
            </TouchableOpacity>
          </HStack>
        </Box>
      </Box>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  itemPreviewCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  previewNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },
  actionStack: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
