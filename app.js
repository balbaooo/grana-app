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
  mesAtual: new Date().getMonth(),     // 0-11
  anoAtual: new Date().getFullYear(),
  paginaAtual: 'home',
  edicaoId: null,                      // ID do lançamento em edição
  excluirId: null,                     // ID aguardando confirmação de exclusão
  tipoLancamento: 'saida',             // 'entrada' ou 'saida'
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

/** Retorna os lançamentos salvos */
function getLancamentos() {
  return JSON.parse(localStorage.getItem(KEYS.lancamentos) || '[]');
}

/** Salva o array de lançamentos */
function setLancamentos(arr) {
  localStorage.setItem(KEYS.lancamentos, JSON.stringify(arr));
}

/** Retorna o perfil do usuário */
function getPerfil() {
  return JSON.parse(localStorage.getItem(KEYS.perfil) || '{"nome":"Usuário","renda":0}');
}

/** Salva perfil */
function setPerfil(p) {
  localStorage.setItem(KEYS.perfil, JSON.stringify(p));
}

/** Retorna metas por mês/ano (chave = "MM-YYYY") */
function getMetas() {
  return JSON.parse(localStorage.getItem(KEYS.metas) || '{}');
}

/** Salva metas */
function setMetas(m) {
  localStorage.setItem(KEYS.metas, JSON.stringify(m));
}

/** Retorna configuração do cartão */
function getCartao() {
  return JSON.parse(localStorage.getItem(KEYS.cartao) || '{"nome":"","limite":0,"vencimento":10}');
}

/** Salva configuração do cartão */
function setCartao(c) {
  localStorage.setItem(KEYS.cartao, JSON.stringify(c));
}

// ============================================
// FORMATADORES
// ============================================

