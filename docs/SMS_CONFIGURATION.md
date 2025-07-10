# Configuration SMS pour &Friends

## Problème : Les SMS OTP ne sont pas reçus

### Causes possibles et solutions

## 1. Configuration Supabase

### Vérifier dans le Dashboard Supabase :

1. **Authentication > Providers > Phone**
   - ✅ Enable Phone Signup = ON
   - ✅ SMS Provider configuré (Twilio, MessageBird, ou Vonage)
   - ✅ Credentials du provider renseignées

2. **Pour Twilio (recommandé)**
   ```
   Account SID: ACxxxxxxxxxx
   Auth Token: xxxxxxxxxx
   Message Service SID: MGxxxxxxxxxx (ou From Number: +1234567890)
   ```

3. **Paramètres SMS**
   - OTP Expiry: 300 (5 minutes)
   - SMS Template: "Your verification code is {{.Code}}"
   - Max Frequency: 60 (1 SMS par minute max)

## 2. Problèmes courants

### A. Quota dépassé
- **Symptôme**: "SMS Quota Exceeded"
- **Solution**: 
  - Plan gratuit Supabase = 100 SMS/mois
  - Passer au plan Pro pour plus de SMS
  - Utiliser le mode test en développement

### B. Provider non configuré
- **Symptôme**: Pas d'erreur mais pas de SMS
- **Solution**: Configurer Twilio/MessageBird dans Supabase

### C. Numéro bloqué/Spam
- **Symptôme**: Certains numéros ne reçoivent jamais
- **Solution**: 
  - Vérifier les logs Twilio
  - Le numéro peut être sur liste noire
  - Essayer avec un autre numéro

### D. Format du numéro incorrect
- **Symptôme**: "Invalid phone number"
- **Solution**: Format international obligatoire (+33612345678)

## 3. Améliorations implémentées

### Retry automatique
- 3 tentatives avec délai progressif
- Gestion intelligente des erreurs

### Validation stricte
- Format international obligatoire
- Validation avant envoi

### Messages d'aide
- Guide de dépannage intégré
- Messages d'erreur clairs

### Mode test
- Numéro: +33612345678
- Code: 123456

## 4. Configuration Twilio recommandée

1. **Créer un compte Twilio**
   - https://www.twilio.com/console
   - Vérifier votre numéro de téléphone

2. **Obtenir un numéro Twilio**
   - Phone Numbers > Manage > Buy a number
   - Choisir un numéro avec capacité SMS

3. **Créer un Messaging Service** (recommandé)
   - Messaging > Services > Create
   - Ajouter votre numéro Twilio
   - Copier le Service SID

4. **Configurer dans Supabase**
   - Auth > Providers > Phone
   - Twilio Account SID
   - Twilio Auth Token  
   - Twilio Message Service SID

## 5. Test de diagnostic

```javascript
// Dans la console du navigateur
const { supabase } = require('@supabase/supabase-js');
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test d'envoi
const { data, error } = await client.auth.signInWithOtp({
  phone: '+33612345678'
});

console.log('Result:', { data, error });
```

## 6. Logs et monitoring

### Vérifier les logs Supabase
- Dashboard > Logs > Auth logs
- Filtrer par "otp" ou "sms"

### Vérifier les logs Twilio
- Console Twilio > Monitor > Logs > Messages
- Vérifier le statut de livraison

## 7. Alternative : WhatsApp (futur)

Configuration pour recevoir les codes via WhatsApp :
- Nécessite Twilio avec WhatsApp Business API
- Plus fiable dans certains pays
- À implémenter dans une future version