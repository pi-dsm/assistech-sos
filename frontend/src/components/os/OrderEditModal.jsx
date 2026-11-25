import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, PackageCheck, Play, Save, Search, Wrench } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useStatusFlow from '../../hooks/useStatusFlow';
import { brl, CLOSED_STATUSES, dateInputToISO, DEVICE_TYPES, dt, isoToDateInput, METHODS, paymentLabel } from '../../utils/format';
import { btnBlue, btnGhost, btnPrimary, btnSm, Field, inputCls, Modal, Notice, PaymentBadge, Segmented, Spinner, StatusBadge } from '../ui';

const TABS = [
  { key: 'info', label: 'Dispositivo, cliente e OS' },
  { key: 'maintenance', label: 'Manutenção' },
  { key: 'values', label: 'Valores' },
  { key: 'payments', label: 'Pagamentos' },
];
const idOf = (doc) => doc?.id || doc?._id;

function fromOrder(o) {
  return {
    customer: { name: o.customer?.name || '', phone: o.customer?.phone || '', alternative_phone: o.customer?.alternative_phone || '' },
    device: { device_type: o.device?.device_type || 'phone', brand: o.device?.brand || '', model: o.device?.model || '' },
    os: {
      reported_issue: o.reported_issue || '',
      estimated_budget_at: isoToDateInput(o.estimated_budget_at),
      estimated_delivery_at: isoToDateInput(o.estimated_delivery_at),
      internal_notes: o.internal_notes || '',
    },
  };
}
const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

