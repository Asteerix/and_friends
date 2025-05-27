import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { supabase } from "../../lib/supabase";
import { useSession } from "../lib/SessionContext";
import { useProfile, UserProfile } from "../hooks/useProfile";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { session, setSession } = useSession();
  const { profile, loading, updateProfile, getProfileStats } = useProfile();
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [profileStats, setProfileStats] = useState<{
    eventsCreated: number;
    eventsParticipated: number;
    friendsCount: number;
  } | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditedProfile(profile);
      loadProfileStats();
    }
  }, [profile]);

  const loadProfileStats = async () => {
    const stats = await getProfileStats();
    setProfileStats(stats);
  };

  const saveProfile = async () => {
    if (!editedProfile) return;

    setSaveLoading(true);
    try {
      const result = await updateProfile(editedProfile);
      
      if (result.error) {
        Alert.alert("Erreur", "Impossible de sauvegarder le profil");
        return;
      }

      setEditing(false);
      Alert.alert("Succès", "Profil mis à jour avec succès");
      loadProfileStats(); // Refresh stats
    } catch (error) {
      console.error("Unexpected error:", error);
      Alert.alert("Erreur", "Une erreur inattendue s'est produite");
    } finally {
      setSaveLoading(false);
    }
  };

  const signOut = async () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnexion",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            if (setSession) {
              setSession(null);
            }
          },
        },
      ]
    );
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatMemberSince = (dateString?: string) => {
    if (!dateString) return "Récemment";
    const date = new Date(dateString);
    return `Membre depuis ${date.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric"
    })}`;
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <TouchableOpacity
          style={[styles.editButton, saveLoading && { opacity: 0.6 }]}
          onPress={() => {
            if (editing) {
              saveProfile();
            } else {
              setEditing(true);
            }
          }}
          disabled={saveLoading}
        >
          <Text style={styles.editButtonText}>
            {saveLoading ? "Sauvegarde..." : editing ? "Sauver" : "Modifier"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Image
            source={{
              uri: profile?.avatar_url || "https://via.placeholder.com/120x120?text=" + (profile?.full_name?.charAt(0) || "U"),
            }}
            style={styles.avatar}
          />
          {editing && (
            <TouchableOpacity style={styles.changeAvatarButton}>
              <Text style={styles.changeAvatarText}>Changer la photo</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.memberSince}>
            {formatMemberSince(profile?.created_at)}
          </Text>
        </View>

        {/* Stats Section */}
        {profileStats && (
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileStats.eventsCreated}</Text>
              <Text style={styles.statLabel}>Événements créés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileStats.eventsParticipated}</Text>
              <Text style={styles.statLabel}>Participations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileStats.friendsCount}</Text>
              <Text style={styles.statLabel}>Amis</Text>
            </View>
          </View>
        )}

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nom complet</Text>
            {editing ? (
              <TextInput
                style={styles.textInput}
                value={editedProfile.full_name || ""}
                onChangeText={(text) =>
                  setEditedProfile({ ...editedProfile, full_name: text })
                }
                placeholder="Votre nom complet"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.full_name || "Non renseigné"}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>
              {profile?.email || session?.user?.email || "Non renseigné"}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Téléphone</Text>
            <Text style={styles.fieldValue}>
              {profile?.phone || session?.user?.phone || "Non renseigné"}
            </Text>
          </View>

          {profile?.birth_date && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Âge</Text>
              <Text style={styles.fieldValue}>
                {calculateAge(profile.birth_date)} ans
              </Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Membre depuis</Text>
            <Text style={styles.fieldValue}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })
                : "Récemment"
              }
            </Text>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Parcours</Text>
            {editing ? (
              <TextInput
                style={styles.textInput}
                value={editedProfile.path || ""}
                onChangeText={(text) =>
                  setEditedProfile({ ...editedProfile, path: text })
                }
                placeholder="Votre parcours"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.path || "Non renseigné"}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Confiture préférée</Text>
            {editing ? (
              <TextInput
                style={styles.textInput}
                value={editedProfile.jam_preference || ""}
                onChangeText={(text) =>
                  setEditedProfile({ ...editedProfile, jam_preference: text })
                }
                placeholder="Votre confiture préférée"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.jam_preference || "Non renseigné"}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Restaurant préféré</Text>
            {editing ? (
              <TextInput
                style={styles.textInput}
                value={editedProfile.restaurant_preference || ""}
                onChangeText={(text) =>
                  setEditedProfile({ ...editedProfile, restaurant_preference: text })
                }
                placeholder="Votre restaurant préféré"
              />
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.restaurant_preference || "Non renseigné"}
              </Text>
            )}
          </View>
        </View>

        {/* Hobbies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Centres d'intérêt</Text>
          <View style={styles.hobbiesContainer}>
            {profile?.hobbies && profile.hobbies.length > 0 ? (
              profile.hobbies.map((hobby, index) => (
                <View key={index} style={styles.hobbyChip}>
                  <Text style={styles.hobbyText}>{hobby}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.fieldValue}>Aucun centre d'intérêt renseigné</Text>
            )}
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confidentialité</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Partage de localisation</Text>
            <Switch
              value={profile?.location_permission_granted || false}
              onValueChange={(value) => {
                if (editing) {
                  setEditedProfile({
                    ...editedProfile,
                    location_permission_granted: value,
                  });
                }
              }}
              disabled={!editing}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Ionicons name="settings-outline" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Paramètres</Text>
            <Ionicons name="chevron-forward-outline" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Aide et support</Text>
            <Ionicons name="chevron-forward-outline" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
            <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>À propos</Text>
            <Ionicons name="chevron-forward-outline" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={signOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={[styles.actionButtonText, styles.signOutText]}>
              Se déconnecter
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#F8F9FA",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E5E5",
  },
  changeAvatarButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#007AFF",
    borderRadius: 16,
  },
  changeAvatarText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: "#222",
  },
  textInput: {
    fontSize: 16,
    color: "#222",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFF",
  },
  hobbiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hobbyChip: {
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hobbyText: {
    fontSize: 14,
    color: "#222",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: "#222",
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#222",
    marginLeft: 12,
  },
  signOutButton: {
    borderBottomWidth: 0,
    marginTop: 16,
  },
  signOutText: {
    color: "#FF3B30",
  },
  memberSince: {
    fontSize: 14,
    color: "#888",
    marginTop: 8,
    textAlign: "center",
  },
  statsSection: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E5E5",
    marginHorizontal: 8,
  },
});