/* ============================================
   GRANA — app.js
   Lógica principal do aplicativo de finanças
   ============================================ */

'use strict';

// ============================================
// CONFIGURAÇÕES E DADOS PADRÃO
// ============================================

/** Categorias padrão com emoji e cor */
const CATEGORIAS = [
  { id: 'alimentacao', nome: 'Alimentação',    emoji: '🍽️', cor: '#ff9f43' },
  { id: 'delivery',    nome: 'iFood/Delivery', emoji: '🛵', cor: '#ee5a24' },
  { id: 'transporte',  nome: 'Transporte',     emoji: '🚌', cor: '#4cc9f0' },
  { id: 'lazer',       nome: 'Lazer',          emoji: '🎮', cor: '#b57bee' },
  { id: 'assinaturas', nome: 'Assinaturas',    emoji: '📱', cor: '#00e676' },
  { id: 'saude',       nome: 'Saúde',          emoji: '💊', cor: '#ff4d6d' },
  { id: 'educacao',    nome: 'Educação',        emoji: '📚', cor: '#ffd166' },
  { id: 'casa',        nome: 'Casa',           emoji: '🏠', cor: '#26de81' },
  { id: 'outros',      nome: 'Outros',         emoji: '📦', cor: '#9090a8' },
];

/** Nomes dos meses em português */
const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

// ============================================
// ESTADO DO APLICATIVO
// ============================================

let estado = {
  mesAtual: new Date().getMonth(),
  anoAtual: new Date().getFullYear(),
  paginaAtual: 'home',
  edicaoId: null,
  excluirId: null,
  tipoLancamento: 'saida',
  categoriaSelecionada: 'outros',
  filtroLancamentos: 'todos',
};

// ============================================
// CHAVES DO LOCALSTORAGE
// ============================================

const KEYS = {
  lancamentos: 'grana_lancamentos',
  perfil:      'grana_perfil',
  metas:       'grana_metas',
  cartao:      'grana_cartao',
};

// ============================================
// HELPERS DE LOCALSTORAGE
// ============================================

function getLancamentos() {
  try { return JSON.parse(localStorage.getItem(KEYS.lancamentos) || '[]'); }
  catch(e) { return []; }
}

function setLancamentos(arr) {
  localStorage.setItem(KEYS.lancamentos, JSON.stringify(arr));
}

function getPerfil() {
  try { return JSON.parse(localStorage.getItem(KEYS.perfil) || '{"nome":"Usuário","renda":0}'); }
  catch(e) { return {nome:'Usuário',renda:0}; }
}

function setPerfil(p) {
  localStorage.setItem(KEYS.perfil, JSON.stringify(p));
}

function getMetas() {
  try { return JSON.parse(localStorage.getItem(KEYS.metas) || '{}'); }
  catch(e) { return {}; }
}

function setMetas(m) {
  localStorage.setItem(KEYS.metas, JSON.stringify(m));
}

function getCartao() {
  try { return JSON.parse(localStorage.getItem(KEYS.cartao) || '{"nome":"","limite":0,"vencimento":10}'); }
  catch(e) { return {nome:'',limite:0,vencimento:10}; }
}

function setCartao(c) {
  localStorage.setItem(KEYS.cartao, JSON.stringify(c));
}

// ============================================
// FORMATADORES
// ============================================

function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return d + '/' + m + '/' + y;
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function chaveAtual() {
  return (estado.mesAtual + 1) + '-' + estado.anoAtual;
}

// ============================================
// FILTRAGEM DE LANÇAMENTOS
// ============================================

function getLancamentosMes() {
  const todos = getLancamentos();
  return todos.filter(function(l) {
    const parts = l.data.split('-');
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    return m === estado.mesAtual + 1 && y === estado.anoAtual;
  });
}

// ============================================
// GERADOR DE ID
// ============================================
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ============================================
// TOAST
// ============================================
let toastTimer = null;

