import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/shared/lib/supabase/client';

interface TableInfo {
  name: string;
  count: number;
  exists: boolean;
  error?: string;
}

export default function DebugEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeDebug();
  }, []);

  const initializeDebug = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchUser(),
      fetchEvents(),
      checkTables(),
      checkStorageBuckets()
    ]);
    setIsLoading(false);
  };

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    console.log('👤 [DebugEvents] Utilisateur actuel:', user?.id);
  };

  const fetchEvents = async () => {
    try {
      console.log('🔍 [DebugEvents] Chargement des événements...');
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [DebugEvents] Erreur:', error);
        Alert.alert('Erreur', error.message);
        return;
      }

      console.log(`✅ [DebugEvents] ${data?.length || 0} événements trouvés`);
      setEvents(data || []);
    } catch (error) {
      console.error('💥 [DebugEvents] Erreur fatale:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    Alert.alert(
      'Supprimer l\'événement',
      'Êtes-vous sûr de vouloir supprimer cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId);

              if (error) {
                Alert.alert('Erreur', error.message);
                return;
              }

              console.log('✅ [DebugEvents] Événement supprimé');
              fetchEvents();
            } catch (error) {
              console.error('❌ [DebugEvents] Erreur suppression:', error);
            }
          },
        },
      ]
    );
  };

  const checkTables = async () => {
    console.log('🔍 [DebugEvents] Vérification des tables...');
    const tablesToCheck = [
      'events', 'event_participants', 'event_attendees', 'profiles', 'users',
      'event_costs', 'event_photos', 'event_questionnaire', 'event_questionnaire_responses',
      'event_items_to_bring', 'event_playlists', 'event_co_hosts', 'event_cover_stickers',
      'chats', 'messages', 'notifications', 'friendships'
    ];
    
    const results: TableInfo[] = [];
    
    for (const tableName of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        results.push({
          name: tableName,
          count: count || 0,
          exists: !error,
          error: error?.message
        });
      } catch (err) {
        results.push({
          name: tableName,
          count: 0,
          exists: false,
          error: String(err)
        });
      }
    }
    
    setTables(results);
    console.log('✅ [DebugEvents] Tables vérifiées:', results);
  };

  const checkStorageBuckets = async () => {
    try {
      console.log('🪣 [DebugEvents] Vérification des buckets...');
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('❌ [DebugEvents] Erreur buckets:', error);
        setBuckets([]);
      } else {
        const bucketNames = data?.map(b => b.name) || [];
        setBuckets(bucketNames);
        console.log('✅ [DebugEvents] Buckets trouvés:', bucketNames);
        
        // Vérifier les buckets nécessaires
        const requiredBuckets = ['event-images', 'event-covers', 'event-memories'];
        for (const bucket of requiredBuckets) {
          if (!bucketNames.includes(bucket)) {
            console.warn(`⚠️ [DebugEvents] Le bucket "${bucket}" n'existe pas!`);
          }
        }
      }
    } catch (err) {
      console.error('💥 [DebugEvents] Erreur fatale buckets:', err);
      setBuckets([]);
    }
  };

  const testCreateBucket = async (bucketName: string) => {
    try {
      console.log(`🆕 [DebugEvents] Tentative de création du bucket ${bucketName}...`);
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (error) {
        if (error.message.includes('already exists')) {
          Alert.alert('Info', `Le bucket "${bucketName}" existe déjà`);
        } else {
          Alert.alert('Erreur', error.message);
        }
      } else {
        Alert.alert('Succès', `Bucket "${bucketName}" créé avec succès!`);
        await checkStorageBuckets();
      }
    } catch (err) {
      console.error('💥 [DebugEvents] Erreur création bucket:', err);
      Alert.alert('Erreur', String(err));
    }
  };

  const runMigrations = async () => {
    try {
      console.log('🚀 [DebugEvents] Application des migrations...');
      Alert.alert(
        'Migrations',
        'Les migrations doivent être exécutées via Supabase CLI ou le dashboard.\n\nAssurez-vous d\'avoir exécuté:\nsupabase db push',
        [
          { text: 'OK' },
          {
            text: 'Voir la doc',
            onPress: () => console.log('Ouvrir la documentation Supabase')
          }
        ]
      );
    } catch (err) {
      console.error('💥 [DebugEvents] Erreur migrations:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchEvents(),
      checkTables(),
      checkStorageBuckets()
    ]);
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Debug - Événements</Text>
        <TouchableOpacity onPress={fetchEvents} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userText}>
          Utilisateur: {user?.email || 'Non connecté'}
        </Text>
        <Text style={styles.userText}>
          ID: {user?.id || 'N/A'}
        </Text>
      </View>

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          Total événements: {events.length}
        </Text>
      </View>

      {/* Section Tables */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Tables Supabase</Text>
        {tables.map((table) => (
          <View key={table.name} style={styles.tableRow}>
            <Text style={[styles.tableName, !table.exists && styles.tableError]}>
              {table.name}
            </Text>
            <Text style={styles.tableCount}>
              {table.exists ? `${table.count} lignes` : table.error || 'N/A'}
            </Text>
          </View>
        ))}
      </View>

      {/* Section Migrations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Migrations & Configuration</Text>
        <TouchableOpacity style={styles.migrationButton} onPress={runMigrations}>
          <Ionicons name="construct-outline" size={20} color="#FFF" />
          <Text style={styles.migrationButtonText}>Info sur les migrations</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.migrationButton, { backgroundColor: '#2196F3' }]} 
          onPress={() => {
            Alert.alert(
              'Logs détaillés',
              'Consultez la console JavaScript pour voir tous les logs détaillés de création d\'événements.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Ionicons name="bug-outline" size={20} color="#FFF" />
          <Text style={styles.migrationButtonText}>Activer logs détaillés</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.migrationButton, { backgroundColor: '#4CAF50' }]} 
          onPress={async () => {
            console.log('🧪 [DEBUG] TEST: Création d\'événement avec TOUS les extras');
            try {
              // Créer un événement de test avec TOUS les extras
              const testEvent = {
                title: '🎉 Super Soirée Test Complète',
                subtitle: 'Avec absolument TOUS les extras!',
                description: 'Ceci est un événement de test créé depuis la page debug pour vérifier que TOUTES les fonctionnalités marchent parfaitement avec Supabase!',
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
                location: 'Paris, France',
                locationDetails: {
                  name: 'Le Spot Test',
                  address: '123 Rue de Test',
                  city: 'Paris',
                  postalCode: '75001',
                  country: 'France',
                  coordinates: {
                    latitude: 48.8566,
                    longitude: 2.3522
                  }
                },
                isPrivate: true,
                coverData: {
                  eventTitle: '🎉 Super Soirée Test',
                  eventSubtitle: 'Tous les extras activés!',
                  selectedTitleFont: '1',
                  selectedSubtitleFont: '2',
                  selectedBackground: 'gradient-1',
                  coverImage: '',
                  uploadedImage: '',
                  placedStickers: [
                    { id: '1', emoji: '🎉', x: 10, y: 10, scale: 1.5, rotation: 15 },
                    { id: '2', emoji: '🎊', x: 80, y: 10, scale: 1.2, rotation: -10 },
                    { id: '3', emoji: '🥳', x: 45, y: 50, scale: 2, rotation: 0 }
                  ],
                  selectedTemplate: null
                },
                coHosts: [
                  { id: user?.id || 'test-id', name: 'Co-Host Test', avatar: 'https://picsum.photos/200' }
                ],
                costs: [
                  { id: '1', amount: '10', currency: 'EUR', description: 'Entrée' },
                  { id: '2', amount: '5', currency: 'EUR', description: 'Boissons' }
                ],
                eventPhotos: [],
                rsvpDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Dans 5 jours
                rsvpReminderEnabled: true,
                rsvpReminderTiming: '24h',
                questionnaire: [
                  { id: '1', text: 'Avez-vous des allergies alimentaires?', type: 'text' },
                  { id: '2', text: 'Combien de personnes amenez-vous?', type: 'number' },
                  { id: '3', text: 'Préférence musicale?', type: 'text' }
                ],
                itemsToBring: [
                  { id: '1', name: 'Chips', quantity: 2, assignedTo: undefined },
                  { id: '2', name: 'Boissons', quantity: 5, assignedTo: undefined },
                  { id: '3', name: 'Bonne humeur', quantity: 1, assignedTo: undefined },
                  { id: '4', name: 'Jeux de société', quantity: 3, assignedTo: undefined }
                ],
                playlist: [
                  { id: '1', title: 'Chanson 1', artist: 'Artiste 1', spotifyUrl: 'https://open.spotify.com/track/1', appleUrl: '', youtubeUrl: '' },
                  { id: '2', title: 'Chanson 2', artist: 'Artiste 2', spotifyUrl: 'https://open.spotify.com/track/2', appleUrl: '', youtubeUrl: '' }
                ],
                spotifyLink: 'https://open.spotify.com/playlist/test'
              };
              
              // Importer dynamiquement le service complet
              const { EventServiceComplete } = await import('@/features/events/services/eventServiceComplete');
              
              console.log('🚀 [DEBUG] Lancement de la création avec EventServiceComplete...');
              const result = await EventServiceComplete.createEvent(testEvent);
              
              if (result.success) {
                console.log('✅ [DEBUG] TEST RÉUSSI! Event ID:', result.event.id);
                Alert.alert(
                  'Test Réussi! 🎉',
                  `Événement créé avec succès!\nID: ${result.event.id}\n\nConsultez la console pour voir tous les logs détaillés.`,
                  [
                    { text: 'Rafraîchir', onPress: () => fetchEvents() },
                    { text: 'OK' }
                  ]
                );
              }
            } catch (error) {
              console.error('❌ [DEBUG] TEST ÉCHOUÉ:', error);
              Alert.alert(
                'Test Échoué',
                `Erreur: ${error instanceof Error ? error.message : String(error)}\n\nConsultez la console pour plus de détails.`
              );
            }
          }}
        >
          <Ionicons name="flask-outline" size={20} color="#FFF" />
          <Text style={styles.migrationButtonText}>🧪 TEST: Créer événement avec TOUS les extras</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.migrationButton, { backgroundColor: '#E91E63' }]} 
          onPress={async () => {
            console.log('🔍 [DEBUG] TEST: Vérification détaillée des tables d\'extras');
            
            const extrasTables = [
              { name: 'event_costs', expectedColumns: ['id', 'event_id', 'amount', 'currency', 'description'] },
              { name: 'event_photos', expectedColumns: ['id', 'event_id', 'photo_url', 'uploaded_by'] },
              { name: 'event_questionnaire', expectedColumns: ['id', 'event_id', 'question', 'question_type'] },
              { name: 'event_items_to_bring', expectedColumns: ['id', 'event_id', 'item_name'] },
              { name: 'event_playlists', expectedColumns: ['id', 'event_id', 'spotify_link'] },
              { name: 'event_cover_stickers', expectedColumns: ['id', 'event_id', 'sticker_emoji', 'position_x', 'position_y'] }
            ];
            
            let report = '📊 RAPPORT DES TABLES D\'EXTRAS\n\n';
            
            for (const table of extrasTables) {
              try {
                // Test de lecture simple
                const { data, error, count } = await supabase
                  .from(table.name)
                  .select('*', { count: 'exact', head: false })
                  .limit(1);
                
                if (error) {
                  report += `❌ ${table.name}: ${error.message}\n`;
                  console.error(`❌ [DEBUG] ${table.name}:`, error);
                } else {
                  report += `✅ ${table.name}: OK (${count || 0} lignes)\n`;
                  console.log(`✅ [DEBUG] ${table.name}: OK, ${count} lignes`);
                  
                  // Afficher les colonnes si on a des données
                  if (data && data.length > 0) {
                    const columns = Object.keys(data[0]);
                    console.log(`   Colonnes trouvées: ${columns.join(', ')}`);
                  }
                }
              } catch (err) {
                report += `💥 ${table.name}: Erreur fatale\n`;
                console.error(`💥 [DEBUG] ${table.name}:`, err);
              }
            }
            
            Alert.alert(
              'Rapport des tables d\'extras',
              report,
              [{ text: 'OK' }]
            );
          }}
        >
          <Ionicons name="search-outline" size={20} color="#FFF" />
          <Text style={styles.migrationButtonText}>🔍 Vérifier tables d'extras</Text>
        </TouchableOpacity>
      </View>

      {/* Section Buckets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🪣 Buckets de stockage</Text>
        {buckets.length > 0 ? (
          buckets.map((bucket) => (
            <View key={bucket} style={styles.bucketRow}>
              <Ionicons name="folder-outline" size={16} color="#007AFF" />
              <Text style={styles.bucketName}>{bucket}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noBuckets}>Aucun bucket trouvé</Text>
        )}
        
        {/* Boutons pour créer les buckets manquants */}
        {['event-images', 'event-covers', 'event-memories'].map(bucketName => (
          !buckets.includes(bucketName) && (
            <TouchableOpacity 
              key={bucketName}
              style={styles.createBucketButton} 
              onPress={() => testCreateBucket(bucketName)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.createBucketText}>Créer bucket "{bucketName}"</Text>
            </TouchableOpacity>
          )
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      ) : (
        <>
      {events.map((event) => (
        <View key={event.id} style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <TouchableOpacity
              onPress={() => deleteEvent(event.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.eventInfo}>ID: {event.id}</Text>
          <Text style={styles.eventInfo}>
            Date: {new Date(event.date).toLocaleString('fr-FR')}
          </Text>
          <Text style={styles.eventInfo}>
            Créé le: {new Date(event.created_at).toLocaleString('fr-FR')}
          </Text>
          <Text style={styles.eventInfo}>
            Créé par: {event.created_by === user?.id ? 'Vous' : event.created_by}
          </Text>
          <Text style={styles.eventInfo}>
            Privé: {event.is_private ? 'Oui' : 'Non'}
          </Text>
          {event.location && (
            <Text style={styles.eventInfo}>Lieu: {event.location}</Text>
          )}
          {event.subtitle && (
            <Text style={styles.eventInfo}>Sous-titre: {event.subtitle}</Text>
          )}
          
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => router.push(`/event/${event.id}`)}
          >
            <Text style={styles.viewButtonText}>Voir l'événement</Text>
          </TouchableOpacity>

          {event.extra_data && (
            <View style={styles.extraData}>
              <Text style={styles.extraDataTitle}>Données supplémentaires:</Text>
              <Text style={styles.extraDataText}>
                {JSON.stringify(event.extra_data, null, 2)}
              </Text>
            </View>
          )}
        </View>
      ))}

      {events.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Aucun événement trouvé</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/screens/create-event')}
          >
            <Text style={styles.createButtonText}>Créer un événement</Text>
          </TouchableOpacity>
        </View>
      )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
  },
  userInfo: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    margin: 10,
    borderRadius: 8,
  },
  userText: {
    fontSize: 14,
    color: '#1976d2',
  },
  stats: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventCard: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  eventInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  viewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  extraData: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  extraDataTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  extraDataText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableName: {
    fontSize: 14,
    color: '#666',
  },
  tableError: {
    color: '#FF3B30',
  },
  tableCount: {
    fontSize: 14,
    color: '#999',
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  bucketName: {
    fontSize: 14,
    color: '#666',
  },
  noBuckets: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  createBucketButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  createBucketText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  migrationButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  migrationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});