export default function OrderEditModal({ id, onClose, onChanged, initialTab = 'info' }) {
  const toast = useToast();
  const { can } = useAuth();
  const showCosts = can('costs.view');
  const [order, setOrder] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState(null);
  const [pay, setPay] = useState({ amount: '', payment_method: 'pix' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/service-orders/${id}`);
      setOrder(data);
      setForm(fromOrder(data));
      setPay((p) => ({ ...p, amount: data.balance_due > 0 ? data.balance_due : '' }));
    } catch (e) {
      toast.error(errMsg(e));
      onClose();
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load();
    onChanged?.();
  };
  const flow = useStatusFlow(refresh);

  if (!order || !form) {
    return (
      <Modal title="Atualizar OS" onClose={onClose} size="xl">
        <Spinner />
      </Modal>
    );
  }

  const closed = CLOSED_STATUSES.includes(order.status);
  const original = fromOrder(order);
  const set = (section, patch) => setForm((f) => ({ ...f, [section]: { ...f[section], ...patch } }));

  const saveInfo = async (e) => {
    e.preventDefault();
    const jobs = [];
    if (changed(form.customer, original.customer)) jobs.push(api.put(`/customers/${idOf(order.customer)}`, form.customer));
    if (changed(form.device, original.device)) jobs.push(api.put(`/devices/${idOf(order.device)}`, form.device));
    if (changed(form.os, original.os)) {
      jobs.push(
        api.put(`/service-orders/${order.id}`, {
          internal_notes: form.os.internal_notes,
          ...(closed
            ? {}
            : {
                reported_issue: form.os.reported_issue,
                estimated_budget_at: dateInputToISO(form.os.estimated_budget_at),
                estimated_delivery_at: dateInputToISO(form.os.estimated_delivery_at),
              }),
        })
      );
    }
    if (!jobs.length) return toast.success('Nada para salvar');
    setBusy(true);
    try {
      await Promise.all(jobs);
      toast.success('OS atualizada');
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const addPayment = async () => {
    if (!(Number(pay.amount) > 0)) return toast.error('Informe um valor maior que zero');
    setBusy(true);
    try {
      await api.post(`/service-orders/${order.id}/payments`, { amount: Number(pay.amount), payment_method: pay.payment_method });
      toast.success('Pagamento registrado');
      refresh();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const canPay = ['ready', 'delivered'].includes(order.status) && order.balance_due > 0;

  return (
    <Modal title={`Atualizar OS #${order.service_order_number}`} onClose={onClose} size="xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {order.device?.brand} {order.device?.model} · {order.customer?.name}
        </p>
        <StatusBadge status={order.status} />
      </div>
      <Segmented options={TABS} value={tab} onChange={setTab} label="Seções da OS" />

      <div className="mt-5">
        {tab === 'info' && (
          <form onSubmit={saveInfo} className="space-y-5">
            <fieldset className="grid gap-3 sm:grid-cols-3">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Dispositivo</legend>
              <Field label="Tipo">
                <select className={inputCls} value={form.device.device_type} onChange={(e) => set('device', { device_type: e.target.value })}>
                  {Object.entries(DEVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Marca *"><input required className={inputCls} value={form.device.brand} onChange={(e) => set('device', { brand: e.target.value })} /></Field>
              <Field label="Modelo *"><input required className={inputCls} value={form.device.model} onChange={(e) => set('device', { model: e.target.value })} /></Field>
            </fieldset>

            <fieldset className="grid gap-3 sm:grid-cols-3">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Cliente</legend>
              <Field label="Nome *"><input required className={inputCls} value={form.customer.name} onChange={(e) => set('customer', { name: e.target.value })} /></Field>
              <Field label="Telefone *"><input required className={inputCls} value={form.customer.phone} onChange={(e) => set('customer', { phone: e.target.value })} /></Field>
              <Field label="Telefone alternativo *"><input required className={inputCls} value={form.customer.alternative_phone} onChange={(e) => set('customer', { alternative_phone: e.target.value })} /></Field>
              <p className="text-xs text-slate-500 sm:col-span-3">Os dados do cliente valem para todas as OSs dele.</p>
            </fieldset>

            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Ordem de serviço</legend>
              <Field label="Problema relatado *" className="sm:col-span-2">
                <textarea required rows={3} disabled={closed} className={inputCls} value={form.os.reported_issue} onChange={(e) => set('os', { reported_issue: e.target.value })} />
              </Field>
              <Field label="Previsão de orçamento">
                <input type="date" disabled={closed} className={inputCls} value={form.os.estimated_budget_at} onChange={(e) => set('os', { estimated_budget_at: e.target.value })} />
              </Field>
              <Field label="Previsão de entrega">
                <input type="date" disabled={closed} className={inputCls} value={form.os.estimated_delivery_at} onChange={(e) => set('os', { estimated_delivery_at: e.target.value })} />
              </Field>
              <Field label="Observações internas" className="sm:col-span-2" hint="Visível apenas para a equipe.">
                <textarea rows={3} className={inputCls} value={form.os.internal_notes} onChange={(e) => set('os', { internal_notes: e.target.value })} />
              </Field>
              {closed && <p className="text-xs text-slate-500 sm:col-span-2">OS finalizada: só as observações internas podem ser alteradas.</p>}
            </fieldset>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className={btnGhost} onClick={onClose}>Fechar</button>
              <button className={btnPrimary} disabled={busy}><Save size={16} /> {busy ? 'Salvando…' : 'Salvar alterações'}</button>
            </div>
          </form>
        )}

        {tab === 'maintenance' && (
          <div className="space-y-4">
            {['received', 'in_diagnosis'].includes(order.status) && (
              <>
                <Notice>O aparelho ainda não está em conserto. Avance o status para registrar a manutenção.</Notice>
                <div className="flex flex-wrap gap-2">
                  {order.status === 'received' && (
                    <button className={btnGhost} onClick={() => flow.request(order, 'in_diagnosis')}><Search size={16} /> Iniciar análise</button>
                  )}
                  <button className={btnBlue} onClick={() => flow.request(order, 'in_repair')}><Play size={16} /> Iniciar conserto</button>
                </div>
              </>
            )}
            {order.status === 'in_repair' && (
              <>
                <Notice>Ao concluir, registre as peças usadas (ou marque que nenhuma foi usada) e a mão de obra. A OS passa para <b>Pronto p/ retirada</b>.</Notice>
                <button className={btnPrimary} onClick={() => flow.request(order, 'ready')}><Wrench size={16} /> Registrar manutenção e concluir conserto</button>
              </>
            )}
            {(order.parts_used.length > 0 || order.no_parts_used) && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-3 py-2">Peça</th><th className="px-3">Fornecedor</th><th className="px-3">Qtd.</th>{showCosts && <th className="px-3 text-right">Custo</th>}<th className="px-3 text-right">Venda</th><th className="px-3">Garantia</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.parts_used.length === 0 ? (
                      <tr><td colSpan={6} className="px-3 py-3 text-slate-500">Conserto sem uso de peças.</td></tr>
                    ) : (
                      order.parts_used.map((p, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium">{p.part_name || p.description}</td>
                          <td className="px-3">{p.is_own_stock ? 'Estoque próprio' : p.supplier_name || '—'}</td>
                          <td className="px-3">{p.quantity}</td>
                          {showCosts && <td className="px-3 text-right">{brl(p.cost_price)}</td>}
                          <td className="px-3 text-right">{brl(p.sale_price)}</td>
                          <td className="px-3">{p.warranty_days ? `${p.warranty_days} dias` : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {['ready', 'delivered', 'returned'].includes(order.status) && (
              <p className="text-xs text-slate-500">A manutenção fica registrada quando a OS fica pronta. Para um novo reparo depois da entrega, use <b>Reabrir como retorno</b> em OSs entregues.</p>
            )}
            <p className="text-sm text-slate-600">Mão de obra: <b>{brl(order.labor_amount)}</b></p>
          </div>
        )}

        {tab === 'values' && (
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-1.5 rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex justify-between"><span>Peças</span><b>{brl(order.parts_total_amount)}</b></div>
              <div className="flex justify-between"><span>Mão de obra</span><b>{brl(order.labor_amount)}</b></div>
              <div className="flex justify-between text-emerald-700"><span>Desconto</span><b>{order.discount_amount > 0 ? `− ${brl(order.discount_amount)}` : '—'}</b></div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base font-extrabold text-ink-900"><span>Total de venda</span><span>{order.is_warranty ? 'Garantia' : brl(order.grand_total_amount)}</span></div>
              {showCosts && (
                <>
                  <div className="flex justify-between text-slate-500"><span>Custo total</span><span>{brl(order.cost_total_amount)}</span></div>
                  <div className={`flex justify-between font-bold ${order.profit_amount < 0 ? 'text-red-600' : 'text-emerald-700'}`}><span>Lucro</span><span>{brl(order.profit_amount)}</span></div>
                </>
              )}
            </div>
            <div className="max-w-xs space-y-2 text-sm text-slate-600">
              {order.status === 'ready' ? (
                <>
                  <p>O desconto é aplicado na entrega, junto com o pagamento e o prazo de garantia.</p>
                  <button className={btnPrimary} onClick={() => flow.request(order, 'delivered')}><PackageCheck size={16} /> Entregar, aplicar desconto e cobrar</button>
                </>
              ) : order.status === 'in_repair' ? (
                <p>Peças e mão de obra são definidas ao concluir o conserto (aba Manutenção).</p>
              ) : closed ? (
                <p>OS finalizada: os valores não podem mais ser alterados.</p>
              ) : (
                <p>Os valores aparecem quando o conserto for concluído.</p>
              )}
            </div>
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Recebido <b>{brl(order.paid_amount)}</b> de <b>{brl(order.grand_total_amount)}</b></p>
              <PaymentBadge state={order.payment_state} />
            </div>
            {order.payments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">Nenhum pagamento registrado.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex justify-between px-3 py-2 text-sm">
                    <span>{paymentLabel(p)} · <span className="text-slate-500">{dt(p.paid_at)}</span>{p.payment_status === 'refunded' && ' (estorno)'}</span>
                    <b>{brl(p.amount)}</b>
                  </li>
                ))}
              </ul>
            )}
            {canPay ? (
              <div className="flex flex-wrap items-end gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                <p className="w-full text-sm font-semibold text-amber-900">Saldo a receber: {brl(order.balance_due)}</p>
                <select className={`${inputCls} w-auto`} value={pay.payment_method} onChange={(e) => setPay((p) => ({ ...p, payment_method: e.target.value }))}>
                  {Object.entries(METHODS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
                <input className={`${inputCls} w-36`} type="number" min="0" step="0.01" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} aria-label="Valor" />
                <button className={`${btnPrimary} ${btnSm}`} onClick={addPayment} disabled={busy}><CreditCard size={14} /> Registrar pagamento</button>
              </div>
            ) : order.balance_due > 0 ? (
              <Notice tone="warn">Pagamentos podem ser registrados quando a OS estiver pronta (ou na entrega).</Notice>
            ) : (
              order.grand_total_amount > 0 && <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Pagamento completo.</p>
            )}
          </div>
        )}
      </div>

      {flow.modals}
    </Modal>
  );
}
