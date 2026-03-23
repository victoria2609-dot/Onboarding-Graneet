import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import type { PageObjectResponse, QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';

// ─── Config ────────────────────────────────────────────────────────────────────

const GENERAL_DB_ID = '242f098f-a71b-81b5-a553-e653205c5459';
const TECH_DB_ID = '242f098f-a71b-8110-9085-df6079919513';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TaskType = '🥋 Dojo' | '📋   Présentation' | '💻 Set-up' | '📍 Task';
export type TaskStatus = 'To do' | 'In Progress' | 'Done' | 'Bac rouge';
export type TeamValue =
  | 'Product Management'
  | 'Customer Success'
  | 'Sales'
  | 'Tech'
  | 'Product design'
  | 'HR'
  | 'SDR'
  | 'ALL';

export type GeneralTimeline =
  | 'Jour 1'
  | 'Semaine 1'
  | 'Semaine 2'
  | 'Semaine 3'
  | 'Semaine 4 et +'
  | 'post attribution  8 mois après arrivée';

export type TechTimeline = 'Semaine 1' | 'Semaine 2' | 'Semaine 3' | 'Semaine 4' | 'Mois 2';

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
      'Jour 1': 'Jour 1',
      'Semaine 1': 'Semaine 1',
      'Semaine 2': 'Semaine 2',
      'Semaine 3': 'Semaine 3',
      'Semaine 4 et +': 'Semaine 4+',
      'post attribution  8 mois après arrivée': 'Post-attribution',
    };
    return map[raw] ?? null;
  } else {
    const map: Record<string, NormalizedTimeline> = {
      'Semaine 1': 'Semaine 1',
      'Semaine 2': 'Semaine 2',
      'Semaine 3': 'Semaine 3',
      'Semaine 4': 'Semaine 4+',
      'Mois 2': 'Mois 2',
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

  // Name
  const nameArr =
    props['Name']?.type === 'title' ? props['Name'].title : [];
  const name = nameArr.map((t: { plain_text: string }) => t.plain_text).join('');

  // Type
  const typeSelect = props['Type']?.type === 'select' ? props['Type'].select : null;
  const type = (typeSelect?.name ?? null) as TaskType | null;

  // Timeline
  const timelineSelect = props['Timeline']?.type === 'select' ? props['Timeline'].select : null;
  const timelineRaw = timelineSelect?.name ?? null;
  const timeline = timelineRaw ? normalizeTimeline(timelineRaw, board) : null;

  // Statut
  const statutSelect = props['Statut']?.type === 'select' ? props['Statut'].select : null;
  const status = (statutSelect?.name ?? null) as TaskStatus | null;

  // Team (multi-select)
  const teamMulti = props['Team']?.type === 'multi_select' ? props['Team'].multi_select : [];
  const team = teamMulti.map((t: { name: string }) => t.name) as TeamValue[];

  // Durée prévue
  const dureeNumber = props['Durée prévue']?.type === 'number' ? props['Durée prévue'].number : null;

  return {
    id: page.id,
    url: page.url,
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
      page_size: 100,
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

// ─── Demo data ──────────────────────────────────────────────────────────────────

function getDemoTasks(): Task[] {
  return [
    // Jour 1 — ALL
    {
      id: 'demo-1',
      url: '#',
      name: 'Accueil et visite des bureaux',
      type: '💻 Set-up',
      timeline: 'Jour 1',
      team: ['ALL'],
      duration: 1,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-2',
      url: '#',
      name: 'Rencontrer son buddy',
      type: '📋   Présentation',
      timeline: 'Jour 1',
      team: ['ALL'],
      duration: 0.5,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-3',
      url: '#',
      name: 'Setup poste de travail',
      type: '💻 Set-up',
      timeline: 'Jour 1',
      team: ['ALL'],
      duration: 2,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-4',
      url: '#',
      name: 'Déjeuner d\'équipe',
      type: '📋   Présentation',
      timeline: 'Jour 1',
      team: ['ALL'],
      duration: 1,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-5',
      url: '#',
      name: 'Lecture du guide de bienvenue Graneet',
      type: '🥋 Dojo',
      timeline: 'Jour 1',
      team: ['ALL'],
      duration: 0.5,
      status: 'To do',
      board: 'general',
    },

    // Semaine 1 — ALL
    {
      id: 'demo-6',
      url: '#',
      name: 'Présentation du produit Graneet',
      type: '📋   Présentation',
      timeline: 'Semaine 1',
      team: ['ALL'],
      duration: 1.5,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-7',
      url: '#',
      name: 'Découverte des processus internes',
      type: '📋   Présentation',
      timeline: 'Semaine 1',
      team: ['ALL'],
      duration: 1,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-8',
      url: '#',
      name: 'Premier standup d\'équipe',
      type: '📍 Task',
      timeline: 'Semaine 1',
      team: ['ALL'],
      duration: 0.5,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-9',
      url: '#',
      name: 'Setup des accès et outils (Notion, Slack, etc.)',
      type: '💻 Set-up',
      timeline: 'Semaine 1',
      team: ['ALL'],
      duration: 2,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-10',
      url: '#',
      name: 'Lecture de la documentation produit',
      type: '🥋 Dojo',
      timeline: 'Semaine 1',
      team: ['ALL'],
      duration: 3,
      status: 'To do',
      board: 'general',
    },

    // Semaine 1 — Tech only
    {
      id: 'demo-tech-1',
      url: '#',
      name: 'Setup environnement de développement',
      type: '💻 Set-up',
      timeline: 'Semaine 1',
      team: ['Tech'],
      duration: 3,
      status: 'To do',
      board: 'tech',
    },
    {
      id: 'demo-tech-2',
      url: '#',
      name: 'Découverte de l\'architecture technique',
      type: '🥋 Dojo',
      timeline: 'Semaine 1',
      team: ['Tech'],
      duration: 2,
      status: 'To do',
      board: 'tech',
    },

    // Semaine 2 — ALL
    {
      id: 'demo-11',
      url: '#',
      name: 'Rencontres individuelles avec l\'équipe',
      type: '📋   Présentation',
      timeline: 'Semaine 2',
      team: ['ALL'],
      duration: 2,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-12',
      url: '#',
      name: 'Formation sur les outils métier',
      type: '🥋 Dojo',
      timeline: 'Semaine 2',
      team: ['ALL'],
      duration: 2,
      status: 'To do',
      board: 'general',
    },

    // Semaine 2 — équipes spécifiques
    {
      id: 'demo-13',
      url: '#',
      name: 'Shadowing d\'un appel client',
      type: '📍 Task',
      timeline: 'Semaine 2',
      team: ['Customer Success', 'Sales'],
      duration: 1,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-14',
      url: '#',
      name: 'Présentation de la roadmap produit',
      type: '📋   Présentation',
      timeline: 'Semaine 2',
      team: ['Product Management', 'Product design', 'Tech'],
      duration: 1.5,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-tech-3',
      url: '#',
      name: 'Premier ticket à traiter',
      type: '📍 Task',
      timeline: 'Semaine 2',
      team: ['Tech'],
      duration: 4,
      status: 'To do',
      board: 'tech',
    },
    {
      id: 'demo-tech-4',
      url: '#',
      name: 'Code review avec un senior',
      type: '🥋 Dojo',
      timeline: 'Semaine 2',
      team: ['Tech'],
      duration: 1,
      status: 'To do',
      board: 'tech',
    },

    // Semaine 3
    {
      id: 'demo-15',
      url: '#',
      name: 'Point bilan avec le manager',
      type: '📍 Task',
      timeline: 'Semaine 3',
      team: ['ALL'],
      duration: 1,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-16',
      url: '#',
      name: 'Compléter son profil dans les outils RH',
      type: '💻 Set-up',
      timeline: 'Semaine 3',
      team: ['ALL'],
      duration: 0.5,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-tech-5',
      url: '#',
      name: 'Sprint planning — première participation active',
      type: '📍 Task',
      timeline: 'Semaine 3',
      team: ['Tech'],
      duration: 1,
      status: 'To do',
      board: 'tech',
    },

    // Semaine 4+
    {
      id: 'demo-17',
      url: '#',
      name: 'Présentation de son équipe au reste de la société',
      type: '📋   Présentation',
      timeline: 'Semaine 4+',
      team: ['ALL'],
      duration: 0.5,
      status: 'To do',
      board: 'general',
    },
    {
      id: 'demo-18',
      url: '#',
      name: 'Dojo découverte secteur BTP',
      type: '🥋 Dojo',
      timeline: 'Semaine 4+',
      team: ['ALL'],
      duration: 2,
      status: 'To do',
      board: 'general',
    },

    // Mois 2 — Tech
    {
      id: 'demo-tech-6',
      url: '#',
      name: 'Revue de performance et objectifs à 3 mois',
      type: '📍 Task',
      timeline: 'Mois 2',
      team: ['Tech'],
      duration: 1,
      status: 'To do',
      board: 'tech',
    },
    {
      id: 'demo-tech-7',
      url: '#',
      name: 'Formation sécurité et bonnes pratiques DevOps',
      type: '🥋 Dojo',
      timeline: 'Mois 2',
      team: ['Tech'],
      duration: 3,
      status: 'To do',
      board: 'tech',
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
      // Return demo data when no API key is configured
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