/** Formata número como moeda BRL */
function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata data ISO para DD/MM/YYYY */
function formatData(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/** Retorna a data de hoje no formato YYYY-MM-DD */
function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Retorna a chave de mês/ano atual */
function chaveAtual() {
  return `${estado.mesAtual + 1}-${estado.anoAtual}`;
}

// ============================================
// FILTRAGEM DE LANÇAMENTOS
// ============================================

/** Filtra lançamentos do mês/ano selecionado */
function getLancamentosMes() {
  const todos = getLancamentos();
  return todos.filter(l => {
    const [y, m] = l.data.split('-').map(Number);
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

function showToast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.borderColor = tipo === 'erro' ? 'var(--red)' : 'var(--border2)';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ============================================
// NAVEGAÇÃO ENTRE PÁGINAS
// ============================================

function navegar(pagina) {
  // Remove active de todos
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Ativa a página e o item de nav
  document.getElementById(`page-${pagina}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${pagina}"]`)?.classList.add('active');

  estado.paginaAtual = pagina;

  // Rola para o topo
  document.getElementById('pages-container').scrollTop = 0;
}

// ============================================
// ATUALIZAÇÃO DO MÊS
// ============================================

function atualizarNavMes() {
  document.getElementById('month-label').textContent =
    `${MESES[estado.mesAtual]} ${estado.anoAtual}`;
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
  const lancamentos = getLancamentosMes();
  const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
  const saidas   = lancamentos.filter(l => l.tipo === 'saida'  ).reduce((s, l) => s + l.valor, 0);
  const saldo    = entradas - saidas;

  const elSaldo   = document.getElementById('saldo-mes');
  const elEntrada = document.getElementById('total-entradas');
  const elSaida   = document.getElementById('total-saidas');

  elSaldo.textContent   = formatBRL(saldo);
  elEntrada.textContent = formatBRL(entradas);
  elSaida.textContent   = formatBRL(saidas);

  // Cor do saldo
  elSaldo.classList.toggle('negativo', saldo < 0);
}

// ============================================
// META DE ECONOMIA
// ============================================

function renderizarMeta() {
  const metas = getMetas();
  const chave = chaveAtual();
  const meta  = metas[chave] || 0;

  const lancamentos = getLancamentosMes();
  const entradas    = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
  const saidas      = lancamentos.filter(l => l.tipo === 'saida'  ).reduce((s, l) => s + l.valor, 0);
  const economizado = Math.max(0, entradas - saidas);

  const pct = meta > 0 ? Math.min(100, (economizado / meta) * 100) : 0;

  document.getElementById('meta-saved').textContent  = formatBRL(economizado);
  document.getElementById('meta-target').textContent = `de ${formatBRL(meta)}`;
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('meta-pct').textContent   = `${Math.round(pct)}%`;

  let msg = 'Defina uma meta!';
  if (meta > 0) {
    if (pct >= 100) msg = '🎉 Meta atingida!';
    else if (pct >= 70) msg = 'Quase lá, continue!';
    else if (pct >= 30) msg = 'Bom progresso!';
    else msg = 'Você consegue!';
  }
  document.getElementById('meta-msg').textContent = msg;
}

// ============================================
// CATEGORIAS
// ============================================

function renderizarCategorias() {
  const lancamentos = getLancamentosMes().filter(l => l.tipo === 'saida');
  const container   = document.getElementById('categoria-list');

  if (!lancamentos.length) {
    container.innerHTML = '<div class="empty-state-small">Nenhum gasto ainda</div>';
    return;
  }

  // Agrupa por categoria
  const grupos = {};
  lancamentos.forEach(l => {
    if (!grupos[l.categoria]) grupos[l.categoria] = { total: 0, count: 0 };
    grupos[l.categoria].total += l.valor;
    grupos[l.categoria].count++;
  });

  const totalGeral = Object.values(grupos).reduce((s, g) => s + g.total, 0);

  // Ordena por total decrescente
  const ordenado = Object.entries(grupos).sort(([,a],[,b]) => b.total - a.total);

  container.innerHTML = ordenado.map(([catId, dados]) => {
    const cat = CATEGORIAS.find(c => c.id === catId) || CATEGORIAS[CATEGORIAS.length - 1];
    const pct = Math.round((dados.total / totalGeral) * 100);
    return `
      <div class="categoria-item">
        <div class="cat-icon" style="background:${cat.cor}20">${cat.emoji}</div>
        <div class="cat-info">
          <span class="cat-name">${cat.nome}</span>
          <span class="cat-count">${dados.count} lançamento${dados.count > 1 ? 's' : ''}</span>
        </div>
        <div class="cat-bar-wrap">
          <div class="cat-bar">
            <div class="cat-bar-fill" style="width:${pct}%;background:${cat.cor}"></div>
          </div>
          <span class="cat-value">${formatBRL(dados.total)}</span>
        </div>
      </div>`;
  }).join('');
}

// ============================================
// LANÇAMENTOS: RENDERIZAÇÃO
// ============================================

/** Cria o HTML de um item de lançamento */
function htmlLancamento(l) {
  const cat    = CATEGORIAS.find(c => c.id === l.categoria) || CATEGORIAS[CATEGORIAS.length - 1];
  const sinal  = l.tipo === 'entrada' ? '+' : '−';
  const classe = l.tipo === 'entrada' ? 'entrada' : 'saida';
  const tagCartao = l.cartao ? `<span class="item-tag" style="background:var(--blue-dim);color:var(--blue)">💳 cartão</span>` : '';

  return `
    <div class="lancamento-item" data-id="${l.id}">
      <div class="item-icon" style="background:${cat.cor}20">${cat.emoji}</div>
      <div class="item-info">
        <span class="item-desc">${l.descricao || cat.nome}</span>
        <div class="item-meta">
          <span>${formatData(l.data)}</span>
          <span>•</span>
          <span>${cat.nome}</span>
          ${tagCartao}
        </div>
      </div>
      <span class="item-valor ${classe}">${sinal} ${formatBRL(l.valor)}</span>
      <button class="item-delete" data-id="${l.id}" aria-label="Excluir">🗑</button>
    </div>`;
}

/** Renderiza os últimos 5 lançamentos na home */
function renderizarLancamentosRecentes() {
  const lancamentos = getLancamentosMes()
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);
  const container = document.getElementById('lancamentos-recentes');

  if (!lancamentos.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">💸</span>
        <p>Nenhum lançamento ainda.<br/>Toque no <strong>+</strong> para começar!</p>
      </div>`;
    return;
  }
  container.innerHTML = lancamentos.map(htmlLancamento).join('');
  bindDeleteButtons(container);
}

/** Renderiza todos os lançamentos com filtro */
function renderizarLancamentosFull() {
  let lancamentos = getLancamentosMes().sort((a, b) => b.data.localeCompare(a.data));

  // Aplica filtro de tipo
  if (estado.filtroLancamentos !== 'todos') {
    lancamentos = lancamentos.filter(l => l.tipo === estado.filtroLancamentos);
  }

  const container = document.getElementById('lancamentos-full');
  if (!lancamentos.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p>Nenhum lançamento neste período.</p>
      </div>`;
    return;
  }
  container.innerHTML = lancamentos.map(htmlLancamento).join('');
  bindDeleteButtons(container);
}

/** Liga os botões de deletar nos items */
function bindDeleteButtons(container) {
  container.querySelectorAll('.item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pedirConfirmacaoExclusao(btn.dataset.id);
    });
  });
}

