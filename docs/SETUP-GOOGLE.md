# Connecter Google Workspace / Gmail à Luunch Mail

Luunch Mail envoie et lit vos e-mails Google via **OAuth + l'API Gmail** — aucun mot de passe stocké.
La mise en place côté Google est une opération **unique** (~5-10 min). Suivez ces étapes.

## 1. Créer un projet Google Cloud
1. Allez sur <https://console.cloud.google.com/> et connectez-vous avec le compte qui gère votre Workspace.
2. En haut, créez un projet (ex. « Luunch Mail »).

## 2. Activer l'API Gmail
1. Menu → **APIs & Services → Library** (Bibliothèque).
2. Cherchez **Gmail API** → **Activer**.

## 3. Configurer l'écran de consentement OAuth
1. **APIs & Services → OAuth consent screen**.
2. Type **Interne** si vous êtes sur Google Workspace (recommandé : pas de validation Google requise), sinon **Externe**.
3. Renseignez nom de l'app + e-mail de support.
4. **Scopes** : vous pouvez laisser vide ici (les scopes sont demandés à la volée). Luunch Mail demande :
   - `gmail.send` (envoyer)
   - `gmail.readonly` (lire les réponses)
   - `userinfo.email` (récupérer l'adresse)
5. Si type **Externe** : ajoutez votre adresse dans **Test users** (sinon l'accès est bloqué tant que l'app n'est pas vérifiée).

## 4. Créer l'ID client OAuth
1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Type d'application : **Web application**.
3. **Authorized redirect URIs** → ajoutez exactement :
   ```
   http://localhost:3000/api/oauth/google/callback
   ```
   (En production, ajoutez aussi `https://votre-domaine.com/api/oauth/google/callback`.)
4. Créez → copiez le **Client ID** et le **Client secret**.

## 5. Renseigner Luunch Mail
Dans le fichier `.env` à la racine :
```
GOOGLE_CLIENT_ID="votre-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="votre-client-secret"
APP_URL="http://localhost:3000"
```
Puis relancez `start.bat`.

## 6. Connecter une boîte
Dans l'app : **Assistant de démarrage** (ou **Infrastructure**) → **Connecter une boîte → Google Workspace → Se connecter avec Google**.
Autorisez l'accès : la boîte apparaît, démarre en chauffe, envoie réellement via Gmail, et ses réponses
remontent automatiquement dans la **Master Inbox**.

---

## ⚠️ À savoir pour le cold outreach
- Google impose des **limites d'envoi** (~2 000/jour/compte Workspace, bien moins en cold) et **suspend** les comptes
  qui envoient trop de froid trop vite. La **chauffe automatique** de Luunch Mail respecte une montée progressive — ne la désactivez pas.
- Restez sous **20-50 e-mails/jour/boîte** en cold, et multipliez les boîtes plutôt que le volume par boîte.
- Pour de gros volumes, combinez avec des boîtes SMTP dédiées (voir l'option SMTP/IMAP).
