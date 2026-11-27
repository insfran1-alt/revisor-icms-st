# Revisor ICMS-ST — SEFAZ/MS · Simples Nacional

**Acesse o app:** https://insfran1-alt.github.io/revisor-icms-st/

Ferramenta web para **revisar as cobranças de ICMS-ST (tributo 333) e de ICMS Equalização Simples Nacional (tributo 349)** apuradas pela SEFAZ/MS nas compras interestaduais de empresas do Simples Nacional. Ela:

- confere **item a item** as memórias de cálculo de cada nota fiscal;
- encontra **duplicidade do mesmo produto da mesma NF cobrado como ST e como Equalização**, além de NF cobrada em dois meses, linha repetida e ST já retido pelo fornecedor;
- aponta erros de cálculo, crédito a menor, MVA divergente, item sem CEST, percentual de Equalização errado, insumos e itens de uso e consumo tributados como ST, isenção de ME etc.;
- confere a MVA de cada item de ST com a **relação oficial do Subanexo I do Anexo III do RICMS/MS** (embutida no app) e aponta mercadoria fora da lista de ST;
- gera o **relatório consolidado** (Excel) com as colunas **Base legal** e **Fundamentação**, o **requerimento** pronto (Word/PDF) e a **lista de NFs para o pedido no e-Fazenda**;
- guarda o cadastro das empresas com as **atividades (CNAE) do cartão CNPJ**.

> **Privacidade:** tudo roda no seu navegador. Os PDFs, planilhas e XMLs são lidos localmente e os dados ficam salvos só no navegador (IndexedDB). Nada é enviado a servidores — nem ao GitHub. A única exceção é opcional: se você clicar em *Buscar razão social*, o CNPJ dos fornecedores é consultado na BrasilAPI.

## Como usar

> Novidade: tela **Vendas × ST**, que cruza o Registro de Saídas e o Controle do Simples (Makro) com as cobranças de ST (veja a seção própria abaixo). Agora também lê o SPED Fiscal de entradas e a Relação de Produtos por Nota da Domínio.

1. **Empresas** — importe o **cartão CNPJ** (PDF da Receita). As atividades (CNAE), o porte e a data de abertura ficam salvos e orientam a análise.
2. **Importar** — arraste de uma vez (várias empresas e meses):
   - **Relatório de Prévia com Cálculos ICMS** (PDF) de cada tributo: 333 – ST Comércio e 349 – Equalização Simples Nacional;
   - **Equalização:** a tela **"Dados da Nota"** de cada NF — copie as páginas (cabeçalho da nota e tabela, 15 itens por página) e cole uma abaixo da outra no Excel (ex.: `NOTA 17134.xlsx`), ou cole direto em *Importar → Colar a tabela do portal*. O PDF da tela também serve (um arquivo por página). O app junta as páginas da mesma NF pela numeração "Visualizando 1 - 15 de N", descarta página repetida e avisa se faltar alguma;
   - **ICMS-ST:** a tabela da memória de cálculo — **copie no portal e cole** em *Importar → Colar a tabela do portal*, ou salve em planilha com o número da NF no nome (ex.: `NOTA 19192.xlsx`);
   - opcional: o **XML da NF-e** (confirma ST retido pelo remetente, destinatário, CEST e linhas repetidas).
