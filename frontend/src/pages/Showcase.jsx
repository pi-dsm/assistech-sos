import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapPin, MessageCircle, Package, Phone, Search, Smartphone, Tags } from '../components/icons';
import api, { errMsg } from '../services/api';
import { brl, onlyDigits } from '../utils/format';
import { btnPrimary, inputCls, Spinner } from '../components/ui';
import { Logo } from '../components/Layout';

// Vitrine pública da assistência: /loja/:slug (sem login)
export default function Showcase() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [number, setNumber] = useState('');

  useEffect(() => {
    api.get(`/public/stores/${slug}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [slug]);

  if (error) return <p className="p-10 text-center text-slate-600">{error}</p>;
  if (!data) return <Spinner />;
  const { store, products, services } = data;
  const devices = products.filter((p) => p.kind === 'device');
  const others = products.filter((p) => p.kind !== 'device');
  const wa = onlyDigits(store.whatsapp);

  const Section = ({ icon: Icon, title, items, price }) =>
    items.length > 0 && (
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-slate-900"><Icon size={20} /> {title}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="font-semibold text-slate-900">{p.name}</p>
              {p.description && <p className="mt-1 text-xs text-slate-500">{p.description}</p>}
              <p className="mt-2 font-bold text-blue-700">{brl(p[price])}</p>
            </div>
          ))}
        </div>
      </section>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-ink-900 px-4 py-10 text-white sm:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-white/60">Assistência técnica</p>
          <h1 className="mt-1 text-3xl font-bold text-white">{store.name}</h1>
          {store.headline && <p className="mt-2 text-lg text-white/80">{store.headline}</p>}
          {store.about && <p className="mt-1 text-sm text-white/60">{store.about}</p>}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/80">
            {store.address && <span className="flex items-center gap-1.5"><MapPin size={16} /> {store.address}</span>}
            {store.phone && <span className="flex items-center gap-1.5"><Phone size={16} /> {store.phone}</span>}
            {wa && <a className="flex items-center gap-1.5 hover:text-white" href={`https://wa.me/55${wa}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-8">
        <form onSubmit={(e) => { e.preventDefault(); navigate(`/loja/${slug}/os/${number}`); }} className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="min-w-56 flex-1">
            <p className="mb-1 font-semibold text-slate-900">Acompanhe seu reparo</p>
            <input inputMode="numeric" required className={inputCls} placeholder="Número da OS" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} />
          </div>
          <button className={btnPrimary}><Search size={16} /> Consultar OS</button>
        </form>

        <Section icon={Tags} title="Serviços" items={services} price="price" />
        <Section icon={Smartphone} title="Aparelhos à venda" items={devices} price="sale_price" />
        <Section icon={Package} title="Produtos" items={others} price="sale_price" />
      </main>

      <footer className="flex flex-col items-center gap-2 py-8 text-xs text-slate-500">
        <span>Vitrine criada com</span>
        <Link to="/"><Logo dark={false} /></Link>
      </footer>
    </div>
  );
}
