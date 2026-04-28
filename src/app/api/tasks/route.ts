import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import type { PageObjectResponse, QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';

// ─── Config ────────────────────────────────────────────────────────────────────

const GENERAL_DB_ID = '242f098f-a71b-81b5-a553-e653205c5459';
const TECH_DB_ID    = '242f098f-a71b-8110-9085-df6079919513';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TaskType   = '🥋 Dojo' | '📋 Présentation' | '💻 Set-up' | '📍 Tâche';
export type TaskStatus = 'To do' | 'In Progress' | 'Done' | 'Bac rouge';
export type TeamValue  =
  | 'Product Management'
  | 'Customer Success'
  | 'Sales'
  | 'Tech'
  | 'Product design'
  | 'HR'
  | 'SDR'
  | 'ALL';

export type NormalizedTimeline =
  | 'Jour 1'
  | 'Semaine 1'
  | 'Semaine 2'
  | 'Semaine 3'
  | 'Semaine 4+'
  | 'Mois 2'
  | 'Post-attribution';

export interface Task {
  id: string;
  url: string;
  name: string;
  type: TaskType | null;
  timeline: NormalizedTimeline | null;
  team: TeamValue[];
  duration: number | null;
  status: TaskStatus | null;
  board: 'general' | 'tech';
}

// ─── Timeline normalisation ─────────────────────────────────────────────────────

function normalizeTimeline(raw: string, board: 'general' | 'tech'): NormalizedTimeline | null {
  if (board === 'general') {
    const map: Record<string, NormalizedTimeline> = {
      'Jour 1':                                    'Jour 1',
      'Semaine 1':                                 'Semaine 1',
      'Semaine 2':                                 'Semaine 2',
      'Semaine 3':                                 'Semaine 3',
      'Semaine 4 et +':                            'Semaine 4+',
      'Semaine 4':                                 'Semaine 4+',
      'post attribution  8 mois après arrivée':    'Post-attribution',
      'post attribution 8 mois après arrivée':     'Post-attribution',
      'Post attribution':                          'Post-attribution',
    };
    return map[raw] ?? null;
  } else {
    const map: Record<string, NormalizedTimeline> = {
      'Semaine 1': 'Semaine 1',
      'Semaine 2': 'Semaine 2',
      'Semaine 3': 'Semaine 3',
      'Semaine 4': 'Semaine 4+',
      'Mois 2':    'Mois 2',
    };
    return map[raw] ?? null;
  }
}

// ─── Timeline sort order ────────────────────────────────────────────────────────

const TIMELINE_ORDER: NormalizedTimeline[] = [
  'Jour 1',
  'Semaine 1',
  'Semaine 2',
  'Semaine 3',
  'Semaine 4+',
  'Mois 2',
  'Post-attribution',
];

// ─── Notion page → Task ─────────────────────────────────────────────────────────

function parseNotionPage(page: PageObjectResponse, board: 'general' | 'tech'): Task {
  const props = page.properties;

  const nameArr =
    props['Name']?.type === 'title' ? props['Name'].title : [];
  const name = nameArr.map((t: { plain_text: string }) => t.plain_text).join('');

  const typeSelect   = props['Type']?.type   === 'select' ? props['Type'].select   : null;
  const type         = (typeSelect?.name ?? null) as TaskType | null;

  const timelineSelect = props['Timeline']?.type === 'select' ? props['Timeline'].select : null;
  const timelineRaw    = timelineSelect?.name ?? null;
  const timeline       = timelineRaw ? normalizeTimeline(timelineRaw, board) : null;

  const statutSelect = props['Statut']?.type === 'select' ? props['Statut'].select : null;
  const status       = (statutSelect?.name ?? null) as TaskStatus | null;

  const teamMulti = props['Team']?.type === 'multi_select' ? props['Team'].multi_select : [];
  const team      = teamMulti.map((t: { name: string }) => t.name) as TeamValue[];

  const dureeNumber = props['Durée prévue']?.type === 'number' ? props['Durée prévue'].number : null;

  return {
    id:       page.id,
    url:      page.url,
    name,
    type,
    timeline,
    team,
    duration: dureeNumber ?? null,
    status,
    board,
  };
}

// ─── Fetch from Notion ──────────────────────────────────────────────────────────

async function fetchNotionDB(notion: Client, dbId: string, board: 'general' | 'tech'): Promise<Task[]> {
  const tasks: Task[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response: QueryDatabaseResponse = await notion.databases.query({
      database_id: dbId,
      start_cursor: cursor,
      page_size:    100,
    });

    for (const page of response.results) {
      if (page.object === 'page' && 'properties' in page) {
        tasks.push(parseNotionPage(page as PageObjectResponse, board));
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return tasks;
}

// ─── Demo data (contenu réel du board Notion Graneet) ───────────────────────────

function getDemoTasks(): Task[] {
  return [

    // ── GÉNÉRAL — Jour 1 ──────────────────────────────────────────────────────
    {
      id: 'g-j1-1', url: '#',
      name: 'Découvre la politique de Télétravail de Graneet',
      type: '📋 Présentation', timeline: 'Jour 1', team: ['ALL'], duration: 0.5, status: 'To do', board: 'general',
    },
    {
      id: 'g-j1-2', url: '#',
      name: 'Déclare chaque semaine dans Lucca tes jours de TT/Présence au bureau',
      type: '💻 Set-up', timeline: 'Jour 1', team: ['ALL'], duration: 0.25, status: 'To do', board: 'general',
    },
    {
      id: 'g-j1-3', url: '#',
      name: 'Infos utiles !',
      type: '📋 Présentation', timeline: 'Jour 1', team: ['ALL'], duration: 0.5, status: 'To do', board: 'general',
    },
    {
      id: 'g-j1-4', url: '#',
      name: 'Rejoindre le Slack de Point 9',
      type: '💻 Set-up', timeline: 'Jour 1', team: ['ALL'], duration: 0.25, status: 'To do', board: 'general',
    },
    {
      id: 'g-j1-5', url: '#',
      name: "S'assurer qu'on connaît la boîte à outils de Graneet et de son équipe",
      type: '💻 Set-up', timeline: 'Jour 1', team: ['ALL'], duration: 1, status: 'To do', board: 'general',
    },

    // ── GÉNÉRAL — Semaine 1 ───────────────────────────────────────────────────
    {
      id: 'g-s1-1', url: '#',
      name: 'Faire ton premier 1:1 avec ton manager',
      type: '📍 Tâche', timeline: 'Semaine 1', team: ['ALL'], duration: 0.5, status: 'To do', board: 'general',
    },
    {
      id: 'g-s1-2', url: '#',
      name: 'Prise en main des ressources produit',
      type: '📋 Présentation', timeline: 'Semaine 1', team: ['ALL'], duration: 2, status: 'To do', board: 'general',
    },
    {
      id: 'g-s1-3', url: '#',
      name: 'Graneet QUIZ [Général]',
      type: '🥋 Dojo', timeline: 'Semaine 1', team: ['ALL'], duration: 1, status: 'To do', board: 'general',
    },
    {
      id: 'g-s1-4', url: '#',
      name: 'Graneet QUIZ [Devis]',
      type: '🥋 Dojo', timeline: 'Semaine 1', team: ['ALL'], duration: 1, status: 'To do', board: 'general',
    },
    {
      id: 'g-s1-5', url: '#',
      name: 'Graneet QUIZ [Achats]',
      type: '🥋 Dojo', timeline: 'Semaine 1', team: ['ALL'], duration: 1, status: 'To do', board: 'general',
    },
    {
      id: 'g-s1-6', url: '#',
      name: 'Les rituels produits',
      type: '📋 Présentation', timeline: 'Semaine 1', team: ['ALL'], duration: 1, status: 'To do', board: 'general',
    },

    // ── GÉNÉRAL — Semaine 1 — Customer Success ────────────────────────────────
    {
      id: 'g-s1-csm-1', url: '#',
      name: '[CSM only] Prise en main de Vitally',
      type: '📋 Présentation', timeline: 'Semaine 1', team: ['Customer Success'], duration: 1, status: 'To do', board: 'general',
    },
    {
      id: 'g-s1-csm-2', url: '#',
      name: '[CSM only] Paramètre ton n° de portable Aircall + finir setup Vitally et Hubspot',
      type: '💻 Set-up', timeline: 'Semaine 1', team: ['Customer Success'], duration: 1, status: 'To do', board: 'general',
    },
    {
      id: 'g-s1-csm-3', url: '#',
      name: 'Paramétrage Vitally',
      type: '💻 Set-up', timeline: 'Semaine 1', team: ['Customer Success'], duration: 1, status: 'To do', board: 'general',
    },
    {
      id: 'g-s1-csm-4', url: '#',
      name: 'Setup Aircall',
      type: '💻 Set-up', timeline: 'Semaine 1', team: ['Customer Success'], duration: 0.5, status: 'To do', board: 'general',
    },

    // ── GÉNÉRAL — Semaine 2 ───────────────────────────────────────────────────
    {
      id: 'g-s2-1', url: '#',
      name: "En autonomie : Prise en main de l'appli Graneet (incl. Décompte Général et Définitif)",
      type: '🥋 Dojo', timeline: 'Semaine 2', team: ['ALL'], duration: 3, status: 'To do', board: 'general',
    },
    {
      id: 'g-s2-2', url: '#',
      name: 'Atelier Onboarding : Gestion commerciale',
      type: '📋 Présentation', timeline: 'Semaine 2', team: ['ALL'], duration: 2, status: 'To do', board: 'general',
    },
    {
      id: 'g-s2-3', url: '#',
      name: 'Atelier onboarding : Fonctionnement des OKR',
      type: '📋 Présentation', timeline: 'Semaine 2', team: ['ALL'], duration: 2, status: 'To do', board: 'general',
    },
    {
      id: 'g-s2-4', url: '#',
      name: 'Atelier Onboarding Vision Graneet - Pitch Deck',
      type: '📋 Présentation', timeline: 'Semaine 2', team: ['ALL'], duration: 1.5, status: 'To do', board: 'general',
    },
    {
      id: 'g-s2-5', url: '#',
      name: "Atelier Care : comprendre la structure des chantiers Graneet et les règles métier",
      type: '📋 Présentation', timeline: 'Semaine 2', team: ['ALL'], duration: 2, status: 'To do', board: 'general',
    },

    // ── GÉNÉRAL — Semaine 2 — Customer Success + Sales ────────────────────────
    {
      id: 'g-s2-csm-1', url: '#',
      name: "[CSM/AE only] Crée ton compte démo avant l'atelier 5bis",
      type: '💻 Set-up', timeline: 'Semaine 2', team: ['Customer Success', 'Sales'], duration: 0.5, status: 'To do', board: 'general',
    },
    {
      id: 'g-s2-csm-2', url: '#',
      name: "Assister à un point d'onboarding client",
      type: '📍 Tâche', timeline: 'Semaine 2', team: ['Customer Success'], duration: 2, status: 'To do', board: 'general',
    },

    // ── GÉNÉRAL — Semaine 3 ───────────────────────────────────────────────────
    {
      id: 'g-s3-csm-1', url: '#',
      name: '[CSM only] Faire le point sur ton portefeuille client + rituel hebdomadaire de revue de portefeuille',
      type: '📍 Tâche', timeline: 'Semaine 3', team: ['Customer Success'], duration: 1, status: 'To do', board: 'general',
    },

    // ── GÉNÉRAL — Post-attribution (8 mois) ───────────────────────────────────
    {
      id: 'g-post-1', url: '#',
      name: '[Back-Office 4] Faire des requêtes SQL simples',
      type: '🥋 Dojo', timeline: 'Post-attribution', team: ['ALL'], duration: 2, status: 'To do', board: 'general',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ── TECH — Semaine 1 ──────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════
    {
      id: 't-s1-1', url: '#',
      name: 'Installation des principales applications (Slack, KeeWeb, VSCode, DataGrip, iTerm, Docker…)',
      type: '💻 Set-up', timeline: 'Semaine 1', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-s1-2', url: '#',
      name: 'Installation fonctionnelle du projet',
      type: '💻 Set-up', timeline: 'Semaine 1', team: ['Tech'], duration: 3, status: 'To do', board: 'tech',
    },
    {
      id: 't-s1-3', url: '#',
      name: 'Communication de l\'équipe technique (Gitlab / Slack / Notion / Discord)',
      type: '📋 Présentation', timeline: 'Semaine 1', team: ['Tech'], duration: 0.5, status: 'To do', board: 'tech',
    },
    {
      id: 't-s1-4', url: '#',
      name: 'Présentation et explications sommaires sur les entités',
      type: '📋 Présentation', timeline: 'Semaine 1', team: ['Tech'], duration: 1, status: 'To do', board: 'tech',
    },
    {
      id: 't-s1-5', url: '#',
      name: 'Présentation du Git flow et des features flags',
      type: '📋 Présentation', timeline: 'Semaine 1', team: ['Tech'], duration: 1, status: 'To do', board: 'tech',
    },
    {
      id: 't-s1-6', url: '#',
      name: 'Présentation de l\'authentification (Auth0)',
      type: '📋 Présentation', timeline: 'Semaine 1', team: ['Tech'], duration: 1, status: 'To do', board: 'tech',
    },
    {
      id: 't-s1-7', url: '#',
      name: 'Présentation des standards du flow de dev + Identification des premiers tickets',
      type: '📍 Tâche', timeline: 'Semaine 1', team: ['Tech'], duration: 1.5, status: 'To do', board: 'tech',
    },
    {
      id: 't-s1-8', url: '#',
      name: 'Accès aux DB des différents environnements',
      type: '💻 Set-up', timeline: 'Semaine 1', team: ['Tech'], duration: 0.5, status: 'To do', board: 'tech',
    },
    {
      id: 't-s1-9', url: '#',
      name: 'Présentation des PDFs',
      type: '📋 Présentation', timeline: 'Semaine 1', team: ['Tech'], duration: 0.5, status: 'To do', board: 'tech',
    },
    {
      id: 't-s1-10', url: '#',
      name: 'Présentation librairie maison pour la gestion des formulaires',
      type: '📋 Présentation', timeline: 'Semaine 1', team: ['Tech'], duration: 1, status: 'To do', board: 'tech',
    },
    {
      id: 't-s1-11', url: '#',
      name: "Je connais l'organisation des fichiers + conventions de code",
      type: '🥋 Dojo', timeline: 'Semaine 1', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },

    // ── TECH — Semaine 2 ──────────────────────────────────────────────────────
    {
      id: 't-s2-1', url: '#',
      name: 'Je sais faire une entité sur NestJS ainsi qu\'une migration',
      type: '🥋 Dojo', timeline: 'Semaine 2', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-s2-2', url: '#',
      name: "Je sais faire un contrôleur et je maîtrise les middlewares d'authentification et la documentation Swagger",
      type: '🥋 Dojo', timeline: 'Semaine 2', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-s2-3', url: '#',
      name: "Je sais faire et utiliser un service sur NestJS et je connais les principes d'organisation",
      type: '🥋 Dojo', timeline: 'Semaine 2', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-s2-4', url: '#',
      name: 'Je sais utiliser la librairie maison de formulaire sur le Front',
      type: '🥋 Dojo', timeline: 'Semaine 2', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-s2-5', url: '#',
      name: "J'ai modifié une vue du front sur laquelle j'ai ajouté un composant de lib-ui ou une méthode business",
      type: '🥋 Dojo', timeline: 'Semaine 2', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-s2-6', url: '#',
      name: 'Je sais faire un composant graphique et faire une story Storybook',
      type: '🥋 Dojo', timeline: 'Semaine 2', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },

    // ── TECH — Semaine 3 ──────────────────────────────────────────────────────
    {
      id: 't-s3-1', url: '#',
      name: 'Je sais faire un test E2E sur le back ainsi qu\'un test de migration',
      type: '🥋 Dojo', timeline: 'Semaine 3', team: ['Tech'], duration: 3, status: 'To do', board: 'tech',
    },
    {
      id: 't-s3-2', url: '#',
      name: 'Je sais faire une méthode business et la tester',
      type: '🥋 Dojo', timeline: 'Semaine 3', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-s3-3', url: '#',
      name: 'Je connais le principe des factories et je sais les utiliser dans les tests',
      type: '🥋 Dojo', timeline: 'Semaine 3', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-s3-4', url: '#',
      name: 'Je sais faire un wizard avec la librairie maison sur le Front',
      type: '🥋 Dojo', timeline: 'Semaine 3', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-s3-5', url: '#',
      name: 'Je sais faire une nouvelle vue front avec routing et traductions',
      type: '🥋 Dojo', timeline: 'Semaine 3', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-s3-6', url: '#',
      name: 'Je connais le fonctionnement de Chakra UI et du theming',
      type: '🥋 Dojo', timeline: 'Semaine 3', team: ['Tech'], duration: 1.5, status: 'To do', board: 'tech',
    },
    {
      id: 't-s3-7', url: '#',
      name: 'Je sais utiliser un feature flag',
      type: '🥋 Dojo', timeline: 'Semaine 3', team: ['Tech'], duration: 1, status: 'To do', board: 'tech',
    },

    // ── TECH — Mois 2 ─────────────────────────────────────────────────────────
    {
      id: 't-m2-1', url: '#',
      name: "J'ai réalisé une MEP tout seul",
      type: '📍 Tâche', timeline: 'Mois 2', team: ['Tech'], duration: null, status: 'To do', board: 'tech',
    },
    {
      id: 't-m2-2', url: '#',
      name: "J'ai compris le fonctionnement de la CI",
      type: '🥋 Dojo', timeline: 'Mois 2', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-m2-3', url: '#',
      name: 'Je sais débugger aussi bien sur le back que sur le front',
      type: '🥋 Dojo', timeline: 'Mois 2', team: ['Tech'], duration: null, status: 'To do', board: 'tech',
    },
    {
      id: 't-m2-4', url: '#',
      name: 'Je connais le fonctionnement de React / Redux et des renders',
      type: '🥋 Dojo', timeline: 'Mois 2', team: ['Tech'], duration: 3, status: 'To do', board: 'tech',
    },
    {
      id: 't-m2-5', url: '#',
      name: 'Je sais déployer sur AWS et je suis capable de voir les logs',
      type: '🥋 Dojo', timeline: 'Mois 2', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
    {
      id: 't-m2-6', url: '#',
      name: "J'ai mis à jour les dépendances de l'application",
      type: '📍 Tâche', timeline: 'Mois 2', team: ['Tech'], duration: null, status: 'To do', board: 'tech',
    },
    {
      id: 't-m2-7', url: '#',
      name: "J'ai généré mes propres PDF et je sais prévisualiser le template Graneet en local",
      type: '🥋 Dojo', timeline: 'Mois 2', team: ['Tech'], duration: 2, status: 'To do', board: 'tech',
    },
  ];
}

// ─── Route handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const team = searchParams.get('team') ?? '';

  try {
    let tasks: Task[];

    if (!process.env.NOTION_API_KEY) {
      tasks = getDemoTasks();
    } else {
      const notion = new Client({ auth: process.env.NOTION_API_KEY });

      const [generalTasks, techTasks] = await Promise.all([
        fetchNotionDB(notion, GENERAL_DB_ID, 'general'),
        team === 'Tech' ? fetchNotionDB(notion, TECH_DB_ID, 'tech') : Promise.resolve([]),
      ]);

      tasks = [...generalTasks, ...techTasks];
    }

    // Sort by timeline order then name
    tasks.sort((a, b) => {
      const aIdx = a.timeline ? TIMELINE_ORDER.indexOf(a.timeline) : 999;
      const bIdx = b.timeline ? TIMELINE_ORDER.indexOf(b.timeline) : 999;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.name.localeCompare(b.name, 'fr');
    });

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    console.error('[/api/tasks] Error:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: 'Impossible de charger les tâches.', details: message },
      { status: 500 }
    );
  }
}