function showToast(msg, tipo) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.borderColor = tipo === 'erro' ? 'var(--red)' : 'var(--border2)';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { el.classList.remove('show'); }, 2800);
}

// ============================================
// NAVEGAÇÃO ENTRE PÁGINAS
// ============================================

function navegar(pagina) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });

  var pg = document.getElementById('page-' + pagina);
  if (pg) pg.classList.add('active');

  var ni = document.querySelector('.nav-item[data-page="' + pagina + '"]');
  if (ni) ni.classList.add('active');

  estado.paginaAtual = pagina;

  var pc = document.getElementById('pages-container');
  if (pc) pc.scrollTop = 0;
}

// ============================================
// ATUALIZAÇÃO DO MÊS
// ============================================

function atualizarNavMes() {
  var el = document.getElementById('month-label');
  if (el) el.textContent = MESES[estado.mesAtual] + ' ' + estado.anoAtual;
}

function mesAnterior() {
  estado.mesAtual--;
  if (estado.mesAtual < 0) { estado.mesAtual = 11; estado.anoAtual--; }
  atualizarNavMes();
  renderizarTudo();
}

function proximoMes() {
  estado.mesAtual++;
  if (estado.mesAtual > 11) { estado.mesAtual = 0; estado.anoAtual++; }
  atualizarNavMes();
  renderizarTudo();
}

// ============================================
// RENDERIZAÇÃO PRINCIPAL
// ============================================

function renderizarTudo() {
  renderizarResumo();
  renderizarMeta();
  renderizarCategorias();
  renderizarLancamentosRecentes();
  renderizarLancamentosFull();
  renderizarCartao();
}

// ============================================
// RESUMO FINANCEIRO
// ============================================

function renderizarResumo() {
  var lancamentos = getLancamentosMes();
  var entradas = 0, saidas = 0;
  lancamentos.forEach(function(l) {
    if (l.tipo === 'entrada') entradas += l.valor;
    else saidas += l.valor;
  });
  var saldo = entradas - saidas;

  var elSaldo   = document.getElementById('saldo-mes');
  var elEntrada = document.getElementById('total-entradas');
  var elSaida   = document.getElementById('total-saidas');

  if (elSaldo)   { elSaldo.textContent   = formatBRL(saldo);    elSaldo.classList.toggle('negativo', saldo < 0); }
  if (elEntrada)   elEntrada.textContent = formatBRL(entradas);
  if (elSaida)     elSaida.textContent   = formatBRL(saidas);
}

// ============================================
// META DE ECONOMIA
// ============================================

function renderizarMeta() {
  var metas = getMetas();
  var meta  = metas[chaveAtual()] || 0;

  var lancamentos = getLancamentosMes();
  var entradas = 0, saidas = 0;
  lancamentos.forEach(function(l) {
    if (l.tipo === 'entrada') entradas += l.valor;
    else saidas += l.valor;
  });
  var economizado = Math.max(0, entradas - saidas);
  var pct = meta > 0 ? Math.min(100, (economizado / meta) * 100) : 0;

  var elSaved  = document.getElementById('meta-saved');
  var elTarget = document.getElementById('meta-target');
  var elFill   = document.getElementById('progress-fill');
  var elPct    = document.getElementById('meta-pct');
  var elMsg    = document.getElementById('meta-msg');

  if (elSaved)  elSaved.textContent  = formatBRL(economizado);
  if (elTarget) elTarget.textContent = 'de ' + formatBRL(meta);
  if (elFill)   elFill.style.width   = pct + '%';
  if (elPct)    elPct.textContent    = Math.round(pct) + '%';

  var msg = 'Defina uma meta!';
  if (meta > 0) {
    if (pct >= 100) msg = '🎉 Meta atingida!';
    else if (pct >= 70) msg = 'Quase lá, continue!';
    else if (pct >= 30) msg = 'Bom progresso!';
    else msg = 'Você consegue!';
  }
  if (elMsg) elMsg.textContent = msg;
}

