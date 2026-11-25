import { useEffect, useState } from 'react';
import { Lock, RotateCcw } from '../icons';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useHolidayCalendar from '../../hooks/useHolidayCalendar';
import { brl, dateOnly, dt } from '../../utils/format';
import DeadlineField, { deadlinePayload, isDeadlineValid, newDeadline } from '../DeadlineField';
import { btnGhost, btnPrimary, Field, inputCls, Modal, Notice, Spinner } from '../ui';

const LOSS_REASONS = ['Peça com defeito', 'Serviço mal executado', 'Dano no manuseio', 'Outro'];

// Reabre uma OS entregue como retorno.
// Na garantia: a original passa para "Retornou" (dados travados) e abre-se uma OS de garantia, sem cobrança.
// Garantia vencida: abre-se uma OS de retorno cobrada normalmente, vinculada à original.
// A perda registrada (peça que falhou, retrabalho) entra nas perdas das métricas.
export default function ReopenModal({ orderId, onClose, onReopened }) {
  const toast = useToast();
  const calendar = useHolidayCalendar();
  const [order, setOrder] = useState(null);
  const [step, setStep] = useState('review'); // review | form
  const [form, setForm] = useState({ reported_issue: '', budget: newDeadline(1), delivery: newDeadline(3), note: '', loss_amount: '', loss_reason: LOSS_REASONS[0] });
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    api.get(`/service-orders/${orderId}`).then((r) => setOrder(r.data)).catch((e) => {
      toast.error(errMsg(e));
      onClose();
    });
  }, [orderId]);

  const submit = async () => {
    if (!form.reported_issue.trim()) return toast.error('Descreva o defeito apresentado no retorno');
    if (!isDeadlineValid(form.budget) || !isDeadlineValid(form.delivery)) return toast.error('Informe as previsões de orçamento e de entrega');
    setSaving(true);
    try {
      const { data } = await api.post(`/service-orders/${order.id}/return`, {
        reported_issue: form.reported_issue,
        notes: form.note,
        loss_amount: Number(form.loss_amount) || 0,
        loss_reason: form.loss_reason,
        charged: expired,
        ...deadlinePayload(form.budget, 'budget'),
        ...deadlinePayload(form.delivery, 'delivery'),
      });
      toast.success(`Retorno registrado: nova OS ${expired ? 'de retorno' : 'de garantia'} #${data.service_order_number}`);
      onReopened?.(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const expired = order ? !order.is_under_warranty : false;

  if (!order) {
    return (
      <Modal title="Reabrir OS como retorno" onClose={onClose} size="lg">
        <Spinner />
      </Modal>
    );
  }

  return (
    <Modal title={`Reabrir OS #${order.service_order_number} como retorno`} onClose={onClose} size="lg">
      {step === 'review' ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <p><span className="text-slate-500">Cliente:</span> <b>{order.customer?.name}</b></p>
            <p><span className="text-slate-500">Dispositivo:</span> <b>{order.device?.brand} {order.device?.model}</b></p>
            <p className="sm:col-span-2"><span className="text-slate-500">Problema original:</span> {order.reported_issue}</p>
            <p><span className="text-slate-500">Entrada:</span> {dt(order.created_at)}</p>
            <p><span className="text-slate-500">Entrega:</span> {dt(order.delivered_at)}</p>
            <p><span className="text-slate-500">Garantia até:</span> {order.warranty_until ? dateOnly(order.warranty_until) : 'sem garantia'}</p>
            <p><span className="text-slate-500">Total cobrado:</span> {brl(order.grand_total_amount)}</p>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Manutenções:</span>{' '}
              {order.parts_used.length ? order.parts_used.map((p) => `${p.quantity}× ${p.part_name || p.description}`).join(', ') : 'sem peças'}
              {order.labor_amount > 0 && ` · mão de obra ${brl(order.labor_amount)}`}
            </div>
          </div>
          {expired ? (
            <Notice tone="warn">
              A garantia desta OS terminou{order.warranty_until ? ` em ${dateOnly(order.warranty_until)}` : ''}. É possível reabrir como <b>retorno cobrado</b>: uma nova OS vinculada à original,
              com orçamento e cobrança normais. A OS original continua como entregue.
            </Notice>
          ) : (
            <Notice tone="warn">
              <span className="flex items-start gap-2">
                <Lock size={16} className="mt-0.5 shrink-0" />
                <span>
                  Ao confirmar, a OS #{order.service_order_number} passa para <b>Retornou</b> e os dados originais não poderão mais ser alterados.
                  Uma nova OS de garantia (sem cobrança) será aberta para os novos relatórios de manutenção.
                </span>
              </span>
            </Notice>
          )}
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={onClose}>Cancelar</button>
            <button className={btnPrimary} onClick={() => setStep('form')}><RotateCcw size={16} /> {expired ? 'Reabrir como retorno cobrado' : 'Confirmar reabertura'}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Defeito apresentado no retorno *">
            <textarea className={inputCls} rows={3} autoFocus value={form.reported_issue} onChange={(e) => set({ reported_issue: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <DeadlineField label="Previsão de orçamento" value={form.budget} onChange={(budget) => set({ budget })} calendar={calendar} />
            <DeadlineField label="Previsão de entrega" value={form.delivery} onChange={(delivery) => set({ delivery })} calendar={calendar} />
          </div>
          <Field label="Anotação (opcional)">
            <textarea className={inputCls} rows={2} placeholder="Ex.: cliente relata que o defeito voltou após 10 dias de uso." value={form.note} onChange={(e) => set({ note: e.target.value })} />
          </Field>
          <fieldset className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">Registro de perda (opcional)</legend>
            <Field label="Valor perdido (R$)" hint="Peças que não funcionaram, retrabalho etc.">
              <input className={inputCls} type="number" min="0" step="0.01" value={form.loss_amount} onChange={(e) => set({ loss_amount: e.target.value })} />
            </Field>
            <Field label="Motivo">
              <select className={inputCls} value={form.loss_reason} onChange={(e) => set({ loss_reason: e.target.value })}>
                {LOSS_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <p className="text-xs text-slate-500 sm:col-span-2">A perda fica registrada na nova OS e entra no total de perdas das métricas, junto com o custo das peças usadas na garantia.</p>
          </fieldset>
          <div className="flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setStep('review')}>Voltar</button>
            <button className={btnPrimary} onClick={submit} disabled={saving}>{saving ? 'Abrindo…' : expired ? 'Abrir OS de retorno' : 'Abrir OS de garantia'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
