// Seed de APRESENTAÇÃO do AssisTech SOS: o superadmin, 3 assinantes e 60 dias de operação fictícia
// da Compucell (mais 4 meses de histórico resumido para a previsão de receita).
// ATENÇÃO: apaga todos os dados do banco configurado em MONGODB_URI antes de popular.
// Uso: npm run seed:demo
process.env.TZ = process.env.TZ || 'America/Sao_Paulo';
require('dotenv').config();
const mongoose = require('mongoose');
const argon2 = require('argon2');
const User = require('./models/User');
const Customer = require('./models/Customer');
const Device = require('./models/Device');
const Product = require('./models/Product');
const StockMovement = require('./models/StockMovement');
const Service = require('./models/Service');
const ServiceOrder = require('./models/ServiceOrder');
const Sale = require('./models/Sale');
const Setting = require('./models/Setting');
const Supplier = require('./models/Supplier');
const Holiday = require('./models/Holiday');
const CashClosing = require('./models/CashClosing');
const { Counter } = require('./models/Counter');
const Tenant = require('./models/Tenant');
const AuditLog = require('./models/AuditLog');
const { runAs } = require('./config/tenant');
const { createSale, refund } = require('./services/sale.service');
const { receivedByMethod } = require('./services/payments.service');
const { round2 } = require('./utils/money');

// ── Aleatoriedade reprodutível (mesmo resultado a cada execução) ─────────────
let state = 20261117;
const rand = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of pairs) if ((r -= w) <= 0) return value;
  return pairs[0][0];
};

// ── Datas: dias atrás, em horário comercial e nunca no futuro ────────────────
const NOW = new Date();
const DAY = 86400000;
const at = (daysAgo, hour = int(9, 17), minute = int(0, 59)) => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - daysAgo, hour, minute);
  return d > NOW ? new Date(NOW.getTime() - int(5, 90) * 60000) : d;
};
const plusDays = (date, days) => new Date(date.getTime() + days * DAY);
const isSunday = (daysAgo) => at(daysAgo, 12).getDay() === 0;

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Limpando o banco…');
  await Promise.all(
    [User, Customer, Device, Product, StockMovement, Service, ServiceOrder, Sale, Setting, Counter, Supplier, Holiday, CashClosing, Tenant, AuditLog].map((m) => m.deleteMany())
  );

  // ── Plataforma: superadmin e assinantes ───────────────────────────────────
  await User.create({ name: 'Anelize Nardelli', email: 'super@assistech.com', password: await argon2.hash('super123'), role: 'superadmin' });
  const [compucell, consertaja] = await Tenant.create([
    {
      name: 'Compucell Tecnologias', slug: 'compucell', plan: 'pro', document: '12.345.678/0001-95', phone: '(14) 3622-0000', whatsapp: '(14) 99700-0002', address: 'Rua Humaitá, 100 - Centro, Jaú - SP',
      showcase: { enabled: true, headline: 'Assistência técnica de celulares e computadores em Jaú', about: 'Conserto com garantia, peças de qualidade e orçamento pelo WhatsApp.' },
    },
    { name: 'Conserta Já Jaú', slug: 'consertaja', plan: 'basic', phone: '(14) 3621-4444', address: 'Av. Brasil, 500 - Jaú - SP', showcase: { headline: 'Seu celular pronto no mesmo dia' } },
    { name: 'Cell Point Bariri', slug: 'cellpoint', plan: 'basic', is_active: false, deactivated_at: new Date(Date.now() - 12 * 86400000) }, // cancelou: aparece no churn
  ]);
  await Tenant.updateOne({ _id: compucell._id }, { created_at: new Date(Date.now() - 200 * 86400000) }, { timestamps: false });

  // Segunda assistência: poucos dados, só para mostrar o isolamento entre assinantes
  await runAs(consertaja, async () => {
    await User.create({ name: 'Carlos Mendes', email: 'admin@consertaja.com', password: await argon2.hash('admin123'), role: 'admin' });
    const c = await Customer.create({ name: 'Paula Ribeiro', phone: '(14) 99111-2222', alternative_phone: '(14) 99111-3333' });
    const d = await Device.create({ customer: c._id, brand: 'Motorola', model: 'Moto G84' });
    await ServiceOrder.create({ customer: c._id, device: d._id, reported_issue: 'Não carrega', estimated_budget_at: new Date(), estimated_delivery_at: new Date(Date.now() + 2 * 86400000) });
    await Service.create({ name: 'Troca de conector de carga', price: 120 });
  });

  await runAs(compucell, () => populateCompucell());

  const [tenants, users] = await Promise.all([Tenant.countDocuments(), User.countDocuments()]);
  console.log(`\n${tenants} assinantes e ${users} usuários.`);
  console.log('\nAcessos:');
  console.log('  SuperAdmin             super@assistech.com    / super123');
  console.log('  Compucell (admin)      admin@compucell.com    / admin123');
  console.log('  Compucell (user)       lucas@compucell.com    / lucas123     (permissões padrão)');
  console.log('  Compucell (user)       juliana@compucell.com  / juliana123   (também estorna e vê métricas)');
  console.log('  Conserta Já (admin)    admin@consertaja.com   / admin123');
  console.log('  Vitrine pública        http://localhost:5173/loja/compucell');
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});