// ============================================
// CATEGORIAS
// ============================================

function renderizarCategorias() {
  var lancamentos = getLancamentosMes().filter(function(l) { return l.tipo === 'saida'; });
  var container   = document.getElementById('categoria-list');
  if (!container) return;

  if (!lancamentos.length) {
    container.innerHTML = '<div class="empty-state-small">Nenhum gasto ainda</div>';
    return;
  }

  var grupos = {};
  lancamentos.forEach(function(l) {
    if (!grupos[l.categoria]) grupos[l.categoria] = { total: 0, count: 0 };
    grupos[l.categoria].total += l.valor;
    grupos[l.categoria].count++;
  });

  var totalGeral = 0;
  Object.keys(grupos).forEach(function(k) { totalGeral += grupos[k].total; });

  var ordenado = Object.keys(grupos).sort(function(a,b) { return grupos[b].total - grupos[a].total; });

  container.innerHTML = ordenado.map(function(catId) {
    var dados = grupos[catId];
    var cat = CATEGORIAS.find(function(c) { return c.id === catId; }) || CATEGORIAS[CATEGORIAS.length - 1];
    var pct = Math.round((dados.total / totalGeral) * 100);
    return '<div class="categoria-item">' +
      '<div class="cat-icon" style="background:' + cat.cor + '20">' + cat.emoji + '</div>' +
      '<div class="cat-info"><span class="cat-name">' + cat.nome + '</span>' +
      '<span class="cat-count">' + dados.count + ' lançamento' + (dados.count > 1 ? 's' : '') + '</span></div>' +
      '<div class="cat-bar-wrap"><div class="cat-bar">' +
      '<div class="cat-bar-fill" style="width:' + pct + '%;background:' + cat.cor + '"></div></div>' +
      '<span class="cat-value">' + formatBRL(dados.total) + '</span></div></div>';
  }).join('');
}

// ============================================
// LANÇAMENTOS: RENDERIZAÇÃO
// ============================================

function htmlLancamento(l) {
  var cat    = CATEGORIAS.find(function(c) { return c.id === l.categoria; }) || CATEGORIAS[CATEGORIAS.length - 1];
  var sinal  = l.tipo === 'entrada' ? '+' : '−';
  var classe = l.tipo === 'entrada' ? 'entrada' : 'saida';
  var tagCartao = l.cartao ? '<span class="item-tag" style="background:var(--blue-dim);color:var(--blue)">💳 cartão</span>' : '';

  return '<div class="lancamento-item" data-id="' + l.id + '">' +
    '<div class="item-icon" style="background:' + cat.cor + '20">' + cat.emoji + '</div>' +
    '<div class="item-info">' +
    '<span class="item-desc">' + (l.descricao || cat.nome) + '</span>' +
    '<div class="item-meta"><span>' + formatData(l.data) + '</span><span>•</span><span>' + cat.nome + '</span>' + tagCartao + '</div>' +
    '</div>' +
    '<span class="item-valor ' + classe + '">' + sinal + ' ' + formatBRL(l.valor) + '</span>' +
    '<button class="item-delete" data-id="' + l.id + '" aria-label="Excluir">🗑</button>' +
    '</div>';
}

function renderizarLancamentosRecentes() {
  var lancamentos = getLancamentosMes()
    .sort(function(a, b) { return b.data.localeCompare(a.data); })
    .slice(0, 5);
  var container = document.getElementById('lancamentos-recentes');
  if (!container) return;

  if (!lancamentos.length) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">💸</span><p>Nenhum lançamento ainda.<br/>Toque no <strong>+</strong> para começar!</p></div>';
    return;
  }
  container.innerHTML = lancamentos.map(htmlLancamento).join('');
  bindDeleteButtons(container);
}

