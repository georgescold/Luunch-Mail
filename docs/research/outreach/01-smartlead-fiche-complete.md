# Smartlead — Fiche produit complète & exhaustive

> Tout ce que propose Smartlead, comment, et avec quelle stack technique. Source : smartlead.ai (pages produit, pricing, intégrations, FAQ), relevé en juin 2026.

---

## 0. Carte d'identité

| | |
|---|---|
| **Nom** | Smartlead.ai |
| **Éditeur** | 521 Products Pty Ltd (t/a Smartlead.ai), un produit **Five2One** |
| **Siège** | Sydney, Australie 🇦🇺 |
| **Positionnement** | « Cold email software for sales teams that run outbound at scale » — plateforme outbound **AI-native** centrée sur la **délivrabilité** et l'**infrastructure** |
| **Cible** | Solo-founders, équipes sales, **agences de lead gen** (cœur de cible), entreprises / Fortune 500 |
| **Clients revendiqués** | 100 000+ entreprises (le chiffre de 31 000 apparaît aussi dans une FAQ — usage marketing variable) |
| **Site app** | app.smartlead.ai |
| **Apps mobiles** | iOS (App Store) + Android (Google Play) |
| **Slogan** | « Unlock the Full Power of AI Outbound » |

**Philosophie produit :** Smartlead se vend comme une **infrastructure** et un **système d'exploitation outbound**, pas comme un simple « séquenceur ». Deux obsessions affichées : (1) la **délivrabilité** (boîte principale), (2) l'**API/automatisation** (les utilisateurs construisent par-dessus). Argument commercial signature : **boîtes mail illimitées** sur tous les plans + **stockage de contacts illimité** (on ne paie que ce qu'on envoie).

---

## 1. Le socle : scalabilité sans limites

Les trois promesses de base, incluses partout :

- **Comptes (mailboxes) illimités** : on connecte autant de boîtes Gmail/Outlook/SMTP que voulu, sans surcoût par boîte. C'est LE différenciateur historique vs la concurrence qui facture à la boîte.
- **Stockage de leads illimité** (sur les plans Unlimited) : pas de frais de stockage, on paie au **send**.
- **Setup & warmup intégrés** : Smartlead gère DNS, warmups et rotation des expéditeurs automatiquement.

---

## 2. Les modules produit (catalogue exhaustif)

### 2.1 SmartInfra / SmartServers — Infrastructure privatisée

Infrastructure d'envoi **dédiée et single-tenant** pour les gros volumes.

- **Serveurs et pools d'IP dédiés** : « Own your servers. Control your IPs. »
- **Clusters multi-serveurs** : routage intelligent de chaque séquence via des pools d'IP dédiés ; trafic réparti sur plusieurs serveurs pour « dé-risquer » ; **isolation single-tenant** de chaque séquence → zéro contamination croisée entre domaines.
- **Réputation composée** : auto-scaling selon le débit de campagne, gestion continue de la réputation IP, architecture **failover-ready**.
- **Grille de serveurs US + Europe**, **99,98 % d'uptime**, serveurs siloés/isolés.
- **Monitoring de blacklists en temps réel** + auto-alertes pour ajuster la réputation avant downtime.
- Les **agences peuvent assigner un serveur dédié à chaque client** (isolation totale entre clients).
- **Prix** : à partir de **39 $/serveur/mois** (Pro). IP dédiée, délivrabilité renforcée, paramètres personnalisables, support prioritaire 24/7.

### 2.2 Ultra Premium Warmup — Chauffe illimitée

Réseau de warmup **privé, sur invitation, « reward-based »**.

- **Pool curé** : seuls des expéditeurs vérifiés entrent (pas d'inscription publique → pas de dilution de réputation par des « bad actors »).
- **Interactions humaines simulées** : l'IA envoie, ouvre, lit et répond aux emails de warmup, et **sort même les mails des spams**.
- Sujets, copy et horaires d'envoi **mélangés en permanence** pour imiter un comportement réel.
- **Garde-fous automatiques** : adaptive scaling (caps quotidiens, limites par domaine), **auto-pause** en cas de pic de bounces/spam/inboxes invalides, pools **auto-réparants** (les mauvais comptes sont retirés, les sains reprennent).
- **Reply-balancing** : met une boîte en pause après un seuil de réponses, puis la réintègre.
- Warmup **multi-boîtes en 1 clic**, planning de ramp individuel par boîte, dashboard temps réel (sends, opens, replies, reputation score), alertes actionnables.
- Inclus / illimité ; les plans Unlimited Smart & Prime sont **éligibles à l'Ultrapremium**.

### 2.3 SmartProspect — Base de leads B2B intégrée

Outil de prospection avec **leads vérifiés gratuits** intégrés à Smartlead.

- **300M+ profils business vérifiés**, envoyés directement dans les campagnes Smartlead (pas d'export, pas de switch d'outil).
- **Vérification waterfall « 3X »** : chaque lead vérifié en temps réel via **plusieurs fournisseurs de data** (3 sources indépendantes) → bounce quasi nul.
- **Modèle « gratuit »** : tous les **3 emails envoyés = 1 lead vérifié offert**. Pas de tarif au contact.
- **Filtres IA** + signaux d'intention temps réel pour cibler les prospects « ready to buy ».
- **Signaux communautaires** : exclusion immédiate des leads qui ont bounce/ignoré, priorisation de ceux qui ont répondu récemment (intelligence partagée à l'échelle du réseau).

### 2.4 SmartSenders — Infrastructure email clé-en-main (DFY)

Achat + setup de boîtes mail « Done-For-You » en 2 clics.

- Achat de **domaines** et de **boîtes** (Google, Outlook, SMTP) directement dans la plateforme.
- **Configuration DNS automatique** : MX, SPF, DKIM, DMARC + CNAME de tracking, sans intervention technique.
- **Activation en 24-48h** (propagation DNS) ; option **boîtes pré-chauffées (pre-warmed)** via Zapmail pour envoyer le jour même (saute les 2-3 semaines de warmup).
- **IP US propres**, domaines **pré-screenés / blacklist-free**, comptes provisionnés avec accès admin.
- **Panneaux de domaine dédiés et isolés** (si un domaine baisse, les autres ne sont pas affectés), health checks temps réel, **rotation de domaines intelligente**.
- **Fournisseurs partenaires & tarifs indicatifs** (par domaine/an + par boîte/mois) :

| Fournisseur | Type | Prix domaine | Prix boîte |
|---|---|---|---|
| Zapmail (Google) | Fresh | 13 $/domaine/an | 4,5 $/boîte/mois |
| Zapmail (Outlook) | Fresh | 13 $/domaine/an | 4,5 $/boîte/mois |
| InfraInbox (Outlook) | Fresh | 16 $/domaine/an | 5 $/boîte/mois |
| Zapmail (Google, admin access) | — | 13 $/domaine/an | 4,5 $/boîte/mois |
| Mailreef (SMTP) | Fresh | 19 $/domaine/an | 3,99 $/boîte/mois |
| Zapmail (Outlook) | Pre-warmed | 18 $/domaine/an | 9 $/boîte/mois |
| Zapmail (Google) | Pre-warmed | 18 $/domaine/an | 9 $/boîte/mois |
| AeroSend (SMTP) | — | 13 $/domaine/an | 4,2 $/boîte/mois |

### 2.5 SmartDelivery — Test & monitoring de délivrabilité

L'outil qui dit **où** atterrissent les emails avant et pendant les campagnes.

- **Tests de placement temps réel** sur des **seed lists** curées (Gmail, Outlook, Yahoo…) : savoir si on tombe en Primary, Promotions ou Spam.
- Benchmark propriétaire : le **Placement Rate** (vetté par des experts).
- **Analyse spam & contenu** : scan des objets, du corps, des liens via filtres standards (SpamAssassin, Google, Barracuda) ; score + recommandations ; vérification pièces jointes/images/headers.
- **Monitoring réputation & blacklists** : surveillance sur **400+ blacklists** d'IP et domaines + alertes ; suivi de la tendance de réputation.
- **Santé SPF/DKIM/DMARC** : vérification instantanée, guidage pas-à-pas de réparation, **rapports DMARC** (qui envoie en votre nom, échecs, anti-spoofing).
- Tests **manuels et automatisés/récurrents**, **illimités**, rapports exportables (pour clients/équipes).
- **Prix (add-on)** : Growth **49 $/mois** (120 tests de séquence, jusqu'à 50 comptes/test) · Pro **174 $/mois** (tests illimités, 200 comptes/test, placement-optimised copy, full API & whitelabel) · Export **599 $/mois** (500 comptes/test).

### 2.6 Unified Master Inbox (Master Inbox 3.0)

Boîte de réception unifiée pour gérer tout le deal flow.

- **Centralise toutes les réponses** de toutes les boîtes/campagnes/clients dans un seul écran (plus de switch de comptes), utilisable comme **inbox partagée** d'équipe/agence.
- **Catégorisation** auto/manuelle par sentiment/intention ; détection auto **OOO / bounce / unsubscribe**.
- **Filtres intelligents & vues custom** (par expéditeur, tag, type de réponse, campagne, temps) ; **actions en masse** (tag, assign, archive, reply, forward) ; priorisation des hot leads.
- **Réponses automatisées & séquences déclenchées** : workflows quand un mot-clé (« interested ») apparaît, routage vers sous-séquences ou calendriers de booking.
- **Collaboration** : assignation aux coéquipiers, commentaires internes, dashboards clients, **white-label**.
- **Reporting + intégrations** : push vers CRM avec contexte, **alertes Slack temps réel**, sync **Google Sheets**.
- **Raccourcis clavier** (ex. « O + L » = marquer out-of-office), **sidebar** (Inbox, Sent, Important, Snoozed, Reminders, Scheduled, Archived), pièces jointes directes.
- **Vues custom limitées par plan** : 3 sur Base/Popular, plus sur Pro/Custom.

### 2.7 SmartAgents — Workforce GTM IA (no-code)

Des **agents IA pré-construits** qui exécutent les workflows outbound de bout en bout, sans code.

- **Principe** : on choisit un template, on l'ajuste, l'agent tourne. « From prompt to running agent, in seconds ».
- Les agents **recherchent les leads, écrivent des emails personnalisés, mettent à jour le CRM, améliorent proactivement la délivrabilité**, etc.
- Positionnés comme **remplaçant une équipe de SDR** (un stack d'agents = plusieurs reps, pipeline 24/7).
- **Templates prêts à l'emploi** observés :
  - *Campaign Reply Rate Alert* : alerte Slack si le reply rate passe sous un seuil.
  - *Daily LinkedIn Lead Auto-Push* : pousse chaque jour les leads intéressés vers l'outil LinkedIn (ex. Aimfox).
  - *Daily Stale Reply Monitor* : signale chaque matin (10h) toute réponse sans relance depuis 24h.
  - *Daily Smartlead Reply Sync to Airtable* : sync des réponses vers Airtable + alerte Slack enrichie.
  - *Client Performance Daily Report* : poste un résumé classé des perfs clients sur Slack.

### 2.8 SmartDialer — Prospection multicanale (appels) *(New)*

Dialer IA intégré pour ajouter la voix au mix.

- **Multicanal** : appels + emails depuis un même dashboard, **parallel dialing**, numéros à **présence locale** pour booster les connexions.
- **AI coaching & insights** : tag des objections, **transcripts**, résumés, analytics de perf par appel.
- **Données propres** : vérification auto des numéros, skip des répondeurs/tonalités, connexion uniquement avec de vrais décideurs.

### 2.9 CRM intégré

- **Kanban drag-and-drop** des deals, **synchronisé** avec la Master Inbox et les campagnes.
- Vue **fil de conversation complet** + notes + timeline d'activité, rattachée à la bonne campagne/boîte/appel.
- **Sync temps réel** : déplacer une carte ou recevoir une réponse met à jour board + inbox automatiquement.

### 2.10 API & automatisation puissantes

Le point fort « technique » de Smartlead (très loué par les power users).

- **API cold email** pour piloter campagnes, leads, statuts, follow-ups **sans UI**.
- **25 clés API nommées** (une par intégration/membre : « Zapier Integration », « Clay Sync »…), révocables indépendamment, partageant la rate limit, gérées dans Settings → API Key Management.
- **Webhooks temps réel** sur reply / bounce / unsubscribe → routage vers Slack, HubSpot, n'importe quel endpoint.
- **Logique conditionnelle** (replies, bounces, changements de statut), workflows multi-boîtes.
- Différenciation assumée : un **cold email API** (rotation d'inbox, warmup, reply detection, sequence logic intégrés) vs un **transactional API** (SendGrid/Mailgun) qui n'a rien de tout ça.

### 2.11 White-label personnalisé (agences)

- **Plateforme sous votre marque** : `app.votredomaine.com`, clients accèdent aux rapports/campagnes et répondent depuis la Master Inbox.
- **Pas de paiement par siège** : ajoutez toute l'équipe sales/marketing.
- **Packages de prix indépendants** : revendez vos propres offres, **splittez/gérez les crédits de leads** par client.
- Analyse de perf par membre, allocation des campagnes.
- **Prix (add-on)** : **29 $/mois par workspace client**. Disponible dès le plan **Pro** ; le plan **Unlimited Prime** inclut déjà **3 clients/workspaces**.

### 2.12 Email Verification (add-on)

- Vérification avancée des emails **avant envoi** pour réduire le bounce.
- Crédits achetables **one-time ou mensuels** (paliers 6k / 12k / 24k / 48k / 96k / 192k / 480k / 960k), à partir de **32 $** (mensuel -17 %).

### 2.13 Fonctions de campagne « cœur » (transverses)

- **Séquences multi-étapes** + **subsequences** déclenchées par l'intention du lead.
- **Spintax**, **personnalisation** (variables / champs custom), **A/B testing**.
- **Rotation automatique des boîtes**, **ESP matching dynamique**, **IP rotating** par campagne.
- **Email Follow-Up Automation** (relances automatiques).
- Outils gratuits annexes : CNAME/SPF/DKIM/DMARC checkers & generators, SSL checker, domain blacklist checker, email verifier, calculatrices (open rate, bounce, spam complaint, click-to-open), grammar checker, AI subject line generator/analyser, spam checker, email signature generator, AI email copywriter.

---

## 3. Stack & intégrations

Smartlead se positionne en **hub** connecté à l'écosystème outbound. Intégrations natives + via Zapier/Make/N8N (**6 000+ apps**).

| Catégorie | Intégrations |
|---|---|
| **CRM / Sales** | HubSpot, Salesforce, Pipedrive, Zoho CRM, Attio, GoHighLevel, Insightly |
| **Communication** | Slack, Intercom, CloudTalk, Dialpad |
| **Automatisation** | Zapier, Make, N8N, Notion, ClickUp, Cal.com |
| **Leads / Data** | **Clay** (partenariat fort), Listkit, LeadMagic, Anymail Finder, ZenRows, SmartProspect, Expandi, GetSales.io, Waalaxy, Sendspark, Supabase, OutboundSync, SmartReach |
| **Mailbox providers** | Gmail, Outlook, Zapmail, Hyperinboxes, Mailreef, Inbox Automate, InfraInbox, AeroSend |

> **À noter :** l'intégration **Clay** (enrichissement/scraping 50+ providers) est mise en avant comme pilier de l'hyper-personnalisation. **OutboundSync** illustre l'écosystème de produits **construits sur l'API Smartlead**.

---

## 4. Tarification (juin 2026)

Essai gratuit, sans carte. Facturation **mensuelle ou annuelle (-17 %)**. **Boîtes mail illimitées sur tous les plans.**

| Plan | Mensuel | Annuel (/mois) | Contacts | Sends/mois | Verified prospect emails/mois | Points clés |
|---|---|---|---|---|---|---|
| **Base** | 39 $ | 32,5 $ | 2 000 | 6 000 | 2 000 | Tier d'entrée, warmup illimité, analytics |
| **Pro** | 94 $ | 78,3 $ | 30 000 | 90 000 | 30 000 | **CRM access**, white-label en add-on, clients en add-on |
| **Unlimited Smart** ⭐ | 174 $ | 144,5 $ | **Illimité** | 150 000 | 50 000 | Le + populaire, **warmup Premium (éligible Ultrapremium)**, CRM |
| **Unlimited Prime** | 379 $ | 314,6 $ | **Illimité** | 500 000 | 170 000 | **3 SmartServers + OAuth**, **3+ clients/workspaces inclus**, dedicated manager, **Slack privé** |

**Add-ons principaux :**

- **SmartDelivery** : 49 $ / 174 $ / 599 $ /mois.
- **SmartServers** : 39 $/serveur/mois.
- **White-label** : 29 $/mois par client/workspace (dès Pro).
- **Email Verification** : crédits one-time/mensuels (dès ~32 $).
- **SmartSenders** : à l'usage (domaines + boîtes, cf. tableau §2.4).
- Add-ons de capacité contacts/sends à 59 $ / 39 $ / 29 $ selon les compteurs.

**Distinctions de vocabulaire facturation :**

- **Lead credit** = une adresse unique stockée (compteur « contacts »).
- **Email credit** = chaque email envoyé (compteur « sends »).
- Ces deux compteurs sont **séparés**.

> Pas d'engagement long terme, résiliable à tout moment, plans mensuels et annuels.

---

## 5. Stack technique / « backend » (ce qu'on déduit)

- **Sortie d'envoi** : serveurs propres + pools d'IP **dédiés single-tenant** (SmartInfra), clusters multi-serveurs US+EU, failover, auto-scaling, IP rotating par campagne, **ESP matching dynamique**.
- **Warmup** : pool privé de boîtes vérifiées « reward-based », IA d'interactions humaines, garde-fous auto-pause/self-healing.
- **Délivrabilité** : monitoring 400+ blacklists temps réel, SpamAssassin/Google/Barracuda, DMARC reporting, ajustement automatique des patterns.
- **Data** : moteur de vérification **waterfall multi-fournisseurs (3X)**, signaux communautaires partagés à l'échelle du réseau.
- **Automatisation** : API REST documentée + 25 clés, webhooks temps réel, agents IA no-code (SmartAgents).
- **Front** : site marketing Webflow ; app SPA app.smartlead.ai ; apps mobiles natives iOS/Android.
- **Hébergement DNS automatisé** lors de l'achat de domaines (SmartSenders).

---

## 6. Forces & limites (synthèse)

**Forces**
- Boîtes **illimitées** + stockage illimité = coût marginal très bas pour scaler.
- **Délivrabilité & infrastructure** au cœur (SmartInfra/SmartServers, SmartDelivery, warmup premium).
- **API & webhooks** réputés excellents (écosystème de produits tiers construits dessus).
- **White-label** complet + workspaces clients → **chouchou des agences**.
- Suite très large : prospection, dialer, agents IA, CRM, vérif.

**Limites / points d'attention**
- Beaucoup de capacités clés sont des **add-ons payants** (SmartDelivery, SmartServers, white-label, vérification).
- **Courbe d'apprentissage** : puissant mais dense (plusieurs témoignages parlent d'une prise en main technique).
- Le « gratuit » de SmartProspect est conditionné au volume d'envoi (1 lead / 3 emails).
- Chiffres marketing parfois incohérents (31 000 vs 100 000 clients selon les pages).

---

*Voir `02-instantly-fiche-complete.md` pour Instantly et `03-comparaison-smartlead-vs-instantly.md` pour les différences point par point.*
