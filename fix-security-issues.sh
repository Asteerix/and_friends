#!/bin/bash

# ============================================
# Script de Correction de Sécurité - And Friends
# ============================================

set -e  # Arrêter en cas d'erreur

echo "🔒 Début de la correction des problèmes de sécurité..."
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les erreurs
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction pour afficher les succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher les warnings
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Vérifier si nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    error "Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

echo "📋 Étape 1: Suppression des fichiers sensibles de Git"
echo "=================================================="

# Vérifier si les fichiers .env sont dans Git
if git ls-files | grep -q "^\.env$"; then
    warning "Le fichier .env est actuellement dans Git"
    git rm --cached .env 2>/dev/null || true
    success "Fichier .env supprimé du tracking Git"
else
    success "Le fichier .env n'est pas dans Git"
fi

if git ls-files | grep -q "ios/\.xcode\.env"; then
    warning "Le fichier ios/.xcode.env est actuellement dans Git"
    git rm --cached ios/.xcode.env 2>/dev/null || true
    success "Fichier ios/.xcode.env supprimé du tracking Git"
else
    success "Le fichier ios/.xcode.env n'est pas dans Git"
fi

# Vérifier si des changements ont été faits
if git diff --cached --quiet; then
    echo "Aucun fichier sensible à supprimer de Git"
else
    echo ""
    warning "Des fichiers sensibles ont été supprimés du tracking Git"
    echo "Voulez-vous commiter ces changements maintenant? (o/n)"
    read -r response
    if [[ "$response" =~ ^[Oo]$ ]]; then
        git commit -m "chore: remove sensitive files from repository"
        success "Changements commités"
        echo ""
        warning "N'oubliez pas de faire: git push"
    fi
fi

echo ""
echo "📋 Étape 2: Sauvegarde et création du nouveau .env"
echo "=================================================="

# Sauvegarder l'ancien .env si existant
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    success "Ancien .env sauvegardé"
fi

# Créer le nouveau .env à partir du template si nécessaire
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    success "Nouveau fichier .env créé à partir du template"
    warning "N'oubliez pas de mettre à jour les clés dans .env"
fi

echo ""
echo "📋 Étape 3: Suppression des codes de test OTP"
echo "=================================================="

# Fichiers à vérifier pour les codes de test
FILES_TO_CHECK=(
    "src/features/auth/screens/PhoneVerificationScreen.tsx"
    "src/features/auth/screens/CodeVerificationScreen.tsx"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "+33612345678\|123456" "$file"; then
            warning "Code de test trouvé dans: $file"
            echo "Voulez-vous voir les lignes concernées? (o/n)"
            read -r response
            if [[ "$response" =~ ^[Oo]$ ]]; then
                echo ""
                grep -n "+33612345678\|123456" "$file" || true
                echo ""
            fi
        else
            success "Pas de code de test dans: $file"
        fi
    fi
done

echo ""
echo "📋 Étape 4: Correction du script avec URL hardcodée"
echo "=================================================="

SCRIPT_FILE="scripts/check-storage-policies.js"
if [ -f "$SCRIPT_FILE" ]; then
    if grep -q "https://.*\.supabase\.co" "$SCRIPT_FILE"; then
        warning "URL Supabase hardcodée trouvée dans: $SCRIPT_FILE"
        # Créer une version corrigée
        sed -i.bak "s|const supabaseUrl = 'https://.*\.supabase\.co'|const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL|g" "$SCRIPT_FILE"
        success "Script corrigé (sauvegarde dans ${SCRIPT_FILE}.bak)"
    else
        success "Pas d'URL hardcodée dans: $SCRIPT_FILE"
    fi
fi

echo ""
echo "📋 Étape 5: Vérification des dépendances de sécurité"
echo "=================================================="

# Vérifier si npm audit est disponible
if command -v npm &> /dev/null; then
    echo "Analyse des vulnérabilités npm..."
    npm audit --production || true
fi

echo ""
echo "📋 Résumé des Actions"
echo "===================="
echo ""
echo "✅ Actions complétées:"
echo "  - Fichiers sensibles supprimés du tracking Git"
echo "  - Sauvegarde de l'ancien .env créée"
echo "  - Scripts avec URLs hardcodées identifiés"
echo ""
echo "❌ Actions manuelles requises:"
echo ""
echo "1. ${RED}URGENT${NC}: Régénérer vos clés API"
echo "   - Supabase: https://app.supabase.com → Settings → API"
echo "   - HERE Maps: Désactiver l'ancienne clé et en créer une nouvelle"
echo ""
echo "2. ${RED}URGENT${NC}: Supprimer manuellement les codes de test OTP dans:"
echo "   - src/features/auth/screens/PhoneVerificationScreen.tsx"
echo "   - src/features/auth/screens/CodeVerificationScreen.tsx"
echo ""
echo "3. ${YELLOW}IMPORTANT${NC}: Exécuter le script SQL de sécurité:"
echo "   psql \$DATABASE_URL < SECURITY_FIX_URGENT.sql"
echo ""
echo "4. ${YELLOW}IMPORTANT${NC}: Mettre à jour le fichier .env avec les nouvelles clés"
echo ""
echo "5. ${YELLOW}IMPORTANT${NC}: Faire git push si vous avez commité les changements"
echo ""
echo "📚 Documentation:"
echo "  - Rapport complet: SECURITY_AUDIT_COMPLETE.md"
echo "  - Actions critiques: SECURITY_CRITICAL_ACTIONS.md"
echo "  - Checklist finale: SECURITY_FINAL_CHECKLIST.md"
echo ""
warning "NE PAS DÉPLOYER EN PRODUCTION tant que toutes les actions ne sont pas complétées!"