function renderizarLancamentosFull() {
  var lancamentos = getLancamentosMes().sort(function(a, b) { return b.data.localeCompare(a.data); });

  if (estado.filtroLancamentos !== 'todos') {
    lancamentos = lancamentos.filter(function(l) { return l.tipo === estado.filtroLancamentos; });
  }

  var container = document.getElementById('lancamentos-full');
  if (!container) return;

  if (!lancamentos.length) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><p>Nenhum lançamento neste período.</p></div>';
    return;
  }
  container.innerHTML = lancamentos.map(htmlLancamento).join('');
  bindDeleteButtons(container);
}

function bindDeleteButtons(container) {
  container.querySelectorAll('.item-delete').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      pedirConfirmacaoExclusao(btn.dataset.id);
    });
  });
}

// ============================================
// CARTÃO DE CRÉDITO
// ============================================

function renderizarCartao() {
  var cartao     = getCartao();
  var lancamentos = getLancamentosMes().filter(function(l) { return l.tipo === 'saida' && l.cartao; });
  var totalFatura = 0;
  lancamentos.forEach(function(l) { totalFatura += l.valor; });

  var elFatura = document.getElementById('cc-fatura');
  var elLimite = document.getElementById('cc-limite');
  if (elFatura) elFatura.textContent = formatBRL(totalFatura);
  if (elLimite) elLimite.textContent = cartao.limite ? formatBRL(cartao.limite) : '—';

  var ccBank = document.querySelector('.cc-bank');
  if (ccBank && cartao.nome) ccBank.textContent = cartao.nome;

  var elNome  = document.getElementById('cc-nome');
  var elLimIn = document.getElementById('cc-limite-input');
  var elVenc  = document.getElementById('cc-vencimento');
  if (elNome)  elNome.value  = cartao.nome || '';
  if (elLimIn) elLimIn.value = cartao.limite || '';
  if (elVenc)  elVenc.value  = cartao.vencimento || '';

  var container = document.getElementById('lancamentos-cartao');
  if (!container) return;

  if (!lancamentos.length) {
    container.innerHTML = '<div class="empty-state-small">Nenhum gasto no cartão este mês</div>';
    return;
  }
  container.innerHTML = lancamentos.sort(function(a,b) { return b.data.localeCompare(a.data); }).map(htmlLancamento).join('');
  bindDeleteButtons(container);
}

// ============================================
// MODAL: LANÇAMENTO
// ============================================

function abrirModalLancamento(tipo) {
  tipo = tipo || 'saida';
  var elValor = document.getElementById('input-valor');
  var elDesc  = document.getElementById('input-descricao');
  var elData  = document.getElementById('input-data');
  var elCart  = document.getElementById('input-cartao');

  if (elValor) elValor.value   = '';
  if (elDesc)  elDesc.value    = '';
  if (elData)  elData.value    = hojeISO();
  if (elCart)  elCart.checked  = false;
  estado.edicaoId = null;

  setTipoLancamento(tipo);
  selecionarCategoria('outros');

  var modal = document.getElementById('modal-lancamento');
  if (modal) modal.classList.add('open');

  setTimeout(function() { if (elValor) elValor.focus(); }, 300);
}

function fecharModalLancamento() {
  var modal = document.getElementById('modal-lancamento');
  if (modal) modal.classList.remove('open');
}

function setTipoLancamento(tipo) {
  estado.tipoLancamento = tipo;
  document.querySelectorAll('.tipo-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.tipo === tipo);
  });
}

function selecionarCategoria(id) {
  estado.categoriaSelecionada = id;
  document.querySelectorAll('.cat-chip').forEach(function(chip) {
    chip.classList.toggle('selected', chip.dataset.cat === id);
  });
}