3. **Revisão** — filtre por empresa, referência, tributo, força, tipo de achado, status, UF e valor. Clique num achado para ver os dados do item, a fundamentação, a base legal e os documentos a anexar; marque o status e o protocolo.
4. **Pedido** — gere o Excel, o requerimento e a lista para o e-Fazenda.
   - **Lista e-Fazenda**: montada como a tela *Informações Fiscais → Revisão de NF* — aba **Notas a Desvincular** (NF inteira: devolução, cancelamento, outro destinatário, ME isenta…) e aba **Notas a Alterar** (item a item, com NCM, descrição, valor e ICMS). Cada linha traz o **Motivo** da lista do portal e os textos do quadro "Confirmação de Dados" já no limite: **Descrição** até 99 caracteres e **Justificativa** até 199, com botão de copiar e planilha.
   - **Notas e itens → Memória de cálculo**: a memória completa, linha a linha (ICMS-ST ou Equalização), com todas as colunas da SEFAZ (as vazias podem ser ocultadas) e colunas auxiliares com NF, referência, CNPJ e razão social do fornecedor, UF e emissão; colunas de conferência (MVA calculada e de referência, item do Subanexo I, ICMS recalculado, a revisar, achados). Filtro em cada coluna (texto ou `>100`, `<50`), ordenação pelo título, agrupamento com subtotais, totais no rodapé e *Excel* com o que está na grade, já com autofiltro.
   - **Fornecedores** (*Tabelas e regras*): a razão social vem do XML da NF-e; sem XML, digite-a ou use *Buscar razão social*, que consulta o CNPJ do fornecedor na BrasilAPI (dados públicos da Receita Federal) — só o CNPJ é enviado, e só quando você pede.
   - **Notas e itens → Itens**: todos os itens cobrados, com filtro *para revisão / com valor a revisar / sem apontamento* e agrupamento por descrição, NCM, CEST, NCM e CEST, GTIN, fornecedor, nota, tributo, referência, segmento ou item do Subanexo I, MVA aplicada, percentual da Equalização ou situação na revisão. O botão *Excel* gera a planilha do agrupamento e dos itens, para conferir em outros portais (ex.: Econet).
   - O menu lateral pode ser recolhido (botão *Recolher menu*), ficando só os ícones.
5. **SOS Reforma** — na tela Revisão, o botão *SOS Reforma* gera a relação dos produtos no modelo do SOS Reforma (`CNPJ | NCM | Descrição | GTIN | Código do Produto`, aba `Sheet1`), um produto por linha, para conferir NCM e classificação. Vale a empresa e a referência escolhidas no topo. Com o XML da NF-e importado, a relação leva a descrição completa, o GTIN e o código do produto da nota; sem XML, o código é gerado pelo app e é sempre o mesmo para o mesmo produto.

### Força dos achados

| Força | Significado |
|---|---|
| **Forte** | Base legal direta e números objetivos — pedir revisão. |
| **Moderada** | Depende de documento ou confirmação (destinação do produto, CEST, MVA). |
| **Atenção** | Ponto a conferir antes de pedir. |

O valor a revisar é **consolidado sem dupla contagem**: um item nunca é contestado acima do ICMS cobrado.

## Checagens realizadas

| Checagem | Base legal principal |
|---|---|
| Mesmo item cobrado na ST e na Equalização | Dec. 15.055/2018, art. 3º, § 1º, II, "a"; LC 123/2006, art. 13, § 1º, XIII, "g" |
| Bases (ST + EQ) acima do valor da NF | Dec. 15.055/2018, arts. 3º e 4º; LC 87/1996, art. 8º |
| NF cobrada em mais de uma referência | CTN, art. 165; Res. SEFAZ 3.033/2019, art. 2º |
| Linha repetida na memória de cálculo | CTN, art. 165 |
| ICMS-ST já retido pelo remetente (XML) | Conv. ICMS 142/2018, cláusulas 8ª e 18ª |
| NF de outro destinatário (XML) | Res. SEFAZ 3.033/2019 |
| NF devolvida, cancelada ou não recebida | LC 87/1996, art. 12; CTN, art. 114; Ajuste SINIEF 07/2005 |
| Erro de cálculo do ICMS-ST / crédito a menor | LC 87/1996, art. 8º, § 5º; CF, art. 155, § 2º, I; Conv. 142/2018, cl. 13ª |
| MVA acima da prevista no Subanexo I / divergente para o mesmo produto | LC 87/1996, art. 8º, II, "c"; RICMS/MS, Anexo III, Subanexo I |
| Item de ST sem CEST / fora da relação do Subanexo I | Conv. ICMS 142/2018, cláusula 7ª; RICMS/MS, Anexo III, Subanexo I |
| Insumo (lanchonete/indústria) e uso e consumo, brinde ou degustação tributados como ST | CF, art. 150, § 7º; LC 87/1996, art. 10; Conv. 142/2018, cl. 9ª e 12ª–13ª; Dec. 15.055/2018 |
| Percentual de Equalização incorreto | Dec. 15.055/2018, art. 5º; Res. SF 22/1989 e 13/2012 |
| ME isenta da Equalização / MEI dispensado | Dec. 16.177/2023, art. 1º, III; Dec. 13.115/2011 |

