const Sale = require('../models/Sale');
const ServiceOrder = require('../models/ServiceOrder');
const { PAYMENT_METHODS } = require('../models/schemas/payment.schema');
const { round2 } = require('../utils/money');

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v) => DAY.test(v || '');
const dayStart = (key) => new Date(`${key}T00:00:00`);
const dayKey = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Pagamentos recebidos em [from, to), líquidos de estornos, por forma e por origem (vendas x OSs).
// Considera a data do pagamento, não a da venda/OS: quitações posteriores entram no dia em que foram pagas.
async function receivedByMethod(from, to) {
  const pipeline = [
    { $match: { 'payments.paid_at': { $gte: from, $lt: to } } },
    { $unwind: '$payments' },
    { $match: { 'payments.paid_at': { $gte: from, $lt: to }, 'payments.payment_status': { $in: ['paid', 'refunded'] } } },
    {
      $group: {
        _id: '$payments.payment_method',
        amount: { $sum: { $cond: [{ $eq: ['$payments.payment_status', 'paid'] }, '$payments.amount', { $multiply: ['$payments.amount', -1] }] } },
        count: { $sum: { $cond: [{ $eq: ['$payments.payment_status', 'paid'] }, 1, 0] } },
      },
    },
  ];
  const [sales, orders] = await Promise.all([Sale.aggregate(pipeline), ServiceOrder.aggregate(pipeline)]);
  const find = (list, m) => list.find((r) => r._id === m) || { amount: 0, count: 0 };
  const methods = PAYMENT_METHODS.map((method) => {
    const s = find(sales, method);
    const o = find(orders, method);
    return {
      method,
      sales: round2(s.amount),
      orders: round2(o.amount),
      total: round2(s.amount + o.amount),
      count: s.count + o.count,
    };
  });
  return { methods, total: round2(methods.reduce((sum, m) => sum + m.total, 0)) };
}

module.exports = { receivedByMethod, isDay, dayStart, dayKey };
