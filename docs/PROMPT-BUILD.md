# PROMPT DE BUILD — Plateforme e-mail tout-en-un (nom de code : **Gigamail**)

> À copier-coller à un **agent de code** (Claude Code, Cursor, Windsurf…). Ce document est le **brief produit + technique** complet. Lis-le en entier, puis lis les documents de référence indiqués, **avant** d'écrire la moindre ligne de code.

---

## 0. Rôle & mission

Tu es un **ingénieur full-stack senior**. Ta mission : concevoir et **développer une application web réelle et fonctionnelle** — une **plateforme e-mail tout-en-un** qui réunit **le meilleur des fonctionnalités** de cinq logiciels de référence :

- **Cold outreach :** Smartlead, Instantly
- **Marketing / infrastructure :** Klaviyo, ActiveCampaign, Resend

L'objectif est de fusionner, dans **un seul produit cohérent**, l'infrastructure de délivrabilité et de prospection à froid (Smartlead/Instantly), l'automatisation marketing et la donnée (Klaviyo/ActiveCampaign), et l'excellence d'une API/infra d'envoi pour développeurs (Resend).

L'application doit **réellement envoyer des e-mails** (pas une maquette). **Tu choisis la stack technique** la plus adaptée (voir §8), mais elle doit respecter les exigences ci-dessous.

---

## 1. ⚠️ DOCUMENTS DE RÉFÉRENCE À LIRE IMPÉRATIVEMENT (source de vérité)

**Avant de coder, lis intégralement** les fiches d'analyse déjà présentes dans ce projet. Elles décrivent, fonctionnalité par fonctionnalité, tout ce que font les logiciels à répliquer. **Elles constituent la spécification fonctionnelle de référence** — ne réinvente pas, synthétise-les.

### Dossier `./research/outreach/` (cold email)
- `./research/outreach/00-fondamentaux-cold-email-outreach.md` — comment marche l'outreach (délivrabilité, warmup, SPF/DKIM/DMARC, rotation de boîtes, infra, KPIs, frontend/backend).
- `./research/outreach/01-smartlead-fiche-complete.md` — tous les modules Smartlead.
- `./research/outreach/02-instantly-fiche-complete.md` — tous les modules Instantly.
- `./research/outreach/03-comparaison-smartlead-vs-instantly.md` — différences et différenciateurs.
- `./research/outreach/README.md` — index.

### Dossier `./research/marketing/` (email marketing)
- `./research/marketing/00-fondamentaux-email-marketing.md` — concepts (opt-in, listes/segments, flows, CDP, transactionnel, omnicanal, KPIs, marketing autonome).
- `./research/marketing/01-klaviyo-fiche-complete.md` — tous les modules Klaviyo.
- `./research/marketing/02-activecampaign-fiche-complete.md` — tous les modules ActiveCampaign.
- `./research/marketing/03-comparaison-klaviyo-vs-activecampaign.md` — différences.
- `./research/marketing/04-resend-fiche-complete.md` — Resend (API, React Email, Broadcasts, délivrabilité).
- `./research/marketing/README.md` — index + les deux catégories d'outils.

### Design (frontend)
- `./DESIGN.md` — **le design system à appliquer pour TOUTE l'interface** : couleurs, typographie (Fredoka/Poppins/Roboto Mono), espacements (base 8px), border-radius, élévations/ombres, et tous les composants (boutons, cartes, inputs, chips, listes, checkboxes, radios, tooltips) + les Do's & Don'ts. **Respecte scrupuleusement ces tokens et composants.**

> **Règle :** chaque module que tu construis doit correspondre à ce qui est décrit dans ces fiches. Quand un choix d'implémentation se pose, **relis la fiche concernée** (elle est citée dans chaque module en §4).

---

## 2. Vision produit

**Gigamail = la plateforme unique qui couvre tout le cycle de vie d'un e-mail**, du froid au chaud, du transactionnel à la campagne, avec une délivrabilité de classe mondiale :

