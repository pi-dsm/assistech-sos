import { useState } from 'react';
import api from '../../services/api';
import { saleStatus } from '../../utils/format';
import { Modal } from '../ui';
import SalePanel from './SalePanel';

// Detalhes de uma venda. Recarrega a venda após pagamentos/estornos para mostrar o estado atual.
export default function SaleDetailsModal({ sale: initial, onClose, onChanged }) {
  const [sale, setSale] = useState(initial);
  const status = saleStatus(sale);

  const changed = async () => {
    try {
      setSale((await api.get(`/sales/${sale.id}`)).data);
    } catch {
      /* mantém o que já está na tela */
    }
    onChanged?.();
  };

  return (
    <Modal
      title={
        <span className="flex flex-wrap items-center gap-2">
          Venda #{sale.sale_number}
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-500">{sale.short_id}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${status.cls}`}>{status.label}</span>
        </span>
      }
      onClose={onClose}
      size="lg"
    >
      <SalePanel key={`${sale.id}-${sale.updated_at}`} sale={sale} onChanged={changed} />
    </Modal>
  );
}
