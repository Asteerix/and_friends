# Corrections du système OTP

## Problèmes corrigés

### 1. Timer qui se met en pause en arrière-plan
**Problème**: Quand l'application passe en arrière-plan, le timer JavaScript s'arrête, causant une désynchronisation entre le temps affiché et le temps réel d'expiration.

**Solution**: 
- Utilisation d'un timestamp d'expiration (`timerExpiry`) au lieu d'un simple compteur
- Ajout d'un listener `AppState` pour recalculer le temps restant quand l'app revient au premier plan
- Le timer utilise maintenant `Date.now()` pour calculer le temps restant réel

### 2. Code OTP invalide même s'il vient d'être reçu
**Problèmes possibles**:
1. **Format du numéro**: Le numéro doit être au format international complet (ex: +33612345678)
2. **Expiration côté Supabase**: Les tokens OTP ont une durée de vie de 5 minutes côté serveur
3. **Mauvais type d'OTP**: S'assurer d'utiliser `type: 'sms'` dans `verifyOtp`

**Solutions implémentées**:
- Logging détaillé pour déboguer les erreurs OTP
- Messages d'erreur plus précis pour différencier entre code incorrect et code expiré
- Vérification du format du numéro de téléphone

## Configuration Supabase recommandée

Dans le dashboard Supabase, vérifier les paramètres suivants :

1. **Auth > Providers > Phone**:
   - SMS Provider activé (Twilio recommandé)
   - OTP Expiry: 300 secondes (5 minutes)
   - Max frequency: 60 secondes entre les envois

2. **Auth > Settings**:
   - Enable phone sign-ups: ON
   - SMS OTP length: 6

## Test en développement

Pour tester sans envoyer de vrais SMS:
- Numéro: +33612345678
- Code: 123456

## Debugging

Si le code est toujours invalide:
1. Vérifier les logs dans la console pour voir le format exact du numéro
2. Vérifier dans Supabase Dashboard > Auth > Users si l'OTP a été généré
3. Vérifier l'heure du serveur vs l'heure du téléphone (décalage possible)

## Code modifié

### CodeVerificationScreen.tsx
- Ajout de `AppState` pour gérer le background/foreground
- Utilisation d'un timestamp pour le timer
- Logging amélioré pour le debugging
- Messages d'erreur plus précis