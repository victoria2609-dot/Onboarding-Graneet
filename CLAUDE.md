# CLAUDE.md — Projet Onboarding Graneet

Tout ce que Claude doit savoir sur ce projet pour travailler efficacement.

---

## Contexte du projet

Application e-learning d'onboarding pour les nouvelles recrues de **Graneet** (logiciel de gestion de chantier, entreprise française). L'objectif est d'accompagner chaque nouvel arrivant avec un parcours personnalisé selon son équipe, en s'appuyant sur les tâches existantes dans Notion.

- **URL de production** : https://onboarding-graneet.vercel.app
- **Repo GitHub** : https://github.com/victoria2609-dot/Onboarding-Graneet
- **Déploiement** : Vercel (auto-deploy depuis la branche `main`)

---

## Stack technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **CSS** : Tailwind CSS + CSS custom properties (variables dans `globals.css`)
- **Contenu** : Notion API via `@notionhq/client`
- **Hébergement** : Vercel (plan Hobby)
- **Pas de Node.js en local** — tout se build sur Vercel

---

## Structure des fichiers

```
onboarding-graneet/
├── src/
│   └── app/
│       ├── layout.tsx              # Layout racine : métadonnées, police Inter, lang="fr"
│       ├── globals.css             # Toutes les variables CSS + classes Tailwind custom
│       ├── page.tsx                # Page d'accueil : questionnaire de bienvenue (client)
│       ├── api/
│       │   └── tasks/
│       │       └── route.ts        # API route : requête Notion, renvoie les tâches JSON
│       └── onboarding/
│           └── page.tsx            # Page principale : board d'onboarding (client)
├── public/
│   └── graneet-logo.svg            # Logo Graneet en SVG (symbole échafaudage + wordmark)
├── .env.example                    # Variables d'environnement à copier en .env.local
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## Ce que fait chaque fichier

### `src/app/page.tsx` — Page d'accueil / Questionnaire
- Composant client (`'use client'`)
- Demande : prénom, équipe (dropdown), poste (optionnel)
- Valide le formulaire et stocke les données dans `localStorage` (clé : `graneet_user`)
- Si l'utilisateur est déjà enregistré → redirige automatiquement vers `/onboarding`
- Layout split-screen : panneau gauche décoratif (fond Vert Empire foncé) + formulaire à droite

### `src/app/onboarding/page.tsx` — Board d'onboarding
- Composant client (`'use client'`)
- Lit `graneet_user` depuis localStorage → redirige vers `/` si absent
- Appelle `/api/tasks?team=<équipe>` pour charger les tâches Notion
- Navigation par onglets Timeline : Jour 1 / Semaine 1 / 2 / 3 / 4+ / Mois 2
- "Mois 2" visible uniquement pour l'équipe Tech
- Chaque tâche a un bouton de statut cyclique : À faire → En cours → Terminé
- Progression sauvegardée dans localStorage (clé : `graneet_progress`)
- Header sticky avec logo, prénom, badge équipe, barre de progression globale
- Bouton "Déconnexion" qui efface localStorage et retourne au questionnaire

### `src/app/api/tasks/route.ts` — API Notion
- Requête GET avec param `?team=<équipe>`
- Si `NOTION_API_KEY` non configurée → retourne des données de démo (25 tâches fictives)
- Interroge toujours le **Board onboarding général** (ID : `242f098f-a71b-81b5-a553-e653205c5459`)
- Si équipe = Tech → interroge aussi le **Board onboarding Tech** (ID : `242f098f-a71b-8110-9085-df6079919513`)
- Normalise les timelines : "Semaine 4 et +" et "Semaine 4" → `"Semaine 4+"`
- Retourne : `{ tasks: Task[] }`

### `src/app/globals.css` — Design system
Toutes les couleurs sont des CSS variables modifiables facilement :
- Classes custom : `.btn-primary`, `.card`, `.input-field`, `.label`, `.timeline-tab`, `.progress-bar-*`, `.badge-*`

---

## Charte graphique Graneet

### Couleurs
| Variable CSS | Valeur | Usage |
|---|---|---|
| `--primary` | `#1A2A27` | Vert Empire (couleur principale) |
| `--primary-light` | `#2D4A45` | Hover states |
| `--primary-dark` | `#0D1A18` | Active states |
| `--background` | `#F0EAE0` | Beige Poudre (fond de page) |
| `--surface` | `#FDFAF6` | Fond des cartes |
| `--border` | `#DDD5C8` | Bordures |
| `--text-primary` | `#1A2A27` | Texte principal |
| `--text-muted` | `#7A9490` | Texte secondaire/grisé |

