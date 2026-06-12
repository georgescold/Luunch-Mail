# Fondamentaux de l'Email Marketing & du Marketing Automation

> Fiche de référence pour comprendre en profondeur le métier de l'email marketing (marketing de permission), indispensable pour décoder Klaviyo et ActiveCampaign. À ne pas confondre avec le **cold outreach** (voir le dossier `outreach`). Rédigée en juin 2026.

---

## 1. Email marketing ≠ Cold outreach

C'est la distinction la plus importante. Les deux envoient des emails, mais tout le reste diffère.

| Critère | **Email marketing** (ce dossier) | **Cold outreach** (dossier `outreach`) |
|---|---|---|
| Consentement | **Opt-in** : le contact s'est inscrit | Pas d'opt-in : prospect froid |
| Relation | Audience qui vous connaît déjà | Inconnu total |
| Objectif | Fidéliser, convertir, ré-acheter | Décrocher un 1er rendez-vous |
| Volume | Élevé depuis 1 domaine principal | Faible, multi-domaines/multi-boîtes |
| Format | HTML riche, design, images, branding | Texte brut, conversationnel |
| Mesure clé | Chiffre d'affaires attribué, CLV | Taux de réponse |
| Légalité | RGPD/CAN-SPAM : consentement requis | Zone grise, B2B encadré |
| Outils types | **Klaviyo, ActiveCampaign**, Mailchimp, Brevo | Smartlead, Instantly, Lemlist |

L'email marketing est un **canal de marketing direct vers une base opt-in**, piloté par la **donnée comportementale** et l'**automatisation**. Son ROI est régulièrement cité parmi les plus élevés du marketing digital (Klaviyo annonce un ROI moyen de **63x** sur l'email ; l'email automatisé génère selon ses données **14x** plus de CA par destinataire que les campagnes manuelles).

---

## 2. Les briques d'une plateforme d'email marketing / automation

```
[1. Collecte & données]  →  [2. Listes / Segments]  →  [3. Contenu & templates]
        ↓                                                      ↓
[CDP / profils clients]  ←  [données e-commerce, web, CRM]  →  [4. Campagnes (broadcast)]
        ↓                                                      ↓
[5. Automations / Flows]  →  [ENVOI multicanal]  →  [6. Délivrabilité]
        ↓                                                      ↓
[7. Analytics & attribution]  →  [8. Optimisation IA]  →  [9. Service / CRM / closing]
```

Chaque brique = une famille de fonctionnalités chez Klaviyo et ActiveCampaign.

---

## 3. Collecte des contacts & consentement

Tout commence par **constituer une liste opt-in** (la prospection à froid est interdite dans ce cadre). Moyens classiques :

- **Formulaires & pop-ups** sur le site (inscription newsletter, pop-up de bienvenue avec réduction, exit-intent).
- **Lead magnets** : contenu gratuit, code promo, jeu-concours en échange de l'email.
- **Checkout e-commerce** : opt-in à l'achat.
- **Landing pages** dédiées.

Le **consentement (RGPD)** est central : double opt-in recommandé en Europe, gestion des préférences, désinscription en 1 clic obligatoire, conservation de la preuve de consentement.

---

## 4. Listes vs Segments (le cœur du ciblage)

- **Liste** : un groupe statique de contacts (ex. « Newsletter », « Clients VIP »). On s'y inscrit/désinscrit.
- **Segment** : un groupe **dynamique** défini par des **conditions** sur les données (ex. « a acheté dans les 30 jours », « a ouvert 3 emails mais jamais cliqué », « panier > 100 € »). Le segment se met à jour **automatiquement** quand le comportement change.

La puissance d'un outil moderne = la **richesse de la segmentation** : combiner un nombre illimité de conditions (comportement web, historique d'achat, engagement email, données du CRM, prédictions IA…). C'est ce qui permet la **personnalisation à grande échelle**.

---

## 5. Campagnes (broadcast) vs Automations (flows)

Deux modes d'envoi fondamentaux :

