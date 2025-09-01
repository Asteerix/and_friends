import React from 'react';
import { TouchableOpacity, View, StyleSheet, Platform, ActionSheetIOS, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../config/Colors';
import CustomText from './CustomText';

export interface OptionItem {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action: () => void;
  destructive?: boolean;
  hidden?: boolean;
}

interface ReportConfig {
  enabled: boolean;
  onReport: () => void;
}

interface OptionsMenuProps {
  options: OptionItem[];
  trigger?: React.ReactNode;
  reportConfig?: ReportConfig;
}

export default function OptionsMenu({ options, trigger, reportConfig }: OptionsMenuProps) {
  const allOptions = React.useMemo(() => {
    const visibleOptions = options.filter((opt) => !opt.hidden);

    if (reportConfig?.enabled) {
      visibleOptions.push({
        label: 'Signaler',
        icon: 'flag-outline',
        action: reportConfig.onReport,
        destructive: true,
      });
    }

    return visibleOptions;
  }, [options, reportConfig]);

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      const optionLabels = allOptions.map((opt) => opt.label);
      const destructiveButtonIndex = allOptions.findIndex((opt) => opt.destructive);

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', ...optionLabels],
          cancelButtonIndex: 0,
          destructiveButtonIndex:
            destructiveButtonIndex >= 0 ? destructiveButtonIndex + 1 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            allOptions[buttonIndex - 1].action();
          }
        }
      );
    } else {
      // For Android, we can create a custom modal or use a library
      // For now, let's use Alert with limited options
      Alert.alert(
        'Options',
        undefined,
        [
          ...allOptions.map((opt) => ({
            text: opt.label,
            onPress: opt.action,
            style: opt.destructive ? 'destructive' : 'default',
          })),
          {
            text: 'Annuler',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    }
  };

  if (trigger) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {trigger}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.defaultTrigger} activeOpacity={0.7}>
      <Ionicons name="ellipsis-horizontal" size={24} color={Colors.light.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  defaultTrigger: {
    padding: 8,
  },
});