function renderizarChipsCategorias() {
  var container = document.getElementById('categoria-chips');
  if (!container) return;

  container.innerHTML = CATEGORIAS.map(function(cat) {
    return '<button class="cat-chip" data-cat="' + cat.id + '" type="button"><span>' + cat.emoji + '</span> ' + cat.nome + '</button>';
  }).join('');

  container.querySelectorAll('.cat-chip').forEach(function(chip) {
    chip.addEventListener('click', function() { selecionarCategoria(chip.dataset.cat); });
  });

  selecionarCategoria('outros');
}

function salvarLancamento() {
  var elValor = document.getElementById('input-valor');
  var elDesc  = document.getElementById('input-descricao');
  var elData  = document.getElementById('input-data');
  var elCart  = document.getElementById('input-cartao');

  var valor   = parseFloat(elValor ? elValor.value : 0);
  var descricao = elDesc ? elDesc.value.trim() : '';
  var data    = elData ? elData.value : '';
  var cartao  = elCart ? elCart.checked : false;

  if (!valor || valor <= 0) {
    showToast('Informe um valor válido', 'erro');
    if (elValor) elValor.focus();
    return;
  }
  if (!data) {
    showToast('Informe uma data', 'erro');
    return;
  }

  var todos = getLancamentos();

  if (estado.edicaoId) {
    var idx = -1;
    todos.forEach(function(l, i) { if (l.id === estado.edicaoId) idx = i; });
    if (idx !== -1) {
      todos[idx].valor     = valor;
      todos[idx].descricao = descricao;
      todos[idx].data      = data;
      todos[idx].cartao    = cartao;
      todos[idx].tipo      = estado.tipoLancamento;
      todos[idx].categoria = estado.categoriaSelecionada;
    }
    showToast('Lançamento atualizado ✓');
  } else {
    todos.push({
      id: gerarId(),
      tipo: estado.tipoLancamento,
      valor: valor,
      descricao: descricao,
      categoria: estado.categoriaSelecionada,
      data: data,
      cartao: cartao,
      criadoEm: new Date().toISOString(),
    });
    showToast(estado.tipoLancamento === 'saida' ? 'Gasto registrado ✓' : 'Entrada registrada ✓');
  }

  setLancamentos(todos);
  fecharModalLancamento();
  renderizarTudo();

  if (navigator.vibrate) navigator.vibrate(40);
}

// ============================================
// EXCLUSÃO DE LANÇAMENTO
// ============================================

function pedirConfirmacaoExclusao(id) {
  estado.excluirId = id;
  var todos = getLancamentos();
  var l = null;
  todos.forEach(function(item) { if (item.id === id) l = item; });
  if (l) {
    var el = document.getElementById('confirm-text');
    if (el) el.textContent = 'Excluir "' + (l.descricao || l.categoria) + '" (' + formatBRL(l.valor) + ')?';
  }
  var modal = document.getElementById('modal-confirm');
  if (modal) modal.classList.add('open');
}

function confirmarExclusao() {
  if (!estado.excluirId) return;
  var todos = getLancamentos().filter(function(l) { return l.id !== estado.excluirId; });
  setLancamentos(todos);
  estado.excluirId = null;
  var modal = document.getElementById('modal-confirm');
  if (modal) modal.classList.remove('open');
  renderizarTudo();
  showToast('Lançamento excluído');
  if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
}

// ============================================
// META
// ============================================

function abrirModalMeta() {
  var metas = getMetas();
  var meta  = metas[chaveAtual()] || '';
  var el = document.getElementById('input-meta');
  if (el) el.value = meta;
  var modal = document.getElementById('modal-meta');
  if (modal) modal.classList.add('open');
  setTimeout(function() { if (el) el.focus(); }, 300);
}

function salvarMeta() {
  var el = document.getElementById('input-meta');
  var valor = parseFloat(el ? el.value : 0);
  if (!valor || valor <= 0) {
    showToast('Informe um valor válido', 'erro');
    return;
  }
  var metas = getMetas();
  metas[chaveAtual()] = valor;
  setMetas(metas);
  var modal = document.getElementById('modal-meta');
  if (modal) modal.classList.remove('open');
  renderizarMeta();
  showToast('Meta definida ✓');
}