### Logo
- Symbole : deux paires de barres diagonales parallèles, inspiré des échafaudages de construction
- Wordmark : "Graneet" en Inter 600, letter-spacing -0.8
- Le logo est inline en SVG dans les pages (blanc sur fond sombre, `#1A2A27` sur fond clair)
- Fichier de référence : `public/graneet-logo.svg`

### Police
- **Inter** (Google Fonts) — weights 300, 400, 500, 600, 700, 800
- Importée dans `globals.css`

### Layout
- Largeur max du contenu : `max-w-4xl` (896px)
- Border radius : `rounded-2xl` pour les cartes, `rounded-xl` pour les inputs/boutons
- Page d'accueil : split-screen (50/50 sur desktop, colonne sur mobile)

---

## Données Notion

### Bases de données
| Nom | ID de la base |
|---|---|
| Board onboarding général | `242f098f-a71b-81b5-a553-e653205c5459` |
| Board onboarding Tech | `242f098f-a71b-8110-9085-df6079919513` |
| Page parente (template) | `242f098f-a71b-8051-92de-c05d22db2e7f` |

### Schéma des tâches (les deux bases ont le même schéma)
- `Name` : titre de la tâche
- `Type` : `"🥋 Dojo"` | `"📋 Présentation"` | `"💻 Set-up"` | `"📍 Task"`
- `Timeline` : `"Jour 1"` | `"Semaine 1"` | `"Semaine 2"` | `"Semaine 3"` | `"Semaine 4 et +"` | `"Mois 2"` (Tech seulement)
- `Statut` : `"To do"` | `"In Progress"` | `"Done"` | `"Bac rouge"`
- `Team` : array parmi `["ALL", "Tech", "Product Management", "Product design", "Customer Success", "Sales", "HR", "SDR"]`
- `Durée prévue` : nombre (en heures)
- `Intervenant` : personne Notion

### Logique de filtrage
- Affiche les tâches où `Team` contient l'équipe de l'utilisateur **OU** `"ALL"`
- Les équipes non-Tech ne voient pas le board Tech ni l'onglet "Mois 2"

### Variable d'environnement requise
```
NOTION_API_KEY=ntn_...   # Token de l'intégration Notion "Onboarding Graneet"
```
Configurée dans Vercel → Settings → Environment Variables.

---

## Préférences de Victoria (propriétaire du projet)

- **Ne code pas** — Claude fait tout le code, elle gère l'UI et le contenu
- **Tutoiement** dans toute l'app (pas de "vous/votre", toujours "tu/ton/ta/tes")
- **Langue** : français partout dans l'interface utilisateur
- **Minimalisme** : ne pas surcharger, garder l'interface claire
- **Déploiement** : toujours passer par GitHub push → Vercel auto-deploy (jamais de config manuelle du build)
- **Pas de permissions demandées** pour des actions de code classiques (écrire des fichiers, push git, etc.)

---

## Flux utilisateur

1. Arrivée sur `/` → questionnaire (prénom + équipe + poste optionnel)
2. Soumission → sauvegarde localStorage → redirection vers `/onboarding`
3. `/onboarding` → charge les tâches via API → affiche par timeline
4. L'utilisateur clique sur les statuts pour tracker sa progression
5. La progression est sauvegardée localement (pas de backend)
6. "Déconnexion" efface tout et retourne au questionnaire

---

## Commandes utiles (pour Claude uniquement — Victoria ne code pas)

```bash
# Pousser une mise à jour (déclenche le redéploiement Vercel automatiquement)
cd /Users/victoria/onboarding-graneet
git add -A
git commit -m "Description du changement"
git push origin main
```

> Note : le token GitHub est dans le remote URL (configuré localement).
> Ne pas créer de fichiers dans `.github/workflows/` — le token n'a pas le scope `workflow`.