A lista completa, com o texto de cada norma, está na tela **Como usar** e na aba **Base legal** do Excel.

## Relação oficial do Subanexo I (RICMS/MS)

O app traz a relação das mercadorias sujeitas à ST em MS — **Subanexo I do Anexo III do RICMS/MS**: 941 itens em 24 segmentos, com CEST, NCM, descrição e MVA original e ajustada (4%, 7% e 12%). É a versão obtida em 25/11/2026, com alterações até o Decreto nº 16.801/2026; só a redação em vigor é usada, sem as redações anteriores.

- **Conferência da MVA:** o item é localizado pelo CEST da nota. Sem CEST, é localizado pelo NCM, valendo o item de classificação mais específica (ex.: "7013.37.00 – outros copos" prevalece sobre "7013 – objetos de vidro"). Onde a relação traz duas tabelas, como bebidas por protocolo ou por tipo de remetente, vale a maior MVA.
- **Fora da lista:** quando nem o CEST nem o NCM constam da relação, o item é apontado como fora da ST.
- **Consulta:** em *Tabelas e regras*, pesquise por NCM, CEST ou palavras da descrição.
- **Atualizar:** baixe o Subanexo I no site da SEFAZ/MS, abra no Word e salve como `.docx`. Depois use *Tabelas e regras → Atualizar com nova versão*.
- **Ajustes:** a sua tabela de MVA, na mesma tela, prevalece sobre a relação.

## Recolhimentos (DAEMS)

Nos itens revisados, parte do imposto continua devida e é recolhida em DAEMS emitido manualmente. A tela soma esses valores por empresa, referência e imposto:

- **DIFAL:** bens de uso e consumo, brinde ou degustação.
- **Equalização:** insumos e itens fora da ST.

O que a tela faz:

- **Memória de cálculo:** mostra, item a item, o valor da operação, as alíquotas, o ICMS de origem, a base e o valor devido.
- **Dados do DAEMS:** guarda o número (formato `01.170.776.181-49`), o valor, o vencimento e a data do pagamento.
- **Justificativa do 1º pedido no e-Fazenda:** com o número informado, a justificativa passa a citar o DAEMS, dentro dos 199 caracteres. Ex.: "devido só o DIFAL de R$ 209,78, recolhido no DAEMS 01.170.776.181-49".
- **Requerimento:** traz o quadro "1.2. Valores que continuam devidos e seu recolhimento", o pedido de reconhecimento do recolhimento e um anexo com a memória de cálculo.
- **Exclusão integral no 1º pedido:**
  - Itens que passam a DIFAL ou Equalização têm o ICMS-ST excluído por inteiro (ex.: "Excluir R$ 381,74"), e o outro imposto é recolhido em DAEMS próprio, com a memória de cálculo.
  - O mesmo vale para os itens de ICMS-ST revisados só em parte, quando o DAEMS do ICMS-ST correto é informado.
  - O requerimento usa os mesmos valores a excluir.
- **ICMS-ST residual:** nos itens que continuam na ST mas foram revisados só em parte (MVA, crédito, cálculo), o ICMS-ST correto (cobrado − revisado) entra como modalidade própria, porque a alteração no e-Fazenda pode não gerar esse valor. Com o número do DAEMS, a justificativa do item informa "ICMS-ST residual de R$ … recolhido no DAEMS …".
- **Análise de economia (uso interno, não vai para a SEFAZ):** compara, por item, o ICMS cobrado com o imposto que continua devido após a revisão (DIFAL, Equalização ou residual). Mostra a economia em reais e em %, e marca os itens com economia pequena (abaixo de R$ 10,00). O Excel tem as abas *Resumo* (por imposto após a revisão), *Por nota* e *Por item*.
- **Excel – memória de cálculo:** duas abas ligadas por fórmulas, com cabeçalho de identificação (empresa, CNPJ, IE, referência, data e fonte) e, abaixo de cada tabela, o total por modalidade (DIFAL, Equalização e ICMS-ST residual) com o nº do DAEMS.
  - **Por nota:** remetente, NF-e, emissão, chave de acesso e totais de cada nota.
  - **Por item:** as mesmas colunas da planilha usada no escritório (Produto+Frete+IPI, Alíquota Inter., Crédito ICMS, Alíquota Destino, B.C ICMS, Débito ICMS, Total a Recolher), com o motivo da revisão, o ICMS-ST cobrado e o revisado.

