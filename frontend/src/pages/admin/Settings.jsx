import { useEffect, useState } from 'react';
import { ExternalLink, Save, Store } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { btnGhost, btnPrimary, Card, Field, inputCls, PageHeader, Spinner } from '../../components/ui';
import Holidays from './Holidays';

// Configurações da loja (só o admin): dados dos comprovantes, garantia padrão, vitrine e feriados
export default function Settings() {
  const { setTenant } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/tenant').then(({ data }) => setForm({ ...data, showcase: data.showcase || {} })).catch((e) => toast.error(errMsg(e)));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setShow = (k, v) => setForm((f) => ({ ...f, showcase: { ...f.showcase, [k]: v } }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put('/tenant', {
        name: form.name, document: form.document, phone: form.phone, whatsapp: form.whatsapp, address: form.address,
        warranty_days: Number(form.warranty_days) || 0, showcase: form.showcase,
      });
      setTenant(data);
      toast.success('Configurações salvas');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <Spinner />;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Configurações da loja" subtitle="Dados que aparecem nos comprovantes e na vitrine, e o calendário de feriados usado nos prazos." />

      <form onSubmit={save}>
        <Card
          title={<span className="flex items-center gap-2"><Store size={16} /> Dados da assistência</span>}
          right={<span className="text-xs text-slate-500">Plano {form.plan_info?.label} · até {form.plan_info?.max_users} usuários</span>}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da assistência *"><input className={inputCls} value={form.name || ''} onChange={set('name')} required /></Field>
            <Field label="CNPJ/CPF"><input className={inputCls} value={form.document || ''} onChange={set('document')} /></Field>
            <Field label="Telefone"><input className={inputCls} value={form.phone || ''} onChange={set('phone')} /></Field>
            <Field label="WhatsApp" hint="Aparece na vitrine para o cliente chamar"><input className={inputCls} value={form.whatsapp || ''} onChange={set('whatsapp')} /></Field>
            <Field label="Endereço" className="sm:col-span-2"><input className={inputCls} value={form.address || ''} onChange={set('address')} /></Field>
            <Field label="Garantia padrão (dias)" hint="Sugerida na entrega da OS"><input type="number" min="0" className={inputCls} value={form.warranty_days ?? 90} onChange={set('warranty_days')} /></Field>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Vitrine pública</p>
              <a className={btnGhost} href={`/loja/${form.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir /loja/{form.slug}</a>
            </div>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.showcase.enabled !== false} onChange={(e) => setShow('enabled', e.target.checked)} /> Vitrine ativa
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Chamada principal"><input className={inputCls} value={form.showcase.headline || ''} onChange={(e) => setShow('headline', e.target.value)} /></Field>
              <Field label="Sobre a loja"><input className={inputCls} value={form.showcase.about || ''} onChange={(e) => setShow('about', e.target.value)} /></Field>
            </div>
            <p className="mt-2 text-xs text-slate-500">Os produtos aparecem na vitrine quando marcados como "Mostrar na vitrine" na Central de Gestão.</p>
          </div>

          <div className="mt-4 flex justify-end">
            <button className={btnPrimary} disabled={busy}><Save size={16} /> {busy ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </Card>
      </form>

      <Holidays />
    </div>
  );
}
