# Luunch Mail — Direction artistique & design system

> Document de référence. **Toute** l'interface applique ces règles. En cas de doute, ce fichier fait foi — pas l'habitude, pas la tendance.

## 1. Concept : « courrier éditorial »

Luunch Mail est un outil de travail pour des équipes qui envoient de l'e-mail sérieusement. La direction artistique évoque le **courrier de qualité** : du papier chaud, de l'encre profonde, une mise en page éditoriale précise — et la **lune** (Luunch) comme signature discrète, en or.

Trois adjectifs guident chaque décision : **précis, chaleureux, sobre**.

Ce que ça veut dire concrètement :
- Les surfaces sont **chaudes** (blanc cassé, bordures sable), jamais gris-bleu froid.
- La hiérarchie vient de la **typographie et des filets**, pas des ombres ni des effets.
- La couleur est **rare et signifiante** : le vert sève dit « action », l'or dit « marque », le reste est sémantique (succès/alerte/erreur/info).

## 2. Palette

### Neutres (la base de tout)

| Token | Hex | Usage |
|---|---|---|
| `paper` | `#F7F6F2` | Fond d'application |
| `surface` | `#FFFFFF` | Cartes, panneaux, inputs |
| `ink` | `#1C2722` | Texte principal (encre sapin) |
| `ink-muted` | `#46524C` | Texte secondaire |
| `ink-faint` | `#6A7570` | Descriptions, hints (minimum pour du texte sur blanc) |
| `ink-disabled` | `#9CA59F` | Désactivé, placeholders — **jamais** pour du texte porteur de sens |
| `ink-inverse` | `#F4F2EA` | Texte sur fonds sombres |
| `line` | `#E6E3DA` | Bordures de carte, dividers |
| `line-strong` | `#D3CFC2` | Bordures d'input |
| `fill-subtle` | `#FAF9F5` | Hover de ligne |
| `fill-muted` | `#F0EEE6` | Chips neutres, fonds de zone |

### Couleurs fonctionnelles

| Token | Hex | Rôle |
|---|---|---|
| `primary` | `#1E6B4A` | Vert sève — **uniquement l'action** (boutons, liens d'action, état actif). Blanc sur primary : 6,4:1 ✓ |
| `primary-soft` | `#E4EFE6` | Fonds sélectionnés/hover — texte `primary-fg` |
| `primary-fg` | `#1A5C40` | Texte vert sur fond clair |
| `secondary` / `info` | `#2E66D0` (fg `#2456AE`, soft `#E8EEFA`) | Informatif |
| `success` | = famille primary | Statuts positifs |
| `warning` | `#B07C1B` (fg `#7E5A10`, soft `#F7EDD8`) | Vigilance |
| `error` | `#BF4040` (fg `#A23636`, soft `#F9ECEA`) | Erreurs, destructif |
| `violet` | `#7C5CBF` (fg `#5B3FA3`, soft `#EFEAF9`) | Réservé aux nœuds condition/action des automations |
| `moon` | `#E8B64C` | **Accent de marque** : logo, panneau sombre, micro-détails. Avec parcimonie. Jamais en texte sur fond clair. |

### Surfaces sombres

| Token | Hex | Usage |
|---|---|---|
| `pine` | `#142019` | Panneau d'auth, blocs de code |
| `pine-raised` | `#1B2A21` | Relief sur pine (disque lunaire, header de bloc) |

**Règle absolue :** sur `pine`, le texte est `ink-inverse` (ou blanc à opacité ≥ 60 %). Les titres `h1–h6` **héritent** de la couleur du contexte (configuré dans `globals.css`) — ne jamais re-forcer une couleur d'encre globale, c'est la cause historique du noir-sur-noir.

### Contraste — non négociable

- Texte courant : ≥ 4,5:1 (AA). Texte ≥ 18 px semi-bold : ≥ 3:1.
- Tous les couples de cette palette ont été choisis pour passer : ne pas créer de nouveaux couples sans vérifier.
- Interdits connus : blanc sur vert clair, vert vif sur vert pâle, texte `disabled` pour de l'information réelle.

## 3. Typographie

| Rôle | Fonte | Usage |
|---|---|---|
| Titres | **Bricolage Grotesque** (`font-headline`) | h1–h4, wordmark, valeurs de stats |
| Texte | **Figtree** (`font-body`) | Tout le reste |
| Code & données | **JetBrains Mono** (`font-mono`) | Code, clés API, enregistrements DNS, eyebrows |

