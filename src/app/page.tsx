'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const TEAMS = [
  'Tech',
  'Product Management',
  'Product design',
  'Customer Success',
  'Sales',
  'HR',
  'SDR',
] as const;

type Team = (typeof TEAMS)[number];

interface UserData {
  prenom: string;
  equipe: Team;
  poste?: string;
}

const STORAGE_KEY = 'graneet_user';

export default function HomePage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState('');
  const [equipe, setEquipe] = useState<Team | ''>('');
  const [poste, setPoste] = useState('');
  const [errors, setErrors] = useState<{ prenom?: string; equipe?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const user: UserData = JSON.parse(stored);
        if (user.prenom && user.equipe) {
          router.replace('/onboarding');
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [router]);

  const validate = () => {
    const newErrors: { prenom?: string; equipe?: string } = {};
    if (!prenom.trim()) newErrors.prenom = 'Ton prénom est requis.';
    if (!equipe) newErrors.equipe = 'Veuillez sélectionner ton équipe.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    const userData: UserData = {
      prenom: prenom.trim(),
      equipe: equipe as Team,
      poste: poste.trim() || undefined,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));

    setTimeout(() => {
      router.push('/onboarding');
    }, 400);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--background)' }}>
      {/* Left panel — decorative */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden p-12"
        style={{ background: 'linear-gradient(145deg, #0A1614 0%, #1A2A27 55%, #2D4A45 100%)' }}
      >
        {/* Decorative circles */}
        <div
          className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full opacity-10"
          style={{ background: 'white' }}
        />
        <div
          className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-10"
          style={{ background: 'white' }}
        />
        <div
          className="absolute top-1/3 right-[-40px] w-40 h-40 rounded-full opacity-5"
          style={{ background: 'white' }}
        />

        {/* Logo + brand */}
        <div className="relative z-10 flex flex-col items-center gap-8 text-white text-center max-w-md animate-fade-in">
          <div className="flex items-center">
            {/* Logo blanc pour le panneau sombre */}
            <svg width="160" height="42" viewBox="0 0 180 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="4" y1="30" x2="16" y2="10" stroke="white" strokeWidth="7.5" strokeLinecap="round"/>
              <line x1="15" y1="30" x2="27" y2="10" stroke="white" strokeWidth="7.5" strokeLinecap="round"/>
              <line x1="8" y1="42" x2="20" y2="22" stroke="white" strokeWidth="7.5" strokeLinecap="round"/>
              <line x1="19" y1="42" x2="31" y2="22" stroke="white" strokeWidth="7.5" strokeLinecap="round"/>
              <text x="44" y="34" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontWeight="600" fontSize="26" fill="white" letterSpacing="-0.8">Graneet</text>
            </svg>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold leading-tight text-balance">
              Bienvenue dans<br />l&apos;aventure Graneet&nbsp;🚀
            </h1>
            <p className="text-lg opacity-80 leading-relaxed text-balance">
              Ton parcours d&apos;intégration personnalisé t&apos;attend. Découvre l&apos;entreprise, l&apos;équipe et tes outils — à ton rythme.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="w-full space-y-3 mt-4">
            {[
              { icon: '🗂️', text: 'Parcours adapté à ton équipe' },
              { icon: '✅', text: 'Suivi de progression en temps réel' },
              { icon: '📚', text: 'Ressources et formations intégrées' },
              { icon: '🤝', text: 'Rencontrez vos collègues dès le Jour 1' },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium opacity-90">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center mb-8">
          <svg width="140" height="38" viewBox="0 0 180 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="4" y1="30" x2="16" y2="10" stroke="#1A2A27" strokeWidth="7.5" strokeLinecap="round"/>
            <line x1="15" y1="30" x2="27" y2="10" stroke="#1A2A27" strokeWidth="7.5" strokeLinecap="round"/>
            <line x1="8" y1="42" x2="20" y2="22" stroke="#1A2A27" strokeWidth="7.5" strokeLinecap="round"/>
            <line x1="19" y1="42" x2="31" y2="22" stroke="#1A2A27" strokeWidth="7.5" strokeLinecap="round"/>
            <text x="44" y="34" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontWeight="600" fontSize="26" fill="#1A2A27" letterSpacing="-0.8">Graneet</text>
          </svg>
        </div>

        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>
              Commençons&nbsp;! 🎉
            </h2>
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>
              Quelques infos pour personnaliser ton parcours d&apos;intégration.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Prénom */}
            <div>
              <label htmlFor="prenom" className="label">
                Prénom <span style={{ color: '#E53E3E' }}>*</span>
              </label>
              <input
                id="prenom"
                type="text"
                value={prenom}
                onChange={(e) => {
                  setPrenom(e.target.value);
                  if (errors.prenom) setErrors((prev) => ({ ...prev, prenom: undefined }));
                }}
                placeholder="Ex : Marie"
                className="input-field"
                autoComplete="given-name"
                autoFocus
              />
              {errors.prenom && (
                <p className="mt-1.5 text-sm font-medium" style={{ color: '#E53E3E' }}>
                  {errors.prenom}
                </p>
              )}
            </div>

            {/* Équipe */}
            <div>
              <label htmlFor="equipe" className="label">
                Équipe <span style={{ color: '#E53E3E' }}>*</span>
              </label>
              <div className="relative">
                <select
                  id="equipe"
                  value={equipe}
                  onChange={(e) => {
                    setEquipe(e.target.value as Team | '');
                    if (errors.equipe) setErrors((prev) => ({ ...prev, equipe: undefined }));
                  }}
                  className="input-field appearance-none pr-10"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Sélectionne ton équipe…</option>
                  {TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="#718096" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              {errors.equipe && (
                <p className="mt-1.5 text-sm font-medium" style={{ color: '#E53E3E' }}>
                  {errors.equipe}
                </p>
              )}
            </div>

            {/* Poste (optionnel) */}
            <div>
              <label htmlFor="poste" className="label">
                Poste{' '}
                <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                  (optionnel)
                </span>
              </label>
              <input
                id="poste"
                type="text"
                value={poste}
                onChange={(e) => setPoste(e.target.value)}
                placeholder="Ex : Développeur Full Stack"
                className="input-field"
                autoComplete="organization-title"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full text-base mt-2"
              style={isLoading ? { opacity: 0.7, cursor: 'not-allowed', transform: 'none', boxShadow: 'none' } : {}}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Chargement…
                </>
              ) : (
                <>
                  Démarrer mon parcours
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4.167 10h11.666M10.833 5l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="mt-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            Tes données sont stockées uniquement dans ton navigateur.{' '}
            <span className="font-medium">Aucune donnée n&apos;est transmise à nos serveurs.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
