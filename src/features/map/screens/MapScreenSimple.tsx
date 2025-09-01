import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';

console.log('🚀 [MapScreenSimple] File loaded');

const MapScreenSimple = () => {
  console.log('🏁 [MapScreenSimple] Component rendering');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, color: '#000' }}>Map Test</Text>
        <Text style={{ fontSize: 16, color: '#666', marginTop: 10 }}>
          If you see this, React is working!
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default MapScreenSimple;