## Vendas × ST (Registro de Saídas e Controle do Simples)

Mede o ICMS pago a mais no DAS quando mercadorias com ICMS-ST já recolhido saem com CSOSN 102. A receita delas deveria ser segregada no PGDAS-D como "com substituição tributária" (LC 123/2006, art. 18, § 4º-A, I).

- **Arquivos:** *Registro de Saídas Detalhado* e *Controle de Cálculo do Simples Nacional*, exportados em Excel pelo sistema contábil (Makro). A empresa vem do nome do arquivo (código do escritório ou razão social), e a referência vem das datas das vendas. Ajuste pelo ícone de lápis em *Importar* se precisar.
- **SPED Fiscal de entradas (opcional, recomendado):** o arquivo TXT da EFD ICMS/IPI. O app guarda só as notas de entrada (C100/C170), reconhece a empresa pelo CNPJ e cruza cada nota com as cobranças de ICMS-ST e Equalização importadas.
  - Mostra as notas interestaduais sem cobrança localizada e as cobranças da SEFAZ sem nota escriturada.
  - Os produtos são ligados pelo GTIN (ou pela descrição), porque o código do produto no SPED pode ser diferente do código no relatório de saídas.
- **Domínio — Relação de Produtos por Nota (XLS):** substitui o Registro de Saídas e o SPED, porque traz as entradas e as saídas item a item. A empresa é reconhecida pelo CNPJ do cabeçalho; se ela ainda não estiver cadastrada, o vínculo é feito quando o cartão CNPJ for importado.
  - Vendas: só CFOP de venda (51xx, 54xx, 61xx, 64xx), pelo valor contábil do item (produto + frete + despesas − desconto). As devoluções de venda (1202/2202 e 1411/2411) abatem a venda do próprio produto, como no PGDAS-D (5102 − 1202; 5405 − 1411). Sem CSOSN no relatório, a venda com CFOP 5405/6404 (e a devolução 1411) conta como já emitida como ST.
  - Entradas: o ICMS-ST vem do campo próprio ou, nas compras com CFOP 1403/2403, das despesas acessórias. Devoluções de cliente, fretes e remessas não servem de origem do produto.
  - Produtos ligados pelo código da Domínio (o mesmo nas entradas e saídas) ou pela descrição; não há GTIN nem CEST.
  - O app corrige sozinho a posição errada da aba que esse .xls traz e que impede a leitura.
- **Classificação de cada produto vendido:**
  - *ST cobrado na entrada:* mesmo GTIN ou descrição numa memória de ICMS-ST da empresa.
  - *ST retido antes:* com o SPED, produto do Subanexo I comprado dentro do estado ou com ICMS-ST destacado na NF de entrada.
  - *Conferir a NF de entrada:* NCM do Subanexo I sem cobrança localizada. Com o SPED, a observação indica a NF de entrada e se ela tem cobrança no app.
  - *Já emitido como ST:* CSOSN 500 ou CST 60.
  - *Não ST:* produtos de Equalização, itens preparados na loja (empresas de alimentação, sem GTIN) e itens fora da lista.
  - O usuário pode mudar a situação e o CEST de qualquer produto.
- **Alíquota:** Anexo I pela RBT12.
  - No início de atividade, a RBT12 é a receita do 1º mês × 12, ou a média dos meses anteriores × 12.
  - Os meses sem relatório contam como sem receita.
  - A RBT12, a alíquota efetiva e o % do ICMS podem ser informados à mão, conforme o extrato do PGDAS-D.
