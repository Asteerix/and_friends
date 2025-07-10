# Event Item Bringers Migration

## Description
Cette migration crée la table `event_item_bringers` qui permet de suivre qui apporte quoi pour chaque événement.

## Instructions d'installation

1. **Connectez-vous à votre projet Supabase**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet
   - Allez dans l'éditeur SQL

2. **Exécutez le script SQL**
   - Copiez le contenu du fichier `create_event_item_bringers.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run"

3. **Vérifiez que la table a été créée**
   - Allez dans le Table Editor
   - Vérifiez que la table `event_item_bringers` existe
   - Vérifiez que les policies RLS sont actives

## Fonctionnalités

### Table event_item_bringers
- Stocke qui apporte quel item
- Relation many-to-many entre items et utilisateurs
- Contrainte unique pour éviter les doublons

### Policies RLS
- **View bringers for public events** : Tout le monde peut voir qui apporte quoi pour les événements publics
- **View bringers for private events** : Seuls les invités peuvent voir pour les événements privés
- **Users can claim items** : Les utilisateurs peuvent s'ajouter comme bringers
- **Users can unclaim items** : Les utilisateurs peuvent se retirer
- **Hosts can manage bringers** : Les hôtes peuvent gérer tous les bringers

## Utilisation dans l'app

Une fois la migration exécutée :
1. Les utilisateurs peuvent cliquer sur les items "suggested" et "open" pour dire qu'ils apportent
2. Un compteur affiche le nombre de personnes qui apportent chaque item
3. En cliquant sur le compteur, on voit la liste détaillée avec noms et avatars
4. Les items "required" sont automatiquement cochés pour tous les participants

## En cas de problème

Si la table n'est pas créée, l'application fonctionnera quand même mais sans la persistance des bringers. Les erreurs sont gérées gracieusement dans le code.