// Dados da Compucell (roda com o assinante ativo: todo documento recebe tenant = Compucell)
async function populateCompucell() {

  // ── Usuários: o admin e dois users com permissões diferentes ───────────────
  const hash = (p) => argon2.hash(p);
  const [admin, tech, attendant] = await User.create([
    { name: 'Roberto Almeida', email: 'admin@compucell.com', password: await hash('admin123'), role: 'admin', phone: '(14) 99700-0002' },
    { name: 'Lucas Ferreira', email: 'lucas@compucell.com', password: await hash('lucas123'), role: 'user', phone: '(14) 99700-0003' },
    {
      name: 'Juliana Costa', email: 'juliana@compucell.com', password: await hash('juliana123'), role: 'user', phone: '(14) 99700-0004',
      permissions: ['orders.manage', 'sales.create', 'cash.close', 'catalog.edit', 'suppliers.edit', 'sales.refund', 'metrics.view'],
    },
  ]);
  const staff = [admin, tech, attendant];

  // ── Configurações ───────────────────────────────────────────────────────────
  await Holiday.create([
    { date: '07-09', name: 'Revolução Constitucionalista', scope: 'state' },
    { date: '08-15', name: 'Aniversário da cidade', scope: 'municipal' },
    { date: '10-28', name: 'Dia do Servidor Público', scope: 'optional' },
  ]);
  await Setting.create([
    { key: 'goals', value: { daily: 700, weekly: 4500, monthly: 18000 } },
    { key: 'sales_goals', value: { daily: 250, weekly: 1600, monthly: 6500 } },
  ]);

  // ── Fornecedores ────────────────────────────────────────────────────────────
  const suppliers = await Supplier.create([
    { name: 'TecPeças Distribuidora', document: '11.222.333/0001-81', contact_name: 'Marcos', phone: '(11) 4002-8922', email: 'vendas@tecpecas.example', city: 'São Paulo', state: 'SP', notes: 'Telas e baterias. Entrega em 2 dias úteis.' },
    { name: 'InfoParts Componentes', document: '45.678.912/0001-55', contact_name: 'Renata', phone: '(14) 3622-1100', city: 'Bauru', state: 'SP', notes: 'Peças de notebook e fontes.' },
    { name: 'Mega Acessórios Atacado', contact_name: 'Paulo', phone: '(11) 3333-4040', city: 'São Paulo', state: 'SP', notes: 'Capas, películas e cabos.' },
    { name: 'Conecta Celulares Seminovos', contact_name: 'Fernanda', phone: '(14) 99812-7070', city: 'Jaú', state: 'SP', notes: 'Aparelhos seminovos revisados.' },
    { name: 'Papelaria Central', contact_name: 'Seu Antônio', phone: '(14) 3621-5566', city: 'Jaú', state: 'SP', is_active: false, notes: 'Fornecedor antigo, inativo.' },
  ]);
  const [tecpecas, infoparts, mega, conecta, papelaria] = suppliers;

  // ── Serviços de balcão ──────────────────────────────────────────────────────
  const services = await Service.create([
    { name: 'Xerox (cópia P&B)', description: 'Por página', price: 0.5, cost_price: 0.1 },
    { name: 'Impressão colorida', description: 'Por página A4', price: 2, cost_price: 0.6 },
    { name: 'Aplicação de película', description: 'Mão de obra da aplicação', price: 15, cost_price: 0 },
    { name: 'Formatação de computador', description: 'Com backup de até 50 GB', price: 120, cost_price: 0 },
    { name: 'Transferência de dados', description: 'Celular para celular', price: 50, cost_price: 0 },
    { name: 'Limpeza de entrada de carga', price: 20, cost_price: 0 },
  ]);
  const svc = Object.fromEntries(services.map((s, i) => [['xerox', 'color', 'film', 'format', 'transfer', 'clean'][i], s]));

  // ── Estoque: periféricos, peças e dispositivos ─────────────────────────────
  // end = estoque desejado ao fim da simulação; sold = peso nas vendas (0 = produto parado)
  const CATALOG = [
    { key: 'film13', kind: 'peripheral', name: 'Película 3D iPhone 13', category: 'screen_protector', supplier: mega, cost: 5, price: 25, min: 6, end: 3, sold: 14 },
    { key: 'filmA54', kind: 'peripheral', name: 'Película de vidro Galaxy A54', category: 'screen_protector', supplier: mega, cost: 4, price: 20, min: 6, end: 11, sold: 10 },
    { key: 'charger', kind: 'peripheral', name: 'Carregador USB-C 20W', category: 'accessory', supplier: infoparts, cost: 22, price: 59.9, min: 4, end: 7, sold: 9 },
    { key: 'cableL', kind: 'peripheral', name: 'Cabo Lightning 1m', category: 'accessory', supplier: mega, cost: 9, price: 29.9, min: 5, end: 2, sold: 10 },
    { key: 'cableC', kind: 'peripheral', name: 'Cabo USB-C 1m reforçado', category: 'accessory', supplier: mega, cost: 8, price: 24.9, min: 5, end: 14, sold: 12 },
    { key: 'case', kind: 'peripheral', name: 'Capa anti-impacto (universal)', category: 'accessory', supplier: mega, cost: 7, price: 35, min: 5, end: 9, sold: 8 },
    { key: 'earbuds', kind: 'peripheral', name: 'Fone Bluetooth TWS', category: 'accessory', supplier: mega, cost: 38, price: 89.9, min: 3, end: 4, sold: 5 },
    { key: 'powerbank', kind: 'peripheral', name: 'Power bank 10.000 mAh', category: 'accessory', supplier: infoparts, cost: 55, price: 119.9, min: 2, end: 0, sold: 3 },
    { key: 'keyboard', kind: 'peripheral', name: 'Teclado USB ABNT2', category: 'keyboard', supplier: infoparts, cost: 35, price: 79.9, min: 3, end: 2, sold: 3 },
    { key: 'mouse', kind: 'peripheral', name: 'Mouse sem fio', category: 'accessory', supplier: infoparts, cost: 18, price: 49.9, min: 3, end: 8, sold: 5 },
    { key: 'notebook', kind: 'peripheral', name: 'Caderno 96 folhas', category: 'stationery', supplier: papelaria, cost: 8, price: 18, min: 5, end: 12, sold: 6 },
    { key: 'pen', kind: 'peripheral', name: 'Caneta esferográfica azul', category: 'stationery', supplier: papelaria, cost: 0.8, price: 2.5, min: 20, end: 45, sold: 6 },
    { key: 'led', kind: 'peripheral', name: 'Lâmpada LED 9W', category: 'lighting', cost: 4, price: 12, min: 10, end: 26, sold: 3 },
    { key: 'ringlight', kind: 'peripheral', name: 'Ring light 26 cm', category: 'lighting', supplier: mega, cost: 45, price: 99.9, min: 1, end: 3, sold: 0, created: 120 },
    { key: 'gamepad', kind: 'peripheral', name: 'Controle USB para PC', category: 'accessory', cost: 30, price: 69.9, min: 1, end: 4, sold: 0, created: 95 },
    // Peças (uso nas OSs ou venda avulsa)
    { key: 'p_screenA54', kind: 'part', name: 'Tela Galaxy A54 (com aro)', description: 'Compatível com SM-A546', supplier: tecpecas, cost: 160, price: 320, min: 1, end: 2, sold: 0 },
    { key: 'p_bat11', kind: 'part', name: 'Bateria iPhone 11', description: 'Capacidade original 3110 mAh', supplier: tecpecas, cost: 55, price: 140, min: 2, end: 1, sold: 1 },
    { key: 'p_connG84', kind: 'part', name: 'Conector de carga Moto G84', supplier: tecpecas, cost: 15, price: 60, min: 3, end: 6, sold: 1 },
    { key: 'p_paste', kind: 'part', name: 'Pasta térmica Arctic MX-4 (4 g)', supplier: infoparts, cost: 25, price: 45, min: 2, end: 5, sold: 1 },
    { key: 'p_ssd', kind: 'part', name: 'SSD 480 GB SATA', description: 'Upgrade para notebooks e desktops', supplier: infoparts, cost: 140, price: 249.9, min: 2, end: 3, sold: 2 },
    { key: 'p_ram', kind: 'part', name: 'Memória DDR4 8 GB 3200', supplier: infoparts, cost: 95, price: 189.9, min: 2, end: 0, sold: 1 },
    { key: 'p_kbDell', kind: 'part', name: 'Teclado Dell Inspiron 15', supplier: infoparts, cost: 90, price: 190, min: 1, end: 1, sold: 0, created: 100 },
    // Dispositivos à venda
    { key: 'd_ip11', kind: 'device', name: 'iPhone 11 64 GB (seminovo)', description: 'Preto · bateria 86% · garantia de 90 dias · IMEI 35xxxxxxxxxxx21', supplier: conecta, cost: 1250, price: 1799, min: 0, end: 1, sold: 1 },
    { key: 'd_a34', kind: 'device', name: 'Galaxy A34 128 GB (seminovo)', description: 'Verde · tela sem riscos · com carregador', supplier: conecta, cost: 780, price: 1199, min: 0, end: 2, sold: 1 },
    { key: 'd_g54', kind: 'device', name: 'Moto G54 256 GB (novo)', description: 'Lacrado · nota fiscal', supplier: conecta, cost: 1050, price: 1449, min: 0, end: 1, sold: 0 },
  ];

  // Planeja as vendas antes de criar o estoque, para o saldo final bater com o desejado
  const sellable = CATALOG.filter((p) => p.sold > 0);
  const salePlan = [];
  for (let d = 59; d >= 0; d--) {
    if (isSunday(d)) continue;
    const count = d === 0 ? int(3, 5) : int(1, 4);
    for (let n = 0; n < count; n++) {
      const items = [];
      const lines = weighted([[1, 6], [2, 3], [3, 1]]);
      for (let l = 0; l < lines; l++) {
        if (chance(0.3)) {
          const s = weighted([['xerox', 5], ['color', 3], ['film', 2], ['transfer', 1], ['format', 0.6], ['clean', 1]]);
          items.push({ service: s, quantity: s === 'xerox' ? int(10, 60) : s === 'color' ? int(2, 15) : 1 });
        } else {
          const p = weighted(sellable.map((x) => [x, x.kind === 'device' ? 0.15 : x.sold]));
          if (p.kind === 'device' && salePlan.some((s) => s.items.some((i) => i.product === p.key))) continue;
          items.push({ product: p.key, quantity: p.kind === 'peripheral' && p.price < 20 ? int(1, 4) : 1 });
        }
      }
      if (items.length) salePlan.push({ daysAgo: d, items });
    }
  }
  const soldQty = {};
  salePlan.forEach((s) => s.items.forEach((i) => i.product && (soldQty[i.product] = (soldQty[i.product] || 0) + i.quantity)));

  const products = {};
  let barcode = 7891000100000;
  for (const p of CATALOG) {
    const created = at(p.created || 75, 10);
    const doc = await Product.create({
      name: p.name, kind: p.kind, barcode: String(barcode++), category: p.category || 'other', description: p.description,
      supplier: p.supplier?._id, cost_price: p.cost, sale_price: p.price, min_stock: p.min,
      stock_quantity: p.end + (soldQty[p.key] || 0),
    });
    await Product.updateOne({ _id: doc._id }, { created_at: created, updated_at: created }, { timestamps: false });
    await StockMovement.create({ product: doc._id, kind: 'initial', quantity: doc.stock_quantity, balance_after: doc.stock_quantity, reason: 'Estoque inicial', created_by: admin._id });
    await StockMovement.updateMany({ product: doc._id, kind: 'initial' }, { created_at: created }, { timestamps: false });
    products[p.key] = doc;
  }

  // ── Clientes e aparelhos ────────────────────────────────────────────────────
  const NAMES = [
    'Ana Paula Martins', 'Bruno Carvalho', 'Camila Rocha', 'Diego Nascimento', 'Eduarda Lopes', 'Felipe Andrade', 'Gabriela Teixeira',
    'Henrique Moraes', 'Isabela Freitas', 'João Pedro Santos', 'Karina Mendes', 'Leonardo Barros', 'Mariana Duarte', 'Nicolas Pereira',
    'Olívia Cardoso', 'Pedro Henrique Lima', 'Rafaela Gomes', 'Sérgio Batista', 'Tatiane Ribeiro', 'Vinícius Araújo', 'Yasmin Correia',
    'Antônio Carlos Souza', 'Beatriz Nogueira', 'Caio Fernandes', 'Daniela Pires', 'Everton Ramos',
  ];
  const phone = () => `(14) 99${int(100, 999)}-${String(int(0, 9999)).padStart(4, '0')}`;
  const customers = await Customer.create(NAMES.map((name) => ({ name, phone: phone(), alternative_phone: phone(), created_by: attendant._id })));

  const MODELS = [
    ['phone', 'Apple', 'iPhone 11', 3], ['phone', 'Apple', 'iPhone 13', 2], ['phone', 'Samsung', 'Galaxy A54', 3], ['phone', 'Samsung', 'Galaxy A34', 2],
    ['phone', 'Samsung', 'Galaxy S21 FE', 1], ['phone', 'Motorola', 'Moto G84', 3], ['phone', 'Motorola', 'Moto G54', 2], ['phone', 'Xiaomi', 'Redmi Note 12', 2],
    ['tablet', 'Apple', 'iPad 9', 1], ['tablet', 'Samsung', 'Galaxy Tab A8', 1], ['laptop', 'Dell', 'Inspiron 15', 2], ['laptop', 'Lenovo', 'IdeaPad 3', 2],
    ['laptop', 'Acer', 'Aspire 5', 1], ['console', 'Sony', 'PlayStation 4', 1], ['smartwatch', 'Apple', 'Watch SE', 0.5], ['desktop', 'Positivo', 'Master D', 0.5],
  ];
  const passcode = () =>
    weighted([
      [{ kind: 'pin', pin: String(int(1000, 999999)) }, 4],
      [{ kind: 'pattern', pattern: pick([[0, 1, 2, 5, 8], [6, 3, 0, 1, 2], [0, 4, 8, 5], [2, 4, 6, 7, 8]]) }, 3],
      [{ kind: 'written', written: `Senha@${int(10, 99)}` }, 1],
      [{ kind: 'none' }, 2],
    ]);
  const deviceFor = async (customer, forcedType) => {
    const pool = forcedType ? MODELS.filter((m) => m[0] === forcedType) : MODELS;
    const [type, brand, model] = weighted(pool.map((m) => [m, m[3]]));
    return Device.create({ customer: customer._id, device_type: type, brand, model, passcode: type === 'phone' || type === 'tablet' ? passcode() : { kind: 'none' } });
  };

  // ── Modelos de conserto (defeito relatado -> peça e mão de obra) ───────────
  const REPAIRS = {
    phone: [
      { issue: 'Tela trincada após queda, touch falhando', part: (m) => `Tela ${m}`, cost: [110, 260], markup: 1.9, labor: [60, 90], w: 5 },
      { issue: 'Bateria descarrega muito rápido e desliga com 20%', part: (m) => `Bateria ${m}`, cost: [45, 70], markup: 2.2, labor: [40, 60], w: 4 },
      { issue: 'Não carrega, conector com mau contato', part: (m) => `Conector de carga ${m}`, cost: [12, 25], markup: 3, labor: [50, 70], own: 0.4, w: 4 },
      { issue: 'Não liga depois de cair na água', part: null, labor: [120, 180], w: 2 },
      { issue: 'Sistema travando e reiniciando sozinho', part: null, labor: [70, 100], w: 2 },
      { issue: 'Câmera traseira não foca', part: (m) => `Câmera traseira ${m}`, cost: [50, 90], markup: 2, labor: [50, 60], w: 1.5 },
      { issue: 'Sem som no alto-falante nas ligações', part: (m) => `Alto-falante auricular ${m}`, cost: [15, 30], markup: 2.5, labor: [40, 60], w: 1.5 },
      { issue: 'Botão de volume afundado', part: (m) => `Flex de botões ${m}`, cost: [18, 30], markup: 2.4, labor: [40, 50], w: 1 },
    ],
    tablet: [
      { issue: 'Tela quebrada', part: (m) => `Touch ${m}`, cost: [120, 200], markup: 1.8, labor: [70, 100], w: 3 },
      { issue: 'Não segura carga', part: (m) => `Bateria ${m}`, cost: [80, 120], markup: 1.9, labor: [60, 80], w: 2 },
    ],
    laptop: [
      { issue: 'Teclado com várias teclas falhando', part: (m) => `Teclado ${m}`, cost: [80, 120], markup: 2, labor: [50, 70], w: 3 },
      { issue: 'Esquentando muito e desligando sozinho', part: () => 'Pasta térmica e limpeza do cooler', own: 1, sale: 45, labor: [100, 140], w: 3 },
      { issue: 'Não liga, fonte não acende o LED', part: () => 'Fonte 65 W', cost: [60, 80], markup: 2.1, labor: [30, 40], w: 2 },
      { issue: 'Muito lento, demora para iniciar', part: () => 'SSD 480 GB', cost: [140, 140], markup: 1.8, labor: [80, 100], w: 2 },
    ],
    console: [{ issue: 'Superaquecendo e fazendo muito barulho', part: () => 'Pasta térmica e limpeza interna', own: 1, sale: 40, labor: [120, 150], w: 1 }],
    smartwatch: [{ issue: 'Tela trincada', part: (m) => `Vidro ${m}`, cost: [90, 120], markup: 1.9, labor: [60, 80], w: 1 }],
    desktop: [{ issue: 'Não dá vídeo ao ligar', part: () => 'Memória DDR4 8 GB', cost: [95, 95], markup: 2, labor: [60, 80], w: 1 }],
  };
  const SUPPLIER_FOR = { phone: tecpecas, tablet: tecpecas, smartwatch: tecpecas, laptop: infoparts, desktop: infoparts, console: infoparts };
  let nf = 4100;
  const buildRepair = (device) => {
    const r = weighted(REPAIRS[device.device_type].map((x) => [x, x.w]));
    const parts = [];
    if (r.part) {
      const own = r.own && chance(r.own);
      const baseCost = r.cost ? int(r.cost[0], r.cost[1]) : 0;
      const cost = own ? 0 : round2(baseCost);
      const sale = r.sale || round2(Math.round((baseCost * (r.markup || 2)) / 5) * 5);
      const supplier = SUPPLIER_FOR[device.device_type];
      parts.push(
        own
          ? { part_name: r.part(device.model), is_own_stock: true, cost_price: 0, sale_price: sale, quantity: 1 }
          : { part_name: r.part(device.model), supplier: supplier._id, supplier_name: supplier.name, supplier_contact: `${supplier.contact_name} · ${supplier.phone}`, purchase_reference: `NF-${nf++}`, cost_price: cost, sale_price: sale, quantity: 1, warranty_days: 90 }
      );
    }
    return { issue: r.issue, parts, labor: int(r.labor[0], r.labor[1]) };
  };
  const method = () => weighted([['pix', 45], ['credit_card', 25], ['debit_card', 15], ['cash', 15]]);
  const payment = (amount, paidAt) => {
    const m = method();
    return { amount: round2(amount), payment_method: m, installments: m === 'credit_card' ? weighted([[1, 5], [2, 2], [3, 2], [6, 1]]) : 1, paid_at: paidAt };
  };

  // ── Ordens de serviço ───────────────────────────────────────────────────────
  // Cada especificação vira uma OS com histórico de status coerente e datas retroativas.
  const specs = [];
  const randomCustomer = () => pick(customers);

  // 1) Entregues nos últimos 60 dias
  for (let i = 0; i < 46; i++) specs.push({ kind: 'delivered', created: int(4, 60) });
  // 2) Orçamentos recusados (canceladas antes do conserto)
  for (let i = 0; i < 6; i++) specs.push({ kind: 'cancelled', created: int(3, 55) });
  // 3) Em aberto na loja (inclui atrasadas e uma pronta há mais de 30 dias)
  [
    { kind: 'open', status: 'received', created: 0.1, deliveryIn: 3 },
    { kind: 'open', status: 'received', created: 1, deliveryIn: 2 },
    { kind: 'open', status: 'received', created: 6, deliveryIn: -2 }, // atrasada
    { kind: 'open', status: 'in_diagnosis', created: 2, deliveryIn: 2 },
    { kind: 'open', status: 'in_diagnosis', created: 9, deliveryIn: -4 }, // muito atrasada
    { kind: 'open', status: 'in_repair', created: 3, deliveryIn: 1 },
    { kind: 'open', status: 'in_repair', created: 4, deliveryIn: 0 },
    { kind: 'open', status: 'in_repair', created: 8, deliveryIn: -1 }, // atrasada
    { kind: 'open', status: 'ready', created: 5, readyAgo: 1 },
    { kind: 'open', status: 'ready', created: 3, readyAgo: 0 },
    { kind: 'open', status: 'ready', created: 42, readyAgo: 36 }, // pronta há mais de 30 dias
  ].forEach((s) => specs.push(s));

  specs.sort((a, b) => b.created - a.created); // cronológico: números de OS crescentes no tempo

  const saveOrder = async (o) => {
    const order = new ServiceOrder(o.doc);
    await order.save();
    await ServiceOrder.updateOne({ _id: order._id }, { created_at: o.created, updated_at: o.updated }, { timestamps: false });
    return order;
  };

  // OS antiga com garantia vencida (criada primeiro para a numeração seguir a ordem do tempo)
  let expiredOrder;
  {
    const customer = customers[3];
    const device = await deviceFor(customer, 'laptop');
    const oldCreated = at(140);
    const oldDelivered = plusDays(oldCreated, 3);
    expiredOrder = await saveOrder({
      created: oldCreated, updated: oldDelivered,
      doc: {
        customer: customer._id, device: device._id, reported_issue: 'Esquentando muito e desligando sozinho',
        estimated_budget_at: plusDays(oldCreated, 1), estimated_delivery_at: plusDays(oldCreated, 4), status: 'delivered',
        parts_used: [{ part_name: 'Pasta térmica e limpeza do cooler', is_own_stock: true, cost_price: 0, sale_price: 45, quantity: 1 }], labor_amount: 120,
        payments: [payment(165, oldDelivered)], ready_at: plusDays(oldCreated, 2), delivered_at: oldDelivered, warranty_days: 90, warranty_until: plusDays(oldDelivered, 90),
        status_history: [{ status: 'received', changed_by: attendant._id, changed_at: oldCreated }, { status: 'ready', changed_by: tech._id, changed_at: plusDays(oldCreated, 2) }, { status: 'delivered', changed_by: attendant._id, changed_at: oldDelivered }],
        created_by: attendant._id,
      },
    });
  }

  const deliveredOrders = [];
  for (const s of specs) {
    const customer = randomCustomer();
    const device = await deviceFor(customer);
    const repair = buildRepair(device);
    const user = pick(staff);
    const created = s.created < 1 ? new Date(NOW.getTime() - 50 * 60000) : at(Math.floor(s.created));
    const history = [{ status: 'received', changed_by: attendant._id, changed_at: created }];
    const step = (status, date) => history.push({ status, changed_by: status === 'in_repair' || status === 'ready' ? tech._id : user._id, changed_at: date });
    const base = {
      customer: customer._id, device: device._id, reported_issue: repair.issue,
      estimated_budget_at: plusDays(created, 1), estimated_delivery_at: plusDays(created, s.deliveryIn !== undefined ? Math.max(0, s.created) + s.deliveryIn : int(3, 6)),
      created_by: attendant._id, updated_by: user._id, status_history: history,
    };

    if (s.kind === 'delivered') {
      const diag = plusDays(created, 0.15);
      const repairAt = plusDays(created, rand() * 1.2 + 0.3);
      const readyAt = plusDays(repairAt, rand() * 2.5 + 0.3);
      let deliveredAt = plusDays(readyAt, weighted([[0.2, 3], [1, 3], [2.5, 2], [6, 1]]) + rand());
      if (deliveredAt > NOW) deliveredAt = new Date(NOW.getTime() - int(20, 240) * 60000);
      const readyFinal = readyAt > deliveredAt ? plusDays(deliveredAt, -0.1) : readyAt;
      step('in_diagnosis', diag);
      step('in_repair', repairAt);
      step('ready', readyFinal);
      step('delivered', deliveredAt);
      const gross = repair.parts.reduce((t, p) => t + p.sale_price * p.quantity, 0) + repair.labor;
      const discount = chance(0.2) ? pick([10, 15, 20]) : 0;
      const total = gross - discount;
      const pending = chance(0.08);
      const payments = pending ? [payment(total / 2, deliveredAt)] : chance(0.12) ? [payment(round2(total / 2), deliveredAt), payment(total - round2(total / 2), deliveredAt)] : [payment(total, deliveredAt)];
      const order = await saveOrder({
        created, updated: deliveredAt,
        doc: {
          ...base, status: 'delivered', parts_used: repair.parts, no_parts_used: repair.parts.length === 0, labor_amount: repair.labor,
          discount_amount: discount, payments, ready_at: readyFinal, delivered_at: deliveredAt, warranty_days: 90, warranty_until: plusDays(deliveredAt, 90),
          internal_notes: chance(0.25) ? pick(['Cliente pediu para guardar a peça antiga.', 'Avisado por WhatsApp quando ficou pronto.', 'Aparelho com marcas de uso na carcaça.']) : undefined,
        },
      });
      deliveredOrders.push(order);
    } else if (s.kind === 'cancelled') {
      step('in_diagnosis', plusDays(created, 0.2));
      const cancelAt = plusDays(created, 1 + rand());
      step('cancelled', cancelAt);
      await saveOrder({ created, updated: cancelAt, doc: { ...base, status: 'cancelled', internal_notes: 'Cliente não aprovou o orçamento.' } });
    } else {
      const st = s.status;
      if (['in_diagnosis', 'in_repair', 'ready'].includes(st)) step('in_diagnosis', plusDays(created, Math.min(0.2, s.created / 3)));
      if (['in_repair', 'ready'].includes(st)) step('in_repair', plusDays(created, Math.min(0.8, s.created / 2)));
      let readyAt;
      if (st === 'ready') {
        readyAt = at(s.readyAgo, s.readyAgo === 0 ? Math.max(9, NOW.getHours() - 1) : undefined);
        step('ready', readyAt);
      }
      await saveOrder({
        created, updated: readyAt || history[history.length - 1].changed_at,
        doc: {
          ...base, status: st,
          ...(st === 'ready' ? { parts_used: repair.parts, no_parts_used: repair.parts.length === 0, labor_amount: repair.labor, ready_at: readyAt } : {}),
          internal_notes: st === 'ready' && s.readyAgo > 30 ? 'Cliente não atende. Já foram enviadas 3 mensagens.' : undefined,
        },
      });
    }
  }

  // 4) Retornos: um em garantia com perda registrada (já resolvido), um em garantia em conserto e um cobrado (garantia vencida)
  const returnCandidates = deliveredOrders.filter((o) => o.parts_used.length && !o.parts_used[0].is_own_stock && o.delivered_at < at(12));
  const original1 = returnCandidates[0];
  const original2 = returnCandidates[1];
  for (const [original, resolved] of [[original1, true], [original2, false]]) {
    if (!original) continue;
    const created = plusDays(original.delivered_at, int(4, 9));
    const part = original.parts_used[0];
    const doc = {
      customer: original.customer, device: original.device, origin_order: original._id, is_warranty: true, return_kind: 'warranty',
      reported_issue: `${original.reported_issue} — o defeito voltou`,
      estimated_budget_at: plusDays(created, 1), estimated_delivery_at: plusDays(created, 3),
      return_loss_amount: resolved ? part.cost_price : 0, return_loss_reason: resolved ? 'Peça com defeito' : undefined,
      internal_notes: `Retorno em garantia da OS #${original.service_order_number}.${resolved ? ' Peça anterior apresentou defeito de fábrica; trocada sem custo para o cliente.' : ''}`,
      created_by: attendant._id, updated_by: tech._id,
      status_history: [{ status: 'received', changed_by: attendant._id, changed_at: created }, { status: 'in_diagnosis', changed_by: tech._id, changed_at: plusDays(created, 0.2) }, { status: 'in_repair', changed_by: tech._id, changed_at: plusDays(created, 0.5) }],
    };
    if (resolved) {
      const readyAt = plusDays(created, 1.5);
      const deliveredAt = plusDays(created, 2);
      doc.status_history.push({ status: 'ready', changed_by: tech._id, changed_at: readyAt }, { status: 'delivered', changed_by: attendant._id, changed_at: deliveredAt });
      Object.assign(doc, {
        status: 'delivered', parts_used: [{ ...part.toObject(), purchase_reference: `NF-${nf++}`, sale_price: 0 }], labor_amount: 0,
        ready_at: readyAt, delivered_at: deliveredAt, warranty_days: 90, warranty_until: plusDays(deliveredAt, 90),
      });
    } else {
      doc.status = 'in_repair';
    }
    await saveOrder({ created, updated: doc.delivered_at || plusDays(created, 0.5), doc });
    original.status_history.push({ status: 'returned', changed_by: attendant._id, changed_at: created });
    original.status = 'returned';
    await original.save();
    await ServiceOrder.updateOne({ _id: original._id }, { updated_at: created }, { timestamps: false });
  }

  // Retorno cobrado da OS antiga (garantia vencida)
  {
    const old = expiredOrder;
    const created = at(1);
    await saveOrder({
      created, updated: plusDays(created, 0.2),
      doc: {
        customer: old.customer, device: old.device, origin_order: old._id, return_kind: 'paid',
        reported_issue: 'Voltou a esquentar e desligar (garantia vencida)', estimated_budget_at: plusDays(created, 1), estimated_delivery_at: plusDays(created, 3),
        status: 'in_diagnosis', internal_notes: `Retorno cobrado (garantia vencida) da OS #${old.service_order_number}.`,
        status_history: [{ status: 'received', changed_by: attendant._id, changed_at: created }, { status: 'in_diagnosis', changed_by: tech._id, changed_at: plusDays(created, 0.2) }],
        created_by: attendant._id,
      },
    });
  }

  // ── Vendas (pelo serviço real: baixa estoque e registra movimentações) ─────
  const saleDocs = [];
  for (const plan of salePlan) {
    const when = plan.daysAgo === 0 ? new Date(NOW.getTime() - int(15, 300) * 60000) : at(plan.daysAgo);
    const items = plan.items.map((i) =>
      i.product ? { item_type: 'product', product_id: products[i.product]._id, quantity: i.quantity } : { item_type: 'service', service_id: svc[i.service]._id, quantity: i.quantity }
    );
    const subtotal = plan.items.reduce((t, i) => t + (i.product ? products[i.product].sale_price : svc[i.service].price) * i.quantity, 0);
    const discount = subtotal > 100 && chance(0.25) ? round2(Math.min(20, subtotal * 0.05)) : 0;
    const total = round2(subtotal - discount);
    const pending = total > 80 && chance(0.06);
    const customer = pending || chance(0.3) ? randomCustomer() : null;
    const body = {
      items, discount_amount: discount, customer_id: customer?._id,
      payments: pending ? [{ ...payment(round2(total / 2), when) }] : total > 150 && chance(0.2) ? [payment(round2(total - 50), when), { amount: 50, payment_method: 'cash' }] : [payment(total, when)],
      allow_partial: pending,
      notes: pending ? 'Cliente vai pagar o restante na próxima semana.' : undefined,
    };
    const sale = await createSale(body, pick([attendant, attendant, admin]));
    await Sale.updateOne({ _id: sale._id }, { $set: { created_at: when, updated_at: when, 'payments.$[].paid_at': when } }, { timestamps: false });
    await StockMovement.updateMany({ sale: sale._id }, { created_at: when }, { timestamps: false });
    saleDocs.push({ id: sale._id, when, total });
  }

  // Um estorno (cliente devolveu o produto) e uma quitação de saldo pendente
  const refundTarget = saleDocs.find((s) => s.when < at(10) && s.total > 50);
  if (refundTarget) {
    const sale = await Sale.findById(refundTarget.id);
    await refund(sale, { restock: true }, admin);
    const when = plusDays(refundTarget.when, 2);
    await Sale.updateOne({ _id: sale._id, 'payments.payment_status': 'refunded' }, { $set: { 'payments.$.paid_at': when } }, { timestamps: false });
    await StockMovement.updateMany({ sale: sale._id, kind: 'refund' }, { created_at: when }, { timestamps: false });
  }
  const pendingSale = await Sale.findOne({ notes: /restante/ }).sort({ created_at: 1 });
  if (pendingSale && pendingSale.created_at < at(5)) {
    const paidAt = plusDays(pendingSale.created_at, 4);
    pendingSale.payments.push({ amount: pendingSale.balance_due, payment_method: 'pix', paid_at: paidAt });
    await pendingSale.save();
  }

  // Um ajuste de estoque manual (perda por quebra)
  {
    const p = products.filmA54;
    const updated = await Product.findOneAndUpdate({ _id: p._id }, { $inc: { stock_quantity: -1 } }, { new: true });
    await StockMovement.create({ product: p._id, kind: 'adjustment', quantity: -1, balance_after: updated.stock_quantity, reason: 'Película trincou na aplicação', created_by: attendant._id });
  }

  // ── Fechamentos de caixa dos últimos dias úteis ────────────────────────────
  for (let d = 6; d >= 1; d--) {
    if (isSunday(d)) continue;
    const from = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - d);
    const to = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - d + 1);
    const { methods } = await receivedByMethod(from, to);
    const float = 100;
    const shortfall = d === 4 ? -12.5 : d === 2 ? 3 : 0; // um dia com quebra e um com sobra no dinheiro
    const pad = (n) => String(n).padStart(2, '0');
    await CashClosing.create({
      day: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
      opening_float: float,
      rows: methods.map((m) => {
        const expected = round2(m.total + (m.method === 'cash' ? float : 0));
        return { method: m.method, expected, counted: round2(expected + (m.method === 'cash' ? shortfall : 0)) };
      }),
      notes: shortfall < 0 ? 'Troco dado a mais em uma venda em dinheiro.' : undefined,
      status: 'closed', opened_by: attendant._id, closed_at: to,
      closed_by: d % 2 ? attendant._id : admin._id,
    });
  }

  // Caixa de hoje aberto, com uma sangria (para mostrar o caixa em andamento)
  await CashClosing.create({
    day: `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}-${String(NOW.getDate()).padStart(2, '0')}`,
    opening_float: 100, opened_by: attendant._id,
    movements: [{ kind: 'withdrawal', amount: 50, reason: 'Compra de material de limpeza', by: admin._id }],
  });

  // Histórico resumido de 2 a 6 meses atrás (só serviços de balcão, sem mexer no estoque) para a previsão de receita
  for (let d = 180; d > 60; d -= 2) {
    const when = at(d);
    const service = pick([svc.format, svc.transfer, svc.clean]);
    const quantity = int(1, 3);
    const payment_method = pick(['pix', 'cash', 'debit_card']);
    const sale = await createSale({ items: [{ item_type: 'service', service_id: service._id, quantity }], payments: [{ amount: round2(service.price * quantity), payment_method }] }, admin);
    await Sale.updateOne({ _id: sale._id }, { $set: { created_at: when, updated_at: when, 'payments.$[].paid_at': when } }, { timestamps: false });
  }

  const [orders, sales] = await Promise.all([ServiceOrder.countDocuments(), Sale.countDocuments()]);
  console.log(`\nCompucell: ${orders} OSs, ${sales} vendas, ${CATALOG.length} itens de estoque, ${customers.length} clientes.`);
}
