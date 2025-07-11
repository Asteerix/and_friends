import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { CachedImage } from './CachedImage';

// Example component showing how to use CachedImage
export const CachedImageExample: React.FC = () => {
  const imageUrls = [
    'https://picsum.photos/200/300',
    'https://picsum.photos/400/400',
    'https://picsum.photos/300/200',
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Cached Image Examples</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Usage</Text>
        <CachedImage
          uri="https://picsum.photos/200/200"
          style={styles.image}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>With Placeholder</Text>
        <CachedImage
          uri="https://picsum.photos/200/201"
          placeholder="https://via.placeholder.com/200"
          style={styles.image}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>With Fallback</Text>
        <CachedImage
          uri="https://invalid-url-that-will-fail.com/image.jpg"
          fallback="https://via.placeholder.com/200/FF0000/FFFFFF?text=Error"
          style={styles.image}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grid Layout</Text>
        <View style={styles.grid}>
          {imageUrls.map((url, index) => (
            <CachedImage
              key={index}
              uri={url}
              style={styles.gridImage}
              priority="high"
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridImage: {
    width: '31%',
    aspectRatio: 1,
    marginBottom: 10,
    borderRadius: 5,
  },
});