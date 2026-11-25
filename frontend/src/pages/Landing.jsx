import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Barcode, Boxes, CalendarClock, CheckCircle2, ClipboardList, FileText, Mic, PackageCheck,
  Search, ShieldCheck, Store, Truck, UserCog, Users, Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Layout';

const FEATURES = [
  { icon: ClipboardList, title: 'Central de OSs', text: 'Kanban, workspace e tabela. Arraste o cartão e o status muda; o sistema exige peças ao concluir e pagamento ao entregar.' },
  { icon: FileText, title: 'Comprovante e garantia', text: 'Segunda via da OS para o cliente na abertura e termo de garantia em PDF na entrega, prontos para imprimir.' },
  { icon: Barcode, title: 'PDV de balcão', text: 'Bipe o código de barras, use atalhos de serviço ou comandos de voz e receba em várias formas de pagamento.' },
  { icon: Boxes, title: 'Estoque organizado', text: 'Periféricos, peças e dispositivos separados, com estoque mínimo, histórico de movimentações e alertas.' },
  { icon: Truck, title: 'Fornecedores', text: 'Cada peça usada no conserto fica ligada ao fornecedor e à nota de compra, com custo e prazo de garantia.' },
  { icon: BarChart3, title: 'Métricas que importam', text: 'Lucro por OS, tempo de ciclo, conversão de orçamentos, curva ABC, giro de estoque e fechamento de caixa.' },
  { icon: CalendarClock, title: 'Prazos em dias úteis', text: 'Previsões de orçamento e entrega que pulam fins de semana e os feriados cadastrados pela loja.' },
  { icon: Search, title: 'Consulta pública', text: 'O cliente acompanha a própria OS pelo número, sem ligar para a loja nem precisar de senha.' },
];

const STEPS = [
  { icon: ClipboardList, title: 'Recebe', text: 'Cliente, aparelho, senha de desbloqueio e problema relatado. Imprime a segunda via.' },
  { icon: Wrench, title: 'Conserta', text: 'Diagnóstico e conserto com status visível para toda a equipe e alerta de atraso.' },
  { icon: PackageCheck, title: 'Entrega', text: 'Peças, mão de obra, desconto e pagamento registrados. Termo de garantia emitido.' },
  { icon: BarChart3, title: 'Acompanha', text: 'Faturamento, metas e perdas do dia na tela inicial; análises completas nas centrais.' },
];

const ACCESS = [
  { icon: ShieldCheck, title: 'Dona do sistema', text: 'Mantém a plataforma e acompanha as assistências que usam o CompuCell.' },
  { icon: UserCog, title: 'Administradores', text: 'Donos e gestores da assistência: métricas, custos, lucro, usuários e configurações.' },
  { icon: Users, title: 'Funcionários', text: 'Técnicos e atendentes: OSs, vendas e cadastros do dia a dia, sem acesso a dados sensíveis.' },
];

