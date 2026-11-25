import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { brl, dt, paymentLabel, pctFmt, PRODUCT_CATEGORIES } from '../../utils/format';
import { ITEM_KIND_LABEL, PRODUCT_KINDS, productKind } from '../../utils/catalog';
import { Info, Modal, Spinner } from '../ui';

// Detalhes de um item vendido: venda de origem, tipo (periférico, peça, dispositivo ou serviço),
// valores, pagamentos da venda e dados atuais do cadastro do produto.
export default function ItemDetailsModal({ row, onClose }) {
  const { can } = useAuth();
  const showCosts = can('costs.view');
  const sale = row.sale;
  const [product, setProduct] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (row.item_type !== 'product' || !row.product_id) return;
    api.get(`/products/${row.product_id}`).then((r) => setProduct(r.data)).catch(() => setMissing(true));
  }, [row]);

  const kind = row.item_type === 'service' ? 'service' : product ? productKind(product) : null;

  return (
    <Modal title={row.name} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Info label="Venda" value={`#${sale.sale_number}`} />
        <Info label="Hex da venda" value={sale.short_id} />
        <Info label="Tipo" value={kind ? ITEM_KIND_LABEL[kind] : row.item_type === 'product' ? 'Produto' : 'Serviço'} />
        <Info label="Quantidade" value={String(row.quantity)} />
        <Info label="Valor unitário" value={brl(row.unit_price)} />
        <Info label="Data e hora" value={dt(sale.created_at)} />
        {showCosts && <Info label="Valor total de custo" value={brl(row.total_cost)} />}
        <Info label="Valor total de venda" value={`${brl(row.total_price)}${row.discount_share > 0 ? ` (desc. ${brl(row.discount_share)})` : ''}`} />
        {showCosts && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Lucro</p>
            <p className={`text-sm font-bold ${row.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{brl(row.profit)} · {pctFmt(row.profit_pct)}</p>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Pagamentos da venda</p>
        {sale.payments.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum pagamento.</p>
        ) : (
          <ul className="text-sm">
            {sale.payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-2"><span>{paymentLabel(p)} · <span className="text-slate-500">{dt(p.paid_at)}</span>{p.payment_status === 'refunded' && ' (estorno)'}</span><b>{brl(p.amount)}</b></li>
            ))}
          </ul>
        )}
        {sale.balance_due > 0 && <p className="mt-1 text-sm font-semibold text-amber-700">Saldo da venda a receber: {brl(sale.balance_due)}</p>}
      </div>

      {row.item_type === 'product' && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Cadastro atual</p>
          {missing ? (
            <p className="text-sm text-slate-600">Produto não encontrado no cadastro (pode ter sido removido).</p>
          ) : !product ? (
            <Spinner />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Info label="Código de barras" value={product.barcode} />
              <Info label="Categoria" value={productKind(product) === 'peripheral' ? PRODUCT_CATEGORIES[product.category] : PRODUCT_KINDS[productKind(product)].label} />
              <Info label="Fornecedor" value={product.supplier?.name} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estoque atual</p>
                <p className={`text-sm font-extrabold ${product.is_low_stock ? 'text-red-600' : 'text-emerald-700'}`}>{product.stock_quantity} <span className="text-xs font-medium text-slate-500">(mín. {product.min_stock})</span></p>
              </div>
              <Info label="Preço atual" value={brl(product.sale_price)} />
              <div className="flex items-end">
                <Link to={PRODUCT_KINDS[productKind(product)].path} className="text-sm font-semibold text-blue-700 hover:underline">Abrir na Central de Gestão</Link>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
