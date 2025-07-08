import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useRealtimeManager } from './useRealtimeManager';

/**
 * Exemple 1: Utilisation simple pour les messages
 */
export function MessagesWithRealtime({ chatId }: { chatId: string }) {
  const [messages, setMessages] = useState<any[]>([]);

  const { isConnected, subscribe } = useRealtimeManager();
  
  useEffect(() => {
    const cleanup = subscribe(`messages:${chatId}`, {
      table: 'messages',
      filter: `chat_id=eq.${chatId}`,
      
      onInsert: (payload: any) => {
        console.log('New message:', payload.new);
        setMessages(prev => [...prev, payload.new]);
      },
      
      onUpdate: (payload) => {
        setMessages(prev => 
          prev.map(msg => msg.id === payload.new.id ? payload.new : msg)
        );
      },
      
      onDelete: (payload) => {
        setMessages(prev => prev.filter(msg => msg.id !== (payload.old as any).id));
      },
    });
    
    return cleanup;
  }, [chatId, subscribe]);

  return (
    <View>
      <View style={{ padding: 10, backgroundColor: isConnected ? 'green' : 'red' }}>
        <Text style={{ color: 'white' }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
        {/* Status */}
      </View>
      
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ padding: 10 }}>
            <Text>{item.content}</Text>
          </View>
        )}
      />
      
      {/* Connection controls */}
    </View>
  );
}

/**
 * Exemple 2: Utilisation avec plusieurs subscriptions
 */
export function DashboardWithMultipleRealtime() {
  // Example state that would be used with real implementation
  // const [notifications, setNotifications] = useState<any[]>([]);
  // const [stories, setStories] = useState<any[]>([]);
  // const [messages, setMessages] = useState<any[]>([]);

  // Example usage with multiple subscriptions - implement useMultipleSubscriptions if needed
  const connectionStates = {} as any; 
  
  // Commented out example usage:
  // const connectionStates = useMultipleSubscriptions([
  //   {
  //     channel: 'dashboard-notifications',
  //     table: 'notifications',
  //     filter: `user_id=eq.USER_ID`,
  //     onInsert: (payload: any) => {
  //       setNotifications(prev => [payload.new, ...prev]);
  //     },
  //   },
  //   {
  //     channel: 'dashboard-stories',
  //     table: 'stories',
  //     event: 'INSERT',
  //     onInsert: (payload: any) => {
  //       setStories(prev => [payload.new, ...prev]);
  //     },
  //   },
  //   {
  //     channel: 'dashboard-messages',
  //     table: 'messages',
  //     filter: `recipient_id=eq.USER_ID`,
  //     onInsert: (payload: any) => {
  //       setMessages(prev => [...prev, payload.new]);
  //     },
  //   },
  // ]);

  return (
    <View>
      <View style={{ padding: 10 }}>
        <Text>Connection Status:</Text>
        {Object.entries(connectionStates).map(([channel, state]: [string, any]) => (
          <Text key={channel}>
            {channel}: {state.isConnected ? '✅' : '❌'}
          </Text>
        ))}
      </View>
      
      {/* Reste du dashboard */}
    </View>
  );
}

/**
 * Exemple 3: Hook personnalisé utilisant useRealtimeManager
 */
export function useOptimizedMessages(chatId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [typing, setTyping] = useState<string[]>([]);

  // Messages realtime
  const messagesRealtime = useRealtimeManager() as any;
  
  useEffect(() => {
    const cleanup = messagesRealtime.subscribe(`chat-messages:${chatId}`, {
    table: 'messages',
    filter: `chat_id=eq.${chatId}`,
    
    onInsert: useCallback((payload: any) => {
      setMessages(prev => {
        // Éviter les doublons
        if (prev.some(m => m.id === payload.new.id)) {
          return prev;
        }
        return [...prev, payload.new];
      });
    }, []),
    
    onUpdate: useCallback((payload: any) => {
      setMessages(prev => 
        prev.map(msg => msg.id === payload.new.id ? payload.new : msg)
      );
    }, []),
    
    onDelete: useCallback((payload: any) => {
      setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
    }, []),
    });
    
    return cleanup;
  }, [chatId, messagesRealtime]);

  // Typing indicators realtime
  const typingRealtime = useRealtimeManager() as any;
  
  useEffect(() => {
    const cleanup = typingRealtime.subscribe(`chat-typing:${chatId}`, {
    table: 'typing_indicators',
    filter: `chat_id=eq.${chatId}`,
    
    onChange: useCallback((payload: any) => {
      if (payload.eventType === 'INSERT') {
        setTyping(prev => [...prev, payload.new.user_id]);
      } else if (payload.eventType === 'DELETE') {
        setTyping(prev => prev.filter(id => id !== payload.old.user_id));
      }
    }, []),
    });
    
    return cleanup;
  }, [chatId, typingRealtime]);

  // Nettoyer les vieux messages (pagination)
  useEffect(() => {
    const MAX_MESSAGES = 100;
    if (messages.length > MAX_MESSAGES) {
      setMessages(prev => prev.slice(-MAX_MESSAGES));
    }
  }, [messages.length]);

  return {
    messages,
    typing,
    isConnected: messagesRealtime.isConnected && typingRealtime.isConnected,
    // error: messagesRealtime.error || typingRealtime.error,
    // reconnect: () => {
    //   messagesRealtime.reconnect();
    //   typingRealtime.reconnect();
    // },
  };
}

/**
 * Exemple 4: Provider avec gestion globale des subscriptions
 */
export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Example implementation - would use globalStats and monitorConnection in real app
  // const [globalStats, setGlobalStats] = useState({
  //   totalConnections: 0,
  //   activeConnections: 0,
  //   errors: 0,
  // });

  // // Monitorer toutes les connexions
  // const monitorConnection = useCallback((_channel: string, isConnected: boolean) => {
  //   setGlobalStats(prev => ({
  //     ...prev,
  //     activeConnections: isConnected 
  //       ? prev.activeConnections + 1 
  //       : Math.max(0, prev.activeConnections - 1),
  //   }));
  // }, []);

  // const contextValue = {
  //   globalStats,
  //   monitorConnection,
  // };

  return (
    // <RealtimeContext.Provider value={contextValue}>
    <View>
      {children}
    </View>
    // </RealtimeContext.Provider>
  );
};