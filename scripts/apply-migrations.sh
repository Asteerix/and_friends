#!/bin/bash

# Script pour appliquer les migrations manuellement via l'interface Supabase
echo "🚀 Instructions pour appliquer les migrations dans Supabase:"
echo ""
echo "1. Allez sur https://app.supabase.com/project/[VOTRE-PROJECT-ID]/sql/new"
echo "2. Copiez et collez le contenu des fichiers de migration suivants dans l'ordre:"
echo ""
echo "   📁 Migrations à appliquer:"
echo "   - supabase/migrations/20250709000000_fix_event_items_playlists_columns.sql (NOUVELLE - Corrige les colonnes manquantes)"
echo "   - supabase/migrations/20250708000001_fix_event_extras_tables.sql"
echo "   - supabase/migrations/20250108000001_create_event_extras_tables.sql" 
echo "   - supabase/migrations/20250108000002_complete_event_structure.sql"
echo ""
echo "3. Exécutez chaque migration une par une"
echo "4. Vérifiez qu'il n'y a pas d'erreurs"
echo ""
echo "💡 Alternative: Utilisez le bouton 'Run Migrations' dans l'app debug-events"
echo ""
echo "📋 Tables qui seront créées/mises à jour:"
echo "   ✅ events (colonnes extras ajoutées)"
echo "   ✅ event_participants (colonnes role et invited_by)"
echo "   ✅ event_co_hosts"
echo "   ✅ event_rsvp_settings"
echo "   ✅ event_costs"
echo "   ✅ event_photos"
echo "   ✅ event_questionnaires"
echo "   ✅ event_questionnaire_responses"
echo "   ✅ event_items"
echo "   ✅ event_playlists"
echo "   ✅ event_cover_stickers"
echo ""
echo "🪣 Buckets Storage à créer (si pas déjà fait):"
echo "   ✅ events (ou event-images)"
echo ""
echo "Appuyez sur Enter pour ouvrir le premier fichier de migration..."
read

# Ouvrir les fichiers de migration pour faciliter le copier-coller
if [ -f "supabase/migrations/20250709000000_fix_event_items_playlists_columns.sql" ]; then
    echo "📂 Ouverture du fichier de migration pour corriger les colonnes manquantes..."
    open "supabase/migrations/20250709000000_fix_event_items_playlists_columns.sql" 2>/dev/null || cat "supabase/migrations/20250709000000_fix_event_items_playlists_columns.sql"
fi