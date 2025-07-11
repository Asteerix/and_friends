# ⚠️ ACTIONS CRITIQUES DE SÉCURITÉ - À EFFECTUER IMMÉDIATEMENT

## 🚨 ALERTE: Votre application a des vulnérabilités critiques exposées

### 1. **SUPPRIMER LE FICHIER .env DU REPOSITORY** (URGENT!)

Le fichier `.env` contenant vos clés API est actuellement visible dans Git. Exécutez ces commandes **MAINTENANT** :

```bash
# Supprimer les fichiers sensibles du tracking Git
git rm --cached .env
git rm --cached ios/.xcode.env

# Commiter le changement
git commit -m "Remove sensitive .env files from repository"

# Pousser le changement
git push origin main
```

### 2. **RÉGÉNÉRER IMMÉDIATEMENT VOS CLÉS** 

Vos clés sont exposées publiquement. Vous devez :

1. **Aller dans Supabase Dashboard** → Settings → API
   - Régénérer la clé anonyme
   - Mettre à jour votre application avec la nouvelle clé

2. **HERE Maps Console** 
   - Désactiver l'ancienne clé : `7oqSD8Q4douBqzonRdiWodb62iEn_KPjcNFoDFhn3o0`
   - Créer une nouvelle clé
   - Mettre à jour votre `.env` local

### 3. **SUPPRIMER LES CODES DE TEST OTP**

Modifiez ces fichiers pour supprimer les codes hardcodés :

**Dans `src/features/auth/screens/PhoneVerificationScreen.tsx`** :
- Supprimer les lignes 281-289 (code de test)

**Dans `src/features/auth/screens/CodeVerificationScreen.tsx`** :
- Supprimer les lignes 285-299 (code de test)

### 4. **CORRIGER LE SCRIPT AVEC URL HARDCODÉE**

Dans `scripts/check-storage-policies.js`, remplacer :
```javascript
const supabaseUrl = 'https://ybbrqejgtmqmuawmgfqv.supabase.co';
```

Par :
```javascript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
```

### 5. **EXÉCUTER LE SCRIPT SQL DE SÉCURITÉ**

```bash
# Se connecter à votre base de données Supabase
psql $DATABASE_URL < SECURITY_FIX_URGENT.sql
```

## 📋 Checklist de vérification

- [ ] Fichier `.env` supprimé de Git
- [ ] Fichier `ios/.xcode.env` supprimé de Git
- [ ] Clé Supabase anonyme régénérée
- [ ] Clé HERE Maps régénérée
- [ ] Codes de test OTP supprimés
- [ ] Script check-storage-policies.js corrigé
- [ ] Script SQL de sécurité exécuté
- [ ] Nouveau `.env` créé localement avec les nouvelles clés
- [ ] Tests effectués avec les nouvelles clés

## ⏰ Délai : Ces actions doivent être effectuées dans l'heure qui suit

Une fois ces actions complétées, votre application sera significativement plus sécurisée. N'oubliez pas de :
- Informer votre équipe des changements
- Mettre à jour la documentation
- Vérifier que tout fonctionne avec les nouvelles clés