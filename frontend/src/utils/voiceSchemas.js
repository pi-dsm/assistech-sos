// Palavras-chave de cada formulário. `words` aceita variações; acentos e maiúsculas não importam.
// Os `key` são exatamente os nomes dos campos dos formulários.

export const productVoice = {
  example: '“nome película 3D, código de barras 7 8 9 1 0 0 0, categoria película, custo 5 reais, preço 25 reais, estoque 10, estoque mínimo 3”',
  schema: [
    { key: 'name', label: 'nome', type: 'text', words: ['nome do produto', 'nome', 'produto'] },
    { key: 'barcode', label: 'código de barras', type: 'digits', words: ['código de barras', 'codigo', 'barras'] },
    {
      key: 'category', label: 'categoria', type: 'enum', words: ['categoria'],
      options: {
        accessory: ['acessorio'], stationery: ['papelaria'], keyboard: ['teclado'],
        screen_protector: ['pelicula'], lighting: ['luz', 'luzes', 'iluminacao', 'lampada'], other: ['outro'],
      },
    },
    { key: 'cost_price', label: 'custo', type: 'money', words: ['custo', 'compra'] },
    { key: 'sale_price', label: 'preço de venda', type: 'money', words: ['preço', 'preco', 'venda'] },
    { key: 'stock_quantity', label: 'estoque', type: 'integer', words: ['estoque', 'quantidade'] },
    { key: 'min_stock', label: 'estoque mínimo', type: 'integer', words: ['estoque mínimo', 'mínimo'] },
  ],
};

export const serviceVoice = {
  example: '“nome xerox, preço 50 centavos, custo 10 centavos, descrição cópia preto e branco”',
  schema: [
    { key: 'name', label: 'nome', type: 'text', words: ['nome do serviço', 'nome', 'serviço'] },
    { key: 'price', label: 'preço', type: 'money', words: ['preço', 'preco', 'valor', 'cobrar'] },
    { key: 'cost_price', label: 'custo', type: 'money', words: ['custo', 'insumo'] },
    { key: 'description', label: 'descrição', type: 'text', words: ['descrição', 'descricao', 'detalhes'] },
  ],
};

export const supplierVoice = {
  example: '“nome TecPeças Distribuidora, cnpj 11 222 333 0001 81, contato Marcos, telefone 11 4002 8922, cidade São Paulo, estado São Paulo”',
  schema: [
    { key: 'name', label: 'nome', type: 'text', words: ['razão social', 'nome do fornecedor', 'nome', 'fornecedor'] },
    { key: 'document', label: 'CNPJ/CPF', type: 'document', words: ['cnpj', 'cpf', 'documento'] },
    { key: 'contact_name', label: 'contato', type: 'name', words: ['pessoa de contato', 'contato', 'responsável'] },
    { key: 'phone', label: 'telefone', type: 'phone', words: ['telefone', 'celular', 'whatsapp'] },
    { key: 'email', label: 'e-mail', type: 'email', words: ['e-mail', 'email'] },
    { key: 'address', label: 'endereço', type: 'text', words: ['endereço', 'endereco', 'rua'] },
    { key: 'city', label: 'cidade', type: 'name', words: ['cidade'] },
    { key: 'state', label: 'UF', type: 'uf', words: ['estado', 'uf'] },
    { key: 'notes', label: 'observações', type: 'text', words: ['observações', 'observacoes', 'observação'] },
  ],
};