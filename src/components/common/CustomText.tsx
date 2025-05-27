import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface CustomTextProps extends TextProps {
  variant?: 'afterHours' | 'playfair' | 'offbeat' | 'regular';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  color?: string;
  weight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
}

const fontFamilies = {
  afterHours: 'AfterHours',
  playfair: 'PlayfairDisplay-Bold',
  offbeat: 'Offbeat',
  regular: 'SpaceMono-Regular',
};

const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export default function CustomText({
  variant = 'regular',
  size = 'md',
  color = '#000',
  weight = 'normal',
  align = 'left',
  style,
  children,
  ...props
}: CustomTextProps) {
  return (
    <Text
      style={[
        {
          fontFamily: fontFamilies[variant],
          fontSize: fontSizes[size],
          color,
          fontWeight: weight,
          textAlign: align,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

export function AfterHoursText(props: Omit<CustomTextProps, 'variant'>) {
  return <CustomText variant="afterHours" {...props} />;
}

export function PlayfairText(props: Omit<CustomTextProps, 'variant'>) {
  return <CustomText variant="playfair" {...props} />;
}

export function OffbeatText(props: Omit<CustomTextProps, 'variant'>) {
  return <CustomText variant="offbeat" {...props} />;
}