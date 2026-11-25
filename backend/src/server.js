process.env.TZ = process.env.TZ || 'America/Sao_Paulo';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');
const swaggerSpec = require('./config/swagger');
const AuditLog = require('./models/AuditLog');
const { authenticate, can } = require('./middleware/auth');

const app = express();
app.use(helmet({ contentSecurityPolicy: false })); // API pura; o Swagger UI usa scripts inline
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

// Auditoria: toda alteração bem-sucedida fica registrada (quem, o quê, quando). Senhas nunca são gravadas.
const safeBody = (body = {}) => {
  const copy = JSON.parse(JSON.stringify(body, (k, v) => (/password|passcode/i.test(k) ? '***' : v)) || '{}');
  return JSON.stringify(copy).length > 4000 ? { resumo: 'conteúdo grande omitido' } : copy;
};
app.use((req, res, next) => {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (!req.user || res.statusCode >= 400) return;
    AuditLog.create({
      tenant: req.user.tenant?._id || req.user.tenant, user: req.user._id, user_name: req.user.name,
      method: req.method, route: (req.baseUrl || '') + (req.route?.path || ''), path: req.originalUrl,
      entity_id: req.params?.id || req.params?.number, body: safeBody(req.body), status: res.statusCode,
    }).catch((err) => console.error('auditoria:', err.message));
  });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/public', require('./routes/public.routes'));
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/service-orders', require('./routes/serviceOrder.routes'));
app.use('/api/v1/sales', require('./routes/sale.routes'));
app.use('/api/v1/dashboard', require('./routes/dashboard.routes'));
app.use('/api/v1/customers', require('./routes/customer.routes'));
app.use('/api/v1/devices', require('./routes/device.routes'));
app.use('/api/v1/products', require('./routes/product.routes'));
app.use('/api/v1/services', require('./routes/service.routes'));
app.use('/api/v1/holidays', require('./routes/holiday.routes'));
app.use('/api/v1/suppliers', require('./routes/supplier.routes'));
app.use('/api/v1/cash-closings', require('./routes/cash.routes'));
app.use('/api/v1/super', require('./routes/super.routes'));
app.use('/api/v1/tenant', require('./routes/tenant.routes'));

// Nomes de rota da documentação do projeto (apelidos das rotas acima)
app.use('/api/v1/os', require('./routes/serviceOrder.routes'));
app.use('/api/v1/inventory', require('./routes/product.routes'));
app.use('/api/v1/cash-register', require('./routes/cash.routes'));
app.post('/api/v1/pdv/checkout', authenticate, can('sales.create'), require('./controllers/sale.controller').create);
app.get('/api/v1/analytics/predictive-revenue', authenticate, can('metrics.view'), require('./controllers/dashboard.controller').predictiveRevenue);

app.use((req, res) => res.status(404).json({ message: 'Rota não encontrada' }));

const FIELD_LABELS = { email: 'e-mail', barcode: 'código de barras', name: 'nome', date: 'data', document_digits: 'CNPJ/CPF' };

app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join('; ') });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: `Valor inválido para "${err.path}"` });
   if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return res.status(409).json({ message: `Já existe um registro com o mesmo valor no campo "${FIELD_LABELS[field] || field || 'valor'}".` });
  }
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3333;
connectDB().then(() =>
  app.listen(PORT, () => console.log(`API em http://localhost:${PORT} | Swagger em http://localhost:${PORT}/api-docs`))
);