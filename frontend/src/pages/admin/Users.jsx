import { useEffect, useState } from 'react';
import { KeyRound, Pencil, Power, UserPlus } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/format';
import { btnGhost, btnPrimary, btnSm, Card, Field, inputCls, Modal, PageHeader, Pill, Spinner } from '../../components/ui';

const idOf = (u) => u.id || u._id;

// Cadastro e edição: dados, perfil e as permissões marcadas pelo admin
function UserModal({ target, catalog, onClose, onSaved }) {
  const toast = useToast();
  const { user: me } = useAuth();
  const isNew = !target.id;
  const [form, setForm] = useState({ password: '', ...target, permissions: target.permissions || catalog.filter((p) => p.default).map((p) => p.key) });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (key) => setForm((f) => ({ ...f, permissions: f.permissions.includes(key) ? f.permissions.filter((k) => k !== key) : [...f.permissions, key] }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = { name: form.name, email: form.email, phone: form.phone, role: form.role, permissions: form.permissions, ...(form.password ? { password: form.password } : {}) };
    try {
      if (isNew) await api.post('/users', payload);
      else await api.put(`/users/${form.id}`, payload);
      toast.success(isNew ? 'Usuário criado' : 'Usuário atualizado');
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const groups = [...new Set(catalog.map((p) => p.group))];
  return (
    <Modal title={isNew ? 'Novo usuário' : `Editar ${target.name}`} onClose={onClose} size="lg">
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome *"><input className={inputCls} value={form.name} onChange={set('name')} required /></Field>
          <Field label="E-mail *"><input type="email" className={inputCls} value={form.email} onChange={set('email')} required /></Field>
          <Field label="Telefone"><input className={inputCls} value={form.phone || ''} onChange={set('phone')} /></Field>
          <Field label="Perfil">
            <select className={inputCls} value={form.role} onChange={set('role')} disabled={!isNew && form.id === idOf(me || {})}>
              <option value="user">Usuário (permissões abaixo)</option>
              <option value="admin">Administrador (tudo, inclusive a Central do Administrador)</option>
            </select>
          </Field>
          <Field label={isNew ? 'Senha *' : 'Nova senha'} hint={isNew ? 'Mínimo de 6 caracteres' : 'Deixe em branco para manter'}>
            <input type="password" className={inputCls} value={form.password} onChange={set('password')} required={isNew} minLength={6} />
          </Field>
        </div>

        {form.role === 'user' && (
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><KeyRound size={16} /> O que este usuário pode fazer</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((g) => (
                <div key={g} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{g}</p>
                  {catalog.filter((p) => p.group === g).map((p) => (
                    <label key={p.key} className="flex items-start gap-2 py-1 text-sm">
                      <input type="checkbox" className="mt-0.5" checked={form.permissions.includes(p.key)} onChange={() => toggle(p.key)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">A Central do Administrador é sempre exclusiva do admin.</p>
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

export default function Users() {
  const toast = useToast();
  const { user: me, tenant } = useAuth();
  const [users, setUsers] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () =>
    Promise.all([api.get('/users'), api.get('/users/permissions')])
      .then(([u, p]) => {
        setUsers(u.data);
        setCatalog(p.data);
      })
      .catch((e) => toast.error(errMsg(e)));
  useEffect(() => {
    load();
  }, []);

  const toggleStatus = async (u) => {
    try {
      await api.patch(`/users/${idOf(u)}/toggle-status`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (!users) return <Spinner />;
  const label = (key) => catalog.find((p) => p.key === key)?.label || key;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Usuários e permissões" subtitle={`Plano ${tenant?.plan_info?.label || ''}: até ${tenant?.plan_info?.max_users || '—'} usuários ativos.`}>
        <button className={btnPrimary} onClick={() => setEditing({ name: '', email: '', phone: '', role: 'user' })}><UserPlus size={16} /> Novo usuário</button>
      </PageHeader>

      <Card>
        <ul className="divide-y divide-slate-100">
          {users.map((u) => (
            <li key={idOf(u)} className={`flex flex-wrap items-center gap-3 py-3 ${u.is_active ? '' : 'opacity-50'}`}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{u.name} {idOf(u) === idOf(me || {}) && <span className="text-xs font-normal text-slate-500">(você)</span>}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {u.role === 'admin' ? 'Todas as permissões' : u.permissions.length ? u.permissions.map(label).join(' · ') : 'Nenhuma permissão marcada'}
                </p>
              </div>
              <Pill cls={u.role === 'admin' ? 'bg-blue-50 text-blue-800 ring-blue-200' : undefined}>{ROLES[u.role]}</Pill>
              {!u.is_active && <Pill cls="bg-red-50 text-red-700 ring-red-200">Desativado</Pill>}
              <button className={`${btnGhost} ${btnSm}`} onClick={() => setEditing({ ...u, id: idOf(u) })}><Pencil size={14} /> Editar</button>
              {idOf(u) !== idOf(me || {}) && (
                <button className={`${btnGhost} ${btnSm}`} onClick={() => toggleStatus(u)}><Power size={14} /> {u.is_active ? 'Desativar' : 'Reativar'}</button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {editing && <UserModal target={editing} catalog={catalog} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
