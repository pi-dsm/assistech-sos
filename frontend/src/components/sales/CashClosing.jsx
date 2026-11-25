import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Save } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { brl, dt, METHODS, round2 } from '../../utils/format';
import { dayKey } from '../../utils/sales';
import { btnGhost, btnPrimary, btnSm, Field, inputCls, Spinner } from '../ui';

const diffCls = (d) => (d === null ? 'text-slate-300' : d < 0 ? 'text-red-600' : d > 0 ? 'text-blue-700' : 'text-emerald-700');
const diffText = (d) => (d === null ? '—' : d === 0 ? 'OK' : `${d > 0 ? '+' : '−'} ${brl(Math.abs(d))}`);

// Fechamento de caixa: o servidor calcula o esperado (pagamentos recebidos no dia, vendas + OSs);
// aqui a pessoa informa o que contou na gaveta e nas maquininhas.
export default function CashClosing() {
  const toast = useToast();
  const [day, setDay] = useState(dayKey(new Date()));
  const [float, setFloat] = useState('');
  const [preview, setPreview] = useState(null);
  const [counted, setCounted] = useState({});
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadHistory = () => api.get('/cash-closings', { params: { limit: 10 } }).then((r) => setHistory(r.data)).catch(() => {});

  const load = useCallback(async () => {
    setPreview(null);
    try {
      const { data } = await api.get('/cash-closings/preview', { params: { day, opening_float: Number(float) || 0 } });
      setPreview(data);
      if (data.closing) {
        setCounted(Object.fromEntries(data.closing.rows.map((r) => [r.method, r.counted])));
        setNotes(data.closing.notes || '');
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [day, float]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    setCounted({});
    setNotes('');
  }, [day]);
  useEffect(() => {
    loadHistory();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/cash-closings', { day, opening_float: Number(float) || 0, counted, notes });
      toast.success(data.difference === 0 ? 'Caixa fechado sem diferenças' : `Caixa fechado com ${data.difference < 0 ? 'quebra' : 'sobra'} de ${brl(Math.abs(data.difference))}`);
      load();
      loadHistory();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const rows = (preview?.methods || []).map((m) => {
    const has = counted[m.method] !== undefined && counted[m.method] !== '';
    return { ...m, has, diff: has ? round2(Number(counted[m.method]) - m.expected) : null };
  });
  const totalExpected = round2(rows.reduce((s, r) => s + r.expected, 0));
  const totalDiff = round2(rows.reduce((s, r) => s + (r.diff || 0), 0));
  const complete = rows.length > 0 && rows.every((r) => r.has);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Dia"><input type="date" className={`${inputCls} w-auto`} value={day} max={dayKey(new Date())} onChange={(e) => e.target.value && setDay(e.target.value)} /></Field>
        <Field label="Fundo de troco (R$)"><input type="number" min="0" step="0.01" className={`${inputCls} w-36`} value={float} onChange={(e) => setFloat(e.target.value)} /></Field>
        <button className={`${btnGhost} ${btnSm} mb-0.5`} onClick={load}><RefreshCw size={14} /> Recalcular</button>
        {preview?.closing && (
          <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={16} /> Fechado {dt(preview.closing.updated_at)}{preview.closing.closed_by?.name ? ` por ${preview.closing.closed_by.name}` : ''}
          </p>
        )}
      </div>

      {!preview ? (
        <Spinner />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[660px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-3 py-2">Forma</th><th className="px-3 text-right">Vendas</th><th className="px-3 text-right">OSs</th><th className="px-3 text-right">Esperado</th><th className="px-3">Contado</th><th className="px-3 text-right">Diferença</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.method}>
                    <td className="px-3 py-2 font-semibold">
                      {METHODS[r.method] || r.method}
                      {r.method === 'cash' && Number(float) > 0 && <span className="block text-[11px] font-normal text-slate-400">inclui fundo de {brl(float)}</span>}
                    </td>
                    <td className="px-3 text-right text-slate-600">{brl(r.sales)}</td>
                    <td className="px-3 text-right text-slate-600">{brl(r.orders)}</td>
                    <td className="px-3 text-right font-bold">{brl(r.expected)}</td>
                    <td className="px-3 py-1.5">
                      <input type="number" step="0.01" className={`${inputCls} w-32`} value={counted[r.method] ?? ''} onChange={(e) => setCounted((c) => ({ ...c, [r.method]: e.target.value }))} aria-label={`Valor contado em ${METHODS[r.method]}`} />
                    </td>
                    <td className={`px-3 text-right font-bold ${diffCls(r.diff)}`}>{diffText(r.diff)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold">
                <tr>
                  <td className="px-3 py-2" colSpan={3}>Total</td>
                  <td className="px-3 text-right">{brl(totalExpected)}</td>
                  <td />
                  <td className={`px-3 text-right ${diffCls(complete ? totalDiff : null)}`}>{complete ? (totalDiff === 0 ? 'Sem diferença' : `${totalDiff > 0 ? 'Sobra' : 'Quebra'} ${brl(Math.abs(totalDiff))}`) : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Field label="Observações (opcional)">
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: troco dado a mais em uma venda em dinheiro" />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Quebra = faltou dinheiro em relação ao sistema; sobra = entrou mais do que o registrado.</p>
            <button className={btnPrimary} disabled={!complete || saving} onClick={save} title={complete ? '' : 'Informe o valor contado em todas as formas'}>
              <Save size={16} /> {preview.closing ? 'Refazer fechamento' : 'Fechar caixa do dia'}
            </button>
          </div>
        </>
      )}

      {history.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Últimos fechamentos</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {history.map((h) => (
              <li key={h.day} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <button type="button" className="text-left hover:underline" onClick={() => setDay(h.day)}>
                  <b>{new Date(`${h.day}T12:00:00`).toLocaleDateString('pt-BR')}</b>
                  <span className="text-xs text-slate-500"> · {h.closed_by?.name || '—'}</span>
                </button>
                <span>
                  Esperado {brl(h.expected_total)} ·{' '}
                  <b className={diffCls(h.difference)}>{h.difference === 0 ? 'sem diferença' : `${h.difference < 0 ? 'quebra' : 'sobra'} ${brl(Math.abs(h.difference))}`}</b>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
