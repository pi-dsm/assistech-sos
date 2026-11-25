import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Showcase from './pages/Showcase.jsx';
import PublicTracking from './pages/PublicTracking.jsx';
import Home from './pages/Home.jsx';
import Preferences from './pages/Preferences.jsx';
import OpenOrders from './pages/os/OpenOrders.jsx';
import DeliveredOrders from './pages/os/DeliveredOrders.jsx';
import BenchMetrics from './pages/os/BenchMetrics.jsx';
import NewServiceOrder from './pages/os/NewServiceOrder.jsx';
import ServiceOrderDetails from './pages/os/ServiceOrderDetails.jsx';
import SalesHistory from './pages/sales/SalesHistory.jsx';
import NewSale from './pages/sales/NewSale.jsx';
import CounterMetrics from './pages/sales/CounterMetrics.jsx';
import ProductCatalog from './components/catalog/ProductCatalog.jsx';
import Services from './pages/management/Services.jsx';
import Suppliers from './pages/management/Suppliers.jsx';
import AssistanceMetrics from './pages/admin/AssistanceMetrics.jsx';
import Users from './pages/admin/Users.jsx';
import Audit from './pages/admin/Audit.jsx';
import Settings from './pages/admin/Settings.jsx';
import Tenants from './pages/super/Tenants.jsx';
import SaasMetrics from './pages/super/SaasMetrics.jsx';

// perm: permissão exigida ('admin' = só o admin). superadmin: área da plataforma.
function Protected({ children, perm, superadmin }) {
  const { token, can, isSuper } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (superadmin !== undefined && superadmin !== isSuper) return <Navigate to={isSuper ? '/super' : '/app'} replace />;
  if (perm && !can(perm)) return <Navigate to="/app" replace />;
  return children;
}

// Endereços antigos continuam funcionando (favoritos, links salvos)
const LEGACY = {
  '/ordens': '/app/os/abertas',
  '/ordens/nova': '/app/os/nova',
  '/vendas': '/app/vendas/historico',
  '/vendas/nova': '/app/vendas/nova',
  '/produtos': '/app/gestao/perifericos',
  '/servicos': '/app/gestao/servicos',
  '/fornecedores': '/app/gestao/fornecedores',
  '/usuarios': '/app/admin/usuarios',
  '/feriados': '/app/admin/configuracoes',
};
function LegacyOrder() {
  const { id } = useParams();
  return <Navigate to={`/app/os/${id}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/loja/:slug" element={<Showcase />} />
      <Route path="/loja/:slug/os/:number?" element={<PublicTracking />} />

      <Route path="/super" element={<Protected superadmin><Layout /></Protected>}>
        <Route index element={<Tenants />} />
        <Route path="metricas" element={<SaasMetrics />} />
        <Route path="auditoria" element={<Audit global />} />
        <Route path="preferencias" element={<Preferences />} />
        <Route path="*" element={<Navigate to="/super" replace />} />
      </Route>

      <Route path="/app" element={<Protected superadmin={false}><Layout /></Protected>}>
        <Route index element={<Home />} />
        <Route path="preferencias" element={<Preferences />} />

        <Route path="os" element={<Navigate to="/app/os/abertas" replace />} />
        <Route path="os/abertas" element={<OpenOrders />} />
        <Route path="os/entregues" element={<DeliveredOrders />} />
        <Route path="os/metricas" element={<Protected perm="metrics.view"><BenchMetrics /></Protected>} />
        <Route path="os/nova" element={<NewServiceOrder />} />
        <Route path="os/:id" element={<ServiceOrderDetails />} />

        <Route path="vendas" element={<Navigate to="/app/vendas/historico" replace />} />
        <Route path="vendas/historico" element={<SalesHistory />} />
        <Route path="vendas/nova" element={<NewSale />} />
        <Route path="vendas/metricas" element={<Protected perm="metrics.view"><CounterMetrics /></Protected>} />

        <Route path="gestao" element={<Navigate to="/app/gestao/perifericos" replace />} />
        <Route path="gestao/perifericos" element={<ProductCatalog key="peripheral" kind="peripheral" />} />
        <Route path="gestao/pecas" element={<ProductCatalog key="part" kind="part" />} />
        <Route path="gestao/dispositivos" element={<ProductCatalog key="device" kind="device" />} />
        <Route path="gestao/servicos" element={<Services />} />
        <Route path="gestao/fornecedores" element={<Suppliers />} />

        <Route path="admin" element={<Navigate to="/app/admin/metricas" replace />} />
        <Route path="admin/metricas" element={<Protected perm="admin"><AssistanceMetrics /></Protected>} />
        <Route path="admin/usuarios" element={<Protected perm="admin"><Users /></Protected>} />
        <Route path="admin/auditoria" element={<Protected perm="admin"><Audit /></Protected>} />
        <Route path="admin/configuracoes" element={<Protected perm="admin"><Settings /></Protected>} />

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>

      {Object.entries(LEGACY).map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
      <Route path="/ordens/:id" element={<LegacyOrder />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