- **Excel:**
  - *Resumo*, com fórmulas.
  - *Cadastro ERP*: CEST, CSOSN 500 e CFOP 5405/6404 por produto; com o SPED, também as NFs de entrada, o fornecedor e o CFOP de entrada escriturado e o correto (2403/1403).
  - *Vendas ST por NF*: item a item.
  - *Entradas (SPED)*: cada item das notas de entrada, com o CFOP correto, a situação do produto e a cobrança da SEFAZ na nota; no fim, as cobranças sem nota escriturada.

## O pedido na SEFAZ/MS

Pela **Resolução SEFAZ nº 3.033/2019**, o optante pelo Simples Nacional pede a revisão eletrônica no **e-Fazenda → Informações Fiscais**:

- **uma única solicitação por mês de referência e por tributo** — consolide tudo antes de enviar;
- feita **até o vencimento**, as NFs contestadas ficam desvinculadas até a decisão;
- não há efeito suspensivo; a decisão sai em até **15 dias úteis**;
- nova revisão, reconsideração ou restituição: **e-SAP** (Res. SEFAZ nº 3.426/2025).

**Dica para o Simples Nacional:** os produtos com ICMS-ST pago devem sair com **CSOSN 500** e ter a receita segregada no PGDAS-D (LC 123/2006, art. 18, § 4º-A, I), para não pagar o ICMS de novo no DAS. O botão **Produtos c/ ST** gera essa lista.

## Publicar no GitHub Pages

**Opção 1 — pelo site (sem instalar nada):**
1. Crie um repositório **público** no GitHub (ex.: `revisor-icms-st`).
2. Em *Add file → Upload files*, arraste **o conteúdo** desta pasta (`index.html`, `assets/`, `README.md`…).
3. Em *Settings → Pages*, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
4. Em 1–2 minutos o app fica em `https://SEU-USUARIO.github.io/revisor-icms-st/`.

**Opção 2 — pelo script (Windows):**
```powershell
powershell -ExecutionPolicy Bypass -File .\publicar-no-github.ps1
```
O script instala Git e GitHub CLI (via winget, se faltar), pede o login no GitHub, cria o repositório, envia os arquivos e ativa o GitHub Pages. Para atualizar depois, rode o mesmo comando.

> O repositório contém só o código. O `.gitignore` impede o envio de PDFs, planilhas, XMLs e backups.

## Usar no próprio computador (sem publicar)

Também funciona abrindo o `index.html` direto no navegador (Chrome/Edge). É preciso internet só para carregar as bibliotecas de leitura de PDF e planilha (cdnjs).

## Backup e vários computadores

Os dados ficam no navegador em que você trabalhou. Em **Tabelas e regras → Dados e backup**, exporte o backup (`.json`) — por exemplo, para o OneDrive — e restaure em outro computador.

## Estrutura

```
index.html              página do app
assets/css/app.css      visual (tema claro/escuro, responsivo)
assets/js/util.js       utilitários (números, datas, CNPJ, NCM…)
assets/js/pdftext.js    extração de texto dos PDFs (pdf.js)
assets/js/parsers.js    leitura: prévia, "Dados da Nota", memória ST, cartão CNPJ, XML
assets/js/vendas.js     Vendas × ST: Registro de Saídas e Controle do Simples (Makro), SPED de entradas, Relação de Produtos por Nota (Domínio), classificação e Excel
assets/js/daems.js      Recolhimentos: DIFAL e Equalização devidos nos itens revisados, nº do DAEMS e memória
assets/js/legal.js      base legal e catálogo de checagens
assets/js/subanexo.js   leitura e consulta da relação oficial (Subanexo I)
assets/data/subanexo1-ms.js  relação oficial do Subanexo I (dados)
assets/js/engine.js     vínculos, conferências e regras de revisão
assets/js/reports.js    Excel, requerimento, lista e-Fazenda, produtos com ST
assets/js/store.js      armazenamento local (IndexedDB) e backup
assets/js/ui.js         interface
```

## Aviso

Ferramenta de apoio à revisão. Os textos de fundamentação são modelos: confira a redação vigente das normas, as MVAs do Subanexo I do Anexo III do RICMS/MS e os documentos de cada caso antes de protocolar.
