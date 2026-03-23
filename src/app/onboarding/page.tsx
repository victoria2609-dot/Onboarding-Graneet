'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, NormalizedTimeline, TeamValue, TaskStatus } from '../api/tasks/route';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY_USER = 'graneet_user';
const STORAGE_KEY_PROGRESS = 'graneet_progress';

const ALL_TIMELINES: NormalizedTimeline[] = [
  'Jour 1',
  'Semaine 1',
  'Semaine 2',
  'Semaine 3',
  'Semaine 4+',
  'Mois 2',
];

const TIMELINE_LABELS: Record<NormalizedTimeline, string> = {
  'Jour 1': 'Jour 1',
  'Semaine 1': 'Semaine 1',
  'Semaine 2': 'Semaine 2',
  'Semaine 3': 'Semaine 3',
  'Semaine 4+': 'Semaine 4+',
  'Mois 2': 'Mois 2',
  'Post-attribution': 'Post',
};

const STATUS_CYCLE: TaskStatus[] = ['To do', 'In Progress', 'Done'];

const TEAM_COLORS: Record<string, { bg: string; text: string }> = {
  Tech: { bg: '#EBF4FF', text: '#2B6CB0' },
  'Product Management': { bg: '#FAF5FF', text: '#6B21A8' },
  'Product design': { bg: '#FDF2F8', text: '#9D174D' },
  'Customer Success': { bg: '#F0FDF4', text: '#15803D' },
  Sales: { bg: '#FFF7ED', text: '#C2410C' },
  HR: { bg: '#FEFCE8', text: '#A16207' },
  SDR: { bg: '#F0F9FF', text: '#0369A1' },
};

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
  else if (type.includes('Set-up')) cls = 'badge-setup';
  else if (type.includes('Task')) cls = 'badge-task';

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
    'To do': { bg: 'var(--status-todo-bg)', text: 'var(--status-todo-text)', label: 'À faire' },
    'In Progress': { bg: 'var(--status-inprogress-bg)', text: 'var(--status-inprogress-text)', label: 'En cours' },
    Done: { bg: 'var(--status-done-bg)', text: 'var(--status-done-text)', label: 'Terminé ✓' },
    'Bac rouge': { bg: '#FFF5F5', text: '#C53030', label: 'Bac rouge' },
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
        <span className="w-2 h-2 rounded-full inline-block animate-pulse-slow" style={{ background: 'var(--status-inprogress-text)' }} />
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
      {/* Left: info */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={task.type} />
          {task.board === 'tech' && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: '#EBF4FF', color: '#2B6CB0', border: '1px solid #C3DAFE' }}
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
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Ouvrir dans Notion
            </a>
          )}
        </div>
      </div>

      {/* Right: status toggle */}
      <div className="flex-shrink-0">
        <StatusButton status={status} onClick={handleToggle} />
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [activeTimeline, setActiveTimeline] = useState<NormalizedTimeline>('Jour 1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Initialise from localStorage
  useEffect(() => {
    setMounted(true);

    const storedUser = localStorage.getItem(STORAGE_KEY_USER);
    if (!storedUser) {
      router.replace('/');
      return;
    }

    let parsedUser: UserData;
    try {
      parsedUser = JSON.parse(storedUser);
    } catch {
      router.replace('/');
      return;
    }

    if (!parsedUser.prenom || !parsedUser.equipe) {
      router.replace('/');
      return;
    }

    setUser(parsedUser);

    const storedProgress = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (storedProgress) {
      try {
        setProgress(JSON.parse(storedProgress));
      } catch {
        /* ignore */
      }
    }

    // Fetch tasks
    fetch(`/api/tasks?team=${encodeURIComponent(parsedUser.equipe)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur réseau');
        return res.json();
      })
      .then((data: { tasks: Task[] }) => {
        setTasks(data.tasks);
        setLoading(false);
      })
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

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_PROGRESS);
    router.replace('/');
  };

  // Filter tasks for the current user and timeline
  const getTaskStatus = useCallback(
    (task: Task): TaskStatus => {
      return progress[task.url] ?? task.status ?? 'To do';
    },
    [progress]
  );

  const visibleTasks = tasks.filter((task) => {
    if (!user) return false;

    // Team filter
    const teamMatch =
      task.team.includes('ALL' as TeamValue) ||
      task.team.includes(user.equipe as TeamValue);
    if (!teamMatch) return false;

    // Timeline filter
    return task.timeline === activeTimeline;
  });

  // Available timelines for the current user
  const availableTimelines = ALL_TIMELINES.filter((tl) => {
    if (tl === 'Mois 2' && user?.equipe !== 'Tech') return false;
    return true;
  });

  // Progress computation (tasks visible to this user, across all timelines)
  const userTasks = tasks.filter((task) => {
    if (!user) return false;
    return (
      task.team.includes('ALL' as TeamValue) ||
      task.team.includes(user.equipe as TeamValue)
    );
  });

  const doneTasks = userTasks.filter((t) => getTaskStatus(t) === 'Done').length;
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
            Chargement de votre parcours…
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
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary text-sm"
          >
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
          {/* Logo + greeting */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ background: 'var(--primary)' }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <text x="4" y="17" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="14" fill="white">G</text>
              </svg>
            </div>
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

          {/* Right: badge + logout */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {user && teamStyle && (
              <span
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: teamStyle.bg, color: teamStyle.text }}
              >
                {user.equipe}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="btn-ghost text-xs"
              title="Se déconnecter"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
              const isActive = activeTimeline === tl;
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
        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {TIMELINE_LABELS[activeTimeline]}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {visibleTasks.length === 0
                ? 'Aucune tâche pour cette période'
                : `${visibleTasks.length} tâche${visibleTasks.length > 1 ? 's' : ''}`}
            </p>
          </div>
          {visibleTasks.length > 0 && (
            <div className="text-right">
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
              Aucune tâche n&apos;est prévue pour votre équipe durant cette période.
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

        {/* Bottom padding */}
        <div className="h-16" />
      </main>
    </div>
  );
}
