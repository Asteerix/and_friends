import React, { useState } from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function InputBar({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <View style={styles.container}>
      <TouchableOpacity>
        <Ionicons name="image-outline" size={24} color="#5C5C5C" />
      </TouchableOpacity>
      <TouchableOpacity>
        <Ionicons name="document-text-outline" size={24} color="#5C5C5C" />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Type a message…"
        placeholderTextColor="#9E9E9E"
      />
      <TouchableOpacity
        style={styles.sendBtn}
        onPress={() => {
          if (text.trim()) {
            onSend(text);
            setText('');
          }
        }}
      >
        <Ionicons name="arrow-up-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: Platform.select({
      ios: 'SFProText-Regular',
      android: 'Roboto',
    }),
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
