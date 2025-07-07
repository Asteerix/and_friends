import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const { width: screenWidth } = Dimensions.get('window');

export interface TabItem {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
}

interface AnimatedTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabName: string) => void;
};
export default function AnimatedTabBar({
  tabs,
  activeTab,
  onTabPress,
}: AnimatedTabBarProps) {
  const insets = useSafeAreaInsets();
  const [tabPositions, setTabPositions] = React.useState<number[]>([]);
  const animatedIndicator = React.useRef(new Animated.Value(0)).current;
  const scaleAnims = React.useRef(
    tabs.map(() => new Animated.Value(1))
  ).current;

  React.useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.name === activeTab);
    if (activeIndex !== -1 && tabPositions[activeIndex] !== undefined) {
      Animated.spring(animatedIndicator, {
        toValue: tabPositions[activeIndex],
        useNativeDriver: true,
        tension: 68,
        friction: 10,
      }).start();
    }
  }, [activeTab, tabPositions]);

  const handleTabPress = (tab: TabItem, index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate scale
    if (scaleAnims[index]) {
      Animated.sequence([
        Animated.timing(scaleAnims[index], {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnims[index], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    onTabPress(tab.name);
  };

  const tabWidth = screenWidth / tabs.length;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <BlurView intensity={100} style={StyleSheet.absoluteFillObject} />
      
      {/* Animated indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            width: tabWidth * 0.6,
            transform: [{ translateX: animatedIndicator }],
          },
        ]}
      />

      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => {
          const isActive = tab.name === activeTab;
          
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => handleTabPress(tab, index)}
              onLayout={(event) => {
                const { x } = event.nativeEvent.layout;
                const positions = [...tabPositions];
                positions[index] = x + (tabWidth - tabWidth * 0.6) / 2;
                setTabPositions(positions);
              }}
              style={styles.tab}
            >
              <Animated.View
                style={[
                  styles.tabContent,
                  scaleAnims[index] ? { transform: [{ scale: scaleAnims[index] }] } : {},
                ]}
              >
                <View>
                  <Ionicons
                    name={tab.icon}
                    size={24}
                    color={isActive ? '#fff' : '#666'}
                    style={styles.icon}
                  />
                  {tab.badge && tab.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.label,
                    { color: isActive ? '#fff' : '#666' },
                  ]}
                >
                  {tab.label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});