import { useEffect, useMemo, useState } from 'react';
import { Check, KeyRound, Minus, Pencil, Power, UserPlus } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/format';
import { btnGhost, btnPrimary, Card, Field, inputCls, Modal, Notice, PageHeader, Pill, SearchInput, Spinner } from '../../components/ui';

const empty = { id: null, name: '', email: '', phone: '', role: 'attendant', password: '' };
const ROLE_CLS = {
  owner: 'bg-violet-50 text-violet-800 ring-violet-200',
  admin: 'bg-blue-50 text-blue-800 ring-blue-200',
  technician: 'bg-amber-50 text-amber-800 ring-amber-200',
  attendant: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};
const idOf = (u) => u.id || u._id;
const overridesOf = (u) => Object.fromEntries((u.permission_overrides || []).map((o) => [o.key, o.allowed]));

// Exceções por usuário: padrão do perfil, sempre permitir ou sempre bloquear
function PermissionsModal({ target, catalog, onClose, onSaved }) {
  const toast = useToast();
  const [draft, setDraft] = useState(() => overridesOf(target));
  const [saving, setSaving] = useState(false);
  const isOwnerTarget = target.role === 'owner';

  const save = async () => {
    const payload = Object.fromEntries(catalog.permissions.map((p) => [p.key, draft[p.key] === undefined ? null : draft[p.key]]));
    setSaving(true);
    try {
      await api.put(`/users/${idOf(target)}`, { permission_overrides: payload });
      toast.success('Permissões atualizadas');
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(catalog.permissions.map((p) => p.group))];
  return (
    <Modal title={`Permissões de ${target.name}`} onClose={onClose} size="lg">
      {isOwnerTarget ? (
        <Notice>A dona do sistema sempre tem todas as permissões.</Notice>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            Perfil <b>{ROLES[target.role]}</b>. Use “Padrão” para seguir o perfil, ou force a permissão para este usuário.
          </p>
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{g}</p>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {catalog.permissions.filter((p) => p.group === g).map((p) => {
                    const byRole = p.roles.includes(target.role);
                    const value = draft[p.key];
                    const opt = (v, label) => (
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, [p.key]: v }))}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                          value === v ? (v === true ? 'bg-emerald-600 text-white' : v === false ? 'bg-red-600 text-white' : 'bg-white text-blue-700 shadow-card') : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    );
                    return (
                      <li key={p.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <span className="text-sm text-slate-700">
                          {p.label}
                          <span className="block text-xs text-slate-400">Padrão do perfil: {byRole ? 'permitido' : 'bloqueado'}</span>
                        </span>
                        <span className="flex rounded-lg bg-slate-100 p-1">
                          {opt(undefined, 'Padrão')}
                          {opt(true, 'Permitir')}
                          {opt(false, 'Bloquear')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button className={btnGhost} onClick={onClose}>Cancelar</button>
        {!isOwnerTarget && <button className={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar permissões'}</button>}
      </div>
    </Modal>
  );
}

export default function UsersPermissions() {
  const toast = useToast();
  const { user: me, isOwner } = useAuth();
  const [users, setUsers] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [permsFor, setPermsFor] = useState(null);

  const load = () =>
    Promise.all([api.get('/users'), api.get('/users/permissions')])
      .then(([u, c]) => {
        setUsers(u.data);
        setCatalog(c.data);
      })
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);

  // Só a dona do sistema atribui o perfil de dona do sistema
  const roleOptions = Object.entries(ROLES).filter(([k]) => k !== 'owner' || isOwner);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => (!roleFilter || u.role === roleFilter) && (!term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)));
  }, [users, q, roleFilter]);
  const locked = (u) => u.role === 'owner' && !isOwner;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, role: form.role };
      if (form.password) payload.password = form.password;
      if (form.id) await api.put(`/users/${form.id}`, payload);
      else await api.post('/users', payload);
      toast.success(form.id ? 'Usuário atualizado' : 'Usuário cadastrado');
      setForm(empty);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (u) => {
    try {
      const { data } = await api.patch(`/users/${idOf(u)}/toggle-status`);
      toast.success(data.is_active ? 'Acesso reativado' : 'Acesso desativado');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="Usuários e permissões" subtitle="Quem acessa o sistema, com qual perfil e quais exceções de permissão." />

      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        <Card title="Usuários" right={<span className="text-xs text-slate-500">{users.filter((u) => u.is_active).length} ativo(s)</span>}>
          <div className="mb-3 flex flex-wrap gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Nome ou e-mail…" />
            <select className={`${inputCls} w-auto`} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Perfil">
              <option value="">Todos os perfis</option>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {loading ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-2">Nome</th><th className="px-3">E-mail</th><th className="px-3">Perfil</th><th className="px-3">Situação</th><th /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u) => {
                    const uid = idOf(u);
                    const exceptions = (u.permission_overrides || []).length;
                    return (
                      <tr key={uid} className={u.is_active ? '' : 'bg-slate-50 text-slate-400'}>
                        <td className="px-3 py-2.5 font-semibold">{u.name}<span className="block text-xs font-normal text-slate-400">{u.phone || ''}</span></td>
                        <td className="px-3">{u.email}</td>
                        <td className="px-3">
                          <Pill cls={ROLE_CLS[u.role]}>{ROLES[u.role]}</Pill>
                          {exceptions > 0 && <span className="mt-0.5 block text-[11px] font-semibold text-orange-600">{exceptions} exceção(ões)</span>}
                        </td>
                        <td className="px-3"><Pill cls={u.is_active ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'}>{u.is_active ? 'Ativo' : 'Inativo'}</Pill></td>
                        <td className="whitespace-nowrap py-2 text-right">
                          <button title="Permissões" aria-label={`Permissões de ${u.name}`} disabled={locked(u) || !catalog} onClick={() => setPermsFor(u)} className="mr-1 rounded-lg p-2 text-orange-600 hover:bg-orange-50 disabled:opacity-30"><KeyRound size={16} /></button>
                          <button title="Editar" aria-label={`Editar ${u.name}`} disabled={locked(u)} onClick={() => setForm({ id: uid, name: u.name, email: u.email, phone: u.phone || '', role: u.role, password: '' })} className="mr-1 rounded-lg p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-30"><Pencil size={16} /></button>
                          <button title={u.is_active ? 'Desativar acesso' : 'Reativar acesso'} aria-label={u.is_active ? 'Desativar acesso' : 'Reativar acesso'} disabled={uid === idOf(me || {}) || locked(u)} onClick={() => toggle(u)} className={`mr-1 rounded-lg p-2 disabled:opacity-30 ${u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}><Power size={16} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title={form.id ? 'Editar usuário' : 'Novo usuário'}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Nome *"><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
            <Field label="E-mail *"><input required type="email" className={inputCls} value={form.email} onChange={set('email')} /></Field>
            <Field label="Telefone"><input className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Perfil de acesso">
              <select className={inputCls} value={form.role} onChange={set('role')} disabled={form.id && form.id === idOf(me || {})}>
                {roleOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label={form.id ? 'Nova senha (deixe vazio para manter)' : 'Senha * (mín. 6 caracteres)'}>
              <input type="password" minLength={6} required={!form.id} className={inputCls} value={form.password} onChange={set('password')} autoComplete="new-password" />
            </Field>
            <div className="flex gap-2 pt-1">
              <button disabled={saving} className={btnPrimary}><UserPlus size={16} /> {saving ? 'Salvando…' : form.id ? 'Salvar alterações' : 'Cadastrar'}</button>
              {form.id && <button type="button" className={btnGhost} onClick={() => setForm(empty)}>Cancelar</button>}
            </div>
          </form>
        </Card>
      </div>

      <Card title="Permissões padrão por perfil">
        {!catalog ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2">Permissão</th>
                  {catalog.roles.map((r) => <th key={r} className="px-3 text-center"><Pill cls={ROLE_CLS[r]}>{ROLES[r]}</Pill></th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalog.permissions.map((p) => (
                  <tr key={p.key}>
                    <td className="py-2 text-slate-700">{p.label}<span className="block text-[11px] text-slate-400">{p.group}</span></td>
                    {catalog.roles.map((r) => (
                      <td key={r} className="px-3 text-center">
                        {r === 'owner' || p.roles.includes(r) ? <Check size={18} className="inline text-emerald-600" aria-label="Permitido" /> : <Minus size={18} className="inline text-slate-300" aria-label="Não permitido" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">Use o botão de chave na lista de usuários para liberar ou bloquear permissões de uma pessoa específica.</p>
      </Card>

      {permsFor && catalog && (
        <PermissionsModal
          target={permsFor}
          catalog={catalog}
          onClose={() => setPermsFor(null)}
          onSaved={() => {
            setPermsFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}
