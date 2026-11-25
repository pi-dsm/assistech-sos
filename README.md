# **AssisTech \- Saas para Assistências Técnicas**

> Sistema de Gestão para Assistência Técnica, validado na **Compucell Tecnologias** (Jaú - SP).

## Apresentação

- **Slides da apresentação:** [inserir o link aqui](#) <!-- troque o # pelo link dos slides -->
- **Vitrine de exemplo (após rodar o seed):** `http://localhost:5173/loja/compucell`
- **Documentação da API (Swagger):** `http://localhost:3333/api-docs`

Atalhos: [Como executar](#apêndice-a--como-executar-o-projeto) · [Acessos de demonstração](#apêndice-b--acessos-de-demonstração) · [Estrutura do repositório](#apêndice-c--estrutura-do-repositório) · [Notas de implementação do MVP](#apêndice-d--notas-de-implementação-do-mvp)

---

1. # **Introdução**

   O AssisTech SOS é uma plataforma SaaS B2B Multi-Tenant concebida sob medida para a transformação digital e otimização operacional de Assistências Técnicas de micro e pequeno porte na cidade e microrregião de Jaú. O sistema integra a gestão completa de Ordens de Serviço (OS) com geração e envio de mensagens via WhatsApp em um clique pelo atendente (link wa.me), Ponto de Venda (PDV), previsão de faturamento por séries temporais, vitrine pública e portal do SuperAdmin. Módulos de emissão fiscal (NFS-e, NF-e, NFC-e), gateway de pagamento Asaas, envio automático via Evolution API e web scraping regional de mercado são funcionalidades planejadas para o futuro (fora do escopo do MVP).

2. # **Contextualização**

   A concepção do projeto originou-se de uma consultoria técnica operada junto à Compucell Tecnologias, uma assistência técnica local caracterizada pela gestão centralizada em um único proprietário solo. O diagnóstico inicial revelou sérios gargalos operacionais: acúmulo de funções administrativas, atendimento manual excessivo via WhatsApp, ausência de padronização na captura de credenciais de dispositivos (PIN/padrão visual) e controle financeiro informal descentralizado em planilhas ou papel. Diante da validação bem-sucedida da solução piloto, identificou-se a oportunidade de escalabilidade geográfica e de mercado, evoluindo a arquitetura de uma solução pontual de código único para uma plataforma SaaS capaz de descentralizar tarefas operacionais, mitigar retrabalhos e fornecer previsibilidade de caixa a múltiplos estabelecimentos comerciais da região.

3. # **Justificativa e Impacto**

   O mercado de manutenção de dispositivos eletrônicos na região de Jaú é composto predominantemente por micro e pequenas empresas operadas de forma solo ou por equipes extremamente reduzidas. O acúmulo de tarefas administrativas, atendimento ao cliente, execução técnica e controle financeiro gera inconsistências operacionais e perda de receita. O AssisTech SOS se justifica como uma solução tecnológica centralizada que automatiza rotinas repetitivas via WhatsApp, otimiza o tempo de bancada e fornece inteligência preditiva para gestão de caixa. O impacto esperado compreende a redução de até 60% no tempo gasto com atendimento inicial, a eliminação de gargalos na aprovação de orçamentos e um aumento na previsibilidade financeira das assistências locais.

4. # **Modelo Canvas (Business Model Canvas)**

   1. **Proposta de Valor:** Plataforma de gestão integrada com inteligência preditiva e automação de comunicação que reduz a carga de trabalho de proprietários solo e de pequenas equipes de assistências técnicas.  
   2. **Segmentos de Clientes:** Micro e pequenas assistências técnicas de eletrônicos, smartphones e computadores situadas na cidade e microrregião de Jaú.  
   3. **Canais:** Vendas diretas B2B locais, marketing digital regional, vitrine pública online e indicações entre estabelecimentos comerciais parceiros.  
   4. **Relacionamento com Clientes:** Suporte técnico humanizado local, autoatendimento via painel intuitivo e onboarding acompanhado nos primeiros 30 dias de operação.  
   5. **Fontes de Receita:** Assinatura SaaS recorrente (planos mensal/anual divididos em tiers), taxas sobre módulos adicionais de emissão fiscal e integrações de pagamento.  
   6. **Recursos-Chave:** Infraestrutura cloud escalável, algoritmo de previsão de receita, engine de integração com API do WhatsApp e base de dados Multi-Tenant.  
   7. **Atividades-Chave:** Desenvolvimento contínuo de software, manutenção da infraestrutura, prospecção comercial local e suporte/treinamento a usuários.  
   8. **Parcerias-Chave:** Compucell Tecnologias (fornecedora do ambiente de testes e validação), gateway de pagamento Asaas, provedores de APIs WhatsApp e órgãos de apoio comercial local.  
   9. **Estrutura de Custos:** Custos de hospedagem e banco de dados em nuvem, taxas de consumo de APIs externas (WhatsApp e emissão de notas fiscais), custos de marketing e licenças de software de desenvolvimento.

5. # **Objetivos**

   1. **Objetivo Geral:** Desenvolver um SaaS escalável utilizado por assistências técnicas de micro e pequeno porte da região de Jaú.  
   2. **Objetivos Específicos:**  
      1. Construir módulo de gestão completa de Ordens de Serviço integrado ao WhatsApp para notificações automáticas de status em tempo real.  
      2. Implementar PDV funcional acoplado a emissão fiscal automatizada (NFS-e, NF-e, NFC-e) e gestão financeira de caixa.  
      3. Desenvolver modelo algorítmico preditivo para análise de faturamento futuro e extração de inteligência competitiva regional via web scraping.  
      4. Disponibilizar vitrine pública customizável para exposição online de serviços e catálogo de aparelhos à venda por loja.  
      5. Arquitetar estrutura Multi-Tenant segura que possibilite o gerenciamento de até 3 unidades por empresa e 5 usuários por unidade.

6. # **Estudo de Viabilidade (Caso Real: Compucell Tecnologias)**

   1. **Viabilidade Técnica:** Validada pelo uso de arquitetura serverless em nuvem, garantindo capacidade de escalamento sem custos de infraestrutura física dedicada e suporte a integrações de API modernas.  
   2. **Viabilidade Econômica:** O custo de operação mantido em infraestrutura cloud é amortizado com a adesão de apenas duas assistências pagantes no plano intermediário, gerando ponto de equilíbrio financeiro rápido.  
   3. **Viabilidade Operacional:** Demonstrada pela facilidade de adoção no ambiente de testes da Compucell Tecnologias, onde o fluxo intuitivo reduziu a curva de aprendizado dos técnicos para menos de um dia.  
   4. **Viabilidade Organizacional:** Alinhada às demandas legais (LGPD) e fiscais locais, promovendo padronização dos processos internos e eliminando o uso de papéis e planilhas descentralizadas.

7. # **Mapeamento de Usuários**

   1. ## Personas:

      1. **SuperAdmin:** Gestor global da plataforma SaaS responsável pela administração de assinaturas, planos, assistências, ativação/desativação de tenants, acompanhamento de métricas globais e auditoria.  
      2. **Admin (Dono de Assistência):** Proprietário do estabelecimento que gerencia a loja, configura parâmetros (comprovantes, garantia, vitrine, feriados locais), cadastra usuários, define permissões e acompanha relatórios e auditorias.  
      3. **User:** Todo funcionário ou colaborador da assistência técnica, possuindo permissões configuráveis pelo Admin conforme suas atribuições operacionais (técnicas, atendimento ou caixa).  
      4. **Cliente Final:** Consumidor final da assistência técnica que consulta o andamento da Ordem de Serviço e aprova orçamentos via página pública sem necessidade de login.

   2. ## Mapas de Empatia:

      1. **Admin (Dono):** Sente sobrecarga e medo de perder o controle do caixa; escuta reclamações sobre atrasos; vê a concorrência crescendo; fala que precisa de mais tempo; busca automatizar tarefas operacionais e prever receitas.  
      2. **User:** Sente pressão pelo tempo de atendimento e bancada; escuta cobranças de clientes sobre prazos; busca agilidade no registro de OS, lançamento de peças, operação do caixa e atualização de status.  
      3. **Cliente Final:** Sente ansiedade por ficar sem o celular/dispositivo; escuta prazos incertos; vê falta de transparência nos preços; busca praticidade, aprovação remota rápida via WhatsApp e garantia do serviço prestado.

   3. ## Jornada dos Usuários:

      1. **Jornada do SuperAdmin:** 1\. Realiza login administrativo com e-mail e senha no portal global \-\> 2\. Visualiza o dashboard de métricas SaaS (MRR, ARR, Churn de 30 dias, ARPU e LTV) \-\> 3\. Cadastra novas assistências técnicas, define planos e parametriza a vitrine \-\> 4\. Cria o usuário Admin inicial da assistência e gerencia a ativação/desativação de assinantes \-\> 5\. Monitora logs globais de auditoria do sistema.  
      2. **Jornada do Admin (Dono da Assistência):** 1\. Acessa a plataforma e cadastra os usuários da loja, definindo permissões de acesso individualizadas \-\> 2\. Configura os parâmetros da assistência, incluindo modelos de comprovantes, termos de garantia, vitrine pública e feriados locais \-\> 3\. Acompanha os relatórios operacionais, o faturamento diário e o fluxo de caixa \-\> 4\. Monitora o registro de atividades e os logs de auditoria interna da assistência.  
      3. **Jornada do Usuário:** 1\. Realiza a abertura da Ordem de Serviço capturando dados do cliente, dispositivo e credenciais de segurança (senha numérica, PIN ou padrão visual) \-\> 2\. Imprime o comprovante de entrada em PDF para o cliente \-\> 3\. Acompanha e movimenta os cards das Ordens de Serviço no quadro Kanban \-\> 4\. Registra diagnósticos, lança serviços e peças com baixa automática no estoque \-\> 5\. Opera o caixa diário, gerencia suprimentos/sangrias e finaliza a entrega do aparelho com recebimento do pagamento e emissão do termo de garantia.  
      4. **Jornada do Cliente Final:** 1\. Recebe o link de acompanhamento via mensagem no WhatsApp fornecido pelo atendente \-\> 2\. Acessa a página pública \`/loja/\<loja\>/os/\<número\>\` sem necessidade de login \-\> 3\. Visualiza o status da manutenção, checklist de entrada e detalhes do orçamento \-\> 4\. Realiza a aprovação ou recusa remota do orçamento pela própria interface pública \-\> 5\. Retira o dispositivo na loja física após notificação de conclusão.

8. # **Documentação de Requisitos**

   1. ## Requisitos Funcionais:

      1. **RF01 \- Gestão de Ordens de Serviço (OS):**  
         1. **RF01.1 \- Abertura de OS:** CRUD completo de Ordens de Serviço suportando cadastro de cliente, dispositivo, defeito relatado e checklists técnicos.  
         2. **RF01.2 \- Registro de Segurança & Credenciais:** Captura e armazenamento seguro de senhas numéricas, PIN e desenho gráfico de padrão visual de desbloqueio.  
         3. **RF01.3 \- Gestão de Status via CRM Kanban:** Quadro Kanban interativo para movimentação entre as etapas padronizadas: Aguardando análise, Orçamento pendente, Em reparo, Aguardando peça, Concluído, Entregue, Cancelada e Retorno, mantendo histórico de alterações e observações.  
         4. **RF01.4 \- Notificações via WhatsApp (wa.me):** Geração dinâmica da mensagem pré-formatada e do link \`wa.me\` para que o atendente/usuário realize o envio manual da notificação em apenas um clique.  
         5. **RF01.5 \- Gestão de Retornos & Garantia:** Vínculo automático de novas chamadas ao histórico de OSs anteriores do mesmo aparelho, marcando status de "Garantia/Retorno" e gerando emissão de termo impresso.  
         6. **RF01.6 \- Impressão de OS e Termo de Garantia:** Geração e exportação em formato PDF do comprovante de entrada da Ordem de Serviço e do termo de garantia legal/contratual para impressão.  
         7. **RF01.7 \- Gestão Inteligente de Prazos:** Cálculo de prazos limite em dias úteis, desconsiderando fins de semana e feriados (nacionais, estaduais, municipais e facultativos) cadastrados nas configurações da loja.  
         8. **RF01.8 \- Preenchimento por Voz:** Suporte a entrada de dados via reconhecimento de voz nativo do navegador para cadastros gerais, abertura/edição de OS e PDV, com exceção da etapa de finalização da venda.  
      2. **RF02 \- PDV, Vendas de Balcão e Módulo Fiscal:**  
         1. **RF02.1 \- Ponto de Venda (PDV) e Caixa Diário:** Interface para vendas rápidas, controle de caixa diário com definição de fundo de troco, lançamento de sangria e suprimento, fechamento de caixa e recálculo automático server-side de eventuais quebras ou sobras.  
         2. **RF02.2 \- Leitura de Código de Barras:** Integração com leitores ópticos (USB/Bluetooth) para inclusão ágil de itens na venda de balcão e busca de estoque.  
         3. **RF02.3 \- Emissão Fiscal Automática (Planejado / Fora do MVP):** Integração para geração e emissão automatizada de documentos fiscais (NFS-e, NF-e, NFC-e).  
      3. **RF03 \- Vitrine Pública e Atendimento Online:**  
         1. **RF03.1 \- Vitrine Pública da Loja:** Página pública parametrizável acessível via \`/loja/\<endereço\>\` para exibição de produtos em estoque e catálogo de serviços disponibilizados pela assistência.  
         2. **RF03.2 \- Consulta e Aprovação Pública de OS:** Página pública \`/loja/\<loja\>/os/\<número\>\` onde o cliente final pode visualizar o andamento, verificar orçamentos e realizar a aprovação/recusa sem necessidade de autenticação.  
      4. **RF04 \- Integrações Financeiras e Pagamentos:**  
         1. **RF04.1 \- Gateway de Pagamento Asaas (Planejado / Fora do MVP):** Integração para emissão de PIX dinâmico, boletos e links de pagamento com baixa via Webhook.  
         2. **RF04.2 \- Parcelamento e Taxas:** Cálculo dinâmico de parcelamento em cartão de crédito no PDV com repasse opcional de taxas de processamento ao cliente.  
      5. **RF05 \- Controle de Acesso e Multi-Tenancy (RBAC):**  
         1. **RF05.1 \- Multitenancy e Numeração Independente:** Isolamento automático de dados por tenant implementado via plugin do Mongoose, contando com acesso global pelo SuperAdmin e controle de numeração sequencial própria de OS e vendas por assistência.  
         2. **RF05.2 \- Gestão de Perfis & Planos:** Estruturação dos perfis SuperAdmin, Admin e Usuário (com matriz de 11 permissões granulares configuráveis pelo Admin), oferecendo suporte aos planos Básico e Profissional, sem limitação de filiais.  
         3. **RF05.3 \- Logs de Auditoria:** Rastreabilidade completa registrando usuário responsável, ação realizada, data/hora, assistência vinculada e dados alterados (com mascaramento automático de senhas e credenciais).  
      6. **RF06 \- Analytics Preditivo e Scraping de Mercado:**  
         1. **RF06.1 \- Previsão Preditiva de Receita:** Projeção de faturamento para os próximos 3 meses por meio de modelo estatístico de regressão linear, exibida graficamente através de gráfico de área com linha tracejada.  
         2. **RF06.2 \- Web Scraping Regional (Planejado / Fora do MVP):** Coleta automatizada de dados de preços de mercado para peças e acessórios na região de Jaú.  
      7. **RF07 \- Gestão de Estoque, Compras e Fornecedores:**  
         1. **RF07.1 \- Controle de Estoque & Insumos:** Gerenciamento de saldo, margem de lucro, alerta de estoque mínimo, localização física na bancada e parâmetro para exibição opcional do item na vitrine pública.  
         2. **RF07.2 \- Compras & Fornecedores:** Cadastro de fornecedores, lançamento de Ordens de Compra com recalculo de custo médio ponderado de aquisição e registro de histórico de compras.  
      8. **RF08 \- Configurações Gerais da Interface:**  
         1. **RF08.1 \- Preferências de Tema Visual:** Suporte a alternância e armazenamento das preferências de tema (claro, escuro ou automático sincronizado com o sistema operacional).

   2. ## Requisitos Não Funcionais:

      1. **RNF01 \- Conformidade Legal:** Adesão integral às diretrizes da LGPD para proteção e anonimização dos dados de clientes.  
      2. **RNF02 \- Disponibilidade:** Garantia de SLA mínimo de 99.9% de uptime para a plataforma em nuvem.  
      3. **RNF03 \- Desempenho:** Tempo médio de resposta das requisições de API inferior a 200ms.  
      4. **RNF04 \- Autenticação e Segurança:** Autenticação via JSON Web Tokens (JWT) com suporte a rotas de refresh token e verificação server-side de sessão/permissões.  
      5. **RNF05 \- Usabilidade e Responsividade:** Interface otimizada com suporte responsivo total para navegadores desktop e dispositivos móveis.  
      6. **RNF06 \- Documentação de API:** Documentação interativa de todos os endpoints REST via Swagger / OpenAPI 3.0 disponibilizada na rota \`/api-docs\`.  
      7. **RNF07 \- Operabilidade Offline Local (Demonstração):** Capacidade de funcionamento e demonstração local via Docker / rede local sem dependência de serviços externos em nuvem, e-mail, 2FA ou WhatsApp (com exceção do recurso de entrada por voz).

9. # **Modelagem de Arquitetura & Fluxos**

   1. ## Fluxos de Trabalho por Perfil de Usuário

      1. **Fluxo Operacional de Bancada (Técnico):** Seleção do card no Kanban \-\> Leitura do checklist prévio \-\> Execução técnica \-\> Aprazamento de peças com baixa automática no estoque \-\> Registro de foto/laudo técnico \-\> Atualização de status para 'Pronto para Retirada'.  
      2. **Fluxo Financeiro e Fiscal (Admin):** Recebimento do evento de encerramento de OS/Venda \-\> Processamento da transação no PDV \-\> Disparo de Webhook para Gateway de Pagamento \-\> Emissão automática do documento fiscal via API de NFS-e/NFC-e \-\> Atualização dos indicadores do Dashboard de margem líquida.

   2. ## Modelagem do Banco de Dados

      1. **Modelo Conceitual ER & Entidades:** Estruturado com as coleções centrais Tenant (empresas assinantes), User (operadores e perfil RBAC), Customer (clientes finais), Device (dispositivos), ServiceOrder (ordens de serviço), Product (produtos/estoque), StockMovement (movimentação de estoque), Service (catálogo de serviços), Supplier (fornecedores), Sale (vendas), CashClosing (fechamento de caixa), Holiday (feriados), Setting (configurações gerais), Counter (contadores de numeração) e AuditLog (auditoria). Todos os índices únicos são obrigatoriamente compostos contendo o \`tenant\_id\`.  
      2. **Schema Documental (MongoDB) & Indexação Multi-Tenant:** Modelagem orientada a documentos mantendo a propriedade \`tenant\_id\` obrigatória e indexada de forma composta com \`store\_id\` e \`\_id\` em todas as coleções. Isso garante isolamento físico lógico na camada de busca e previne vazamento de dados entre empresas assinantes.  
      3. **Diagrama de Classes:** Classes de domínio mapeando propriedades operacionais de serviços, itens de estoque com cálculo automático de margem, histórico de movimentação financeira e registros de logs auditáveis.

   3. ## Especificação dos Endpoints (API REST)

      1. **Autenticação & RBAC:** POST /api/v1/auth/login, POST /api/v1/auth/refresh-token, GET /api/v1/auth/me, GET /api/v1/users/permissions  
      2. **Ordens de Serviço & Impressão:** GET /api/v1/service-orders, POST /api/v1/service-orders, GET /api/v1/service-orders/{id}, PUT /api/v1/service-orders/{id}, PATCH /api/v1/service-orders/{id}/status, GET /api/v1/service-orders/{id}/receipt.pdf, GET /api/v1/service-orders/{id}/warranty.pdf  
      3. **Estoque & Fornecedores:** GET /api/v1/inventory, POST /api/v1/inventory, PUT /api/v1/inventory/{id}, GET /api/v1/suppliers, POST /api/v1/suppliers/purchase-order  
      4. **PDV, Caixa & Módulo Fiscal (Planejado):** POST /api/v1/sales, GET /api/v1/cash-closings/open, POST /api/v1/cash-closings/movements, POST /api/v1/cash-closings/close, POST /api/v1/fiscal/emit (planejado)  
      5. **Clientes:** GET /api/v1/customers, POST /api/v1/customers, PUT /api/v1/customers/{id}  
      6. **Analytics & Públicos:** GET /api/v1/analytics/predictive-revenue, GET /api/v1/analytics/market-scraping (planejado), GET /api/v1/public/stores/{loja}, GET /api/v1/public/stores/{loja}/service-orders/{número}, POST /api/v1/public/stores/{loja}/service-orders/{número}/approve  
      7. **Administração Global (SuperAdmin) & Configurações:** GET/POST /api/v1/super/tenants, GET /api/v1/super/metrics, GET /api/v1/super/audit, GET/PUT /api/v1/tenant, GET /api/v1/tenant/audit, GET/POST/DELETE /api/v1/holidays

   4. ## Pipeline de CI/CD e DevOps

      1. Pipeline orquestrado via GitHub Actions acionado a cada push ou Pull Request nas branches de desenvolvimento e produção. O fluxo executa análises estáticas de código (ESLint), verificações de segurança de dependências, testes unitários e testes de integração com banco de dados em contêiner temporário Docker. Após a aprovação do pipeline, realiza-se o deploy contínuo automatizado do Frontend e da API Backend na infraestrutura da Vercel (ou Render, conforme a necessidade de infraestrutura) e do banco de dados no MongoDB Atlas, acompanhado de rotinas automáticas de migração de schema e validação de saúde do ambiente (health check).

10. # **Relatórios Gerenciais**

    1. **Indicadores-Chave de Desempenho (KPIs):** O sistema calcula dinamicamente o Ticket Médio por OS, Tempo de Bancada, Previsão de Faturamento e Métricas SaaS globais (MRR, ARR, Churn de 30 dias, ARPU e LTV).  
    2. **Tratamento Estatístico e Análise de Dados:** Para garantir dados confiáveis no apoio à decisão, o motor analítico utiliza:  
       1. **Análise do Tempo de Bancada & Regressão Linear:** Tratamento do tempo de bancada utilizando Média Aritmética, Mediana (para amenizar distorções provocadas por serviços atípicos retidos) e Desvio Padrão. A previsão de faturamento para os 3 meses subsequentes é calculada via modelo de regressão linear.  
       2. **Métricas de Negócio SaaS:** Acompanhamento contínuo da Receita Recorrente Mensal (MRR), Receita Recorrente Anual (ARR), Taxa de Cancelamento (Churn 30 dias), Receita Média por Usuário (ARPU) e Valor do Tempo de Vida do Cliente (LTV).  
    3. **Visualização de Dados e Tipos de Gráficos:** A interface utiliza bibliotecas gráficas responsivas estruturadas por tipo de análise:  
       1. **Gráficos de Linha & Área:** Visualização temporal de faturamento acumulado e projeção preditiva contínua.  
       2. **Gráficos de Barras Comparativos:** Comparação entre volume de faturamento de vendas de balcão vs. prestação de serviços por período.  
       3. **Gráficos de Rosca / Donut:** Distribuição percentual da composição de custos (peças, impostos, margem líquida) e categorias de serviços mais solicitadas.  
    4. **Histogramas & Diagramas de Pareto:** Mapeamento de frequência de defeitos por fabricante e análise da curva ABC de insumos em estoque.

11. # **User Interface e User Experience (UI/UX)**

    1. ## Design System

       1. **1\. Paleta de Cores (Tailwind CSS):** A arquitetura visual suporta Light Mode e Dark Mode nativamente através das classes do Tailwind CSS. O esquema de cores neutras no Light Mode compreende \`slate-50\` (fundo principal), \`slate-100\` (superfícies e cards) e \`slate-900\` (texto de alto contraste). No Dark Mode, utilizam-se os tons \`slate-950\` (fundo principal), \`slate-900\` (superfícies de elementos) e \`slate-100\` (texto legível). A cor primária de destaque em toda a plataforma é o Azul (\`blue-600\` no modo claro e \`blue-500\` no modo escuro), transmitindo confiança e clareza para ações principais e navegação. O Laranja (\`amber-500\` / \`orange-500\`) é aplicado de forma estritamente pontual e esparsa, reservado apenas para alertas críticos, avisos de estoque baixo ou destaques de alta prioridade.  
       2. **2\. Tipografia e Tema:** Tipografia local padronizada sob a família **Plus Jakarta Sans**. O sistema oferece suporte individual a tema escuro por preferência do usuário (salvo localmente).  
       3. **3\. Ícones e Arquitetura de Telas:** Utilização da biblioteca **Google Material Symbols Rounded** de forma local. A navegação é estruturada em centrais lógicas: Tela inicial, Central de OSs, Central de Vendas, Central de Gestão, Central do Administrador, Configurações gerais e menu do SuperAdmin.

12. #  **Metodologia de Desenvolvimento e Stack Tecnológica**

    1. **Metodologia:** Scrumban adaptado para projeto solo.  
    2. **Frontend:** React.js e Tailwind CSS.  
    3. **Backend:** Node.js (Express).  
    4. **Banco de Dados:** MongoDB Atlas (NoSQL) com Mongoose.  
    5. **Integrações:** API WhatsApp Web / Evolution API, Gateway Asaas e serviços REST fiscais.

13. #  **Resultados Alcançados**

    1. Conclusão e validação do protótipo funcional MVP em parceria com a Compucell Tecnologias. O MVP demonstrou redução significativa no tempo de registro de OS, envio automatizado e transparente de orçamentos e aprovação ágil por clientes via WhatsApp.

14. # **Trabalhos Futuros**

    1. Implementação dos módulos de emissão fiscal (NFS-e/NF-e/NFC-e), gateway de pagamento Asaas, automação de envio via Evolution API (WhatsApp), web scraping de mercado regional, suporte a múltiplas filiais (até 3 unidades), captura de foto do aparelho no check-in de entrada e deploy em infraestrutura cloud em produção.

15. #  **Agradecimentos**

    1. Agradeço à Compucell Tecnologias pelo espaço, confiança e apoio fundamental na validação prática deste projeto, e principalmente ao meu pai, que está por trás de tudo isso.  
    2. Agradeço também aos meus amigos, família e principalmente meu namorado, que me apoiou em todas as dificuldades que eu enfrentei esse semestre desenvolvendo um projeto solo.  
    3. E por fim, agradeço o apoio de todas as professoras e mentoras que me deram um rumo todas as vezes que eu fui chorar as pitangas por não ter certeza do que fazer, e que me orientaram muito bem no desenvolvimento desta solução tecnológica.

---

## Apêndice A – Como executar o projeto

Tudo roda localmente, sem depender de internet (exceto o preenchimento por voz, que usa o reconhecimento do navegador).

**Pré-requisitos:** Node.js 20+ e MongoDB 6+ (instalado na máquina ou pelo Docker).

1. **Banco de dados.** Use um MongoDB local ou suba só o banco do `docker-compose.yml`:
   ```bash
   docker compose up -d db
   ```
2. **Backend (API em `http://localhost:3333`):**
   ```bash
   cd backend
   cp .env.example .env      # ajuste MONGODB_URI e JWT_SECRET
   npm install
   npm run seed              # ATENÇÃO: apaga o banco e cria os dados de demonstração
   npm run dev
   ```
   Com o banco do Docker, use `MONGODB_URI=mongodb://admin:senha123@127.0.0.1:27017/assistech?authSource=admin`.
3. **Frontend (`http://localhost:5173`):**
   ```bash
   cd frontend
   cp .env.example .env      # VITE_SALES_WHATSAPP: número do botão "Quero assinar"
   npm install
   npm run dev
   ```
   O Vite encaminha `/api` para a API na porta 3333.
4. **Testes unitários:** `npm test` no `backend` (dias úteis, documentos e relatórios de vendas) e no `frontend` (dias úteis).

**Variáveis de ambiente do backend (`backend/.env`):**

| Variável | Uso |
|---|---|
| `PORT` | Porta da API (padrão 3333) |
| `MONGODB_URI` | Conexão com o MongoDB |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Assinatura e validade do token |
| `CORS_ORIGIN` | Origens liberadas para o frontend |
| `TZ` | Fuso usado nos relatórios (America/Sao_Paulo) |
| `PUBLIC_URL` | Endereço do frontend, usado no link de acompanhamento enviado pelo WhatsApp |

## Apêndice B – Acessos de demonstração

Criados pelo `npm run seed`:

| Perfil | E-mail | Senha | Observação |
|---|---|---|---|
| SuperAdmin | super@assistech.com | super123 | Portal da plataforma (assinantes, métricas SaaS, auditoria) |
| Admin – Compucell | admin@compucell.com | admin123 | Todas as permissões da loja |
| User – Compucell | lucas@compucell.com | lucas123 | Permissões padrão |
| User – Compucell | juliana@compucell.com | juliana123 | Também estorna vendas e vê métricas |
| Admin – Conserta Já | admin@consertaja.com | admin123 | Segunda assistência, para mostrar o isolamento dos dados |

O seed também cria a assistência **Cell Point Bariri** desativada (aparece no churn) e cerca de seis meses de histórico na Compucell (para a previsão de receita): OSs em todos os status, vendas, estoque, fornecedores, feriados e caixas fechados.

## Apêndice C – Estrutura do repositório

```
backend/
  src/
    config/       tenant (isolamento multi-tenant), permissions, swagger, company, db
    models/       Tenant, User, Customer, Device, ServiceOrder, Product, StockMovement, Service,
                  Supplier, Sale, CashClosing, Holiday, Setting, Counter, AuditLog
    controllers/  regras de cada recurso da API
    routes/       rotas REST (/api/v1/...)
    services/     fluxos de OS, vendas, estoque, pagamentos, PDF e calendário
    utils/        dias úteis, dinheiro, documentos (CNPJ/CPF), relatórios
    seed-demo.js  dados de demonstração
frontend/
  src/
    pages/        Landing, Login, Tela inicial, vitrine, consulta pública e as centrais
                  (os/, sales/, management/, admin/, super/)
    components/   layout, ícones, modais de OS, vendas, catálogo e gráficos
    config/       navegação por centrais e permissões
    context/      sessão (AuthContext) e avisos (ToastContext)
    hooks/        voz, feriados, fluxo de status da OS
    utils/        formatação, dias úteis, voz, vendas e catálogo
docker-compose.yml  MongoDB (e containers da aplicação)
```

## Apêndice D – Notas de implementação do MVP

Pontos em que a versão atual do código difere ou detalha o que está descrito acima:

- **Multi-tenant:** o campo do assinante se chama `tenant` em todas as coleções. Não há `store_id` nesta versão, porque cada assinante é uma loja (filiais ficam para os trabalhos futuros). O filtro por assinante é aplicado por um plugin do Mongoose (`backend/src/config/tenant.js`) em consultas, agregações e gravações.
- **Permissões:** o Admin tem todas; o User recebe as que o Admin marcar (11 permissões). A Central do Administrador é sempre exclusiva do Admin. Planos: Básico (até 2 usuários ativos) e Profissional (até 5).
- **Manutenção da OS:** o registro de manutenção guarda relatório, peças e mão de obra e pode ser salvo várias vezes antes de concluir. As peças da OS registram fornecedor, nota e custo, mas não dão baixa no estoque de produtos (a baixa automática acontece nas vendas do PDV e nas compras de fornecedor).
- **Orçamento público:** o cliente aprova o orçamento pelo link; a recusa é tratada pela loja (cancelando a OS). O checklist de entrada é registrado no defeito relatado e nas observações internas.
- **Caixa:** rotas `GET /cash-closings/status` (apelido `/cash-register/status`), `POST /cash-closings/open`, `POST /cash-closings/movements` e `POST /cash-closings` (fechamento).
- **Apelidos de rota da documentação:** `/os` → `/service-orders`, `/inventory` → `/products`, `/pdv/checkout` → `POST /sales`, `/analytics/predictive-revenue` → `/dashboard/predictive-revenue`.
- **Ainda não implementados:** emissão fiscal, Asaas, envio automático pela Evolution API, web scraping, repasse de taxas do cartão ao cliente, foto do aparelho e deploy em nuvem.
- **Tema:** a preferência (claro, escuro ou automático) fica salva no perfil de cada usuário, no servidor.
- **Banco na demonstração:** MongoDB local; o MongoDB Atlas é o alvo do deploy em produção.
