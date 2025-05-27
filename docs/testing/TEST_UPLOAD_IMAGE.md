# Test de la fonctionnalité d'upload d'image pour les événements

## Fonctionnalités implémentées

1. **Hook useSupabaseStorage** (`src/hooks/useSupabaseStorage.ts`)
   - `pickImage()` : Ouvre le sélecteur d'images avec permission
   - `uploadImage()` : Upload l'image vers Supabase Storage
   - `deleteImage()` : Supprime une image du storage
   - `uploadProgress` : Suivi du progrès d'upload
   - `isUploading` : État de l'upload

2. **Intégration dans CreateEventScreen**
   - Import du hook useSupabaseStorage
   - Bouton "Upload Image" dans la section Style > Upload Media
   - Affichage de l'image sélectionnée dans la couverture
   - Bouton "Supprimer l'image" quand une image est sélectionnée
   - Indicateur de progression pendant l'upload
   - Upload automatique lors de la création de l'événement

3. **Configuration Supabase Storage**
   - Migration créée pour le bucket "event-covers"
   - Politiques RLS configurées pour :
     - Lecture publique des images
     - Upload pour les utilisateurs authentifiés
     - Modification/suppression par le propriétaire

## Comment tester

1. **Prérequis**
   - Assurez-vous que la migration Supabase est appliquée
   - L'utilisateur doit être connecté

2. **Test de sélection d'image**
   - Aller dans "Create Event"
   - Cliquer sur "Edit Cover"
   - Dans l'onglet "Style", section "Upload Media"
   - Cliquer sur "Upload Image"
   - Sélectionner une image de la galerie
   - L'image devrait s'afficher dans la couverture

3. **Test de suppression**
   - Après avoir sélectionné une image
   - Cliquer sur "Supprimer l'image"
   - L'image par défaut devrait réapparaître

4. **Test de création d'événement avec image**
   - Remplir les champs requis (titre, date, heure)
   - Sélectionner une image de couverture
   - Cliquer sur "Publish"
   - Observer l'indicateur de progression "Upload... X%"
   - L'événement devrait être créé avec l'image uploadée

## Points d'attention

- La taille maximale des images est de 5MB
- Formats acceptés : JPEG, JPG, PNG, WebP, GIF
- L'aspect ratio est fixé à 16:9 pour les couvertures
- Les images sont compressées à 80% de qualité
- L'upload se fait uniquement lors de la création de l'événement

## Améliorations futures possibles

1. Ajouter un aperçu de l'image avant upload
2. Permettre de recadrer l'image
3. Ajouter des filtres ou effets
4. Support des vidéos de couverture
5. Galerie de templates prédéfinis