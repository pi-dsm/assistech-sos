import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { Card, PageHeader } from '../../components/ui';
import Holidays from './Holidays';

const THEMES = [
  { key: 'light', label: 'Claro', icon: Sun, ready: true },
  { key: 'dark', label: 'Escuro', icon: Moon, ready: false },
  { key: 'system', label: 'Automático', icon: Monitor, ready: false },
];

export default function Settings() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Configurações" subtitle="Aparência do sistema e calendário de feriados usado nos prazos das OSs." />

      <Card title={<span className="flex items-center gap-2"><Palette size={16} /> Tema</span>} right={<span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Em breve</span>}>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Tema">
          {THEMES.map(({ key, label, icon: Icon, ready }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={key === 'light'}
              disabled={!ready}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed ${
                key === 'light' ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' : 'border-slate-200 opacity-60'
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-lg ${key === 'light' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={20} /></span>
              <span>
                <b className="block text-sm text-ink-900">{label}</b>
                <span className="text-xs text-slate-500">{ready ? 'Em uso' : 'Ainda não disponível'}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Por enquanto o sistema usa apenas o tema claro.</p>
      </Card>

      <Holidays />
    </div>
  );
}
