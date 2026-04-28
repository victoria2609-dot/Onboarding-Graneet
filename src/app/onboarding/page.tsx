'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, NormalizedTimeline, TeamValue, TaskStatus } from '../api/tasks/route';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY_USER     = 'graneet_user';
const STORAGE_KEY_PROGRESS = 'graneet_progress';
const STORAGE_KEY_LEGEND   = 'graneet_legend_dismissed';

const ALL_TIMELINES: NormalizedTimeline[] = [
  'Jour 1',
  'Semaine 1',
  'Semaine 2',
  'Semaine 3',
  'Semaine 4+',
  'Mois 2',
  'Post-attribution',
];

const TIMELINE_LABELS: Record<NormalizedTimeline, string> = {
  'Jour 1':           'Jour 1',
  'Semaine 1':        'Semaine 1',
  'Semaine 2':        'Semaine 2',
  'Semaine 3':        'Semaine 3',
  'Semaine 4+':       'Semaine 4+',
  'Mois 2':           'Mois 2',
  'Post-attribution': '8 mois+',
};

const TIMELINE_DESCRIPTIONS: Record<NormalizedTimeline, string> = {
  'Jour 1':           'Premiers pas chez Graneet — installation et découverte',
  'Semaine 1':        'Prise en main des outils, ressources produit et quizzes',
  'Semaine 2':        'Ateliers, découverte du produit et des processus',
  'Semaine 3':        'Autonomie et bilan intermédiaire',
  'Semaine 4+':       'Montée en compétences et approfondissement',
  'Mois 2':           'Sujets avancés et premières contributions en autonomie',
  'Post-attribution': 'Bilan post-attribution — 8 mois après ton arrivée',
};

const STATUS_CYCLE: TaskStatus[] = ['To do', 'In Progress', 'Done'];

const TEAM_COLORS: Record<string, { bg: string; text: string }> = {
  Tech:                 { bg: '#EAF0EE', text: '#1A2A27' },
  'Product Management': { bg: '#FAF5FF', text: '#6B21A8' },
  'Product design':     { bg: '#FDF2F8', text: '#9D174D' },
  'Customer Success':   { bg: '#EAF2EF', text: '#1B6B52' },
  Sales:                { bg: '#FFF7ED', text: '#C2410C' },
  HR:                   { bg: '#FEFCE8', text: '#A16207' },
  SDR:                  { bg: '#F0F9FF', text: '#0369A1' },
};

// Explication des types de tâches (depuis la charte d'onboarding Graneet)
const TASK_TYPE_LEGEND = [
  {
    icon: '💻',
    label: 'Set-up',
    desc: "Tâche à effectuer à ton arrivée pour mettre en place ton environnement de travail.",
  },
  {
    icon: '📋',
    label: 'Présentation',
    desc: "Contenu présenté par un membre de l'équipe pour monter en compétences sur les sujets Graneet. Si la présentation n'est pas dans ton agenda, ping la personne responsable pour organiser cela !",
  },
  {
    icon: '🥋',
    label: 'Dojo',
    desc: "Explication théorique sur le fonctionnement d'un sujet et mise en pratique. L'objectif est de devenir autonome sur la tâche.",
  },
  {
    icon: '📍',
    label: 'Tâche',
    desc: "À réaliser dans la période de ton onboarding.",
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UserData {
  prenom: string;
  equipe: string;
  poste?: string;
}

type ProgressMap = Record<string, TaskStatus>;

// ─── Helper components ──────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  let cls = 'badge-dojo';
  if (type.includes('Présentation')) cls = 'badge-presentation';
  else if (type.includes('Set-up'))  cls = 'badge-setup';
  else if (type.includes('Tâche') || type.includes('Task')) cls = 'badge-task';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {type}
    </span>
  );
}

function StatusButton({
  status,
  onClick,
}: {
  status: TaskStatus;
  onClick: () => void;
}) {
  const styles: Record<TaskStatus, { bg: string; text: string; label: string }> = {
    'To do':      { bg: 'var(--status-todo-bg)',       text: 'var(--status-todo-text)',       label: 'À faire'    },
    'In Progress':{ bg: 'var(--status-inprogress-bg)', text: 'var(--status-inprogress-text)', label: 'En cours'   },
    Done:         { bg: 'var(--status-done-bg)',        text: 'var(--status-done-text)',        label: 'Terminé ✓' },
    'Bac rouge':  { bg: '#FFF5F5',                     text: '#C53030',                        label: 'Bac rouge'  },
  };

  const s = styles[status] ?? styles['To do'];

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-80 active:scale-95 cursor-pointer select-none"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.text}22` }}
      title="Cliquer pour changer le statut"
    >
      {status === 'Done' && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {status === 'In Progress' && (
        <span
          className="w-2 h-2 rounded-full inline-block animate-pulse-slow"
          style={{ background: 'var(--status-inprogress-text)' }}
        />
      )}
      {s.label}
    </button>
  );
}

