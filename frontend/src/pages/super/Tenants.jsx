import { useEffect, useState } from 'react';
import { Building, ExternalLink, Pencil, Plus, Power } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { brl, dateOnly } from '../../utils/format';
import { btnGhost, btnPrimary, btnSm, Card, Field, inputCls, Modal, PageHeader, Pill, Spinner } from '../../components/ui';

const blank = { name: '', slug: '', plan: 'pro', phone: '', admin: { name: '', email: '', password: '' } };
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);

function TenantModal({ tenant, plans, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !tenant._id && !tenant.id;
  const [form, setForm] = useState(tenant);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'name' && isNew ? { slug: slugify(e.target.value) } : {}) }));
  const setAdmin = (k) => (e) => setForm((f) => ({ ...f, admin: { ...f.admin, [k]: e.target.value } }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isNew) await api.post('/super/tenants', form);
      else await api.put(`/super/tenants/${form._id || form.id}`, { name: form.name, plan: form.plan, phone: form.phone });
      toast.success(isNew ? 'Assinante criado' : 'Assinante atualizado');
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isNew ? 'Novo assinante' : `Editar ${tenant.name}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da assistência *"><input className={inputCls} value={form.name} onChange={set('name')} required /></Field>
          <Field label="Endereço da vitrine" hint={`/loja/${form.slug || '...'}`}><input className={inputCls} value={form.slug} onChange={set('slug')} disabled={!isNew} required /></Field>
          <Field label="Plano">
            <select className={inputCls} value={form.plan} onChange={set('plan')}>
              {Object.entries(plans).map(([k, p]) => <option key={k} value={k}>{p.label} — {brl(p.price)}/mês, até {p.max_users} usuários</option>)}
            </select>
          </Field>
          <Field label="Telefone"><input className={inputCls} value={form.phone || ''} onChange={set('phone')} /></Field>
        </div>
        {isNew && (
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="mb-3 text-sm font-semibold text-slate-900">Admin da assistência (primeiro acesso)</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nome *"><input className={inputCls} value={form.admin.name} onChange={setAdmin('name')} required /></Field>
              <Field label="E-mail *"><input type="email" className={inputCls} value={form.admin.email} onChange={setAdmin('email')} required /></Field>
              <Field label="Senha *"><input type="password" minLength={6} className={inputCls} value={form.admin.password} onChange={setAdmin('password')} required /></Field>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary} disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}

// Portal do superadmin: assinantes da plataforma
export default function Tenants() {
  const toast = useToast();
  const [tenants, setTenants] = useState(null);
  const [plans, setPlans] = useState({});
  const [editing, setEditing] = useState(null);

  const load = () =>
    Promise.all([api.get('/super/tenants'), api.get('/super/plans')])
      .then(([t, p]) => {
        setTenants(t.data);
        setPlans(p.data);
      })
      .catch((e) => toast.error(errMsg(e)));
  useEffect(() => {
    load();
  }, []);

  const toggle = async (t) => {
    if (t.is_active && !window.confirm(`Desativar ${t.name}? Os usuários dessa assistência perdem o acesso.`)) return;
    try {
      await api.put(`/super/tenants/${t._id || t.id}`, { is_active: !t.is_active });
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (!tenants) return <Spinner />;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Assinantes" subtitle="Assistências que usam o AssisTech SOS.">
        <button className={btnPrimary} onClick={() => setEditing(blank)}><Plus size={16} /> Novo assinante</button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tenants.map((t) => (
          <Card key={t._id || t.id} className={t.is_active ? '' : 'opacity-60'}>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><Building size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-500">/loja/{t.slug} · desde {dateOnly(t.created_at)}</p>
              </div>
              <Pill cls={t.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'}>{t.is_active ? 'Ativo' : 'Inativo'}</Pill>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Plano <b>{plans[t.plan]?.label}</b> · {brl(plans[t.plan]?.price)}/mês
            </p>
            <p className="text-xs text-slate-500">{t.usage.users} usuários · {t.usage.orders} OSs · {t.usage.sales} vendas</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={`${btnGhost} ${btnSm}`} onClick={() => setEditing({ ...t, admin: {} })}><Pencil size={14} /> Editar</button>
              <button className={`${btnGhost} ${btnSm}`} onClick={() => toggle(t)}><Power size={14} /> {t.is_active ? 'Desativar' : 'Reativar'}</button>
              <a className={`${btnGhost} ${btnSm}`} href={`/loja/${t.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Vitrine</a>
            </div>
          </Card>
        ))}
      </div>
      {editing && <TenantModal tenant={editing} plans={plans} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
