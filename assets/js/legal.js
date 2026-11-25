/* Revisor ICMS-ST — biblioteca de base legal e textos de fundamentação
 * Os textos são modelos de apoio. Confira sempre a redação vigente das normas antes de protocolar.
 */
(function (global) {
  'use strict';

  const PLANALTO_CF = 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm';
  const PLANALTO_LC87 = 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp87.htm';
  const PLANALTO_LC123 = 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm';
  const PLANALTO_CTN = 'https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm';
  const CONFAZ_142 = 'https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18';

  /** Normas citadas. `cit` = citação curta; `texto` = síntese do dispositivo. */
  const NORMAS = {
    CF150_7: { cit: 'CF/88, art. 150, § 7º', texto: 'Na substituição tributária para frente, é assegurada a imediata e preferencial restituição da quantia paga caso não se realize o fato gerador presumido.', url: PLANALTO_CF },
    CF155_2_I: { cit: 'CF/88, art. 155, § 2º, I', texto: 'O ICMS é não cumulativo: compensa-se o imposto devido em cada operação com o cobrado nas anteriores.', url: PLANALTO_CF },
    LC87_6: { cit: 'LC nº 87/1996, art. 6º', texto: 'A lei estadual pode atribuir a contribuinte a responsabilidade pelo pagamento do imposto (substituição tributária).', url: PLANALTO_LC87 },
    LC87_8: { cit: 'LC nº 87/1996, art. 8º, II e §§ 4º e 5º', texto: 'Base de cálculo da ST: valor da operação, acrescido de seguro, frete e outros encargos cobrados do adquirente e da margem de valor agregado (MVA) prevista na legislação; o imposto devido por substituição é a diferença entre o imposto calculado à alíquota interna sobre essa base e o imposto da operação própria do remetente.', url: PLANALTO_LC87 },
    LC87_10: { cit: 'LC nº 87/1996, art. 10', texto: 'É assegurado o direito à restituição do imposto pago por força da substituição tributária correspondente ao fato gerador presumido que não se realizar.', url: PLANALTO_LC87 },
    LC87_12: { cit: 'LC nº 87/1996, art. 12', texto: 'Define os momentos de ocorrência do fato gerador do ICMS (saída/entrada da mercadoria em operação efetivamente realizada).', url: PLANALTO_LC87 },
    LC123_13_XIII_a: { cit: 'LC nº 123/2006, art. 13, § 1º, XIII, "a"', texto: 'O ICMS devido por substituição tributária não está incluído no DAS do Simples Nacional e é exigido na forma da legislação estadual.', url: PLANALTO_LC123 },
    LC123_13_XIII_g: { cit: 'LC nº 123/2006, art. 13, § 1º, XIII, "g"', texto: 'Antecipação nas aquisições interestaduais pelo optante: (1) com encerramento da tributação; ou (2) sem encerramento, hipótese em que se cobra apenas a diferença entre a alíquota interna e a interestadual, vedada a agregação de qualquer valor.', url: PLANALTO_LC123 },
    LC123_13_XIII_h: { cit: 'LC nº 123/2006, art. 13, § 1º, XIII, "h"', texto: 'Nas aquisições interestaduais de bens não sujeitos à antecipação (ex.: uso e consumo), o optante recolhe apenas a diferença entre a alíquota interna e a interestadual.', url: PLANALTO_LC123 },
    LC123_13_8: { cit: 'LC nº 123/2006, art. 13, § 8º', texto: 'Para chocolates, preparações à base de cereais, produtos de padaria, entre outros segmentos, a ST do optante aplica-se somente aos produtos fabricados em escala industrial relevante.', url: PLANALTO_LC123 },
    LC123_18_4A: { cit: 'LC nº 123/2006, art. 18, § 4º-A, I', texto: 'O optante deve segregar as receitas de mercadorias cujo ICMS já foi recolhido por substituição tributária, excluindo-as da parcela do ICMS no DAS.', url: PLANALTO_LC123 },
    CTN114: { cit: 'CTN, art. 114', texto: 'Fato gerador da obrigação principal é a situação definida em lei como necessária e suficiente à sua ocorrência.', url: PLANALTO_CTN },
    CTN165: { cit: 'CTN, arts. 165, I, e 168, I', texto: 'O sujeito passivo tem direito à restituição do tributo pago indevidamente ou a maior, no prazo de 5 anos contados do pagamento.', url: PLANALTO_CTN },
    CONV142_7: { cit: 'Convênio ICMS 142/2018, cláusula sétima, caput e §§ 1º, 5º e 7º', texto: 'A ST alcança apenas os bens relacionados nos Anexos II a XXVI, identificados por CEST, NCM/SH e descrição; se a descrição do item não reproduzir a da NCM, a ST aplica-se somente aos bens identificados pela descrição do convênio; a legislação estadual deve reproduzir CEST, NCM e descrição.', url: CONFAZ_142 },
    CONV142_8_18: { cit: 'Convênio ICMS 142/2018, cláusulas oitava e décima oitava', texto: 'O remetente pode ser o responsável pela retenção do ICMS-ST nas operações interestaduais; quando não inscrito na UF de destino, recolhe por GNRE vinculada à NF-e, a cada operação.', url: CONFAZ_142 },
    CONV142_9: { cit: 'Convênio ICMS 142/2018, cláusula nona, I, III e V', texto: 'A ST não se aplica: às remessas a estabelecimento industrial fabricante da mesma mercadoria; às remessas destinadas a emprego em processo de industrialização (matéria-prima, produto intermediário ou embalagem); e às mercadorias fabricadas em escala industrial não relevante.', url: CONFAZ_142 },
    CONV142_DIFAL: { cit: 'Convênio ICMS 142/2018, cláusulas primeira, § 1º, décima segunda e décima terceira', texto: 'Para bens destinados a uso, consumo ou ativo imobilizado, a ST alcança apenas o diferencial de alíquotas, com base no valor da operação (sem MVA).', url: CONFAZ_142 },
    CONV142_13: { cit: 'Convênio ICMS 142/2018, cláusula décima terceira e § 1º', texto: 'O ICMS-ST é a diferença entre o imposto calculado à alíquota interna sobre a base ST e o imposto da operação própria; se o remetente for optante do Simples Nacional, deduz-se o valor calculado à alíquota interestadual.', url: CONFAZ_142 },
    CONV142_22: { cit: 'Convênio ICMS 142/2018, cláusula vigésima segunda', texto: 'Escala industrial não relevante: fabricante optante do Simples Nacional, com receita bruta anual de até R$ 180.000,00, estabelecimento único e credenciado quando exigido.', url: CONFAZ_142 },
    RICMS_MS_ST: { cit: 'RICMS/MS (Decreto nº 9.203/1998), Anexo III, Subanexo I', texto: 'Relação das mercadorias sujeitas à substituição tributária em MS, com CEST, NCM, descrição e MVA aplicáveis.', url: 'https://www.legisweb.com.br/legislacao/?id=135856' },
    RICMS_MS_14: { cit: 'RICMS/MS, Anexo III, art. 14, § 2º-A', texto: 'Apuração, pela SEFAZ/MS, do ICMS-ST devido pelos optantes do Simples Nacional nas aquisições interestaduais (objeto da revisão eletrônica da Res. SEFAZ nº 3.033/2019).', url: 'https://www.legisweb.com.br/legislacao/?id=135856' },
    DEC15055_3: { cit: 'Decreto nº 15.055/2018, art. 3º', texto: 'Institui o ICMS Equalização Simples Nacional (cód. 349) nas aquisições interestaduais de mercadorias destinadas à comercialização ou à industrialização, na forma do art. 13, § 1º, XIII, "g", item 2, da LC nº 123/2006 (Lei nº 1.810/1997, art. 84, § 4º).', url: 'https://www.legisweb.com.br/legislacao/?id=365690' },
    DEC15055_3_1_II_a: { cit: 'Decreto nº 15.055/2018, art. 3º, § 1º, II, "a"', texto: 'A Equalização não se aplica às aquisições de mercadorias cujas operações estejam submetidas ao regime de substituição tributária, hipótese em que se aplica esse regime.', url: 'https://www.legisweb.com.br/legislacao/?id=365690' },
    DEC15055_3_1_II_b: { cit: 'Decreto nº 15.055/2018, art. 3º, § 1º, II, "b"', texto: 'A Equalização não se aplica às mercadorias beneficiadas com isenção ou não incidência.', url: 'https://www.legisweb.com.br/legislacao/?id=365690' },
    DEC15055_IND: { cit: 'Decreto nº 15.055/2018, art. 3º, § 1º, I, e § 2º; art. 10', texto: 'Para o optante industrial, aplica-se a Equalização às aquisições, inclusive de mercadorias sujeitas à ST, e a ST complementar apenas sobre o que não for empregado na industrialização (conferir a redação dada pelo Decreto nº 16.345/2023).', url: 'https://www.legisweb.com.br/legislacao/?id=365690' },
    DEC15055_4: { cit: 'Decreto nº 15.055/2018, art. 4º', texto: 'Base de cálculo da Equalização: valor de aquisição (produtos, IPI, frete, seguro, juros e demais despesas), sem aplicação de margem de valor agregado; reduz-se proporcionalmente quando houver redução de base nas operações internas.', url: 'https://www.legisweb.com.br/legislacao/?id=365690' },
    DEC15055_5: { cit: 'Decreto nº 15.055/2018, art. 5º', texto: 'O percentual da Equalização é a diferença entre a alíquota interna de MS e a alíquota interestadual do estado de origem.', url: 'https://www.legisweb.com.br/legislacao/?id=365690' },
    DEC16177: { cit: 'Decreto nº 16.177/2023, art. 1º, II e III, e §§ 1º e 2º', texto: 'Isenção do diferencial de alíquotas e do ICMS Equalização (cód. 349), nas aquisições a partir de 01/05/2023, para microempresas optantes com receita bruta acumulada no ano anterior de até R$ 360.000,00 (proporcional no ano seguinte ao de início; não se aplica no ano de início de atividades nem a partir de quando exceder o limite).', url: 'https://www.legisweb.com.br/legislacao/?id=445075' },
    DEC13115: { cit: 'Decreto nº 13.115/2011, art. 1º, II (red. Decreto nº 15.184/2019)', texto: 'Dispensa da cobrança do diferencial de alíquotas e do ICMS Equalização Simples Nacional na hipótese que especifica (Microempreendedor Individual). Conferir a redação vigente.', url: 'https://www.legisweb.com.br/legislacao/?id=139627' },
    RES3033: { cit: 'Resolução SEFAZ nº 3.033/2019, arts. 1º a 4º', texto: 'Revisão eletrônica da cobrança do ICMS-ST e da Equalização dos optantes pelo Simples Nacional, no módulo "Informações Fiscais" do e-Fazenda: uma solicitação por mês de referência e por tributo, sem efeito suspensivo; feita até o vencimento, as NFs ficam desvinculadas até a decisão (prazo de 15 dias úteis); novos pedidos por e-SAP.', url: 'https://www.contabeis.com.br/legislacao/5011396/resolucao-sefaz-3033-2019/' },
    RES3426: { cit: 'Resolução SEFAZ nº 3.426/2025', texto: 'Requerimento de restituição do indébito tributário e apropriação de crédito de ICMS-ST, protocolado pelo e-SAP no e-Fazenda.', url: 'https://www.legisweb.com.br/legislacao/?id=473403' },
    RSF22: { cit: 'Resolução do Senado Federal nº 22/1989', texto: 'Alíquotas interestaduais: 7% nas saídas do Sul e Sudeste (exceto ES) para Norte, Nordeste, Centro-Oeste e ES; 12% nas demais.', url: '' },
    RSF13: { cit: 'Resolução do Senado Federal nº 13/2012', texto: 'Alíquota interestadual de 4% para bens e mercadorias importados ou com conteúdo de importação superior a 40%.', url: '' },
    SINIEF0705: { cit: 'Ajuste SINIEF 07/2005 (eventos da NF-e)', texto: 'Manifestação do destinatário: eventos "Desconhecimento da Operação" e "Operação não Realizada", que registram que a mercadoria não ingressou no estabelecimento.', url: '' },
    STF_T201: { cit: 'STF, Tema 201 (RE 593.849)', texto: 'É devida a restituição da diferença do ICMS pago a mais na ST para frente quando a base de cálculo efetiva for inferior à presumida.', url: '' }
  };

  /** Catálogo de regras (achados). */
  const REGRAS = {
    DUP_ST_EQ: { nome: 'Duplicidade ST × Equalização', categoria: 'Duplicidade', forca: 'forte', integral: true, base: ['DEC15055_3_1_II_a', 'LC123_13_XIII_g', 'RES3033', 'CTN165'], docs: ['Memórias de cálculo da NF nos dois tributos (ST e Equalização)', 'DANFE ou XML da NF-e', 'Relatórios de prévia dos tributos 333 e 349'], acao: 'Excluir o item da Equalização',
      direito: 'Nos termos do art. 3º, § 1º, II, "a", do Decreto nº 15.055/2018, a Equalização não se aplica às aquisições de mercadorias submetidas ao regime de substituição tributária, hipótese em que se aplica exclusivamente esse regime. A mesma mercadoria não pode ser exigida, simultaneamente, a título de ICMS-ST e de ICMS Equalização, sob pena de bis in idem (LC nº 123/2006, art. 13, § 1º, XIII, "g", itens 1 e 2, que tratam as duas sistemáticas como alternativas).' },
    DUP_BASES: { nome: 'Bases somadas excedem o valor da NF', categoria: 'Duplicidade', forca: 'forte', integral: false, base: ['DEC15055_3_1_II_a', 'DEC15055_4', 'LC87_8', 'CTN165'], docs: ['DANFE ou XML da NF-e', 'Memórias de cálculo de todos os tributos cobrados sobre a NF'], acao: 'Revisar a apuração da NF',
      direito: 'A soma das bases de cálculo utilizadas pela SEFAZ/MS nas diferentes cobranças não pode superar o valor das mercadorias constantes do documento fiscal: cada item integra apenas uma das sistemáticas (art. 3º, § 1º, II, "a", do Decreto nº 15.055/2018), e a base de cálculo está limitada ao valor da operação e seus acréscimos legais (LC nº 87/1996, art. 8º; Decreto nº 15.055/2018, art. 4º).' },
    DUP_PERIODO: { nome: 'NF cobrada em mais de uma referência', categoria: 'Duplicidade', forca: 'forte', integral: true, escopo: 'nota', base: ['CTN165', 'RES3033', 'RES3426'], docs: ['Relatórios de prévia das duas referências', 'Comprovante de pagamento da cobrança anterior (DAEMS), se houver'], acao: 'Desvincular a NF da referência',
      direito: 'O mesmo fato gerador não pode ser exigido mais de uma vez. Constatada a inclusão da mesma NF-e em cobranças de referências distintas, impõe-se a desvinculação da cobrança repetida (Res. SEFAZ nº 3.033/2019, art. 2º) ou, se já recolhida, a restituição do valor pago em duplicidade (CTN, art. 165, I; Res. SEFAZ nº 3.426/2025).' },
    DUP_ITEM: { nome: 'Item repetido na memória de cálculo', categoria: 'Duplicidade', forca: 'moderada', integral: false, base: ['LC87_8', 'DEC15055_4', 'CTN165'], docs: ['DANFE ou XML da NF-e (quantidade de linhas do item)', 'Memória de cálculo'], acao: 'Excluir a linha repetida',
      direito: 'A apuração deve refletir as mercadorias efetivamente constantes do documento fiscal; a repetição de linha idêntica na memória de cálculo, sem correspondência na NF-e, resulta em cobrança em duplicidade (CTN, art. 165, I).' },
    ST_RETIDO: { nome: 'ICMS-ST já retido pelo remetente', categoria: 'Duplicidade', forca: 'forte', integral: true, base: ['CONV142_8_18', 'LC87_6', 'DEC15055_3_1_II_a', 'CTN165'], docs: ['XML da NF-e com o ICMS-ST destacado', 'GNRE e comprovante de pagamento pelo remetente'], acao: 'Excluir o item da cobrança',
      direito: 'Quando o remetente, na condição de substituto tributário, retém o ICMS-ST na própria NF-e e o recolhe por GNRE (Convênio ICMS 142/2018, cláusulas oitava e décima oitava), não cabe nova exigência do imposto do destinatário sobre as mesmas mercadorias, sob pena de duplicidade; tampouco cabe Equalização sobre mercadoria submetida à ST (Decreto nº 15.055/2018, art. 3º, § 1º, II, "a").' },
    NF_DEST: { nome: 'NF de outro destinatário', categoria: 'Vínculo indevido', forca: 'forte', integral: true, escopo: 'nota', base: ['RES3033', 'CTN165'], docs: ['XML da NF-e (destinatário)', 'Cartão CNPJ da empresa'], acao: 'Desvincular a NF',
      direito: 'A cobrança pressupõe aquisição destinada ao próprio contribuinte. NF-e emitida para outro estabelecimento foi vinculada indevidamente à apuração, devendo ser desvinculada (Res. SEFAZ nº 3.033/2019, arts. 1º e 2º).' },
    NF_SITUACAO: { nome: 'Operação não realizada / devolvida', categoria: 'Fato gerador', forca: 'forte', integral: true, escopo: 'nota', base: ['LC87_12', 'CTN114', 'SINIEF0705', 'RES3033', 'CTN165'], docs: ['NF-e de devolução, evento de cancelamento ou de manifestação do destinatário', 'Declaração do fornecedor, se houver'], acao: 'Desvincular a NF',
      direito: 'Sem a entrada efetiva da mercadoria no estabelecimento — por cancelamento da NF-e, devolução integral, desconhecimento da operação ou operação não realizada (Ajuste SINIEF 07/2005) — não se verifica o fato gerador que fundamenta a cobrança antecipada (LC nº 87/1996, art. 12; CTN, art. 114), devendo a NF ser excluída da apuração.' },
    ST_CALCULO: { nome: 'Erro de cálculo do ICMS-ST', categoria: 'Cálculo', forca: 'forte', integral: false, base: ['LC87_8', 'CONV142_13', 'CTN165'], docs: ['Memória de cálculo da NF', 'Demonstrativo do recálculo'], acao: 'Recalcular o item',
      direito: 'O ICMS-ST corresponde à diferença entre o imposto calculado à alíquota interna sobre a base de cálculo da substituição e o imposto da operação própria do remetente (LC nº 87/1996, art. 8º, § 5º; Convênio ICMS 142/2018, cláusula décima terceira). Valor exigido acima desse resultado é indevido.' },
    ST_CREDITO: { nome: 'Crédito da operação própria a menor', categoria: 'Cálculo', forca: 'forte', integral: false, base: ['CF155_2_I', 'LC87_8', 'CONV142_13', 'RSF22', 'CTN165'], docs: ['DANFE ou XML da NF-e (ICMS destacado)', 'Memória de cálculo'], acao: 'Admitir o crédito integral',
      direito: 'Em respeito à não cumulatividade (CF/88, art. 155, § 2º, I), deve ser deduzido do ICMS-ST o imposto da operação própria do remetente, calculado à alíquota interestadual aplicável (LC nº 87/1996, art. 8º, § 5º; Convênio ICMS 142/2018, cláusula décima terceira e § 1º; Resolução do Senado Federal nº 22/1989).' },
    ST_MVA_TAB: { nome: 'MVA acima da tabela de referência', categoria: 'Cálculo', forca: 'forte', integral: false, base: ['LC87_8', 'RICMS_MS_ST', 'CTN165'], docs: ['Memória de cálculo', 'Item do Subanexo I do Anexo III do RICMS/MS com a MVA vigente', 'Demonstrativo do recálculo'], acao: 'Recalcular com a MVA correta',
      direito: 'A margem de valor agregado é a prevista na legislação para cada mercadoria (LC nº 87/1996, art. 8º, II, "c", e § 4º; RICMS/MS, Anexo III, Subanexo I). Base de cálculo apurada com MVA superior à legal resulta em imposto exigido a maior.' },
    ST_MVA_DIV: { nome: 'MVA divergente para o mesmo produto', categoria: 'Cálculo', forca: 'moderada', integral: false, base: ['LC87_8', 'RICMS_MS_ST', 'CTN165'], docs: ['Memórias de cálculo das NFs comparadas', 'Item do Subanexo I do Anexo III do RICMS/MS com a MVA vigente'], acao: 'Confirmar a MVA e recalcular',
      direito: 'A MVA é fixada por mercadoria na legislação (RICMS/MS, Anexo III, Subanexo I; LC nº 87/1996, art. 8º, II, "c"). A aplicação de margens distintas à mesma mercadoria, no mesmo período, evidencia erro de parametrização na apuração e impõe a revisão da base de cálculo.' },
    ST_SEM_CEST: { nome: 'Item ST sem CEST', categoria: 'Enquadramento', forca: 'moderada', integral: true, base: ['CONV142_7', 'RICMS_MS_ST', 'CTN165'], docs: ['DANFE ou XML da NF-e', 'Ficha técnica / descrição do produto', 'Comparativo com a descrição do Subanexo I'], acao: 'Conferir o enquadramento',
      direito: 'A substituição tributária alcança somente os bens identificados nos Anexos do Convênio ICMS 142/2018 e reproduzidos na legislação estadual pelo CEST, NCM/SH e descrição (cláusula sétima, caput e §§ 1º e 5º). Mercadoria cuja descrição não corresponda a item da relação não está sujeita ao regime.' },
    ST_FORA_TAB: { nome: 'Mercadoria fora da lista de ST', categoria: 'Enquadramento', forca: 'forte', integral: true, base: ['CONV142_7', 'RICMS_MS_ST', 'CTN165'], docs: ['DANFE ou XML da NF-e', 'Relação vigente do Subanexo I do Anexo III do RICMS/MS'], acao: 'Excluir o item da ST',
      direito: 'Somente as mercadorias relacionadas na legislação estadual (RICMS/MS, Anexo III, Subanexo I), em conformidade com os Anexos do Convênio ICMS 142/2018 (cláusula sétima), sujeitam-se à substituição tributária. Ausente o enquadramento, não há fundamento para a exigência do ICMS-ST.' },
    ST_USO: { nome: 'Uso e consumo / brinde / degustação', categoria: 'Destinação', forca: 'moderada', integral: false, base: ['CF150_7', 'LC87_10', 'CONV142_DIFAL', 'LC123_13_XIII_h', 'CTN165'], docs: ['DANFE ou XML da NF-e', 'Declaração de destinação (uso e consumo / degustação)', 'Controle interno de consumo'], acao: 'Reenquadrar como diferencial de alíquotas',
      direito: 'A substituição tributária presume operação subsequente de venda. Destinada a mercadoria a uso e consumo, brinde ou degustação, o fato gerador presumido não se realiza (CF/88, art. 150, § 7º; LC nº 87/1996, art. 10) e o imposto devido limita-se ao diferencial de alíquotas, calculado sem MVA (Convênio ICMS 142/2018, cláusulas primeira, § 1º, décima segunda e décima terceira; LC nº 123/2006, art. 13, § 1º, XIII, "h").' },
    ST_INSUMO: { nome: 'Insumo / ingrediente', categoria: 'Destinação', forca: 'moderada', integral: false, base: ['CF150_7', 'LC87_10', 'DEC15055_3', 'DEC15055_5', 'CTN165'], docs: ['DANFE ou XML da NF-e', 'Ficha técnica / receitas que utilizam o insumo', 'Cartão CNPJ (atividades)', 'Demonstrativo do valor devido'], acao: 'Reenquadrar como Equalização',
      direito: 'Mercadoria adquirida como insumo para o preparo de produtos vendidos pelo estabelecimento não é revendida no estado em que foi adquirida, de modo que não se realiza a operação subsequente presumida pela ST (CF/88, art. 150, § 7º; LC nº 87/1996, art. 10). Para o optante do Simples Nacional, a aquisição interestadual destinada à comercialização ou industrialização sujeita-se à Equalização, calculada sem MVA (Decreto nº 15.055/2018, arts. 3º a 5º). Tratando-se de estabelecimento industrial, o regime de ST não se aplica às mercadorias destinadas à industrialização (Convênio ICMS 142/2018, cláusula nona, III; Decreto nº 15.055/2018, art. 3º, § 1º, I, e § 2º).' },
    ST_DESPESAS: { nome: 'Despesas acessórias elevadas na base ST', categoria: 'Cálculo', forca: 'atencao', integral: false, base: ['LC87_8'], docs: ['DANFE ou XML da NF-e (composição de "outras despesas")'], acao: 'Conferir as despesas acessórias',
      direito: 'Integram a base da ST apenas o seguro, o frete e os demais encargos cobrados ou transferíveis ao adquirente relativos à mercadoria (LC nº 87/1996, art. 8º, II, "b"). Valores sem relação com a operação não devem compor a base nem receber a MVA.' },
    EQ_PERC: { nome: 'Percentual de Equalização incorreto', categoria: 'Cálculo', forca: 'forte', integral: false, base: ['DEC15055_5', 'LC123_13_XIII_g', 'RSF22', 'RSF13', 'CTN165'], docs: ['DANFE ou XML da NF-e (alíquota interestadual)', 'Memória de cálculo'], acao: 'Recalcular com o percentual correto',
      direito: 'O percentual da Equalização é a diferença entre a alíquota interna de MS e a alíquota interestadual do estado de origem (Decreto nº 15.055/2018, art. 5º; LC nº 123/2006, art. 13, § 1º, XIII, "g", item 2), observadas as alíquotas da Resolução do Senado Federal nº 22/1989 (7% ou 12%) e nº 13/2012 (4%, importados).' },
    EQ_CALCULO: { nome: 'Erro de cálculo da Equalização', categoria: 'Cálculo', forca: 'forte', integral: false, base: ['DEC15055_4', 'DEC15055_5', 'CTN165'], docs: ['Memória de cálculo', 'Demonstrativo do recálculo'], acao: 'Recalcular o item',
      direito: 'A Equalização é calculada sobre o valor de aquisição (produtos, IPI, frete, seguro e demais despesas, deduzidos os descontos), sem MVA, aplicando-se o percentual do art. 5º do Decreto nº 15.055/2018 (art. 4º).' },
    EQ_ME: { nome: 'ME isenta da Equalização (Dec. 16.177/2023)', categoria: 'Isenção', forca: 'forte', integral: true, escopo: 'nota', base: ['DEC16177', 'RES3033'], docs: ['Comprovante da receita bruta do ano anterior (PGDAS-D)', 'Lista de beneficiários publicada pela SEFAZ/MS', 'Cartão CNPJ (porte ME)'], acao: 'Excluir a NF da Equalização',
      direito: 'O art. 1º, III, do Decreto nº 16.177/2023 isenta do ICMS Equalização Simples Nacional (código 349), nas aquisições a partir de 1º/05/2023, as microempresas optantes com receita bruta acumulada no ano-calendário anterior de até R$ 360.000,00.' },
    EQ_ME_VERIF: { nome: 'Possível isenção de ME (verificar receita)', categoria: 'Isenção', forca: 'atencao', integral: true, escopo: 'nota', base: ['DEC16177'], docs: ['Receita bruta do ano anterior (PGDAS-D)', 'Lista de beneficiários da SEFAZ/MS'], acao: 'Informar a receita no cadastro',
      direito: 'Microempresas com receita bruta acumulada no ano anterior de até R$ 360.000,00 são isentas do ICMS Equalização (Decreto nº 16.177/2023, art. 1º, III).' },
    EQ_MEI: { nome: 'MEI dispensado da Equalização', categoria: 'Isenção', forca: 'forte', integral: true, escopo: 'nota', base: ['DEC13115', 'RES3033'], docs: ['Certificado da Condição de MEI'], acao: 'Excluir a NF da Equalização',
      direito: 'O Decreto nº 13.115/2011, art. 1º, II (redação do Decreto nº 15.184/2019), dispensa a cobrança do ICMS Equalização Simples Nacional na hipótese que especifica (Microempreendedor Individual).' },
    EQ_ITEM_ST: { nome: 'Equalização sobre mercadoria da lista de ST', categoria: 'Enquadramento', forca: 'atencao', integral: false, base: ['DEC15055_3_1_II_a'], docs: [], acao: 'Avaliar risco antes de pedir',
      direito: 'Mercadoria sujeita à ST não se submete à Equalização (Decreto nº 15.055/2018, art. 3º, § 1º, II, "a"), mas a SEFAZ/MS pode exigir o ICMS-ST correspondente, em regra maior.' }
  };

  const FORCAS = {
    forte: { nome: 'Forte', ordem: 0, desc: 'Base legal direta e números objetivos — pedir revisão' },
    moderada: { nome: 'Moderada', ordem: 1, desc: 'Depende de documento ou confirmação — analisar e pedir' },
    atencao: { nome: 'Atenção', ordem: 2, desc: 'Ponto a conferir — pode gerar pedido após verificação' }
  };

  const DESTINACOES = {
    '': 'Automático',
    revenda: 'Revenda',
    insumo: 'Insumo / ingrediente',
    uso_consumo: 'Uso e consumo',
    degustacao: 'Brinde / degustação',
    ativo: 'Ativo imobilizado'
  };

  const SITUACOES_NF = {
    '': 'Normal',
    devolvida: 'Devolvida integralmente',
    cancelada: 'NF-e cancelada',
    nao_realizada: 'Operação não realizada (mercadoria não recebida)',
    desconhecida: 'Operação desconhecida'
  };

  const STATUS = {
    novo: 'A analisar',
    pedir: 'Incluir no pedido',
    solicitado: 'Solicitado',
    deferido: 'Deferido',
    indeferido: 'Indeferido',
    descartado: 'Descartado'
  };

  function citacoes(ids) { return (ids || []).map(id => NORMAS[id] ? NORMAS[id].cit : id); }

  global.RST_LEGAL = { NORMAS, REGRAS, FORCAS, DESTINACOES, SITUACOES_NF, STATUS, citacoes };
})(window);