function TaskCard({
  task,
  status,
  onStatusChange,
}: {
  task: Task;
  status: TaskStatus;
  onStatusChange: (taskUrl: string, next: TaskStatus) => void;
}) {
  const handleToggle = () => {
    const currentIdx = STATUS_CYCLE.indexOf(status);
    const next = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    onStatusChange(task.url, next);
  };

  const isDone = status === 'Done';

  return (
    <div
      className={`card p-4 flex flex-col sm:flex-row sm:items-start gap-3 transition-all duration-200 ${isDone ? 'opacity-60' : ''}`}
    >
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={task.type} />
          {task.board === 'tech' && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: '#EAF2EF', color: '#1B4D3E', border: '1px solid #C0DAD3' }}
            >
              Tech
            </span>
          )}
        </div>

        <h3
          className={`text-sm font-semibold leading-snug ${isDone ? 'line-through' : ''}`}
          style={{ color: isDone ? 'var(--text-muted)' : 'var(--text-primary)' }}
        >
          {task.url && task.url !== '#' ? (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: 'inherit' }}
            >
              {task.name}
            </a>
          ) : (
            task.name
          )}
        </h3>

        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {task.duration !== null && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {task.duration < 1
                ? `${task.duration * 60} min`
                : task.duration === 1
                ? '1 h'
                : `${task.duration} h`}
            </span>
          )}
          {task.url && task.url !== '#' && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline transition-colors"
              style={{ color: 'var(--primary)' }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path
                  d="M4.5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V6.5M7 1h3m0 0v3m0-3L4.5 6.5"
                  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
              Ouvrir dans Notion
            </a>
          )}
        </div>
      </div>

      <div className="flex-shrink-0">
        <StatusButton status={status} onClick={handleToggle} />
      </div>
    </div>
  );
}

// ─── Legend panel ───────────────────────────────────────────────────────────────

