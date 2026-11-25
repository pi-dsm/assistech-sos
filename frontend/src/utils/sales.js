import { round2 } from './format';

// Espelho de backend/src/utils/saleReports.js#allocateItems: uma linha por item,
// com o desconto da venda rateado proporcionalmente ao subtotal de cada item.
export function allocateItems(sale) {
  const items = sale.items || [];
  const subtotal = sale.subtotal_amount || items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discount = sale.discount_amount || 0;

  return items.map((item, index) => {
    const gross = round2(item.unit_price * item.quantity);
    const discountShare = subtotal > 0 ? round2((gross / subtotal) * discount) : 0;
    const totalPrice = round2(gross - discountShare);
    const totalCost = round2((item.unit_cost || 0) * item.quantity);
    const profit = round2(totalPrice - totalCost);
    return {
      key: `${sale.id}-${index}`,
      item_type: item.item_type,
      product_id: item.product ? String(item.product.id || item.product._id || item.product) : null,
      service_id: item.service ? String(item.service.id || item.service._id || item.service) : null,
      name: item.name,
      barcode: item.barcode || null,
      quantity: item.quantity,
      unit_cost: round2(item.unit_cost || 0),
      total_cost: totalCost,
      unit_price: round2(item.unit_price),
      discount_share: discountShare,
      total_price: totalPrice,
      profit,
      profit_pct: totalPrice > 0 ? round2((profit / totalPrice) * 100) : 0,
    };
  });
}

// Linhas de itens de várias vendas, já com os dados da venda de origem
export const saleItemRows = (sales) =>
  sales.flatMap((sale) => allocateItems(sale).map((row) => ({ ...row, sale })));

// Pagamentos líquidos (pagos - estornos) por forma, dentro de [from, to)
export function paymentsByMethod(docs, from, to) {
  const map = {};
  docs.forEach((doc) =>
    (doc.payments || []).forEach((p) => {
      const at = new Date(p.paid_at);
      if ((from && at < from) || (to && at >= to)) return;
      const sign = p.payment_status === 'paid' ? 1 : p.payment_status === 'refunded' ? -1 : 0;
      if (!sign) return;
      const cur = map[p.payment_method] || { method: p.payment_method, amount: 0, count: 0 };
      cur.amount = round2(cur.amount + sign * p.amount);
      if (sign > 0) cur.count += 1;
      map[p.payment_method] = cur;
    })
  );
  return map;
}

export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const dayKey = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
