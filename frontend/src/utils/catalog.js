// Tipos de produto do estoque. O backend atual ainda não tem o campo `kind` no Product:
// enquanto ele não existir, todo produto é tratado como periférico.
export const PRODUCT_KINDS = {
  peripheral: {
    label: 'Periféricos',
    singular: 'periférico',
    path: '/app/gestao/perifericos',
    subtitle: 'Acessórios e produtos de balcão vendidos no PDV.',
  },
  part: {
    label: 'Peças',
    singular: 'peça',
    path: '/app/gestao/pecas',
    subtitle: 'Peças em estoque para uso nas ordens de serviço ou para venda.',
  },
  device: {
    label: 'Dispositivos',
    singular: 'dispositivo',
    path: '/app/gestao/dispositivos',
    subtitle: 'Aparelhos à venda. No backend, contam como produtos.',
  },
};

export const ITEM_KIND_LABEL = { peripheral: 'Periférico', part: 'Peça', device: 'Dispositivo', service: 'Serviço' };

export const productKind = (p) => (p && PRODUCT_KINDS[p.kind] ? p.kind : 'peripheral');

// null = não dá para saber (lista vazia); true/false = o backend devolve (ou não) o campo kind
export const backendHasKind = (products) => (products.length ? products.some((p) => p.kind !== undefined) : null);

// Margem sobre o preço de venda, em %
export const marginPct = (cost, price) => (Number(price) > 0 ? Math.round(((Number(price) - Number(cost || 0)) / Number(price)) * 1000) / 10 : 0);
