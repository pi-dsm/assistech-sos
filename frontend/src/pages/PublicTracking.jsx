import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, Clock, ClipboardCheck, Package, PackageCheck, Search, Stethoscope, Wrench, XCircle } from '../components/icons';
import api, { errMsg } from '../services/api';
import { brl } from '../utils/format';
import { btnPrimary, inputCls, Spinner } from '../components/ui';

const STEPS = [
  { key: 'received', label: 'Aguardando análise', icon: ClipboardCheck },
  { key: 'in_diagnosis', label: 'Orçamento pendente', icon: Stethoscope },
  { key: 'in_repair', label: 'Em reparo', icon: Wrench },
  { key: 'awaiting_part', label: 'Aguardando peça', icon: Clock },
  { key: 'ready', label: 'Concluído: pronto para retirada', icon: PackageCheck },
  { key: 'delivered', label: 'Entregue', icon: Package },
];
const d = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : null);

// Consulta pública da OS (sem login): /loja/:slug/os/:number
export default function PublicTracking() {
  const { slug, number: param } = useParams();
  const navigate = useNavigate();
  const [number, setNumber] = useState(param || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (n) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get(`/public/stores/${slug}/service-orders/${n}`);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (param) load(param);
  }, [param]);

  const search = (e) => {
    e.preventDefault();
    navigate(`/loja/${slug}/os/${number.trim()}`);
  };

  const approve = async () => {
    if (!window.confirm(`Aprovar o orçamento de ${brl(result.budget.total)}?`)) return;
    try {
      const { data } = await api.post(`/public/stores/${slug}/service-orders/${result.service_order_number}/approve`);
      setResult(data);
    } catch (err) {
      setError(errMsg(err));
    }
  };

  // "Aguardando peça" só aparece no caminho quando a OS passou por ele
  const steps = STEPS.filter((s) => s.key !== 'awaiting_part' || result?.status === 'awaiting_part');
  const current = result ? steps.findIndex((s) => s.key === result.status) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-950 to-blue-800 p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600"><Search size={28} /></div>
          <h1 className="text-2xl font-extrabold text-white">Acompanhe seu aparelho</h1>
          <p className="text-sm text-white/70">{result?.store?.name || 'Digite o número da sua Ordem de Serviço'}</p>
        </div>

        <form onSubmit={search} className="mb-5 flex gap-2 rounded-2xl bg-white p-3 shadow-xl">
          <input inputMode="numeric" required className={inputCls} placeholder="Número da OS, ex.: 1001" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} />
          <button className={btnPrimary} disabled={loading}>Consultar</button>
        </form>

        {loading && <div className="rounded-2xl bg-white p-4"><Spinner /></div>}
        {error && <p className="rounded-2xl bg-white p-5 text-center font-medium text-red-600 shadow-xl">{error}</p>}

        {result && !loading && (
          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-xs font-medium uppercase text-slate-500">Ordem de Serviço</p>
              <p className="text-2xl font-extrabold text-blue-700">#{result.service_order_number}</p>
              <p className="text-sm text-slate-600">{result.device} · {result.reported_issue}</p>
              <p className="text-xs text-slate-500">Recebido em {d(result.received_at)}{result.estimated_delivery_at && ` · Previsão: ${d(result.estimated_delivery_at)}`}</p>
            </div>

            {(result.can_approve || result.budget_approved_at) && result.budget.total > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="mb-2 font-semibold text-slate-900">Orçamento</p>
                <ul className="mb-2 space-y-1 text-sm text-slate-600">
                  {result.budget.parts.map((p, i) => <li key={i} className="flex justify-between"><span>{p.quantity}x {p.name}</span><span>{brl(p.price * p.quantity)}</span></li>)}
                  {result.budget.labor > 0 && <li className="flex justify-between"><span>Mão de obra</span><span>{brl(result.budget.labor)}</span></li>}
                </ul>
                <p className="flex justify-between border-t border-blue-200 pt-2 font-bold text-slate-900"><span>Total</span><span>{brl(result.budget.total)}</span></p>
                {result.can_approve ? (
                  <button className={`${btnPrimary} mt-3 w-full`} onClick={approve}><Check size={16} /> Aprovar orçamento</button>
                ) : (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-700"><CheckCircle2 size={16} /> Aprovado em {d(result.budget_approved_at)}</p>
                )}
              </div>
            )}

            {result.status === 'cancelled' ? (
              <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-700">
                <XCircle /> <span className="font-semibold">Esta ordem de serviço foi cancelada. Entre em contato com a loja.</span>
              </div>
            ) : (
              <ol>
                {steps.map((s, i) => {
                  const Icon = s.icon;
                  const done = i < current;
                  const active = i === current;
                  return (
                    <li key={s.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${done ? 'bg-emerald-500 text-white' : active ? 'animate-pulse bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {done ? <CheckCircle2 size={22} /> : <Icon size={22} />}
                        </div>
                        {i < steps.length - 1 && <div className={`h-8 w-1 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                      </div>
                      <div className="pt-2">
                        <p className={`font-bold ${active ? 'text-blue-700' : done ? 'text-emerald-700' : 'text-slate-400'}`}>{s.label}</p>
                        {active && s.key === 'ready' && result.finished_at && <p className="text-xs text-slate-500">Desde {d(result.finished_at)}</p>}
                        {active && s.key === 'delivered' && result.warranty_until && <p className="text-xs text-slate-500">Garantia até {d(result.warranty_until)}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}

        <Link to={`/loja/${slug}`} className="mt-6 flex items-center justify-center gap-1.5 text-sm text-white/70 hover:underline"><ArrowLeft size={14} /> Voltar para a loja</Link>
      </div>
    </div>
  );
}
