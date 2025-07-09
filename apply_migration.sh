#!/bin/bash

echo "🚀 Application de la migration pour ajouter les colonnes manquantes..."

# Récupérer l'URL de la base de données depuis le fichier .env.local
DB_URL=$(grep SUPABASE_DB_URL .env.local | cut -d '=' -f2-)

if [ -z "$DB_URL" ]; then
    echo "❌ SUPABASE_DB_URL non trouvé dans .env.local"
    exit 1
fi

# Appliquer la migration
echo "📝 Application de la migration 20250109_fix_missing_columns.sql..."
psql "$DB_URL" -f supabase/migrations/20250109_fix_missing_columns.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration appliquée avec succès!"
else
    echo "❌ Erreur lors de l'application de la migration"
    exit 1
fi

echo "🎉 Terminé!"