// ============================================
// CARTÃO DE CRÉDITO
// ============================================

function renderizarCartao() {
  const cartao     = getCartao();
  const lancamentos = getLancamentosMes().filter(l => l.tipo === 'saida' && l.cartao);
  const totalFatura = lancamentos.reduce((s, l) => s + l.valor, 0);

  // Visual do cartão
  document.getElementById('cc-fatura').textContent = formatBRL(totalFatura);
  document.getElementById('cc-limite').textContent = cartao.limite
    ? formatBRL(cartao.limite)
    : '—';

  // Atualiza nome no visual
  const ccBank = document.querySelector('.cc-bank');
  if (ccBank && cartao.nome) ccBank.textContent = cartao.nome;

  // Preenche inputs do formulário
  document.getElementById('cc-nome').value      = cartao.nome || '';
  document.getElementById('cc-limite-input').value  = cartao.limite || '';
  document.getElementById('cc-vencimento').value = cartao.vencimento || '';

  // Lista de gastos no cartão
  const container = document.getElementById('lancamentos-cartao');
  if (!lancamentos.length) {
    container.innerHTML = '<div class="empty-state-small">Nenhum gasto no cartão este mês</div>';
    return;
  }
  container.innerHTML = lancamentos.sort((a,b) => b.data.localeCompare(a.data)).map(htmlLancamento).join('');
  bindDeleteButtons(container);
}

// ============================================
// MODAL: LANÇAMENTO
// ============================================

function abrirModalLancamento(tipo = 'saida') {
  // Reseta formulário
  document.getElementById('input-valor').value       = '';
  document.getElementById('input-descricao').value   = '';
  document.getElementById('input-data').value        = hojeISO();
  document.getElementById('input-cartao').checked    = false;
  estado.edicaoId = null;

  // Define tipo inicial
  setTipoLancamento(tipo);

  // Seleciona categoria padrão
  selecionarCategoria('outros');

  // Abre o modal
  document.getElementById('modal-lancamento').classList.add('open');

  // Foca no valor
  setTimeout(() => document.getElementById('input-valor').focus(), 300);
}

function fecharModalLancamento() {
  document.getElementById('modal-lancamento').classList.remove('open');
}

/** Define o tipo (entrada/saída) no modal */
function setTipoLancamento(tipo) {
  estado.tipoLancamento = tipo;
  document.querySelectorAll('.tipo-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tipo === tipo);
  });
}

/** Seleciona um chip de categoria */
function selecionarCategoria(id) {
  estado.categoriaSelecionada = id;
  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.classList.toggle('selected', chip.dataset.cat === id);
  });
}

/** Gera os chips de categoria no modal */
function renderizarChipsCategorias() {
  const container = document.getElementById('categoria-chips');
  container.innerHTML = CATEGORIAS.map(cat => `
    <button class="cat-chip" data-cat="${cat.id}" type="button">
      <span>${cat.emoji}</span> ${cat.nome}
    </button>`).join('');

  container.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => selecionarCategoria(chip.dataset.cat));
  });

  selecionarCategoria('outros');
}

