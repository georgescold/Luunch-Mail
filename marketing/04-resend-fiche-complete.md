# Resend — Fiche produit complète & exhaustive

> Tout ce que propose Resend, comment, et avec quelle stack technique. Source : resend.com (homepage, pricing, pages features), relevé en juin 2026.

> ⚠️ **Catégorie différente de Klaviyo/ActiveCampaign.** Resend n'est pas une plateforme de marketing automation, c'est une **infrastructure / API d'envoi d'e-mails pour développeurs** (concurrent de SendGrid, Postmark, Mailgun, Amazon SES). Son cœur est le **transactionnel** ; le **marketing** y est présent via **Broadcasts** (newsletters) + **Audiences** + **Automations**. Voir le positionnement détaillé en §15.

---

## 0. Carte d'identité

| | |
|---|---|
| **Nom** | Resend |
| **Slogan** | « **Email for developers** » |
| **Positionnement** | **API/infrastructure d'envoi d'e-mails** transactionnels **et** marketing « à l'échelle », orientée **développeurs** (DX-first) |
| **Cible** | **Développeurs, startups, SaaS, équipes produit/ingénierie** ; toute app qui envoie des e-mails par code |
| **Origine** | Équipe créatrice de **React Email** (la lib open source de templating email en React) ; fondée par Zeno Rocha & co. |
| **Siège** | San Francisco, CA |
| **Clients revendiqués** | Warner Bros, **MrBeast / Beast Industries**, eBay, Replit, Gumroad, Tailwind, Max (HBO), Valentino, A24, OSN+, Vercel… |
| **Conformité** | **SOC 2 Type II**, RGPD |
| **Catégorie** | Email API / **email infrastructure** (≠ marketing automation suite) |

**Philosophie produit :** Resend est né d'un constat : l'envoi d'e-mails (surtout transactionnel) était mal outillé côté **expérience développeur**. Sa promesse : une **API simple et élégante**, une **délivrabilité de premier ordre**, et la possibilité de **coder ses e-mails en React** (via React Email). C'est l'outil « moderne » qui veut remplacer SendGrid/Mailgun/Postmark. Depuis, Resend a ajouté une couche **marketing** (Broadcasts, Audiences, Automations) pour couvrir aussi les newsletters et les séquences — mais l'ADN reste **l'infrastructure d'envoi pour devs**, pas le no-code marketing.

---

## 1. Email API — le cœur (transactionnel)

Le produit central : envoyer des e-mails depuis son code.

