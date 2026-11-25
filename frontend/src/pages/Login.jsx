import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck, UserCog, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../services/api';
import { btnPrimary, Field, inputCls } from '../components/ui';
import { Logo } from '../components/Layout';

// Um único formulário para todos os perfis: o nível de acesso vem do usuário cadastrado.
const PROFILES = [
  { icon: ShieldCheck, title: 'Dona do sistema', text: 'Gestão da plataforma' },
  { icon: UserCog, title: 'Administradores', text: 'Donos e gestores da assistência' },
  { icon: Users, title: 'Funcionários', text: 'Técnicos e atendentes' },
];

export default function Login() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/app" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/app', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,520px)]">
      <aside className="relative hidden overflow-hidden bg-ink-950 p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50rem_30rem_at_100%_0%,rgba(249,115,22,0.25),transparent),radial-gradient(40rem_30rem_at_0%_100%,rgba(33,58,133,0.7),transparent)]" />
        <Link to="/" className="relative"><Logo size="lg" /></Link>
        <div className="relative my-auto max-w-lg">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Um só acesso para toda a assistência.</h1>
          <p className="mt-3 text-lg text-blue-100/80">Entre com seu e-mail e senha. O sistema mostra as centrais de acordo com o seu nível de acesso.</p>
          <ul className="mt-8 space-y-3">
            {PROFILES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-orange-500/20 text-orange-300"><Icon size={20} /></span>
                <span><b className="block">{title}</b><span className="text-sm text-blue-100/70">{text}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-blue-100/50">CompuCell · Gestão de assistência técnica</p>
      </aside>

      <main className="flex flex-col justify-center bg-white px-6 py-10 sm:px-12">
        <Link to="/" className="mb-10 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-slate-500 hover:text-ink-900">
          <ArrowLeft size={16} /> Voltar ao site
        </Link>
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden"><Logo dark={false} size="lg" /></div>
          <h2 className="mt-6 text-2xl font-extrabold text-ink-900 lg:mt-0">Entrar</h2>
          <p className="mt-1 text-sm text-slate-500">Dona do sistema, administradores e funcionários usam o mesmo acesso.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="E-mail">
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required autoComplete="username" className={`${inputCls} pl-9`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoFocus />
              </div>
            </Field>
            <Field label="Senha">
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={show ? 'text' : 'password'} required autoComplete="current-password" className={`${inputCls} px-9`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
            <button className={`${btnPrimary} w-full py-3`} disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
          </form>

          <p className="mt-4 text-xs text-slate-500">Esqueceu a senha? Peça ao administrador da sua assistência para redefini-la.</p>
          <div className="mt-8 border-t border-slate-200 pt-6">
            <Link to="/consulta" className="text-sm font-semibold text-blue-700 hover:underline">Sou cliente: consultar minha ordem de serviço</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