Échelle : h1 34/700, h2 27/700, h3 21/600, h4 17/600, body 15, sm 13,5, xs 12. Tracking négatif léger sur h1–h3 (déjà dans les tokens `text-h*`).

Motif éditorial signature : **l'eyebrow mono** — une ligne en JetBrains Mono 12 px, majuscules, `tracking-[0.18em]`, au-dessus d'un grand titre (en `moon` sur fond sombre, `ink-faint` sur clair).

## 4. Espace, formes, profondeur

- **Grille 8 px** : tokens `sp-1` (4) → `sp-8` (64).
- **Radius** : `sm` 6 px (inputs, petits éléments), `md` 10 px (cartes, boutons), `lg` 16 px (modales), `pill` (chips). Fini l'esthétique « bulle ».
- **Profondeur** : une carte tient par sa **bordure** (`line`) + `shadow-sm`. `shadow-md` au hover, `shadow-lg` pour les surfaces flottantes (modales, menus) uniquement. Pas de cartes qui « lévitent ».
- **Filets** : pour structurer une liste, préférer `border-t border-line` entre items plutôt que des boîtes imbriquées.

## 5. Composants normés

- **Bouton primaire** : fond `primary`, texte blanc, radius `md`. Hover `primary-hover`. Pas de dégradé, pas d'ombre portée.
- **Bouton secondaire** : bordure + texte `primary` sur blanc. **Ghost** : texte `primary`, hover `primary-soft`. **Destructif** : fond `error`.
- **Input** : bordure `line-strong`, focus bordure `primary` + halo `shadow-focus`. Erreur : bordure `error` + fond `error-soft`.
- **Chips/Badges** : pill, fond `*-soft`, texte `*-fg` (jamais la teinte vive sur soft).
- **Cartes** : `surface`, bordure `line`, padding 24, radius `md`.
- **Tableaux** : padding 12/16, divider `fill-muted`, hover `fill-subtle`, chiffres en `tnum`.
- **Tooltips** : fond `ink`, texte blanc, 13 px.
- **Stat card** : label `ink-faint`, valeur en `font-headline` `tnum`, icône dans une pastille `primary-soft`/`primary-fg` statique.
- **Navigation (sidebar)** : item actif = `primary-soft` + texte `primary-fg` + barre verte 3 px à gauche. Hover = `fill-subtle`.
- **Bloc de code** : fond `pine`, texte blanc 90 %, header `pine` avec filet `white/10`.
- **États vides** : pictogramme dans une pastille `primary-soft`, message qui dit **quoi faire ensuite**.

## 6. Le panneau sombre (auth)

Composition éditoriale sur `pine` : eyebrow mono `moon` → grand titre Bricolage → liste à filets `white/10` avec icônes `moon`. Signature graphique : **le disque lunaire** — deux cercles `pine-raised`/`pine` décalés formant un croissant géométrique en bord de cadre. C'est le seul ornement autorisé.

## 7. Mouvement

Discret et fonctionnel : `fade-in` à l'arrivée d'une page, `pop-in` pour les modales, transitions de couleur 150–200 ms. **Pas** d'éléments qui flottent en boucle, pas de zoom d'icônes au hover. `prefers-reduced-motion` est respecté globalement.

## 8. Do's & Don'ts

**À faire**
- Hiérarchiser par la typo (taille/graisse) et les filets, pas par la couleur.
- Toujours montrer la prochaine action (états vides compris).
- `font-mono` pour toute donnée technique (clé, DNS, code, ID).
- Vérifier le contraste de tout nouveau couple texte/fond.

**À proscrire (les « patterns IA »)**
- Halos flous (`blur-[...]`), dégradés décoratifs, glassmorphism (`backdrop-blur` hors overlay de modale).
- Trames de points, grilles décoratives, particules.
- Emojis dans l'interface (boutons, titres, descriptions). Tolérés uniquement dans du **contenu d'exemple d'e-mail** (sujets de démo).
- Couleurs Tailwind par défaut posées telles quelles ; toute couleur vient des tokens.
- Icônes qui grossissent au hover, cartes qui se soulèvent, animations gratuites.
- Texte gris clair sur fond clair « parce que c'est joli ».

## 9. Implémentation

Tokens : `tailwind.config.ts`. Base (fontes, héritage de couleur des titres, scrollbars, sélection) : `src/app/globals.css`. Fontes chargées par `next/font` dans `src/app/layout.tsx` (variables `--font-headline`, `--font-body`, `--font-mono`). Primitives : `src/components/ui/`.