/** Salva o lançamento do modal */
function salvarLancamento() {
  const valor = parseFloat(document.getElementById('input-valor').value);
  const descricao = document.getElementById('input-descricao').value.trim();
  const data = document.getElementById('input-data').value;
  const cartao = document.getElementById('input-cartao').checked;

  // Validações
  if (!valor || valor <= 0) {
    showToast('Informe um valor válido', 'erro');
    document.getElementById('input-valor').focus();
    return;
  }
  if (!data) {
    showToast('Informe uma data', 'erro');
    return;
  }

  const todos = getLancamentos();

  if (estado.edicaoId) {
    // Atualiza lançamento existente
    const idx = todos.findIndex(l => l.id === estado.edicaoId);
    if (idx !== -1) {
      todos[idx] = { ...todos[idx], valor, descricao, data, cartao,
        tipo: estado.tipoLancamento, categoria: estado.categoriaSelecionada };
    }
    showToast('Lançamento atualizado ✓');
  } else {
    // Novo lançamento
    todos.push({
      id: gerarId(),
      tipo: estado.tipoLancamento,
      valor,
      descricao,
      categoria: estado.categoriaSelecionada,
      data,
      cartao,
      criadoEm: new Date().toISOString(),
    });
    showToast(estado.tipoLancamento === 'saida' ? 'Gasto registrado ✓' : 'Entrada registrada ✓');
  }

  setLancamentos(todos);
  fecharModalLancamento();
  renderizarTudo();

  // Feedback háptico se disponível
  if (navigator.vibrate) navigator.vibrate(40);
}

// ============================================
// EXCLUSÃO DE LANÇAMENTO
// ============================================

function pedirConfirmacaoExclusao(id) {
  estado.excluirId = id;
  const l = getLancamentos().find(l => l.id === id);
  if (l) {
    document.getElementById('confirm-text').textContent =
      `Excluir "${l.descricao || l.categoria}" (${formatBRL(l.valor)})?`;
  }
  document.getElementById('modal-confirm').classList.add('open');
}

function confirmarExclusao() {
  if (!estado.excluirId) return;
  const todos = getLancamentos().filter(l => l.id !== estado.excluirId);
  setLancamentos(todos);
  estado.excluirId = null;
  document.getElementById('modal-confirm').classList.remove('open');
  renderizarTudo();
  showToast('Lançamento excluído');
  if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
}

// ============================================
// META
// ============================================

function abrirModalMeta() {
  const metas = getMetas();
  const meta  = metas[chaveAtual()] || '';
  document.getElementById('input-meta').value = meta;
  document.getElementById('modal-meta').classList.add('open');
  setTimeout(() => document.getElementById('input-meta').focus(), 300);
}

function salvarMeta() {
  const valor = parseFloat(document.getElementById('input-meta').value);
  if (!valor || valor <= 0) {
    showToast('Informe um valor válido', 'erro');
    return;
  }
  const metas = getMetas();
  metas[chaveAtual()] = valor;
  setMetas(metas);
  document.getElementById('modal-meta').classList.remove('open');
  renderizarMeta();
  showToast('Meta definida ✓');
}

// ============================================
// CARTÃO: SALVAR CONFIG
// ============================================

function salvarCartao() {
  const cartao = {
    nome:       document.getElementById('cc-nome').value.trim(),
    limite:     parseFloat(document.getElementById('cc-limite-input').value) || 0,
    vencimento: parseInt(document.getElementById('cc-vencimento').value) || 10,
  };
  setCartao(cartao);
  renderizarCartao();
  showToast('Cartão salvo ✓');
}

// ============================================
// PERFIL
// ============================================

function carregarPerfil() {
  const perfil = getPerfil();
  document.getElementById('input-nome').value  = perfil.nome || '';
  document.getElementById('input-renda').value = perfil.renda || '';

  // Atualiza avatar e nome exibido
  const inicial = (perfil.nome || 'U').charAt(0).toUpperCase();
  document.getElementById('avatar').textContent         = inicial;
  document.querySelector('.perfil-avatar').textContent  = inicial;
  document.getElementById('perfil-nome-display').textContent = perfil.nome || 'Usuário';
}

