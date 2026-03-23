# Graneet — Onboarding E-Learning

Plateforme d'onboarding e-learning pour les nouveaux collaborateurs Graneet. Construite avec Next.js 14, TypeScript et Tailwind CSS.

## Fonctionnalités

- **Questionnaire d'accueil** : Prénom, équipe et poste pour personnaliser le parcours
- **Tableau de bord** : Toutes les tâches d'onboarding filtrées par équipe et par période
- **Suivi de progression** : Statut des tâches (À faire → En cours → Terminé) sauvegardé en localStorage
- **Intégration Notion** : Les tâches sont chargées depuis deux bases Notion (générale + tech)
- **Mode démo** : Fonctionne sans clé API Notion avec des données de démonstration réalistes
- **Responsive** : Optimisé desktop et mobile

## Technologies

- [Next.js 14](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js)

## Installation

```bash
# Cloner le projet
git clone <repo-url>
cd onboarding-graneet

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env.local
```

## Configuration Notion (optionnel)

Sans configuration Notion, l'application utilise automatiquement des données de démonstration.

Pour connecter les vraies bases Notion :

1. Créez une intégration sur [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Copiez le token d'intégration
3. Renseignez-le dans `.env.local` :

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

4. Assurez-vous que votre intégration a accès aux deux bases de données :
   - **Général** : `242f098f-a71b-81b5-a553-e653205c5459`
   - **Tech** : `242f098f-a71b-8110-9085-df6079919513`

## Démarrage

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
src/
├── app/
│   ├── globals.css          # Styles globaux + variables CSS
│   ├── layout.tsx           # Layout racine (métadonnées, police)
│   ├── page.tsx             # Page d'accueil — questionnaire
│   ├── onboarding/
│   │   └── page.tsx         # Tableau de bord onboarding
│   └── api/
│       └── tasks/
│           └── route.ts     # API route — lecture Notion ou demo data
public/
├── graneet-logo.svg         # Logo SVG placeholder
```

## Variables CSS (branding)

Les couleurs sont définies via des variables CSS dans `globals.css` pour faciliter les mises à jour :

```css
:root {
  --primary: #2B6CB0;      /* Couleur principale */
  --primary-light: #4A90E2;
  --primary-dark: #1A4A7A;
  /* ... */
}
```

## Logique de filtrage

- Les tâches sont affichées si l'équipe du collaborateur est dans le champ `Team` de la tâche, **ou** si `ALL` est présent.
- L'onglet **Semaine 4+** correspond à `Semaine 4 et +` (board général) et `Semaine 4` (board tech).
- L'onglet **Mois 2** n'est visible que pour l'équipe **Tech**.

## Données localStorage

| Clé | Contenu |
|-----|---------|
| `graneet_user` | `{ prenom, equipe, poste? }` |
| `graneet_progress` | `{ [notionUrl]: "To do" \| "In Progress" \| "Done" }` |

## Déploiement

L'application est prête pour un déploiement sur [Vercel](https://vercel.com/) :

```bash
npm run build
```

Ajoutez la variable d'environnement `NOTION_API_KEY` dans les paramètres de votre projet Vercel.
