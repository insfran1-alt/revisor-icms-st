# Revisor ICMS-ST — SEFAZ/MS · Simples Nacional

**Acesse o app:** https://insfran1-alt.github.io/revisor-icms-st/

Ferramenta web para **revisar as cobranças de ICMS-ST (tributo 333) e de ICMS Equalização Simples Nacional (tributo 349)** apuradas pela SEFAZ/MS nas compras interestaduais de empresas do Simples Nacional. Ela:

- confere **item a item** as memórias de cálculo de cada nota fiscal;
- encontra **duplicidade do mesmo produto da mesma NF cobrado como ST e como Equalização**, além de NF cobrada em dois meses, linha repetida e ST já retido pelo fornecedor;
- aponta erros de cálculo, crédito a menor, MVA divergente, item sem CEST, percentual de Equalização errado, insumos e itens de uso e consumo tributados como ST, isenção de ME etc.;
- gera o **relatório consolidado** (Excel) com as colunas **Base legal** e **Fundamentação**, o **requerimento** pronto (Word/PDF) e a **lista de NFs para o pedido no e-Fazenda**;
- guarda o cadastro das empresas com as **atividades (CNAE) do cartão CNPJ**.

> **Privacidade:** tudo roda no seu navegador. Os PDFs, planilhas e XMLs são lidos localmente e os dados ficam salvos só no navegador (IndexedDB). Nada é enviado a servidores — nem ao GitHub.

## Como usar

1. **Empresas** — importe o **cartão CNPJ** (PDF da Receita). As atividades (CNAE), o porte e a data de abertura ficam salvos e orientam a análise.
2. **Importar** — arraste de uma vez (várias empresas e meses):
   - **Relatório de Prévia com Cálculos ICMS** (PDF) de cada tributo: 333 – ST Comércio e 349 – Equalização Simples Nacional;
   - **Equalização:** a tela **"Dados da Nota"** de cada NF — copie as páginas (cabeçalho da nota e tabela, 15 itens por página) e cole uma abaixo da outra no Excel (ex.: `NOTA 17134.xlsx`), ou cole direto em *Importar → Colar a tabela do portal*. O PDF da tela também serve (um arquivo por página). O app junta as páginas da mesma NF pela numeração "Visualizando 1 - 15 de N", descarta página repetida e avisa se faltar alguma;
   - **ICMS-ST:** a tabela da memória de cálculo — **copie no portal e cole** em *Importar → Colar a tabela do portal*, ou salve em planilha com o número da NF no nome (ex.: `NOTA 19192.xlsx`);
   - opcional: o **XML da NF-e** (confirma ST retido pelo remetente, destinatário, CEST e linhas repetidas).
3. **Revisão** — filtre por empresa, referência, tributo, força, tipo de achado, status, UF e valor. Clique num achado para ver os dados do item, a fundamentação, a base legal e os documentos a anexar; marque o status e o protocolo.
4. **Pedido** — gere o Excel, o requerimento e a lista para o e-Fazenda.

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
| MVA acima da tabela / divergente para o mesmo produto | LC 87/1996, art. 8º, II, "c"; RICMS/MS, Anexo III, Subanexo I |
| Item de ST sem CEST / fora da lista de ST | Conv. ICMS 142/2018, cláusula 7ª |
| Insumo (lanchonete/indústria) e uso e consumo, brinde ou degustação tributados como ST | CF, art. 150, § 7º; LC 87/1996, art. 10; Conv. 142/2018, cl. 9ª e 12ª–13ª; Dec. 15.055/2018 |
| Percentual de Equalização incorreto | Dec. 15.055/2018, art. 5º; Res. SF 22/1989 e 13/2012 |
| ME isenta da Equalização / MEI dispensado | Dec. 16.177/2023, art. 1º, III; Dec. 13.115/2011 |

A lista completa, com o texto de cada norma, está na tela **Como usar** e na aba **Base legal** do Excel.

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
assets/js/legal.js      base legal e catálogo de checagens
assets/js/engine.js     vínculos, conferências e regras de revisão
assets/js/reports.js    Excel, requerimento, lista e-Fazenda, produtos com ST
assets/js/store.js      armazenamento local (IndexedDB) e backup
assets/js/ui.js         interface
```

## Aviso

Ferramenta de apoio à revisão. Os textos de fundamentação são modelos: confira a redação vigente das normas, as MVAs do Subanexo I do Anexo III do RICMS/MS e os documentos de cada caso antes de protocolar.