1. **Infrastructure & délivrabilité** : domaines, boîtes d'envoi, DNS automatisés, IP dédiées, multi-région, warmup, tests de placement, monitoring de réputation.
2. **Audiences & données** : contacts, segmentation dynamique temps réel, profils unifiés, analytics prédictives, formulaires/landing pages d'opt-in.
3. **Composition** : éditeur drag-and-drop + templates code (React Email) + génération IA + personnalisation/spintax.
4. **Trois moteurs d'envoi unifiés** : (a) **cold outreach** (séquences), (b) **marketing automation** (flows + broadcasts), (c) **API transactionnelle** (REST/SMTP/SDK/webhooks).
5. **Boîte de réception unifiée** (master inbox / unibox) multi-comptes avec tri IA.
6. **Multicanal** : e-mail (cœur) + SMS / WhatsApp / RCS / push.
7. **Couche IA** : agents (génération de campagnes, agent de réponse, optimisation autonome, send-time, segments, copywriting, images).
8. **Analytics** : délivrabilité, engagement, attribution du chiffre d'affaires, résultats A/B.
9. **Multi-workspace & white-label** (usage agence).

La promesse : *« réunir le meilleur de Smartlead, Instantly, Klaviyo, ActiveCampaign et Resend, sans le superflu »*.

---

## 3. Périmètre — INCLUS vs EXCLU

### ✅ INCLUS (à construire)
Tout ce qui relève de l'**envoi, de la délivrabilité, de l'automatisation, de la donnée d'audience, de la composition, de l'inbox et de l'analytics** (détaillé en §4).

### ❌ EXCLU (NE PAS construire)
- **CRM de vente** : pas de pipeline d'opportunités/deals, pas de gestion d'affaires, pas de lead scoring commercial, pas de win probability, pas de routage commercial, pas de dialer/appels téléphoniques sortants. (= la partie « Sales CRM » d'ActiveCampaign et le SmartDialer de Smartlead.)
- **Lead finder / sourcing de prospects** : pas de base de données de prospects B2B, pas de scraping/enrichissement de prospects, pas de déanonymisation de visiteurs de site, pas de recherche de contacts. (= SmartProspect de Smartlead, Lead Database & Website Visitors d'Instantly.)

> Nuance importante : la **gestion des contacts opt-in, la segmentation, les profils et la vérification d'e-mails** font partie du périmètre INCLUS (ce n'est ni du CRM de vente, ni du lead finding). On **importe/collecte** des contacts (via formulaires, imports, API) ; on ne **prospecte pas de nouveaux leads** depuis une base externe.

---

## 4. Modules fonctionnels à construire (synthèse des fiches)

Pour chaque module, **consulte la fiche citée**. Construis l'union des meilleures capacités des outils analysés.

### 4.1 Infrastructure d'envoi & gestion des comptes
*(Réf. : outreach/01 §2.1, 2.4 ; outreach/02 §2.6, 2.7 ; marketing/04 §1, §8)*
- Connexion de **boîtes d'envoi illimitées** : Google Workspace (OAuth), Microsoft 365/Outlook (OAuth), **SMTP/IMAP générique**.
- **Provisioning de domaines & boîtes (DFY)** : achat/connexion de domaines, création de boîtes, **configuration DNS automatique** (MX, **SPF, DKIM, DMARC**, CNAME de tracking) via API de registrar/DNS (ex. Cloudflare API), avec **vérification** et statut de propagation.
- **IP dédiées gérées** (warmup + autoscale + monitoring) en option, et **pools d'IP partagées propres** ; **multi-région** (sélection de la région d'envoi la plus proche).
- **Rotation des boîtes** (mailbox rotation) et **ESP matching** dans les campagnes.
- **Workspaces isolés** par client (agence), avec **white-label** (domaine custom de l'app, branding).

### 4.2 Moteur de warmup (chauffe)
*(Réf. : outreach/01 §2.2 ; outreach/02 §2.4 ; outreach/00 §4)*
- **Pool de warmup** : réseau de comptes connectés qui s'échangent des e-mails, avec **ouverture/lecture/réponse automatiques** et **sortie des spams**.
- **Slow ramp** (montée progressive : J1=2, J2=4…), **caps quotidiens**, **reply-rate cible**, **garde-fous** (auto-pause sur bounce/spam, self-healing).
- Dashboard temps réel (volume, opens, replies, score de réputation).

### 4.3 Délivrabilité & réputation
*(Réf. : outreach/01 §2.5 (SmartDelivery) ; outreach/02 §2.5 (Inbox Placement) ; marketing/04 §8)*
- **Tests de placement** (seed lists Gmail/Outlook/Yahoo) → savoir si on tombe en Principale / Promotions / Spam, score de placement.
- **Analyse spam & contenu** (SpamAssassin et équivalents) + recommandations.
- **Monitoring de blacklists** (400+ DNSBL, ex. **Spamhaus**) + génération de demandes de retrait.
- **Santé DNS** (SPF/DKIM/DMARC), **rapports DMARC**, alertes de régression.
- **Liste de suppression dynamique** (anti-renvoi aux désinscrits/plaintes), **BIMI/VMC**.
- **Vérification d'e-mails** (validation d'une liste avant envoi, détection catch-all).