### 5.1 Les campagnes (broadcasts / diffusions)

Envoi **ponctuel** d'un email à un segment à un moment choisi : newsletter hebdo, annonce produit, promo Black Friday, soldes. C'est le « one-to-many » planifié.

### 5.2 Les automations (flows / parcours / journeys)

Des séquences **déclenchées automatiquement** par un événement ou un comportement, qui tournent en permanence. C'est là que se trouve l'essentiel du chiffre d'affaires (Klaviyo : des marques attribuent **76 % de leur CA** aux flux automatisés).

**Anatomie d'une automation :**

- **Déclencheur (trigger)** : ce qui démarre le flux (inscription à une liste, achat, abandon de panier, visite d'une page, date anniversaire, inactivité…).
- **Conditions / branches (split & conditional)** : « si le contact a ouvert → branche A ; sinon → branche B ». Logique conditionnelle.
- **Actions** : envoyer un email/SMS, attendre X jours, ajouter un tag, mettre à jour un champ, notifier l'équipe, créer une tâche CRM…
- **Objectifs (goals)** : sortir le contact du flux dès qu'il a converti.

**Les flows e-commerce indispensables** (souvent fournis préconçus) :

| Flow | Déclencheur | But |
|---|---|---|
| **Bienvenue (welcome series)** | Inscription | Convertir le nouvel abonné |
| **Panier abandonné (abandoned cart)** | Ajout au panier sans achat | Récupérer la vente |
| **Navigation abandonnée (browse abandonment)** | Vue produit sans achat | Relancer l'intérêt |
| **Post-achat** | Commande | Onboarding, cross-sell, avis |
| **Win-back / réengagement** | Inactivité X jours | Réveiller un client dormant |
| **Anniversaire / réapprovisionnement** | Date / cycle de conso | Fidéliser, déclencher le ré-achat |

> Klaviyo annonce **80+ flux préconçus** ; ActiveCampaign **900+ automatisations préconçues**.

---

## 6. La donnée : CDP, profils clients, e-commerce

L'email marketing moderne est **data-driven**. La brique data unifie tout :

- **Profil client unique** : chaque contact agrège ses données identitaires, comportementales (clics, ouvertures, navigation web), transactionnelles (achats, panier moyen) et d'engagement, sur tous les canaux.
- **CDP (Customer Data Platform)** : la plateforme qui centralise et active ces données en **temps réel** (Klaviyo en fait son cœur avec la **KDP**).
- **Intégrations e-commerce** : synchro temps réel avec Shopify, WooCommerce, Magento… (commandes, produits, clients). C'est ce qui alimente les flows e-commerce.
- **Données prédictives (IA)** : valeur vie client (**CLV**) prévue, **risque d'attrition (churn)**, date probable de prochaine commande, affinité de canal.

---

## 7. Personnalisation & contenu

- **Variables / merge tags** : `{{ first_name }}`, `{{ last_order }}` injectent les données du profil.
- **Contenu dynamique / conditionnel** : un même email affiche des blocs différents selon le segment (recommandations produits personnalisées, offre adaptée, images différentes).
- **Recommandations produits par IA** : suggestion automatique des produits les plus susceptibles de plaire.
- **Templates / modèles** : bibliothèques de modèles d'emails (Klaviyo 160+, ActiveCampaign 250+) + **éditeur glisser-déposer** sans code.
- **A/B testing (split testing)** : tester objets, contenus, heures d'envoi ; ActiveCampaign va jusqu'au **A/B/C/D/E**.
- **Send-time optimization** : envoyer à l'heure où chaque contact ouvre le plus (Klaviyo « Smart Send Time », ActiveCampaign « Envoi prédictif »).

---

## 8. Délivrabilité en contexte opt-in

Les bases techniques sont les mêmes que pour le cold email (**SPF, DKIM, DMARC** — voir `outreach/00`), mais l'enjeu et les leviers diffèrent :

- On envoie depuis **son domaine principal authentifié** (pas de multi-domaines jetables).
- La **réputation d'expéditeur** se construit sur l'**engagement** : ouvertures, clics, faible taux de plaintes et de désinscription. Une liste opt-in propre et engagée = bonne délivrabilité.
- **Hygiène de liste** : retirer les inactifs, gérer les bounces, sunset policy (arrêter d'écrire à ceux qui n'ouvrent jamais).
- **Onglets Gmail** : éviter de tomber systématiquement dans « Promotions » plutôt que « Principale ».
- Les deux plateformes gèrent une **infrastructure d'envoi mutualisée optimisée** et surveillent la réputation (ActiveCampaign revendique une infra interne « meilleure que Mailchimp/HubSpot » ; Klaviyo propose la « réparation automatique de réputation »).

> Depuis 2024, Google/Yahoo imposent SPF+DKIM+DMARC, un **taux de plainte < 0,3 %** et une désinscription en 1 clic pour les expéditeurs de volume. Ces règles s'appliquent pleinement à l'email marketing.

---

## 9. Transactionnel vs Marketing

| Type | Définition | Exemple | Particularité |
|---|---|---|---|
| **Marketing** | Promotionnel, vers une liste opt-in | Newsletter, promo | Soumis au consentement + désinscription |
| **Transactionnel** | Déclenché par une action individuelle | Confirmation de commande, reset mot de passe, facture | Pas besoin d'opt-in marketing, priorité de délivrabilité, **API dédiée** |

Les transactionnels passent souvent par une **API/infra séparée** optimisée pour la vitesse et la délivrabilité (ex. **Postmark**, propriété d'ActiveCampaign ; chez les outils cold, c'est SendGrid/Mailgun).

---

## 10. Au-delà de l'email : l'omnicanal

Les plateformes modernes ne sont plus « email-only ». Elles orchestrent plusieurs canaux dans un **même flow** :

- **SMS** (et **RCS**, version enrichie du SMS).
- **WhatsApp** (conversationnel, très fort en Europe/international).
- **Notifications push** (mobile / web).
- **Réseaux sociaux / publicité** (audiences synchronisées).
- **CRM / ventes** (pour le B2B et le suivi de pipeline).

La logique « **affinité de canal** » (IA) choisit automatiquement le meilleur canal par contact.

---

## 11. CRM, scoring et closing (surtout ActiveCampaign)

Certaines plateformes (ActiveCampaign en tête) ajoutent une couche **CRM / sales automation** pour le B2B et les cycles de vente longs :

- **Lead scoring** : noter chaque contact selon ses actions (ouvertures, visites, téléchargements) pour repérer les prospects chauds.
- **Pipeline / deals** : suivre les opportunités (kanban) de la prise de contact à la signature.
- **Deal scoring / win probability** : l'IA prédit la probabilité de conclure.
- **Sales routing & tâches** : attribuer automatiquement les leads aux bons commerciaux.

Klaviyo, lui, oriente sa couche relationnelle vers le **service client B2C** (helpdesk, agents IA) plutôt que le sales B2B.

---

## 12. Les métriques (KPIs) à connaître

| Métrique | Définition | Repère |
|---|---|---|
| **Taux d'ouverture** | % d'ouvertures | 15-30 %+ (tracking imprécis depuis Apple MPP) |
| **Taux de clic (CTR)** | % de clics / envois | 2-5 % |
| **CTOR** | clics / ouvertures | 10-20 % |
| **Taux de conversion** | % d'achats déclenchés | variable |
| **Revenu par destinataire (RPR)** | CA / nb d'emails | métrique reine en e-commerce |
| **CA attribué** | chiffre d'affaires généré par l'email/flow | objectif business |
| **Taux de délivrabilité** | % d'emails acceptés | > 98 % |
| **Taux de désinscription** | % de désabonnements | < 0,5 % |
| **Taux de plainte (spam)** | % de plaintes | < 0,3 % (limite Google/Yahoo) |
| **Taux de bounce** | % rejetés | < 2 % |
| **CLV** | valeur vie client | pilotage de la rétention |
| **RFM** | Récence / Fréquence / Montant | segmentation de fidélité |

---

## 13. L'IA et le « marketing autonome » (tendance 2025-2026)

La grande bascule actuelle : passer du **marketing automation** (la plateforme exécute des règles que vous définissez) au **marketing autonome** (des **agents IA** décident, créent et optimisent à votre place).

- **IA générative** : rédaction d'emails, d'objets, génération/retouche d'images, création de segments et de flows à partir d'un prompt en langage naturel.
- **IA prédictive** : CLV, churn, meilleur canal, meilleure heure d'envoi, probabilité de conversion.
- **Agents IA autonomes** : analysent votre site/marque, construisent des campagnes complètes, répondent aux clients 24/7, optimisent en continu.
  - Klaviyo : **K:AI Marketing Agent** & **Customer Agent**, **Composer** (« vibe marketing »).
  - ActiveCampaign : **Active Intelligence** & **marketing autonome** (agents : éditeur de campagne, segments suggérés, brand kit, envoi prédictif, traduction, analyse de sentiment).
- **Connecteurs IA** : serveurs **MCP** pour brancher Claude/ChatGPT sur ses données marketing.

---

## 14. Frontend vs Backend

### Côté Frontend (ce que l'utilisateur manipule)

- L'**éditeur d'emails** glisser-déposer + bibliothèque de templates.
- Le **constructeur de flows / automations** (canvas visuel avec déclencheurs, branches, actions).
- Le **builder de segments** et la gestion des listes/profils.
- Les **formulaires & landing pages**.
- Les **dashboards analytics** (CA attribué, ouvertures, conversions, attribution).
- Le **CRM kanban** (ActiveCampaign) ou le **helpdesk / Customer Hub** (Klaviyo).

### Côté Backend (l'infrastructure invisible)

- La **CDP / base de profils temps réel** qui ingère événements web, achats, engagement (Klaviyo : 2,5 Mrd d'événements/jour, 7,3 Mrd de profils).
- Le **moteur d'envoi** mutualisé optimisé + monitoring de réputation + authentification (SPF/DKIM/DMARC).
- Le **moteur de segmentation** qui recalcule les segments en temps réel.
- Les **modèles d'IA** (prédictif + génératif) et les **agents autonomes**.
- L'**API, les webhooks et les 350-1000+ intégrations** (e-commerce, CRM, pub, data warehouse).
- L'**infra transactionnelle** dédiée (ex. Postmark chez ActiveCampaign).

---

## 15. Glossaire express

- **Opt-in** : consentement explicite à recevoir des emails.
- **Flow / Automation / Journey** : séquence déclenchée automatiquement.
- **Trigger** : événement qui démarre un flow.
- **Segment** : groupe dynamique défini par conditions.
- **Broadcast / Campagne** : envoi ponctuel à un segment.
- **CDP** : Customer Data Platform, base de profils unifiée temps réel.
- **CLV** : Customer Lifetime Value (valeur vie client).
- **Churn** : attrition / perte de clients.
- **RFM** : Récence, Fréquence, Montant (modèle de segmentation).
- **Lead scoring** : notation des prospects selon l'engagement.
- **Contenu dynamique / conditionnel** : blocs d'email variables selon le profil.
- **Transactionnel** : email déclenché par une action individuelle (reçu, confirmation).
- **Abandoned cart** : flow de panier abandonné.
- **Deliverability / placement** : capacité à arriver en boîte de réception.
- **Sender reputation** : réputation de l'expéditeur (basée sur l'engagement).
- **Marketing autonome** : marketing piloté par des agents IA qui décident et exécutent.
- **B2C / B2B** : Klaviyo est orienté **B2C/e-commerce**, ActiveCampaign couvre **B2B et B2C**.

---

*Cette fiche pose les bases. Voir `01-klaviyo-fiche-complete.md` et `02-activecampaign-fiche-complete.md` pour le détail produit, et `03-comparaison-klaviyo-vs-activecampaign.md` pour les différences.*
