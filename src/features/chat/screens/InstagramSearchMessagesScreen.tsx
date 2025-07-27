import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  sender: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function InstagramSearchMessagesScreen() {
  const params = useLocalSearchParams<{ chatId: string }>();
  const chatId = params?.chatId;
  const router = useRouter();
  const { session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatInfo, setChatInfo] = useState<any>(null);
  
  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (chatId) {
      loadChatInfo();
    }
  }, [chatId]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchMessages();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const loadChatInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*, participants(user_id, profiles(full_name, avatar_url))')
        .eq('id', chatId)
        .single();

      if (error) throw error;
      setChatInfo(data);
    } catch (error) {
      console.error('Error loading chat info:', error);
    }
  };

  const searchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          sender:profiles!messages_user_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('chat_id', chatId)
        .ilike('content', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error searching messages:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultPress = (message: SearchResult) => {
    // Navigate back to conversation with highlighted message
    router.back();
    // TODO: Implement scroll to message functionality
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const isOwnMessage = item.user_id === currentUserId;
    const messageDate = new Date(item.created_at);
    
    return (
      <TouchableOpacity 
        style={styles.resultItem}
        onPress={() => handleResultPress(item)}
      >
        <View style={styles.resultHeader}>
          <Text style={styles.senderName}>
            {isOwnMessage ? 'Vous' : item.sender?.full_name || 'Utilisateur'}
          </Text>
          <Text style={styles.resultDate}>
            {format(messageDate, 'dd MMM yyyy', { locale: fr })}
          </Text>
        </View>
        
        <Text style={styles.resultContent} numberOfLines={2}>
          {item.content}
        </Text>
        
        {searchQuery && (
          <View style={styles.highlightContainer}>
            {item.content.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, index) => (
              <Text key={index} style={[
                styles.resultContent,
                part.toLowerCase() === searchQuery.toLowerCase() && styles.highlight
              ]}>
                {part}
              </Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      {searchQuery.length < 2 ? (
        <>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            Tapez au moins 2 caractères pour rechercher
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            Aucun message trouvé pour "{searchQuery}"
          </Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher dans la conversation"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results Count */}
        {searchQuery.length >= 2 && !loading && (
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsCount}>
              {results.length} {results.length === 1 ? 'résultat' : 'résultats'}
            </Text>
          </View>
        )}

        {/* Search Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <FlatList
            data={results}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            contentContainerStyle={results.length === 0 ? styles.emptyContainer : styles.resultsList}
            ListEmptyComponent={<EmptyState />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  resultsInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  resultsCount: {
    fontSize: 14,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    paddingVertical: 8,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  resultDate: {
    fontSize: 12,
    color: '#999',
  },
  resultContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  highlightContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  highlight: {
    backgroundColor: '#FFEB3B',
    color: '#000',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#DBDBDB',
    marginHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});