function salvarPerfil() {
  const nome  = document.getElementById('input-nome').value.trim();
  const renda = parseFloat(document.getElementById('input-renda').value) || 0;
  setPerfil({ nome: nome || 'Usuário', renda });
  carregarPerfil();
  showToast('Perfil salvo ✓');
}

// ============================================
// EXPORTAR DADOS
// ============================================

function exportarDados() {
  const dados = {
    lancamentos: getLancamentos(),
    perfil:      getPerfil(),
    metas:       getMetas(),
    cartao:      getCartao(),
    exportadoEm: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `grana-backup-${hojeISO()}.json`;
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
  setTimeout(() => location.reload(), 800);
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
  // Gera chips de categoria uma vez
  renderizarChipsCategorias();

  // Nav: mês
  document.getElementById('prev-month').addEventListener('click', mesAnterior);
  document.getElementById('next-month').addEventListener('click', proximoMes);
  atualizarNavMes();

  // Nav: páginas
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navegar(btn.dataset.page));
  });

  // Avatar → perfil
  document.getElementById('avatar-btn').addEventListener('click', () => navegar('perfil'));

  // FAB → abre modal
  document.getElementById('fab').addEventListener('click', () => abrirModalLancamento('saida'));

  // Modal: lançamento
  document.getElementById('close-lancamento').addEventListener('click', fecharModalLancamento);
  document.getElementById('btn-salvar-lancamento').addEventListener('click', salvarLancamento);
  document.getElementById('modal-lancamento').addEventListener('click', fecharModalAoClicarFora);

  // Modal: tipo toggle
  document.querySelectorAll('.tipo-btn').forEach(btn => {
    btn.addEventListener('click', () => setTipoLancamento(btn.dataset.tipo));
  });

  // Modal: meta
  document.getElementById('btn-edit-meta').addEventListener('click', abrirModalMeta);
  document.getElementById('close-meta').addEventListener('click', () => {
    document.getElementById('modal-meta').classList.remove('open');
  });
  document.getElementById('btn-salvar-meta').addEventListener('click', salvarMeta);
  document.getElementById('modal-meta').addEventListener('click', fecharModalAoClicarFora);

  // Modal: confirmação exclusão
  document.getElementById('close-confirm').addEventListener('click', () => {
    document.getElementById('modal-confirm').classList.remove('open');
  });
  document.getElementById('btn-cancel-confirm').addEventListener('click', () => {
    document.getElementById('modal-confirm').classList.remove('open');
  });
  document.getElementById('btn-ok-confirm').addEventListener('click', confirmarExclusao);
  document.getElementById('modal-confirm').addEventListener('click', fecharModalAoClicarFora);

  // Ver todos → navega para lançamentos
  document.getElementById('btn-ver-todos').addEventListener('click', () => navegar('lancamentos'));

  // Filtros de tipo
  document.getElementById('filter-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    estado.filtroLancamentos = btn.dataset.filter;
    renderizarLancamentosFull();
  });

  // Cartão
  document.getElementById('btn-salvar-cartao').addEventListener('click', salvarCartao);
  document.getElementById('btn-add-fatura').addEventListener('click', () => {
    abrirModalLancamento('saida');
    // Pré-seleciona cartão
    setTimeout(() => {
      document.getElementById('input-cartao').checked = true;
    }, 350);
  });

  // Perfil
  document.getElementById('btn-salvar-perfil').addEventListener('click', salvarPerfil);
  document.getElementById('btn-exportar').addEventListener('click', exportarDados);
  document.getElementById('btn-limpar').addEventListener('click', limparDados);

  // Carrega dados
  carregarPerfil();
  renderizarTudo();

  // Mostra o app após o splash
  const app = document.getElementById('app');
  app.classList.remove('hidden');
  setTimeout(() => app.classList.add('visible'), 100);

  // Registra service worker (PWA)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW não registrado:', err);
      });
    });
  }
}

// Inicia quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