### 4.4 Audiences, contacts & données
*(Réf. : marketing/01 §2 (KDP/CDP), §7 (segmentation) ; marketing/02 §6 ; outreach — leads de campagne)*
- **Profils de contacts unifiés** (identité, attributs custom, comportement, engagement, historique d'envoi) en **temps réel**.
- **Segmentation dynamique illimitée** (conditions combinables sur n'importe quelle donnée, recalcul temps réel).
- **Listes & imports** (CSV, API), **objets personnalisés**, **rétention configurable**.
- **Analytics prédictives** (CLV prévue, risque de churn, date probable de prochaine commande, affinité de canal) — *donnée, pas CRM de vente*.
- **Formulaires / pop-ups / landing pages** d'opt-in (capture de contacts, A/B).
- **Conformité** : consentement, double opt-in, gestion des préférences, **désinscription 1 clic**, RGPD/CAN-SPAM.

### 4.5 Composition & templates
*(Réf. : marketing/01 §3.3 ; marketing/02 §3 ; marketing/04 §2 (React Email), §3 (éditeur Broadcasts))*
- **Éditeur e-mail drag-and-drop** (blocs : image, titres, listes, bouton, divider, HTML, quote, section, code, liens sociaux, **footer de désinscription**, variables).
- **Templates code via React Email** (composants React, Tailwind) — pour les profils techniques et le transactionnel.
- **Bibliothèque de templates** prêts à l'emploi + **modèles de flows préconçus**.
- **Personnalisation** : variables `{{first_name}}` avec fallback, **contenu dynamique/conditionnel**, **spintax** (variation de texte anti-spam), **Markdown**.
- **Génération IA** : objets, corps, images (remix), à partir d'un prompt.

### 4.6 Moteur 1 — Cold outreach (séquences)
*(Réf. : outreach/00 §5 ; outreach/01 §2.13 ; outreach/02 §1)*
- **Séquences multi-étapes** avec **délais**, **branches conditionnelles** (si répondu/ouvert/cliqué/bounce), **subsequences** selon l'intention.
- **Rotation des boîtes**, **ESP matching**, **A/B testing** (objet/corps/heure), **spintax**.
- **Détection de réponse** → arrêt automatique de la séquence.
- **Planification** (fenêtres d'envoi, fuseaux, jours ouvrés), **throttling**.

### 4.7 Moteur 2 — Marketing automation (flows + broadcasts)
*(Réf. : marketing/00 §5 ; marketing/01 §3 ; marketing/02 §2)*
- **Constructeur de flows visuel** (canvas) : **déclencheurs** (inscription, achat, panier abandonné, visite, inactivité, date, événement API), **conditions/branches**, **actions** (envoyer e-mail/SMS/WhatsApp/push, attendre, taguer, mettre à jour un champ, webhook), **objectifs** (sortie sur conversion).
- **Flows préconçus e-commerce** : bienvenue, panier abandonné, navigation abandonnée, post-achat, win-back, réapprovisionnement.
- **Broadcasts / campagnes** ponctuelles vers un segment, **planification** (langage naturel « dans 1h »), **send-time optimization**.
- **A/B/n testing** sur campagnes et workflows.

### 4.8 Moteur 3 — API transactionnelle
*(Réf. : marketing/04 §1, §7 ; outreach/01 §2.10)*
- **API REST** d'envoi + **relais SMTP** + **SDKs** (au moins Node/TS ; idéalement Python, etc.).
- **Batch sending**, **envoi planifié**, **idempotence**, **mode test** (simuler des événements sans envoi réel).
- **Webhooks** temps réel signés (delivered, opened, clicked, bounced, complained, unsubscribed) + **inbound** (réception/parsing d'e-mails).
- **Clés API multiples** nommées avec **permissions granulaires**.

### 4.9 Boîte de réception unifiée (Master Inbox / Unibox)
*(Réf. : outreach/01 §2.6 ; outreach/02 (Unibox) ; outreach/00 §7)*
- **Centralisation** des réponses de toutes les boîtes/campagnes/clients dans une vue unique.
- **Catégorisation auto par IA** (intéressé, pas intéressé, OOO, désinscription, bounce), **filtres**, **actions en masse** (assigner, taguer, archiver, répondre, transférer), **notes internes**, collaboration d'équipe.
- **Agent de réponse IA** : répond aux intéressés en <5 min, gère objections, propose des créneaux (lien de RDV externe), **modes Human-in-the-loop ou Autopilot**.

### 4.10 Multicanal
*(Réf. : marketing/00 §10 ; marketing/01 §3.1 ; marketing/02 §6)*
- Canal **e-mail = cœur**. Ajouter **SMS, WhatsApp (natif), RCS, push** dans les flows et campagnes.
- **Affinité de canal** (IA choisit le meilleur canal par contact).
- *(Rappel : pas de canal voix/dialer — exclu.)*

### 4.11 Couche IA (agents & assistance)
*(Réf. : outreach/01 §2.7 (SmartAgents) ; outreach/02 §2.10-2.12 ; marketing/01 §4 (K:AI/Composer) ; marketing/02 §5 (Active Intelligence))*
- **Agent générateur de campagne** (« Composer ») : à partir d'une URL/prompt, génère campagnes/flows/segments/templates fidèles à la marque.
- **Agent de réponse** (cf. 4.9), **agents d'automatisation no-code** (alertes, sync, reporting).
- **Optimisation autonome** : send-time, A/B auto, segments suggérés, copywriting, analyse de sentiment, traduction.
- Brancher des **LLM** (OpenAI/Anthropic) ; prévoir **clé LLM configurable** ; **endpoint MCP** optionnel.

### 4.12 Analytics & reporting
*(Réf. : marketing/01 §6 ; marketing/02 (analytics) ; marketing/04 §3 (broadcast analytics) ; outreach KPIs)*
- **Dashboards** : délivrabilité (placement, bounce, spam, blacklist), engagement (open/click/reply), opt-out (unsub/plainte), **attribution du chiffre d'affaires**, résultats A/B, **par campagne / flow / canal / boîte**.
- **Logs détaillés** par e-mail (timeline d'événements), **« opened by »** (niveau individuel), top liens cliqués.
- **Exports** et rapports partageables (clients/équipe), alertes sur seuils.

---

## 5. Exigences fonctionnelles transverses
- **Multi-tenant** : organisations → workspaces → utilisateurs, avec **rôles & permissions**.
- **Authentification** (e-mail + OAuth social), **MFA**, SSO (option entreprise).
- **Onboarding** guidé (connexion domaine/boîtes, warmup, première campagne).
- **Facturation/quotas** simulée ou réelle (au volume d'e-mails et/ou contacts) — au minimum un système de **quotas & compteurs**.
- **Internationalisation** : interface **en français** par défaut (le public est francophone), prête pour l'anglais.

---

## 6. Exigences de délivrabilité & conformité (non négociables)
- Authentification **SPF + DKIM + DMARC** obligatoire et vérifiée avant tout envoi de volume.
- **Désinscription en 1 clic** (header List-Unsubscribe + lien), **liste de suppression** appliquée à chaque envoi.
- **Gestion des bounces/plaintes** (suppression auto, seuils d'alerte), respect des limites Google/Yahoo (taux de plainte < 0,3 %).
- **Consentement & RGPD** (preuve de consentement, gestion des préférences, droit à l'effacement).
- **Warmup obligatoire** avant montée en volume sur une nouvelle boîte.

---

## 7. Envoi RÉEL — implémentation concrète
L'app doit envoyer pour de vrai. Implémente ainsi :
- **Transactionnel & broadcasts** → via un **provider d'envoi réel** (recommandé : **Resend** — API + React Email s'intègrent parfaitement au périmètre ; ou Amazon SES/Postmark/SMTP). Configurable par clé API.
- **Cold outreach** → envoi via les **boîtes réelles connectées par l'utilisateur** (Gmail/Outlook OAuth, SMTP), lecture des réponses via **IMAP/API** pour alimenter l'inbox unifiée.
- **Warmup** → boucle réelle d'envois + ouvertures/réponses automatiques entre comptes connectés (via IMAP/API).
- **DNS** → intégration **API DNS** (Cloudflare ou autre) pour poser/vérifier les enregistrements ; sinon, générer les enregistrements à copier + **vérification automatique**.
- **Délivrabilité** → lookups **DNSBL** réels (Spamhaus…), tests de placement via comptes seed.
- **Webhooks entrants** du provider (events) → mise à jour des stats et de l'inbox.

> Indique clairement (dans le code et un README) les parties qui dépendent d'un compte provider/clé API externe, et fournis un **mode démo** (données simulées) activable quand les clés ne sont pas configurées, pour que l'app soit testable immédiatement.

---

## 8. Stack technique — **tu choisis**, sous contraintes
Choisis la stack que tu juges la plus adaptée et **justifie ton choix** dans le README. Contraintes :
- **Application web réelle** (frontend + backend + base de données), pas une simple maquette.
- **Frontend** : web responsive, qui applique **strictement `./DESIGN.md`** (tokens, composants, do's & don'ts). Une stack à base de **React** est cohérente avec l'écosystème React Email (mais libre à toi).
- **Backend** : API robuste + **base de données** (relationnelle recommandée pour la donnée transactionnelle/relationnelle).
- **File d'attente / jobs asynchrones** (envois, warmup, webhooks, batchs) — indispensable.
- **Intégration provider e-mail réelle** + **OAuth Gmail/Microsoft** + **IMAP/SMTP**.
- **Tests** (unitaires + e2e sur les parcours critiques), **CI**, **variables d'environnement** (`.env.example`), **migrations** de DB, **seed** de démo.
- **Sécurité** : SOC2-friendly (chiffrement secrets, webhooks signés, permissions par clé API, rate limiting, DDoS-aware), **conformité RGPD**.

---

## 9. Frontend & design — appliquer `./DESIGN.md`
- **Tout l'UI** suit le design system de `./DESIGN.md` : palette (primaire #F97316, secondaire #3B82F6, succès #22C55E, etc.), typographie (**Fredoka** titres, **Poppins** corps, **Roboto Mono** code), espacements base 8px, radius, ombres, et les composants normés (boutons, cartes, inputs, chips, listes, checkboxes, radios, tooltips).
- Respecte les **Do's & Don'ts** (progression visible, hiérarchie claire, mobile-friendly, contrastes WCAG AA, pas de rouge pour un état neutre, etc.).
- **Écrans clés à concevoir** (au minimum) :
  1. **Dashboard** global (santé délivrabilité, volumes, performances, alertes).
  2. **Infrastructure** : domaines & boîtes, statut DNS/warmup, IP.
  3. **Audiences** : contacts, segments, formulaires, profils.
  4. **Composer** : éditeur drag-and-drop + éditeur code (React Email) + IA.
  5. **Campagnes outreach** : séquences (builder), A/B, stats.
  6. **Automations** : canvas de flows + broadcasts.
  7. **Transactionnel/API** : clés API, logs, webhooks, mode test, docs SDK.
  8. **Master Inbox** unifiée (réponses + agent IA).
  9. **Analytics** : rapports, attribution, exports.
  10. **Réglages** : workspace, white-label, facturation/quotas, conformité.

---

## 10. Architecture suggérée (libre, mais cohérente)
Organise le code en **domaines** clairs : `infrastructure` (domaines/boîtes/DNS/IP), `deliverability` (warmup/placement/blacklist/suppression), `audiences` (contacts/segments/forms), `composer` (templates/éditeur/IA), `outreach` (séquences), `automation` (flows/broadcasts), `transactional` (API/SMTP/webhooks/inbound), `inbox` (unibox/agent réponse), `analytics`, `iam` (auth/workspaces/permissions), `billing` (quotas). Découple l'**envoi** derrière une abstraction « provider » pour brancher Resend/SES/SMTP/boîtes OAuth de façon interchangeable.

---

## 11. Ordre de construction recommandé (mais livrer la vision complète)
Construis dans un ordre qui garde l'app fonctionnelle à chaque étape :
1. Socle : auth, workspaces, DB, design system (composants `DESIGN.md`), navigation.
2. Infrastructure : connexion boîtes (OAuth/SMTP) + domaines + DNS/SPF/DKIM/DMARC + vérif.
3. Envoi réel transactionnel (provider) + logs + webhooks + clés API + mode test.
4. Audiences : contacts, imports, segmentation, formulaires, conformité/désinscription.
5. Composer : éditeur drag-and-drop + React Email + IA + templates.
6. Moteur outreach (séquences) + warmup + rotation.
7. Moteur automation (flows + broadcasts) + send-time.
8. Délivrabilité : placement, blacklist, suppression, vérification e-mails.
9. Master Inbox + agent de réponse IA.
10. Multicanal (SMS/WhatsApp/push) + analytics/attribution + white-label.

---

## 12. Critères d'acceptation
- L'app **démarre** (`README` clair, `.env.example`, migrations, seed démo) et tourne en local.
- On peut **connecter une boîte/domaine**, **vérifier le DNS**, **lancer un warmup**, **créer et envoyer une campagne réelle** (provider configuré) et **voir les events** (open/click/bounce) remonter.
- On peut **créer un flow** déclenché, un **broadcast**, et **appeler l'API transactionnelle** (avec webhooks).
- L'**inbox unifiée** affiche les réponses ; l'**agent IA** peut proposer/écrire une réponse.
- **Désinscription, suppression, SPF/DKIM/DMARC** fonctionnels ; **mode démo** disponible sans clés.
- L'**UI applique fidèlement `./DESIGN.md`** ; aucune partie **CRM de vente** ni **lead finder** n'a été construite (cf. §3).
- Tests verts + documentation des modules (en renvoyant aux fiches `./outreach` et `./marketing`).

---

## 13. Pour démarrer
1. **Lis** : toutes les fiches de `./research/outreach/` et `./research/marketing/`, puis `./DESIGN.md`.
2. **Propose** un court plan d'architecture + choix de stack (avec justification) et une découpe en modules (§10).
3. **Construis** itérativement selon §11, en gardant l'app fonctionnelle, en appliquant `DESIGN.md`, et en t'appuyant sur les fiches comme spécification de chaque fonctionnalité.
4. **Rappelle-toi du périmètre** : on réunit le meilleur de l'envoi/délivrabilité/automation/données/inbox/IA — **sans CRM de vente ni lead finder**.

> Nom de code du produit : **Gigamail** (modifiable). Public cible : francophone. Interface en français par défaut.