// ============================================
// CARTÃO: SALVAR CONFIG
// ============================================

function salvarCartao() {
  var cartao = {
    nome:       (document.getElementById('cc-nome') || {}).value || '',
    limite:     parseFloat((document.getElementById('cc-limite-input') || {}).value) || 0,
    vencimento: parseInt((document.getElementById('cc-vencimento') || {}).value) || 10,
  };
  setCartao(cartao);
  renderizarCartao();
  showToast('Cartão salvo ✓');
}

// ============================================
// PERFIL
// ============================================

function carregarPerfil() {
  var perfil = getPerfil();
  var elNome  = document.getElementById('input-nome');
  var elRenda = document.getElementById('input-renda');
  if (elNome)  elNome.value  = perfil.nome || '';
  if (elRenda) elRenda.value = perfil.renda || '';

  var inicial = (perfil.nome || 'U').charAt(0).toUpperCase();
  var elAvatar = document.getElementById('avatar');
  var elPAvatar = document.querySelector('.perfil-avatar');
  var elPNome   = document.getElementById('perfil-nome-display');
  if (elAvatar)  elAvatar.textContent  = inicial;
  if (elPAvatar) elPAvatar.textContent = inicial;
  if (elPNome)   elPNome.textContent   = perfil.nome || 'Usuário';
}

function salvarPerfil() {
  var elNome  = document.getElementById('input-nome');
  var elRenda = document.getElementById('input-renda');
  var nome  = elNome  ? elNome.value.trim()  : '';
  var renda = elRenda ? parseFloat(elRenda.value) || 0 : 0;
  setPerfil({ nome: nome || 'Usuário', renda: renda });
  carregarPerfil();
  showToast('Perfil salvo ✓');
}

// ============================================
// EXPORTAR DADOS
// ============================================

function exportarDados() {
  var dados = {
    lancamentos: getLancamentos(),
    perfil:      getPerfil(),
    metas:       getMetas(),
    cartao:      getCartao(),
    exportadoEm: new Date().toISOString(),
  };
  var blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'grana-backup-' + hojeISO() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Dados exportados ✓');
}

// ============================================
// LIMPAR DADOS
// ============================================

function limparDados() {
  if (!confirm('Tem certeza? Todos os dados serão apagados permanentemente.')) return;
  localStorage.clear();
  showToast('Dados apagados');
  setTimeout(function() { location.reload(); }, 800);
}

// ============================================
// FECHAMENTO DE MODAIS AO CLICAR FORA
// ============================================

