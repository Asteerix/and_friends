// Exemple de migration ProfileScreen vers CachedImage
// Ce fichier montre comment migrer les images

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// Remplacer l'import Image
// import { Image } from 'react-native';
import { CachedImage } from '@/shared/components/CachedImage';

// Exemple de header avec image cachée
export const ProfileHeaderExample = ({ profile }) => {
  return (
    <View style={styles.header}>
      {/* Avant: Image native */}
      {/* <Image
        source={
          profile && profile.cover_url
            ? { uri: profile.cover_url }
            : profile && profile.avatar_url
              ? { uri: profile.avatar_url }
              : require('@/assets/images/default-avatar.png')
        }
        style={styles.headerImage}
      /> */}

      {/* Après: CachedImage */}
      <CachedImage
        uri={profile?.cover_url || profile?.avatar_url}
        style={styles.headerImage}
        fallback={require('@/assets/images/default-avatar.png')}
        priority="high" // Priorité haute pour l'image principale
      />
    </View>
  );
};

// Exemple d'avatar d'ami avec cache
export const FriendAvatarExample = ({ friend }) => {
  return (
    <View style={styles.friendItem}>
      {/* Avant */}
      {/* <Image
        source={
          friend.avatar_url
            ? { uri: friend.avatar_url }
            : require('@/assets/images/default-avatar.png')
        }
        style={styles.friendAvatar}
      /> */}

      {/* Après */}
      <CachedImage
        uri={friend.avatar_url}
        style={styles.friendAvatar}
        placeholder={require('@/assets/images/default-avatar.png')}
        priority="normal" // Priorité normale pour les avatars
      />
      <Text>{friend.username}</Text>
    </View>
  );
};

// Exemple de galerie avec préchargement
export const AlbumGalleryExample = ({ albums }) => {
  // Précharger toutes les images de l'album
  const albumCovers = albums.map((album) => album.cover_url).filter(Boolean);

  // Hook pour précharger
  React.useEffect(() => {
    if (albumCovers.length > 0) {
      // Le préchargement se fait automatiquement
      console.log(`Préchargement de ${albumCovers.length} covers d'albums`);
    }
  }, [albumCovers]);

  return (
    <View style={styles.albumGrid}>
      {albums.map((album, index) => (
        <View key={album.id || index} style={styles.albumItem}>
          <CachedImage
            uri={album.cover_url}
            style={styles.albumCover}
            placeholder={require('@/assets/images/album-placeholder.png')}
            priority="low" // Priorité basse pour les albums
          />
          <Text style={styles.albumTitle}>{album.title}</Text>
          <Text style={styles.albumArtist}>{album.artist}</Text>
        </View>
      ))}
    </View>
  );
};

// Exemple d'utilisation des hooks de cache pour le profil
export const ProfileDataExample = ({ userId }) => {
  // Utiliser le hook de cache au lieu d'un appel API direct
  const { data: profile, isLoading, error } = useUserProfile(userId);
  const { data: friends } = useUserFriends(userId);

  if (isLoading) {
    return <Text>Chargement...</Text>;
  }

  if (error) {
    return <Text>Erreur: {error.message}</Text>;
  }

  return (
    <View>
      <Text>{profile?.username}</Text>
      <Text>{friends?.length || 0} amis</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 300,
    width: '100%',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  albumItem: {
    width: '48%',
    margin: '1%',
  },
  albumCover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  albumTitle: {
    fontWeight: 'bold',
    marginTop: 5,
  },
  albumArtist: {
    color: '#666',
    fontSize: 12,
  },
});
