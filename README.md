# Luunch Mail — plateforme e-mail tout-en-un

> Réunit le meilleur de **Smartlead, Instantly** (cold outreach & délivrabilité), **Klaviyo, ActiveCampaign** (marketing automation & données) et **Resend** (API/infra d'envoi pour développeurs) — sans CRM de vente ni lead finder.

Luunch Mail couvre tout le cycle de vie de l'e-mail : **infrastructure & délivrabilité** → **audiences & données** → **composition** → **3 moteurs d'envoi** (cold outreach, marketing automation, API transactionnelle) → **inbox unifiée** → **analytics**, le tout multi-workspace et white-label.

---

## ⚡ Démarrage rapide

Prérequis : **Node ≥ 20** et **pnpm** (`npm i -g pnpm`).

```bash
pnpm install          # dépendances
cp .env.example .env   # variables (l'app tourne SANS aucune clé externe)
pnpm setup            # génère le client Prisma + crée la base SQLite + seed démo
pnpm dev              # http://localhost:3000
```

**Connexion démo :** `demo@gigamail.io` / `demodemo`

> `pnpm setup` = `prisma generate` + `prisma db push` + `pnpm db:seed`. Pour repartir de zéro : `pnpm db:reset`.

L'app démarre par défaut en **MODE DÉMO** : aucun e-mail réel n'est envoyé, mais les events (delivered / opened / clicked / bounced) sont **simulés par le worker** de jobs, et le warmup progresse en temps réel — l'app est donc pleinement testable immédiatement. Renseignez les clés (ci-dessous) pour passer à l'envoi réel.

---

## 🧱 Stack & justification

| Couche | Choix | Pourquoi |
|---|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 + TypeScript | Frontend + API dans un seul déploiement ; écosystème natif de **React Email** (Resend) ; Server Components. |
| **Base de données** | **Prisma + SQLite** (dev) | Démarre sans Docker ni serveur. Schéma **portable Postgres** pour la prod (voir ci-dessous). |
| **UI** | Tailwind CSS v3 + design system maison | Application **stricte de `DESIGN.md`** (tokens couleurs/typo/espacements, composants normés). |
| **Jobs async** | File adossée à la DB + worker in-process (`src/lib/worker.ts`) | Zéro infra en dev. Swappable BullMQ/Redis en prod. |
| **Envoi** | Abstraction *provider* : `Resend` / `SMTP` / `Demo` | Interchangeable, mode démo sans clé (brief §7/§10). |
| **Auth** | Sessions + cookies httpOnly, mot de passe **scrypt** natif | Multi-tenant (Organisation → Workspace → User). |
| **IA** | Claude (préféré) ou OpenAI, fallback démo | Composer, agent de réponse, génération d'objets. |

---

## 🗂️ Architecture par domaines (`src/lib/` & `src/app/(app)/`)

| Domaine | Code | Écran | Fiches de référence |
|---|---|---|---|
| **iam** | `auth.ts`, `crypto.ts` | (auth) + topbar | — |
| **infrastructure** | `dns.ts` | `/infrastructure` | outreach/01 §2.1·2.4, outreach/02 §2.6, marketing/04 §8 |
| **deliverability** | `deliverability.ts`, `warmup.ts` | `/deliverability` | outreach/01 §2.2·2.5, outreach/02 §2.4·2.5 |
| **audiences** | `segments.ts` | `/audiences` | marketing/01 §2·7, marketing/02 §6 |
| **composer** | `spintax.ts`, `ai.ts` | `/composer` | marketing/04 §2·3, marketing/01 §3.3 |
| **outreach** | `outreach.ts` | `/outreach` | outreach/00 §5, outreach/01 §2.13, outreach/02 §1 |
| **automation** | `outreach.ts`, `messaging.ts` | `/automations` | marketing/00 §5, marketing/01 §3, marketing/02 §2 |
| **transactional** | `messaging.ts`, `api-auth.ts` | `/transactional` + `/api/v1/emails` | marketing/04 §1·7, outreach/01 §2.10 |
| **inbox** | `messaging.ts`, `ai.ts` | `/inbox` | outreach/01 §2.6, outreach/00 §7 |
| **analytics** | requêtes agrégées | `/analytics` | marketing/01 §6, marketing/04 §3 |
| **billing** | `UsageCounter` | `/settings` | — |

Le **moteur d'envoi** est découplé derrière l'interface `EmailProvider` (`src/lib/providers/`).

---

## 🔌 Activer l'envoi réel & les intégrations

Tout est piloté par `.env` (voir `.env.example`). Sans clé → mode démo.

- **Resend** (transactionnel + broadcasts) : `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=…`, `DEFAULT_FROM_EMAIL=no-reply@votredomaine.com`.
- **SMTP générique** : `EMAIL_PROVIDER=smtp` + `SMTP_HOST/PORT/USER/PASSWORD/SECURE`.
- **Cold outreach** : connexion des boîtes Gmail/Outlook (OAuth — `GOOGLE_*`, `MICROSOFT_*`) ou SMTP/IMAP. L'envoi part des **boîtes réelles** connectées ; les réponses alimentent l'inbox via IMAP/API (`/api/inbound`).
- **DNS automatisé** : `CLOUDFLARE_API_TOKEN` pour poser/vérifier SPF/DKIM/DMARC/MX/CNAME. Sinon, les enregistrements sont **générés à copier** + **vérifiés** par lookup DNS réel (`src/lib/dns.ts`).
- **Délivrabilité** : lookups **DNSBL réels** (Spamhaus & co, `src/lib/deliverability.ts`), analyse spam (heuristique type SpamAssassin), tests de placement.
- **IA** : `ANTHROPIC_API_KEY` (modèle `ANTHROPIC_MODEL`, défaut `claude-opus-4-8`) ou `OPENAI_API_KEY`.

---

## 🛠️ API transactionnelle

Créez une clé API dans **Transactionnel / API**, puis :

```bash
curl -X POST http://localhost:3000/api/v1/emails \
  -H "Authorization: Bearer gm_live_…" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order-1234" \
  -d '{
    "from": "no-reply@votredomaine.com",
    "to": "client@example.com",
    "subject": "Votre commande est confirmée",
    "html": "<h1>Merci !</h1>"
  }'
```

- **Batch** : envoyez un tableau d'objets (max 100).
- **Mode test** : `"test": true` → simule les events sans envoi réel.
- **Envoi planifié** : `"scheduledAt": "2026-07-01T09:00:00Z"`.
- **Webhooks** : événements signés (`gigamail-signature`) vers vos endpoints (delivered/opened/clicked/bounced/complained). Réception des events d'un provider réel sur `POST /api/webhooks/:provider`.
- **Inbound** : `POST /api/inbound` (parsing) → alimente l'inbox unifiée.

---

## 🔒 Délivrabilité & conformité (brief §6)

- **SPF + DKIM + DMARC** générés (vraie paire de clés RSA pour DKIM) et **vérifiés** avant l'envoi de volume.
- **Désinscription 1-clic** : en-tête `List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058) → `/u/:token` (jeton signé).
- **Liste de suppression** appliquée à **chaque** envoi marketing/outreach ; bounce dur & plainte → suppression auto.
- **Warmup** obligatoire (slow ramp, caps quotidiens, auto-pause sur réputation basse) avant montée en volume.
- **RGPD** : preuve de consentement, double opt-in, gestion des préférences, export/effacement (Réglages › Conformité).

---

## ❌ Hors périmètre (volontairement non construit)

Conformément au brief §3 : **pas de CRM de vente** (pipeline/deals, lead scoring commercial, dialer) ni de **lead finder / sourcing** (base B2B, scraping, déanonymisation de visiteurs). La gestion des contacts opt-in, segments, profils et vérification d'e-mails **est** incluse.

---

## 📜 Scripts

```bash
pnpm dev          # serveur de dev (worker de jobs auto-démarré)
pnpm build        # build de production
pnpm start        # serveur de production
pnpm setup        # generate + db push + seed
pnpm db:seed      # (re)génère les données de démo
pnpm db:reset     # réinitialise la base + seed
pnpm db:studio    # explorateur Prisma
pnpm test         # tests unitaires (Vitest)
```

---

## 🚀 Passage en production

1. **Postgres** : dans `prisma/schema.prisma`, `provider = "postgresql"` + `DATABASE_URL` Postgres, puis `prisma migrate deploy`. (Les champs JSON sont stockés en `String` pour rester compatibles ; passez-les en `Json` natif sous Postgres si souhaité.)
2. **File de jobs** : remplacer le worker in-process par **BullMQ + Redis** (process worker dédié). L'interface `enqueue()` (`src/lib/queue.ts`) est déjà l'abstraction à brancher.
3. **Secrets** : `APP_SECRET` long et aléatoire ; chiffrer les tokens OAuth des boîtes.
4. **Sécurité** : webhooks signés ✅, permissions par clé API ✅, ajouter rate limiting + WAF/DDoS au déploiement.

---

## 🧪 Tests & qualité

`pnpm test` couvre la personnalisation (variables + spintax), la cryptographie (scrypt, clés API, signatures de webhook) et l'analyse de spam. Le socle est typé strict (`pnpm exec tsc --noEmit`).

---

## 📚 Documentation des modules

Chaque module implémente l'union des meilleures capacités des outils analysés. La spécification fonctionnelle de référence reste les fiches de `./outreach/` et `./marketing/` (citées dans le tableau d'architecture ci-dessus et dans le code).