function fecharModalAoClicarFora(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

function init() {
  // Esconde splash e mostra app imediatamente
  var splash = document.getElementById('splash');
  var app    = document.getElementById('app');

  if (splash) {
    setTimeout(function() {
      splash.style.opacity = '0';
      splash.style.transition = 'opacity 0.4s ease';
      setTimeout(function() {
        splash.style.display = 'none';
      }, 400);
    }, 1200);
  }

  if (app) {
    app.classList.remove('hidden');
  }

  // Gera chips de categoria
  renderizarChipsCategorias();

  // Nav: mês
  var btnPrev = document.getElementById('prev-month');
  var btnNext = document.getElementById('next-month');
  if (btnPrev) btnPrev.addEventListener('click', mesAnterior);
  if (btnNext) btnNext.addEventListener('click', proximoMes);
  atualizarNavMes();

  // Nav: páginas
  document.querySelectorAll('.nav-item').forEach(function(btn) {
    btn.addEventListener('click', function() { navegar(btn.dataset.page); });
  });

  // Avatar → perfil
  var avatarBtn = document.getElementById('avatar-btn');
  if (avatarBtn) avatarBtn.addEventListener('click', function() { navegar('perfil'); });

  // FAB → abre modal
  var fab = document.getElementById('fab');
  if (fab) fab.addEventListener('click', function() { abrirModalLancamento('saida'); });

  // Modal: lançamento
  var closeL = document.getElementById('close-lancamento');
  var saveL  = document.getElementById('btn-salvar-lancamento');
  var modalL = document.getElementById('modal-lancamento');
  if (closeL) closeL.addEventListener('click', fecharModalLancamento);
  if (saveL)  saveL.addEventListener('click', salvarLancamento);
  if (modalL) modalL.addEventListener('click', fecharModalAoClicarFora);

  // Modal: tipo toggle
  document.querySelectorAll('.tipo-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { setTipoLancamento(btn.dataset.tipo); });
  });

  // Modal: meta
  var btnMeta   = document.getElementById('btn-edit-meta');
  var closeMeta = document.getElementById('close-meta');
  var saveMeta  = document.getElementById('btn-salvar-meta');
  var modalMeta = document.getElementById('modal-meta');
  if (btnMeta)   btnMeta.addEventListener('click', abrirModalMeta);
  if (closeMeta) closeMeta.addEventListener('click', function() { modalMeta && modalMeta.classList.remove('open'); });
  if (saveMeta)  saveMeta.addEventListener('click', salvarMeta);
  if (modalMeta) modalMeta.addEventListener('click', fecharModalAoClicarFora);

  // Modal: confirmação exclusão
  var closeConf  = document.getElementById('close-confirm');
  var cancelConf = document.getElementById('btn-cancel-confirm');
  var okConf     = document.getElementById('btn-ok-confirm');
  var modalConf  = document.getElementById('modal-confirm');
  if (closeConf)  closeConf.addEventListener('click',  function() { modalConf && modalConf.classList.remove('open'); });
  if (cancelConf) cancelConf.addEventListener('click', function() { modalConf && modalConf.classList.remove('open'); });
  if (okConf)     okConf.addEventListener('click', confirmarExclusao);
  if (modalConf)  modalConf.addEventListener('click', fecharModalAoClicarFora);

  // Ver todos
  var btnVerTodos = document.getElementById('btn-ver-todos');
  if (btnVerTodos) btnVerTodos.addEventListener('click', function() { navegar('lancamentos'); });

  // Filtros de tipo
  var filterTabs = document.getElementById('filter-tabs');
  if (filterTabs) {
    filterTabs.addEventListener('click', function(e) {
      var btn = e.target.closest('.filter-tab');
      if (!btn) return;
      document.querySelectorAll('.filter-tab').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      estado.filtroLancamentos = btn.dataset.filter;
      renderizarLancamentosFull();
    });
  }

  // Cartão
  var btnSalvarCartao = document.getElementById('btn-salvar-cartao');
  var btnAddFatura    = document.getElementById('btn-add-fatura');
  if (btnSalvarCartao) btnSalvarCartao.addEventListener('click', salvarCartao);
  if (btnAddFatura) {
    btnAddFatura.addEventListener('click', function() {
      abrirModalLancamento('saida');
      setTimeout(function() {
        var el = document.getElementById('input-cartao');
        if (el) el.checked = true;
      }, 350);
    });
  }

  // Perfil
  var btnSalvarPerfil = document.getElementById('btn-salvar-perfil');
  var btnExportar     = document.getElementById('btn-exportar');
  var btnLimpar       = document.getElementById('btn-limpar');
  if (btnSalvarPerfil) btnSalvarPerfil.addEventListener('click', salvarPerfil);
  if (btnExportar)     btnExportar.addEventListener('click', exportarDados);
  if (btnLimpar)       btnLimpar.addEventListener('click', limparDados);

  // Carrega dados
  carregarPerfil();
  renderizarTudo();

  // Registra service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function(err) {
        console.warn('SW não registrado:', err);
      });
    });
  }
}

// Inicia quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
