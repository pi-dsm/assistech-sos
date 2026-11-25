import { Monitor, Moon, Palette, Sun } from '../components/icons';
import { Card, PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const THEMES = [
  { key: 'light', label: 'Claro', icon: Sun },
  { key: 'dark', label: 'Escuro', icon: Moon },
  { key: 'system', label: 'Automático', icon: Monitor, hint: 'Segue o tema do computador' },
];

// Configurações gerais: valem para qualquer usuário e ficam salvas no perfil de cada um
export default function Preferences() {
  const { user, updatePreferences } = useAuth();
  const current = user?.preferences?.theme || 'system';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Configurações gerais" subtitle="Preferências do seu usuário. Cada pessoa escolhe as suas." />
      <Card title={<span className="flex items-center gap-2"><Palette size={16} /> Tema</span>}>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Tema">
          {THEMES.map(({ key, label, icon: Icon, hint }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={key === current}
              onClick={() => updatePreferences({ theme: key })}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                key === current ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${key === current ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={20} /></span>
              <span>
                <b className="block text-sm text-slate-900">{label}</b>
                <span className="text-xs text-slate-500">{key === current ? 'Em uso' : hint || 'Clique para usar'}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