function LegendPanel({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="rounded-2xl border p-5 mb-6 animate-fade-in"
      style={{
        background:   'linear-gradient(135deg, #F7F4EF 0%, #FDFAF6 100%)',
        borderColor:  'var(--border)',
        boxShadow:    '0 2px 8px rgba(26,42,39,0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Comment lire ce parcours ?
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Les tâches se divisent en 4 types. Les statuts <strong>À faire → En cours → Terminé</strong> se
              changent en cliquant sur le bouton à droite de chaque carte.
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-black/5"
          title="Fermer"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TASK_TYPE_LEGEND.map((item) => (
          <div
            key={item.label}
            className="flex gap-3 p-3 rounded-xl"
            style={{ background: 'white', border: '1px solid var(--border)' }}
          >
            <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
            <div>
              <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {item.label}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bac rouge note */}
      <div
        className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
        style={{ background: '#FFF5F5', border: '1px solid #FED7D7', color: '#9B2C2C' }}
      >
        <span className="flex-shrink-0 font-bold">🪣 Bac rouge</span>
        <span>
          Identifie une partie de l&apos;onboarding qui peut être améliorée — c&apos;est à toi de la compléter
          pour les prochains arrivants !
        </span>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  const [user,           setUser]           = useState<UserData | null>(null);
  const [tasks,          setTasks]          = useState<Task[]>([]);
  const [progress,       setProgress]       = useState<ProgressMap>({});
  const [activeTimeline, setActiveTimeline] = useState<NormalizedTimeline>('Jour 1');
  const [showLegend,     setShowLegend]     = useState(true);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [mounted,        setMounted]        = useState(false);

  // Initialise from localStorage
  useEffect(() => {
    setMounted(true);

    const storedUser = localStorage.getItem(STORAGE_KEY_USER);
    if (!storedUser) { router.replace('/'); return; }

    let parsedUser: UserData;
    try {
      parsedUser = JSON.parse(storedUser);
    } catch {
      router.replace('/');
      return;
    }

    if (!parsedUser.prenom || !parsedUser.equipe) { router.replace('/'); return; }
    setUser(parsedUser);

    // Restore progress
    const storedProgress = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (storedProgress) {
      try { setProgress(JSON.parse(storedProgress)); } catch { /* ignore */ }
    }

    // Restore legend state
    const dismissed = localStorage.getItem(STORAGE_KEY_LEGEND);
    if (dismissed === 'true') setShowLegend(false);

    // Fetch tasks
    fetch(`/api/tasks?team=${encodeURIComponent(parsedUser.equipe)}`)
      .then((res) => { if (!res.ok) throw new Error('Erreur réseau'); return res.json(); })
      .then((data: { tasks: Task[] }) => { setTasks(data.tasks); setLoading(false); })
      .catch((err) => {
        console.error(err);
        setError('Impossible de charger les tâches. Veuillez réessayer.');
        setLoading(false);
      });
  }, [router]);

  const handleStatusChange = useCallback((taskUrl: string, next: TaskStatus) => {
    setProgress((prev) => {
      const updated = { ...prev, [taskUrl]: next };
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleDismissLegend = useCallback(() => {
    setShowLegend(false);
    localStorage.setItem(STORAGE_KEY_LEGEND, 'true');
  }, []);

  const handleShowLegend = useCallback(() => {
    setShowLegend(true);
    localStorage.removeItem(STORAGE_KEY_LEGEND);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_PROGRESS);
    localStorage.removeItem(STORAGE_KEY_LEGEND);
    router.replace('/');
  };

  const getTaskStatus = useCallback(
    (task: Task): TaskStatus => progress[task.url] ?? task.status ?? 'To do',
    [progress]
  );

  const visibleTasks = tasks.filter((task) => {
    if (!user) return false;
    const teamMatch =
      task.team.includes('ALL' as TeamValue) ||
      task.team.includes(user.equipe as TeamValue);
    return teamMatch && task.timeline === activeTimeline;
  });

  const availableTimelines = ALL_TIMELINES.filter((tl) => {
    if (tl === 'Mois 2' && user?.equipe !== 'Tech') return false;
    return true;
  });

  const userTasks = tasks.filter((task) => {
    if (!user) return false;
    return (
      task.team.includes('ALL' as TeamValue) ||
      task.team.includes(user.equipe as TeamValue)
    );
  });

  const doneTasks  = userTasks.filter((t) => getTaskStatus(t) === 'Done').length;
  const totalTasks = userTasks.length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const teamStyle = user ? TEAM_COLORS[user.equipe] ?? { bg: '#F1F5F9', text: '#475569' } : null;

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-10 h-10" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--primary)' }}>
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Chargement de ton parcours…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
        <div className="text-center max-w-sm space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Oups, quelque chose s&apos;est mal passé
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/graneet-logo.png" alt="Graneet" className="flex-shrink-0" style={{ height: '28px', width: 'auto' }} />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                Bonjour {user?.prenom}&nbsp;👋
              </h1>
              {user?.poste && (
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {user.poste}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {user && teamStyle && (
              <span
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: teamStyle.bg, color: teamStyle.text }}
              >
                {user.equipe}
              </span>
            )}
            {/* Bouton pour ré-afficher la légende */}
            {!showLegend && (
              <button
                onClick={handleShowLegend}
                className="btn-ghost text-xs"
                title="Afficher le guide"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 7.5v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Guide</span>
              </button>
            )}
            <button onClick={handleLogout} className="btn-ghost text-xs" title="Se déconnecter">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Progression globale
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
              {doneTasks}/{totalTasks} tâches — {progressPct}&nbsp;%
            </span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </header>

      {/* ── Timeline tabs ── */}
      <div
        className="sticky top-[108px] z-20 border-b"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1.5 py-3 overflow-x-auto scrollbar-hide">
            {availableTimelines.map((tl) => {
              const isActive  = activeTimeline === tl;
              const taskCount = tasks.filter((t) => {
                if (!user) return false;
                const teamMatch =
                  t.team.includes('ALL' as TeamValue) ||
                  t.team.includes(user.equipe as TeamValue);
                return teamMatch && t.timeline === tl;
              }).length;

              return (
                <button
                  key={tl}
                  onClick={() => setActiveTimeline(tl)}
                  className={`timeline-tab flex items-center gap-1.5 ${isActive ? 'timeline-tab-active' : 'timeline-tab-inactive'}`}
                >
                  {TIMELINE_LABELS[tl]}
                  {taskCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                      style={
                        isActive
                          ? { background: 'rgba(255,255,255,0.25)', color: 'white' }
                          : { background: 'var(--border)', color: 'var(--text-secondary)' }
                      }
                    >
                      {taskCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Task list ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Legend panel (dismissible) */}
        {showLegend && <LegendPanel onDismiss={handleDismissLegend} />}

        {/* Section header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {TIMELINE_LABELS[activeTimeline]}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {TIMELINE_DESCRIPTIONS[activeTimeline]}
            </p>
          </div>
          {visibleTasks.length > 0 && (
            <div className="text-right flex-shrink-0">
              <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                {visibleTasks.filter((t) => getTaskStatus(t) === 'Done').length} /{' '}
                {visibleTasks.length} terminée{visibleTasks.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {visibleTasks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Rien à faire ici !
            </h3>
            <p className="text-sm text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Aucune tâche n&apos;est prévue pour ton équipe durant cette période.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleTasks.map((task) => (
              <div key={task.id} className="animate-fade-in">
                <TaskCard
                  task={task}
                  status={getTaskStatus(task)}
                  onStatusChange={handleStatusChange}
                />
              </div>
            ))}
          </div>
        )}

        <div className="h-16" />
      </main>
    </div>
  );
}