- **API RESTful** simple (envoi en quelques lignes) + **relais SMTP** (pour les stacks legacy).
- **SDKs officiels** : Node.js, Ruby, Python, PHP, Go, Rust, Java, Elixir, .NET (+ REST, + SMTP).
- **Support frameworks** (surtout JS/TS) : Next.js, Remix, Nuxt, Express, Hono, RedwoodJS, Bun, Astro ; serverless ; **CLI**.
- **Batch sending** : envoyer des milliers d'e-mails en un appel (queue, throttle).
- **Schedule emails** : programmer l'envoi (langage naturel « in 1 hour »).
- **Test mode** : simuler des événements (delivered, opened, clicked, bounced, complained) **sans envoyer de vrais e-mails**.
- **Idempotence**, logs détaillés, réponses claires (HTTP 200 + id d'e-mail).

> Cas d'usage typiques : e-mails de bienvenue, reset de mot de passe, confirmations de commande, factures, notifications produit, OTP/2FA, alertes.

---

## 2. React Email — la lib open source phare

Le différenciateur culturel de Resend.

- **react.email** : bibliothèque **open source** de composants pour construire des e-mails en **React** (au lieu de bricoler des `<table>` HTML).
- Composants prêts : `Html`, `Head`, `Preview`, `Body`, `Container`, `Section`, `Heading`, `Text`, `Button`, `Img`, **Tailwind**…
- Templates versionnés dans le code (`welcome.tsx`, `reset-password.tsx`…), pas besoin de quitter son IDE.
- Adopté largement dans l'écosystème JS, c'est un puissant **canal d'acquisition** pour Resend.

---

## 3. Broadcasts — l'offre « marketing » (newsletters)

Le pendant marketing : envoyer des **campagnes / email blasts** à une audience, **sans code** (mais aussi par API).

- **Éditeur WYSIWYG moderne** (commandes « slash ») : Image, Heading 1/2, listes à puces/numérotées, **Button**, Divider, **HTML**, Quote, Section, **Code**, **Social links**, **Unsubscribe footer**, **Variable**.
- **Personnalisation par variables** : `{{{FIRST_NAME}}}`, `{{{LAST_NAME}}}`, `{{{EMAIL}}}` avec **fallback** si valeur absente.
- **Support Markdown** (titres, listes, gras/italique, liens, quotes).
- **Personnalisation du look & feel** : couleurs de fond/liens, taille du container, styles globaux ou individuels, typographie.
- **Planification** (envoi différé en langage naturel).
- **Analytics de broadcast** : délivrabilité (delivered/bounced), engagement (**opened/clicked**), opt-out (**unsubscribed/complained**), **top liens cliqués**, **« opened by »** (qui a ouvert/cliqué au niveau individuel), tendances dans le temps.
- **API Broadcasts** : créer/mettre à jour/envoyer un broadcast par code (`resend.broadcasts.create({ segmentId, from, subject, html })`), avec `{{{RESEND_UNSUBSCRIBE_URL}}}` géré.
- **Délivrabilité intégrée** : **mise en file automatique** (batching/espacement), insights de délivrabilité, authentification.
- Modèle de facturation : **« unlimited broadcast sending »** (les broadcasts ne décomptent pas du quota transactionnel — à confirmer selon le plan).

---

## 4. Audiences — gestion des contacts

La brique CRM-léger / listes.

- **Import de listes** en quelques minutes, quelle que soit la taille.
- **Profils de contacts** avec leurs **attributs personnels** (visibilité complète).
- **Groupes / segments** pour cibler les broadcasts (les broadcasts ciblent un `segmentId`).
- Gestion simple et intuitive (pas une CDP avancée à la Klaviyo).

---

## 5. Automations — séquences déclenchées *(récent)*

Couche d'automatisation événementielle (welcome series, séquences post-inscription…).

- Déclenchement basé sur des **événements / runs** d'automatisation.
- **10 000 runs d'automatisation inclus**, puis **pay-as-you-go à 0,0015 $/run**.
- Plus léger qu'un moteur de flows Klaviyo/ActiveCampaign (orienté dev/produit, pas no-code marketing complexe).

*(Note : page détaillée rendue côté client au moment du relevé ; description basée sur le pricing et la navigation.)*

---

## 6. Inbound — réception d'e-mails

- **Inbound emails** : recevoir et traiter des e-mails entrants (parsing), pour bâtir des fonctionnalités (support, reply-to-email, etc.).
- Compté séparément dans le pricing.

---

## 7. Webhooks — événements temps réel

- **Webhooks modulaires** : notifications temps réel vers votre serveur à chaque événement — **delivered, opened, clicked, bounced, complained** (+ autres).
- **Endpoints** : 1 (Free), 10 (Pro/Scale), flexible (Enterprise) ; **tous les événements** sur tous les plans ; **endpoints signés** (sécurité).
- Intégrable avec Segment, LogSnag, etc. pour le tracking.

---

## 8. Délivrabilité — la suite complète (point fort)

Resend met un soin extrême sur la délivrabilité (« reach humans, not spam folders ») :

- **Proactive blocklist tracking** : alerte si le domaine est ajouté à une **DNSBL** (ex. **Spamhaus**) + **demandes de retrait générées par Resend**.
- **Multi-région / faster time to inbox** : envoi depuis la région la plus proche (**Amérique du Nord, Amérique du Sud, Europe, Asie**) → latence réduite.
- **BIMI** : afficher le logo de marque dans la boîte de réception + accompagnement pour obtenir un **VMC** (« checkmark » de l'e-mail).
- **Managed dedicated IPs** : IP dédiée **gérée**, **auto-warmup** et **autoscaling** selon le volume, **sans délai d'attente**.
- **Dynamic suppression list** : ne pas réenvoyer aux désinscrits, conformité **CAN-SPAM** & co.
- **IP & domain monitoring** : surveillance DNS, alertes en cas d'erreur/régression.
- **Authentification** : vérification **DKIM, SPF**, et **DMARC** (anti-spoofing/usurpation).
- **Pristine shared IPs** : pools d'IP partagées « propres », charges distribuées.
- **Deliverability insights** + recommandations in-app + **mise en file automatique**.

---

## 9. Dashboard & observabilité

- **Analytics intuitives** + **métriques** (vue d'ensemble).
- **Logs détaillés** / **full visibility** : tracer chaque e-mail, debugger.
- **Domain authentication** : configurer et vérifier ses domaines (jusqu'à 1 000 sur Scale).
- **Open tracking** et **link tracking**.
- **Data retention** : 30 jours (Free/Pro/Scale), flexible (Enterprise).

---

## 10. IA & « AI-native »

Resend est très orienté IA/agents :

- **AI assistant** intégré (aide in-app).
- **AI credits** mensuels : 5 (Free), 100 (Pro), 500 (Scale), flexible (Enterprise).
- Page **« Are you an AI agent? See pricing »** → version **`pricing.md`** lisible par les agents (approche AI-friendly / MCP).
- S'inscrit dans la tendance « infrastructure pour apps agentiques ».

---

## 11. Templates & autres

- **Templates** d'e-mails réutilisables (+ React Email pour le code).
- **Resend Forward** : nouveauté annoncée (mise en avant en bandeau).
- **Migrate** : outils/guides de migration depuis SendGrid/Mailgun/Postmark.

---

## 12. Sécurité & conformité

- **SOC 2 Type II**, **RGPD**.
- **Penetration testing**, **DDoS protection**, **automated backups**.
- **MFA**, **permissions par clé API**, **social login**, **webhooks signés**.

---

## 13. Tarification (juin 2026)

Modèle **basé sur le volume d'e-mails envoyés** (très lisible, contrairement à Klaviyo/AC). Pay-as-you-go possible.

| Plan | Prix | E-mails inclus | Limite/jour | Domaines | Webhooks | AI credits | Support |
|---|---|---|---|---|---|---|---|
| **Free** | 0 $/mo | 3 000/mois | 100/jour | 1 | 1 endpoint | 5/mo | Ticket |
| **Pro** | 20 $/mo | 50 000/mois | aucune | 10 | 10 | 100/mo | Ticket |
| **Scale** | 90 $/mo | 100 000/mois | aucune | 1 000 | 10 | 500/mo | Slack + ticket |
| **Enterprise** | Sur devis | Flexible | aucune | Flexible | Flexible | Flexible | Prioritaire + SLA |

- **Dépassement e-mails** : **0,90 $ / 1 000 e-mails** (pay-as-you-go, plans payants).
- **Add-on IP dédiée** : **30 $/mois** (dispo sur Scale, au-delà de 500 e-mails/jour) — warmup + monitoring + autoscale gérés.
- **Automations** : 10 000 runs inclus puis **0,0015 $/run**.
- **Rétention data** : 30 jours (sauf Enterprise flexible).
- Curseur de volume jusqu'à **3M+ e-mails/mois**. Pas de remises annuelles affichées par défaut (FAQ : nous contacter ; tarifs non-profit/éducation possibles).

> **Très bon marché à volume** comparé à une suite marketing : 100 000 e-mails = 90 $/mois chez Resend, là où une plateforme marketing facture surtout au **nombre de contacts** + fonctionnalités.

---

## 14. Stack technique / « backend »

- **Infrastructure d'envoi multi-région** (NA/SA/EU/Asie), pools d'IP partagées « propres » + IP dédiées gérées (warmup/autoscale).
- **API REST + SMTP**, SDKs multi-langages, batch/queue/throttle, scheduling.
- **Moteur de délivrabilité** : blocklist tracking (Spamhaus), suppression dynamique, monitoring DNS, DKIM/SPF/DMARC/BIMI.
- **Webhooks** signés temps réel ; **inbound parsing**.
- **React Email** (OSS) pour le rendu ; éditeur WYSIWYG pour Broadcasts.
- **Front** : site & dashboard Next.js (hébergé Vercel, dont le CEO est ambassadeur).
- **Sécurité** : SOC 2 Type II, RGPD, pentests, DDoS, MFA, clés API granulaires.

---

## 15. Positionnement vs Klaviyo & ActiveCampaign (à lire)

**C'est une catégorie différente.** Resend n'est pas un concurrent frontal de Klaviyo/ActiveCampaign — il joue sur un autre terrain.

| Critère | **Resend** | **Klaviyo / ActiveCampaign** |
|---|---|---|
| **Catégorie** | **Email API / infrastructure** (type SendGrid, Postmark, Mailgun, SES) | **Marketing automation / CRM** |
| **Cœur** | **Transactionnel** (par code) | **Marketing** (campagnes + flows) |
| **Utilisateur** | **Développeur** (envoi par API) | **Marketeur** (no-code) |
| **Création d'e-mail** | **Code (React Email)** + éditeur Broadcasts | Éditeur glisser-déposer + templates |
| **Automatisation** | Légère (Automations, par runs) | **Moteurs de flows avancés** (panier abandonné, scoring…) |
| **Données** | Audiences (listes + attributs) | **CDP** (Klaviyo) / **CRM** (AC), prédictif |
| **Segmentation** | Basique | **Avancée, temps réel, IA** |
| **Canaux** | **E-mail uniquement** | Email + **SMS + WhatsApp + push…** |
| **Pricing** | **Au volume d'e-mails** (90 $/100k) | **Au nombre de contacts** + features |
| **Idéal pour** | E-mails applicatifs/transactionnels, devs, newsletters simples | Marketing e-commerce/B2B piloté par la donnée |

**Comment ils coexistent :** beaucoup d'entreprises utilisent **Resend pour le transactionnel** (reçus, resets, notifications applicatives — par code) **ET** Klaviyo/ActiveCampaign pour le **marketing** (campagnes, flows, segmentation). Resend peut suffire seul si les besoins marketing se limitent à des **newsletters simples** envoyées par une équipe technique. Il ne remplace pas une suite marketing pour du e-commerce data-driven (pas de CDP, pas de flows e-commerce préconçus, pas de SMS/WhatsApp, pas de prédictif).

---

## 16. Forces & limites (synthèse)

**Forces**
- **Expérience développeur** de référence (API élégante, SDKs, React Email).
- **Délivrabilité** très soignée (multi-région, blocklist/Spamhaus, IP dédiées gérées, BIMI, DMARC).
- **Pricing au volume** simple et **très compétitif** à grande échelle.
- **Transactionnel solide** + **Broadcasts** pour les newsletters + **webhooks/inbound**.
- **AI-native** (AI assistant, credits, pricing.md pour agents), open source (React Email).
- Adopté par des marques majeures (Warner Bros, eBay, MrBeast…).

**Limites / points d'attention**
- **Pas une plateforme de marketing automation** : pas de CDP, segmentation avancée limitée, pas de flows e-commerce préconçus, **pas de SMS/WhatsApp/push**.
- **Orienté développeurs** : un marketeur non-technique sera plus à l'aise sur Klaviyo/AC pour les campagnes complexes.
- **Rétention des données 30 jours** (sauf Enterprise) — court pour de l'analyse historique.
- Couche **Automations encore jeune** vs les moteurs matures des suites marketing.
- Marketing « léger » : convient aux newsletters, pas au marketing relationnel e-commerce sophistiqué.

---

*Fiches liées : `00-fondamentaux-email-marketing.md`, `01-klaviyo-fiche-complete.md`, `02-activecampaign-fiche-complete.md`, `03-comparaison-klaviyo-vs-activecampaign.md`.*