// Ilustração do produto (dados fictícios, só para a vitrine)
function ProductPreview() {
  const cols = [
    { title: 'Recebido', dot: 'bg-slate-400', cards: [['#1042', 'Troca de tela', 'Smartphone']] },
    { title: 'Em conserto', dot: 'bg-blue-500', cards: [['#1039', 'Conector de carga', 'Smartphone'], ['#1037', 'Teclado falhando', 'Notebook']] },
    { title: 'Pronto', dot: 'bg-green-500', cards: [['#1031', 'Bateria', 'Tablet']] },
  ];
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
      <div className="rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 backdrop-blur">
        <div className="overflow-hidden rounded-xl bg-slate-50 shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2">
            <i className="h-2.5 w-2.5 rounded-full bg-red-400" /><i className="h-2.5 w-2.5 rounded-full bg-amber-400" /><i className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="ml-3 text-[11px] font-semibold text-slate-400">Central de OSs · OSs não entregues</span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {cols.map((c) => (
              <div key={c.title} className="rounded-lg bg-slate-100 p-2">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><i className={`h-2 w-2 rounded-full ${c.dot}`} />{c.title}</p>
                <div className="space-y-2">
                  {c.cards.map(([n, issue, type]) => (
                    <div key={n} className="rounded-md bg-white p-2 shadow-card">
                      <p className="text-[11px] font-extrabold text-ink-900">{n}</p>
                      <p className="text-[10px] text-slate-600">{type}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-4 hidden rounded-xl bg-white p-3 shadow-pop sm:block">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><Store size={13} className="text-orange-500" /> Venda registrada</p>
        <p className="text-lg font-extrabold text-ink-900">R$ 89,90</p>
        <p className="text-[10px] text-slate-400">Pix · 2 itens</p>
      </div>
      <div className="absolute -right-3 -top-4 hidden items-center gap-2 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-pop sm:flex">
        <Mic size={14} /> “adicionar duas películas”
      </div>
    </div>
  );
}

export default function Landing() {
  const { token } = useAuth();
  const enter = token ? '/app' : '/login';

  return (
    <div className="bg-white text-slate-800">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-blue-100/80 md:flex">
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#como-funciona" className="hover:text-white">Como funciona</a>
            <a href="#acessos" className="hover:text-white">Acessos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/consulta" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-blue-100 hover:bg-white/10 sm:inline-flex">Consultar OS</Link>
            <Link to={enter} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-orange-600">
              {token ? 'Abrir sistema' : 'Entrar'} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-ink-950 pb-24 pt-32 sm:pt-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,rgba(249,115,22,0.22),transparent),radial-gradient(40rem_30rem_at_0%_100%,rgba(33,58,133,0.6),transparent)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-200 ring-1 ring-white/15">
              Sistema de gestão para assistências técnicas
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Da bancada ao balcão, <span className="text-orange-400">sua assistência inteira</span> em um só lugar.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-blue-100/80">
              Ordens de serviço, vendas, estoque e métricas pensados para a rotina de quem conserta celulares, notebooks e eletrônicos. Menos papel, menos retrabalho, nenhum aparelho esquecido na prateleira.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={enter} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-base font-bold text-white shadow-pop transition hover:bg-orange-600">
                {token ? 'Abrir o sistema' : 'Entrar no sistema'} <ArrowRight size={18} />
              </Link>
              <Link to="/consulta" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 text-base font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15">
                <Search size={18} /> Sou cliente: consultar OS
              </Link>
            </div>
            <p className="mt-8 flex items-center gap-2 text-sm text-blue-100/70">
              <CheckCircle2 size={16} className="text-emerald-400" /> Em operação na <b className="text-white">Compucell Tecnologias</b>
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-7xl scroll-mt-10 px-4 py-20 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wider text-orange-600">Recursos</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Tudo o que a assistência faz no dia, organizado em centrais.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-pop">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600"><Icon size={22} /></span>
              <h3 className="mt-4 font-bold text-ink-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-10 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-wider text-orange-600">Como funciona</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Um fluxo único, do aparelho que chega ao cliente que sai satisfeito.</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200">
                <span className="text-xs font-extrabold text-orange-500">0{i + 1}</span>
                <span className="mt-2 flex items-center gap-2 text-lg font-extrabold text-ink-900"><Icon size={20} className="text-blue-700" /> {title}</span>
                <p className="mt-1.5 text-sm text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="acessos" className="mx-auto max-w-7xl scroll-mt-10 px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-orange-600">Acessos</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Um só login, cada pessoa vê o que precisa.</h2>
            <p className="mt-3 text-slate-600">A mesma tela de entrada atende a todos. O que aparece depois depende do nível de acesso de cada usuário.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {ACCESS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={20} /></span>
                <h3 className="mt-3 font-bold text-ink-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-3xl bg-ink-900 px-6 py-10 sm:px-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Pronto para organizar a sua assistência?</h2>
            <p className="mt-2 text-blue-100/80">Entre com o usuário fornecido pelo administrador da sua loja.</p>
          </div>
          <Link to={enter} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 font-bold text-white transition hover:bg-orange-600">
            {token ? 'Abrir o sistema' : 'Entrar agora'} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:px-6">
          <Logo dark={false} />
          <p>© {new Date().getFullYear()} CompuCell · Gestão de assistência técnica</p>
          <Link to="/consulta" className="font-semibold text-blue-700 hover:underline">Consultar minha OS</Link>
        </div>
      </footer>
    </div>
  );
}
