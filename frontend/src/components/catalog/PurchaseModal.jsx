import { useState } from 'react';
import { Plus, Trash2, Truck } from '../icons';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { brl } from '../../utils/format';
import { btnGhost, btnPrimary, btnSm, Field, inputCls, Modal } from '../ui';
import SupplierSelect from '../SupplierSelect';

// Compra de fornecedor: dá entrada no estoque e o servidor recalcula o custo médio ponderado
export default function PurchaseModal({ products, onClose, onDone }) {
  const toast = useToast();
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [rows, setRows] = useState([{ product: '', quantity: 1, unit_cost: '' }]);
  const [busy, setBusy] = useState(false);
  const setRow = (i, k, v) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)));
  const total = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_cost) || 0), 0);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/suppliers/purchase-order', { supplier, reference, items: rows.map((r) => ({ ...r, quantity: Number(r.quantity), unit_cost: Number(r.unit_cost) })) });
      toast.success('Compra lançada: estoque e custo médio atualizados');
      onDone();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={<span className="flex items-center gap-2"><Truck size={18} /> Lançar compra de fornecedor</span>} onClose={onClose} size="lg">
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fornecedor *"><SupplierSelect value={supplier} onChange={setSupplier} /></Field>
          <Field label="Nota / pedido"><input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex.: NF 1234" /></Field>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <Field label="Item" className="min-w-56 flex-1">
              <select className={inputCls} required value={r.product} onChange={(e) => setRow(i, 'product', e.target.value)}>
                <option value="">Selecione…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} (estoque {p.stock_quantity}, custo {brl(p.cost_price)})</option>)}
              </select>
            </Field>
            <Field label="Qtd."><input type="number" min="1" step="1" required className={`${inputCls} w-20`} value={r.quantity} onChange={(e) => setRow(i, 'quantity', e.target.value)} /></Field>
            <Field label="Custo unit. (R$)"><input type="number" min="0" step="0.01" required className={`${inputCls} w-28`} value={r.unit_cost} onChange={(e) => setRow(i, 'unit_cost', e.target.value)} /></Field>
            {rows.length > 1 && <button type="button" className={`${btnGhost} ${btnSm} mb-1`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label="Remover item"><Trash2 size={14} /></button>}
          </div>
        ))}
        <button type="button" className={`${btnGhost} ${btnSm}`} onClick={() => setRows((r) => [...r, { product: '', quantity: 1, unit_cost: '' }])}><Plus size={14} /> Outro item</button>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-sm">Total da compra: <b>{brl(total)}</b></p>
          <div className="flex gap-2">
            <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
            <button className={btnPrimary} disabled={busy || !supplier}>{busy ? 'Lançando…' : 'Lançar compra'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
