// ══════════════════════════════════════════════════════════
// RESULTADO DIÁRIO DOS PARCEIROS — importação do backoffice da casa
// ══════════════════════════════════════════════════════════
// Quem roda: a rotina diária (agente no Chrome do Diego). Ela só lê a página
// Visão geral do backoffice com o filtro no endereço e entrega o texto aqui.
// Esta parte faz o resto: monta os links, confere se o filtro pegou, lê a tabela
// "Resultado por período" e grava em crm.partner_daily (parceiro + dia + origem).
//
//   await ptnSyncPlan('rips', 7)          → [{ partner_id, name, channel, value, url }]
//   await ptnIngest(itemDoPlano, textoDaPagina)  → { rows }  (texto do get_page_text, com a linha URL:)
//   ptnReadSnippet(item.url)               → JS para rodar na aba do backoffice; o JSON
//                                            que ele devolve vai direto no ptnIngest
//   await ptnSyncLog('rips', linhas, ok, detalhe)
//
// Link e cupom ficam separados (channel 'link' | 'cupom'). Quem chegou pelo link
// e usou o cupom aparece nos dois; não somar sem saber disso.
// ══════════════════════════════════════════════════════════
(function () {
  const sb = () => window.sb.schema('crm');
  const HOSTS = { rips: 'https://backoffice.rips.com.br/analytics/visao-geral' };
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Colunas da tabela, na ordem do backoffice (conferidas pelo cabeçalho)
  const HEADER = 'DIA Cadastros FTDs Cadastro → FTD Depositantes Depósitos concluídos Valor FTD Saques pagos Net cash Compradores em dinheiro Compras em dinheiro GMV em dinheiro GMV em bônus Recompra paga em dinheiro Recompra em bônus Custo das cartas Take Custo de bônus NGR Saldo inicial Saldo final Saldo bônus final';
  const COLS = ['registrations', 'ftd', '_conv', 'depositors', 'deposits', 'ftd_value', 'withdrawals', 'net_cash', 'buyers', '_purchases', 'gmv', '_gmv_bonus', '_rebuy', '_rebuy_bonus', '_card_cost', 'take', 'bonus_cost', 'ngr', '_bal0', '_bal1', '_bal_bonus'];

  const num = (t) => {
    if (t === '—' || t === '-' || t === '') return 0;
    const n = Number(String(t).replace(/\./g, '').replace(',', '.').replace('%', ''));
    if (!Number.isFinite(n)) throw new Error(`valor inesperado "${t}"`);
    return n;
  };

  // Lê o texto da página filtrada. Lança erro se o layout mudou ou o filtro não pegou.
  // `item` é a linha do ptnSyncPlan (traz a url pedida, com período e filtro).
  function parse(text, item) {
    const t = String(text || '');
    const lines0 = t.split('\n').map(l => l.trim());
    // 1. É a página pedida? (o leitor de texto escreve "URL: ..." no topo)
    const urlLine = lines0.find(l => l.startsWith('URL: '));
    const urlOk = urlLine && urlLine.slice(5) === item.url;
    if (!urlOk) throw new Error(`a página lida não é a pedida (${item.value}); nada gravado`);
    // 2. O backoffice aceitou o filtro do endereço? (botão Filtros com contador 1)
    const fi = lines0.findIndex(l => l === 'Filtros');
    if (fi < 0 || lines0[fi + 1] !== '1') throw new Error(`filtro "${item.value}" não está ativo na página; nada gravado`);
    // 3. Período certo
    const [y0, m0, d0] = item.from.split('-'), [y1, m1, d1] = item.to.split('-');
    if (!lines0.some(l => l.startsWith(`${d0}/${m0}/${y0} a ${d1}/${m1}/${y1}`))) throw new Error('período da página diferente do pedido; nada gravado');
    // 4. Cabeçalho da tabela igual ao esperado
    const lines = t.split('\n').map(l => l.trim());
    const hi = lines.findIndex(l => /^DIA\s/.test(l));
    if (hi < 0) throw new Error('tabela "Resultado por período" não encontrada');
    if (lines[hi].replace(/\s+/g, ' ') !== HEADER) throw new Error('as colunas da tabela mudaram no backoffice; revisar o importador');
    // 5. Linhas dd/mm/aaaa (só dentro do período)
    const rows = [];
    for (let i = hi + 1; i < lines.length; i++) {
      const l = lines[i];
      if (!/^\d{2}\/\d{2}\/\d{4}\s/.test(l)) { if (/^Total do período/.test(l)) break; continue; }
      const tok = l.replace(/-\s?R\$\s?/g, '-').replace(/R\$\s?/g, '').split(/\s+/);
      const [dd, mm, yy] = tok.shift().split('/');
      if (tok.length !== COLS.length) throw new Error(`linha de ${dd}/${mm} com ${tok.length} colunas (esperado ${COLS.length})`);
      const r = { day: `${yy}-${mm}-${dd}` };
      if (r.day < item.from || r.day > item.to) continue;
      COLS.forEach((c, k) => { if (c[0] !== '_') r[c] = num(tok[k]); });
      rows.push(r);
    }
    return rows;
  }

  // Parceiros da marca com cupom e/ou link → um link por origem
  window.ptnSyncPlan = async (brand = 'rips', days = 7, toDate) => {
    const base = HOSTS[brand];
    if (!base) throw new Error(`sem backoffice configurado para ${brand}`);
    if (!STATE.crm?.ptnLoaded && window.CRM?.loadPartners) await CRM.loadPartners();
    const prod = (STATE.crm.products || []).find(p => fold(p.name).replace(/[^a-z0-9]/g, '') === brand);
    if (!prod) throw new Error(`produto ${brand} não encontrado`);
    const to = toDate ? new Date(toDate + 'T12:00:00') : new Date();
    const from = new Date(to); from.setDate(from.getDate() - (days - 1));
    const q = `from=${iso(from)}&to=${iso(to)}`;
    const out = [];
    (STATE.crm.partners || []).filter(p => p.product_id === prod.id && p.status !== 'ended').forEach(p => {
      const f = iso(from), t = iso(to);
      if (p.ref_code) out.push({ partner_id: p.id, name: p.name, channel: 'cupom', value: p.ref_code, from: f, to: t, url: `${base}?${q}&codigos=${encodeURIComponent(p.ref_code)}` });
      if (p.utm_content) out.push({ partner_id: p.id, name: p.name, channel: 'link', value: p.utm_content, from: f, to: t, url: `${base}?${q}&utm_content=${encodeURIComponent(p.utm_content)}` });
    });
    return out;
  };

  window.ptnIngest = async (item, text) => {
    if (!item?.partner_id || !['link', 'cupom'].includes(item.channel)) throw new Error('item inválido (use uma linha do ptnSyncPlan)');
    const { partner_id: partnerId, channel } = item;
    const tx = typeof text === 'string' ? text.trim() : text;
    const parsed = (tx && (typeof tx === 'object' || tx[0] === '{')) ? fromSnippet(tx, item) : parse(tx, item);
    if (!parsed.length) return { rows: 0 };
    const now = new Date().toISOString();
    const rows = parsed.map(r => ({ ...r, partner_id: partnerId, channel, source: 'backoffice', synced_at: now }));
    const { data, error } = await sb().from('partner_daily').upsert(rows, { onConflict: 'partner_id,day,channel' }).select();
    if (error) throw new Error(error.message);
    const list = (STATE.crm.partnerDaily = STATE.crm.partnerDaily || []);
    (data || []).forEach(r => { const i = list.findIndex(x => x.id === r.id); if (i >= 0) list[i] = r; else list.push(r); });
    return { rows: (data || []).length, days: parsed.map(r => r.day) };
  };

  // Script de leitura para rodar NA ABA DO BACKOFFICE (só lê; não clica em nada).
  // Faz as conferências e a conversão ali mesmo e devolve um JSON curto:
  //   { url_ok, filters, period, header_ok, n, rows: [[dia, ...KEEP]] }  (só dias com movimento)
  const KEEP = COLS.filter(c => c[0] !== '_');
  window.ptnReadSnippet = (url) => `(() => {
  const HEADER = ${JSON.stringify(HEADER)};
  const COLS = ${JSON.stringify(COLS)};
  const num = (x) => (x === '—' || x === '-' || x === '') ? 0 : Number(String(x).replace(/\\./g, '').replace(',', '.').replace('%', ''));
  const t = (document.querySelector('main') || document.body).innerText.split('\\n').map(s => s.trim());
  const fi = t.indexOf('Filtros');
  const hi = t.findIndex(l => /^DIA\\s/.test(l));
  const out = { url_ok: location.href === ${JSON.stringify(url)}, filters: fi >= 0 ? t[fi + 1] : '',
    period: (t.find(l => /^\\d{2}\\/\\d{2}\\/\\d{4} a \\d{2}\\/\\d{2}\\/\\d{4}/.test(l)) || '').slice(0, 23),
    header_ok: hi >= 0 && t[hi].replace(/\\s+/g, ' ') === HEADER, n: 0, bad: 0, rows: [] };
  if (hi >= 0) for (let i = hi + 1; i < t.length; i++) {
    const l = t[i];
    if (/^Total/.test(l)) break;
    if (!/^\\d{2}\\/\\d{2}\\/\\d{4}\\s/.test(l)) continue;
    const tok = l.replace(/-\\s?R\\$\\s?/g, '-').replace(/R\\$\\s?/g, '').split(/\\s+/);
    const [dd, mm, yy] = tok.shift().split('/');
    out.n++;
    if (tok.length !== COLS.length) { out.bad++; continue; }
    const r = {}; COLS.forEach((c, k) => { r[c] = num(tok[k]); });
    const vals = ${JSON.stringify(KEEP)}.map(c => r[c]);
    if (vals.some(v => !Number.isFinite(v))) { out.bad++; continue; }
    if (vals.some(v => v !== 0)) out.rows.push([yy + '-' + mm + '-' + dd, ...vals]);
  }
  return JSON.stringify(out);
})()`;

  // Leitura curta (JSON do ptnReadSnippet) → linhas para gravar, com as mesmas conferências
  function fromSnippet(json, item) {
    const o = typeof json === 'string' ? JSON.parse(json) : json;
    if (!o.url_ok) throw new Error(`a página lida não é a pedida (${item.value}); nada gravado`);
    if (o.filters !== '1') throw new Error(`filtro "${item.value}" não está ativo na página; nada gravado`);
    const [y0, m0, d0] = item.from.split('-'), [y1, m1, d1] = item.to.split('-');
    if (o.period !== `${d0}/${m0}/${y0} a ${d1}/${m1}/${y1}`) throw new Error('período da página diferente do pedido; nada gravado');
    if (!o.header_ok) throw new Error('as colunas da tabela mudaram no backoffice; revisar o importador');
    if (o.bad) throw new Error(`${o.bad} linha(s) da tabela fora do formato; nada gravado`);
    // Todos os dias do período: os que não vieram em rows tiveram zero
    const days = [];
    for (let d = new Date(item.from + 'T12:00:00'); iso(d) <= item.to; d.setDate(d.getDate() + 1)) days.push(iso(d));
    if (o.n !== days.length) throw new Error(`a tabela trouxe ${o.n} dias, esperado ${days.length} (a página mostra no máximo 10)`);
    const by = new Map(o.rows.map(r => [r[0], r]));
    return days.map(day => {
      const r = { day }, src = by.get(day);
      KEEP.forEach((c, k) => { r[c] = src ? Number(src[k + 1]) || 0 : 0; });
      return r;
    });
  }

  window.ptnSyncLog = async (brand, rows, ok, detail) => {
    const { error } = await sb().from('partner_sync_runs').insert({ product: brand, rows_upserted: rows || 0, ok: ok !== false, detail: detail || null });
    if (error) throw new Error(error.message);
    return true;
  };

  window.ptnLastSync = async (brand = 'rips') => {
    const { data } = await sb().from('partner_sync_runs').select('*').eq('product', brand).order('started_at', { ascending: false }).limit(1);
    return data?.[0] || null;
  };

  window.__ptnParse = parse; window.__ptnFromSnippet = fromSnippet; // para testes
})();
