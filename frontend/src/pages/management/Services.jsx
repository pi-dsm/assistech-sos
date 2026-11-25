import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, LayoutGrid, List, Pencil, Plus, Trash2 } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import usePref from '../../hooks/usePref';
import { brl, dt } from '../../utils/format';
import { marginPct } from '../../utils/catalog';
import { btnGhost, btnPrimary, btnSm, ConfirmModal, EmptyState, Field, Info, inputCls, Modal, PageHeader, SearchInput, Segmented, Spinner, Toolbar } from '../../components/ui';
import VoiceFill from '../../components/VoiceFill';
import { serviceVoice } from '../../utils/voiceSchemas';

const VIEWS = [
  { key: 'cards', label: 'Cards', icon: LayoutGrid },
  { key: 'table', label: 'Tabela', icon: List },
];
const SORTS = [
  ['name', 'Nome (A–Z)'],
  ['price', 'Maior preço'],
  ['margin', 'Maior margem'],
];
const blank = { name: '', description: '', price: '', cost_price: '' };
const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Services() {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can('catalog.edit');
  const canDelete = can('catalog.delete');
  const [view, setView] = usePref('services_view', 'cards');
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setAll((await api.get('/services')).data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const term = norm(q.trim());
    const list = all.filter((s) => !term || norm(s.name).includes(term) || norm(s.description).includes(term));
    const by = {
      name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      price: (a, b) => b.price - a.price,
      margin: (a, b) => marginPct(b.cost_price, b.price) - marginPct(a.cost_price, a.price),
    }[sort];
    return list.sort(by);
  }, [all, q, sort]);

  const save = async (e) => {
    e.preventDefault();
    const body = { name: form.name, description: form.description, price: Number(form.price), cost_price: Number(form.cost_price) || 0 };
    setSaving(true);
    try {
      if (form.id) await api.put(`/services/${form.id}`, body);
      else await api.post('/services', body);
      toast.success('Serviço salvo');
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/services/${removing.id}`);
      toast.success('Serviço desativado');
      setRemoving(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const edit = (s) => {
    setDetails(null);
    setForm({ ...s, description: s.description || '' });
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <PageHeader title="Serviços" subtitle="Serviços disponíveis no balcão (xerox, impressão, formatação…), vendidos no PDV.">
        <Segmented options={VIEWS} value={view} onChange={setView} label="Visualização" />
        {canEdit && <button className={btnPrimary} onClick={() => setForm({ ...blank })}><Plus size={18} /> Adicionar serviço</button>}
      </PageHeader>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Nome ou descrição do serviço…" />
        <select className={`${inputCls} w-auto`} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenação">
          {SORTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Toolbar>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState>{all.length ? 'Nenhum serviço encontrado.' : 'Nenhum serviço cadastrado.'}</EmptyState>
      ) : view === 'cards' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <article key={s.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-pop">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{s.name}</p>
                  {s.description && <p className="line-clamp-2 text-sm text-slate-500">{s.description}</p>}
                </div>
                <p className="whitespace-nowrap text-lg font-extrabold text-blue-700">{brl(s.price)}</p>
              </div>
              <p className="mb-3 mt-2 text-xs text-slate-500">Custo de insumo {brl(s.cost_price)} · margem {marginPct(s.cost_price, s.price).toLocaleString('pt-BR')}%</p>
              <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3">
                <button className={`${btnGhost} ${btnSm} flex-1`} onClick={() => setDetails(s)}><Eye size={14} /> Detalhes</button>
                {canEdit && <button className={`${btnGhost} ${btnSm} flex-1`} onClick={() => edit(s)}><Pencil size={14} /> Editar</button>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{['Serviço', 'Descrição', 'Custo de insumo', 'Preço', 'Margem', ''].map((h, i) => <th key={i} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-blue-50/30">
                  <td className="px-3 py-2.5 font-semibold">{s.name}</td>
                  <td className="max-w-72 truncate px-3 py-2.5 text-slate-500">{s.description || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{brl(s.cost_price)}</td>
                  <td className="px-3 py-2.5 font-semibold">{brl(s.price)}</td>
                  <td className="px-3 py-2.5">{marginPct(s.cost_price, s.price).toLocaleString('pt-BR')}%</td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button className={`${btnGhost} ${btnSm}`} onClick={() => setDetails(s)}><Eye size={14} /> Detalhes</button>
                      {canEdit && <button className={`${btnGhost} ${btnSm}`} onClick={() => edit(s)}><Pencil size={14} /> Editar</button>}
                      {canDelete && <button className={`${btnGhost} ${btnSm} text-red-600`} onClick={() => setRemoving(s)} aria-label="Desativar" title="Desativar"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {details && (
        <Modal title={details.name} onClose={() => setDetails(null)} size="sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Info label="Descrição" value={details.description} /></div>
            <Info label="Preço" value={brl(details.price)} />
            <Info label="Custo de insumo" value={brl(details.cost_price)} />
            <Info label="Lucro por unidade" value={brl(details.price - (details.cost_price || 0))} />
            <Info label="Margem" value={`${marginPct(details.cost_price, details.price).toLocaleString('pt-BR')}%`} />
            <Info label="Situação" value={details.is_active === false ? 'Inativo' : 'Ativo'} />
            <Info label="Atualizado em" value={dt(details.updated_at)} />
          </div>
          {canEdit && (
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
              {canDelete && <button className={`${btnGhost} text-red-600`} onClick={() => { setRemoving(details); setDetails(null); }}><Trash2 size={16} /> Desativar</button>}
              <button className={btnPrimary} onClick={() => edit(details)}><Pencil size={16} /> Editar</button>
            </div>
          )}
        </Modal>
      )}

      {form && (
        <Modal title={form.id ? 'Editar serviço' : 'Adicionar serviço'} onClose={() => setForm(null)} size="sm">
          <form onSubmit={save} className="space-y-3">
            <VoiceFill schema={serviceVoice.schema} example={serviceVoice.example} onFill={(v) => setForm((s) => ({ ...s, ...v }))} />
            <Field label="Nome *"><input className={inputCls} required autoFocus value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></Field>
            <Field label="Descrição"><input className={inputCls} value={form.description || ''} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (R$) *"><input className={inputCls} type="number" min="0" step="0.01" required value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} /></Field>
              <Field label="Custo de insumo (R$)"><input className={inputCls} type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm((s) => ({ ...s, cost_price: e.target.value }))} /></Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancelar</button>
              <button className={btnPrimary} disabled={saving}>{saving ? 'Salvando…' : 'Salvar serviço'}</button>
            </div>
          </form>
        </Modal>
      )}

      {removing && (
        <ConfirmModal title="Desativar serviço" message={`Desativar "${removing.name}"? Ele deixa de aparecer no PDV.`} confirmLabel="Desativar" danger onConfirm={remove} onClose={() => setRemoving(null)} />
      )}
    </div>
  );
}
