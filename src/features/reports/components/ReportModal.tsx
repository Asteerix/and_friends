import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import CustomText from '@/shared/ui/CustomText';
import { Colors } from '@/shared/config/Colors';
import { useReports, ReportType, ReportReason } from '@/hooks/useReports';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  type: ReportType;
  targetId: string;
  targetName?: string;
  onReportSubmitted?: () => void;
}

const REPORT_REASONS = [
  {
    value: 'inappropriate_content' as ReportReason,
    label: 'Contenu inapproprié',
    icon: 'alert-circle-outline',
  },
  {
    value: 'spam' as ReportReason,
    label: 'Spam',
    icon: 'mail-unread-outline',
  },
  {
    value: 'harassment' as ReportReason,
    label: 'Harcèlement',
    icon: 'hand-left-outline',
  },
  {
    value: 'fake_profile' as ReportReason,
    label: 'Faux profil',
    icon: 'person-remove-outline',
  },
  {
    value: 'inappropriate_name' as ReportReason,
    label: 'Nom inapproprié',
    icon: 'text-outline',
  },
  {
    value: 'violence' as ReportReason,
    label: 'Violence',
    icon: 'warning-outline',
  },
  {
    value: 'hate_speech' as ReportReason,
    label: 'Discours haineux',
    icon: 'megaphone-outline',
  },
  {
    value: 'adult_content' as ReportReason,
    label: 'Contenu adulte',
    icon: 'eye-off-outline',
  },
  {
    value: 'misinformation' as ReportReason,
    label: 'Désinformation',
    icon: 'information-circle-outline',
  },
  {
    value: 'copyright' as ReportReason,
    label: 'Violation de droits d\'auteur',
    icon: 'shield-checkmark-outline',
  },
  {
    value: 'other' as ReportReason,
    label: 'Autre',
    icon: 'ellipsis-horizontal-outline',
  },
];

export default function ReportModal({
  visible,
  onClose,
  type,
  targetId,
  targetName,
  onReportSubmitted,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { reportUser, reportEvent, reportMessage, reportStory, reportMemory } = useReports();

  const handleSelectReason = (reason: ReportReason) => {
    setSelectedReason(reason);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Erreur', 'Veuillez sélectionner une raison');
      return;
    }

    setIsSubmitting(true);
    try {
      let result;
      switch (type) {
        case 'user':
          result = await reportUser(targetId, selectedReason, description);
          break;
        case 'event':
          result = await reportEvent(targetId, selectedReason, description);
          break;
        case 'message':
          result = await reportMessage(targetId, selectedReason, description);
          break;
        case 'story':
          result = await reportStory(targetId, selectedReason, description);
          break;
        case 'memory':
          result = await reportMemory(targetId, selectedReason, description);
          break;
      }

      if (result) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Signalement envoyé',
          'Merci pour votre signalement. Notre équipe va examiner ce contenu.',
          [{ text: 'OK', onPress: () => handleClose() }]
        );
        onReportSubmitted?.();
      }
    } catch (error: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors du signalement'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  const getContentTypeLabel = () => {
    switch (type) {
      case 'user':
        return 'ce profil';
      case 'event':
        return 'cet événement';
      case 'message':
        return 'ce message';
      case 'story':
        return 'cette story';
      case 'memory':
        return 'ce souvenir';
      default:
        return 'ce contenu';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <BlurView intensity={80} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <CustomText size="lg" weight="bold">
                Signaler {getContentTypeLabel()}
              </CustomText>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {targetName && (
                <View style={styles.targetInfo}>
                  <CustomText size="md" color="#666">
                    {targetName}
                  </CustomText>
                </View>
              )}

              <CustomText size="md" style={styles.subtitle}>
                Pourquoi signalez-vous {getContentTypeLabel()} ?
              </CustomText>

              {/* Reasons */}
              <View style={styles.reasonsList}>
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.value}
                    style={[
                      styles.reasonItem,
                      selectedReason === reason.value && styles.reasonItemSelected,
                    ]}
                    onPress={() => handleSelectReason(reason.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reasonIcon}>
                      <Ionicons
                        name={reason.icon as any}
                        size={24}
                        color={
                          selectedReason === reason.value
                            ? Colors.light.tint
                            : Colors.light.textSecondary
                        }
                      />
                    </View>
                    <CustomText
                      size="md"
                      color={
                        selectedReason === reason.value
                          ? Colors.light.tint
                          : Colors.light.text
                      }
                      style={styles.reasonLabel}
                    >
                      {reason.label}
                    </CustomText>
                    {selectedReason === reason.value && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={Colors.light.tint}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description */}
              {selectedReason && (
                <View style={styles.descriptionContainer}>
                  <CustomText size="md" style={styles.descriptionLabel}>
                    Détails supplémentaires (optionnel)
                  </CustomText>
                  <TextInput
                    style={styles.descriptionInput}
                    placeholder="Décrivez le problème..."
                    placeholderTextColor="#999"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <CustomText size="sm" color="#999" style={styles.charCount}>
                    {description.length}/500
                  </CustomText>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedReason || isSubmitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!selectedReason || isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <CustomText size="md" color="#FFF" weight="bold">
                    Envoyer le signalement
                  </CustomText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  targetInfo: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 15,
  },
  subtitle: {
    marginTop: 20,
    marginBottom: 15,
  },
  reasonsList: {
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 10,
  },
  reasonItemSelected: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: Colors.light.tint,
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  reasonLabel: {
    flex: 1,
  },
  descriptionContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  descriptionLabel: {
    marginBottom: 10,
  },
  descriptionInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    minHeight: 100,
    fontSize: 16,
    color: Colors.light.text,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 5,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  submitButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCC',
  },
});