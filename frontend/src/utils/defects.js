// Classifica o "problema relatado" (texto livre) em categorias de defeito,
// para calcular a moda de defeitos por marca/modelo.
const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const RULES = [
  ['Oxidação / líquido', /molh|agua|oxid|liquido|umidade/],
  ['Tela / display', /tela|display|touch|lcd|oled|vidro|trinc|imagem|listra|mancha/],
  ['Bateria', /bateri|descarreg|nao segura carga|estufad|inchad/],
  ['Carregamento / conector', /carreg|conector|entrada usb|tipo.?c|lightning|cabo/],
  ['Não liga', /nao liga|desligad|morto|apagad|sem sinal de vida/],
  ['Software / sistema', /software|sistema|travad|trava|lento|virus|formata|atualiza|reinici|bootloop|senha|conta google|icloud|backup/],
  ['Áudio / microfone', /audio|som|alto.?falante|microfone|auricular|fone/],
  ['Câmera', /camera|foto|foco/],
  ['Botões', /botao|botoes|power|volume|home/],
  ['Conectividade', /wi.?fi|sinal|rede|bluetooth|chip|antena|operadora/],
  ['Teclado / touchpad', /teclad|touchpad|tecla/],
  ['Aquecimento', /esquent|aquec|cooler|ventoinha|temperatura/],
];

export const defectCategory = (text) => {
  const t = normalize(text);
  const hit = RULES.find(([, rx]) => rx.test(t));
  return hit ? hit[0] : 'Outros';
};

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// [{ name, total, top: { category, count }, categories: [{ category, count }] }]
export function defectModes(orders, by = 'model') {
  const groups = new Map();
  orders.forEach((o) => {
    const brand = (o.device?.brand || '').trim();
    const model = (o.device?.model || '').trim();
    if (!brand) return;
    const name = by === 'brand' ? titleCase(brand.toLowerCase()) : `${titleCase(brand.toLowerCase())} ${model}`.trim();
    const key = name.toLowerCase();
    const g = groups.get(key) || { name, total: 0, counts: new Map() };
    const cat = defectCategory(o.reported_issue);
    g.total += 1;
    g.counts.set(cat, (g.counts.get(cat) || 0) + 1);
    groups.set(key, g);
  });
  return [...groups.values()]
    .map((g) => {
      const categories = [...g.counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
      return { name: g.name, total: g.total, top: categories[0], categories };
    })
    .sort((a, b) => b.total - a.total);
}
