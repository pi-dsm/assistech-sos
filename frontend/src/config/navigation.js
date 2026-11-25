import {
  Activity, BarChart3, Boxes, ClipboardList, Cpu, Gauge, Headphones, House, LogOut, PackageCheck,
  Receipt, Settings, ShieldCheck, Smartphone, Store, Tags, Truck, Users, Wrench,
} from 'lucide-react';

// Estrutura única da navegação: a sidebar, o breadcrumb e as permissões de rota leem daqui.
// perm: 'chave' -> visível apenas para quem tem a permissão (ver config/permissions.js).
// Uma central só aparece se sobrar ao menos uma página visível nela.
export const NAV = [
  { key: 'home', label: 'Tela inicial', to: '/app', icon: House, end: true },
  {
    key: 'os',
    label: 'Central de OSs',
    icon: Wrench,
    base: '/app/os',
    children: [
      { to: '/app/os/abertas', label: 'OSs não entregues', icon: ClipboardList },
      { to: '/app/os/entregues', label: 'OSs entregues', icon: PackageCheck },
      { to: '/app/os/metricas', label: 'Métricas de bancada', icon: Gauge, perm: 'metrics.view' },
    ],
  },
  {
    key: 'sales',
    label: 'Central de Vendas',
    icon: Store,
    base: '/app/vendas',
    children: [
      { to: '/app/vendas/historico', label: 'Histórico de vendas', icon: Receipt },
      { to: '/app/vendas/metricas', label: 'Métricas de balcão', icon: BarChart3, perm: 'metrics.view' },
    ],
  },
  {
    key: 'management',
    label: 'Central de Gestão',
    icon: Boxes,
    base: '/app/gestao',
    children: [
      { to: '/app/gestao/perifericos', label: 'Periféricos', icon: Headphones },
      { to: '/app/gestao/pecas', label: 'Peças', icon: Cpu },
      { to: '/app/gestao/dispositivos', label: 'Dispositivos', icon: Smartphone },
      { to: '/app/gestao/servicos', label: 'Serviços', icon: Tags },
      { to: '/app/gestao/fornecedores', label: 'Fornecedores', icon: Truck },
    ],
  },
  {
    key: 'admin',
    label: 'Central do Administrador',
    icon: ShieldCheck,
    base: '/app/admin',
    children: [
      { to: '/app/admin/metricas', label: 'Métricas da assistência', icon: Activity, perm: 'metrics.view' },
      { to: '/app/admin/usuarios', label: 'Usuários e permissões', icon: Users, perm: 'users.manage' },
      { to: '/app/admin/configuracoes', label: 'Configurações', icon: Settings, perm: 'settings.manage' },
      { action: 'logout', label: 'Sair', icon: LogOut },
    ],
  },
];

// Telas que não aparecem na sidebar, mas precisam de breadcrumb
const EXTRA = [
  { to: '/app/os/nova', label: 'Nova OS', parent: 'os' },
  { to: '/app/os/', label: 'Ficha da OS', parent: 'os', prefix: true },
  { to: '/app/vendas/nova', label: 'Nova venda', parent: 'sales' },
];

// can: (permissão) => boolean, vindo do AuthContext
export const navFor = (can) =>
  NAV.map((g) => (g.children ? { ...g, children: g.children.filter((c) => !c.perm || can(c.perm)) } : g)).filter(
    (g) => !g.children || g.children.some((c) => !c.action)
  );

// ['Central de OSs', 'OSs não entregues'] para o caminho atual
export function crumbsFor(pathname) {
  for (const g of NAV) {
    if (g.to && g.to === pathname) return [g.label];
    const child = g.children?.find((c) => c.to && pathname.startsWith(c.to));
    if (child) return [g.label, child.label];
  }
  const extra = EXTRA.find((e) => (e.prefix ? pathname.startsWith(e.to) : pathname === e.to));
  if (extra) return [NAV.find((g) => g.key === extra.parent).label, extra.label];
  return [];
}
