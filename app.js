'use strict';

// ============================================
// CONSTANTES
// ============================================

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const EMOJIS = ['🍔','🛒','🚌','🚗','🏋️','🎮','🎬','✈️','🏠','💊',
                '📱','🎓','👕','💄','🐾','☕','🍺','🎵','💡','🔧',
                '💰','📦','🎁','🌿','🏦','🛵','🍕','🍣','🧴','⚽'];

const CORES = ['#ff6b00','#f59e0b','#22c55e','#3b82f6','#8b5cf6',
               '#ec4899','#ef4444','#14b8a6','#f97316','#6366f1',
               '#84cc16','#06b6d4','#a855f7','#e11d48','#0ea5e9'];

const CATS_PADRAO = [
  { id:'alimentacao', nome:'Alimentação',  emoji:'🍔', cor:'#f59e0b', limite:0 },
  { id:'transporte',  nome:'Transporte',   emoji:'🚌', cor:'#3b82f6', limite:0 },
  { id:'lazer',       nome:'Lazer',        emoji:'🎮', cor:'#8b5cf6', limite:0 },
  { id:'saude',       nome:'Saúde',        emoji:'💊', cor:'#ef4444', limite:0 },
  { id:'casa',        nome:'Casa',         emoji:'🏠', cor:'#22c55e', limite:0 },
  { id:'outros',      nome:'Outros',       emoji:'📦', cor:'#888',    limite:0 },
];

const KEYS = {
  lancamentos: 'grana2_lancamentos',
  perfil:      'grana2_perfil',
  cartao:      'grana2_cartao',
  categorias:  'grana2_categorias',
};

// ============================================
// ESTADO
// ============================================

let estado = {
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
  pagina: 'home',
  tipoLanc: 'saida',
  catSel: '',
  excluirId: null,
  excluirTipo: null, // 'lancamento' | 'categoria'
  editandoCatId: null,
  emojiSel: EMOJIS[0],
  corSel: CORES[0],
  filtro: 'todos',
};

// ============================================
// STORAGE
// ============================================

function get(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; }
  catch(e) { return def; }
}
function set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function getLancs()  { return get(KEYS.lancamentos, []); }
function setLancs(v) { set(KEYS.lancamentos, v); }
function getPerfil() { return get(KEYS.perfil, {nome:'Usuário', renda:0}); }
function setPerfil(v){ set(KEYS.perfil, v); }
function getCartao() { return get(KEYS.cartao, {nome:'Meu Cartão', limite:0, vencimento:10}); }
function setCartao(v){ set(KEYS.cartao, v); }

function getCats() {
  const saved = get(KEYS.categorias, null);
  if (!saved) { set(KEYS.categorias, CATS_PADRAO); return CATS_PADRAO; }
  return saved;
}
function setCats(v) { set(KEYS.categorias, v); }

// ============================================
// HELPERS
// ============================================

function fmtBRL(v) {
  return v.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
}
function fmtData(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return d+'/'+m+'/'+y;
}
function hoje() { return new Date().toISOString().slice(0,10); }
function gerarId() { return Date.now().toString(36)+Math.random().toString(36).slice(2,5); }

function getLancsMes() {
  return getLancs().filter(function(l) {
    const p = l.data.split('-');
    return parseInt(p[1]) === estado.mes+1 && parseInt(p[0]) === estado.ano;
  });
}

// ============================================
// TOAST
// ============================================
let toastT = null;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(function(){ el.classList.remove('show'); }, 2500);
}

// ============================================
// NAVEGAÇÃO
// ============================================
function navegar(pag) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });
  const pg = document.getElementById('page-'+pag);
  if (pg) pg.classList.add('active');
  const nb = document.querySelector('.nav-btn[data-page="'+pag+'"]');
  if (nb) nb.classList.add('active');
  estado.pagina = pag;
  document.querySelector('.content') && (document.querySelector('#page-'+pag+' .content').scrollTop = 0);
}

// ============================================
// MÊS
// ============================================
function updateMesHeader() {
  const el = document.getElementById('header-month');
  if (el) el.textContent = MESES[estado.mes]+' '+estado.ano;
}
function prevMes() {
  estado.mes--;
  if (estado.mes<0){ estado.mes=11; estado.ano--; }
  updateMesHeader(); renderAll();
}
function nextMes() {
  estado.mes++;
  if (estado.mes>11){ estado.mes=0; estado.ano++; }
  updateMesHeader(); renderAll();
}

// ============================================
// RENDER ALL
// ============================================
function renderAll() {
  renderResumo();
  renderCatGridComAlerta();
  renderComparativo();
  renderGrafico();
  renderLancsRecentes();
  renderLancsFull();
  renderCartao();
}

// ============================================
// RESUMO
// ============================================
function renderResumo() {
  const ls = getLancsMes();
  let ent=0, sai=0;
  ls.forEach(function(l){ if(l.tipo==='entrada') ent+=l.valor; else sai+=l.valor; });
  const saldo = ent-sai;
  const elS = document.getElementById('saldo-mes');
  const elE = document.getElementById('total-entradas');
  const elD = document.getElementById('total-saidas');
  if (elS){ elS.textContent=fmtBRL(saldo); elS.classList.toggle('negativo', saldo<0); }
  if (elE) elE.textContent = fmtBRL(ent);
  if (elD) elD.textContent = fmtBRL(sai);
}

// ============================================
// CATEGORIAS GRID
// ============================================
function renderCatGrid() {
  const grid = document.getElementById('cat-grid');
  if (!grid) return;
  const cats = getCats();
  const ls   = getLancsMes().filter(function(l){ return l.tipo==='saida'; });

  let html = '';
  cats.forEach(function(cat) {
    const total = ls.filter(function(l){ return l.catId===cat.id; })
                    .reduce(function(s,l){ return s+l.valor; }, 0);
    const limite = cat.limite || 0;
    const pct    = limite>0 ? Math.min(100, (total/limite)*100) : 0;
    const cor    = cat.cor || '#888';
    const overLimit = limite>0 && total>limite;

    html += '<div class="cat-card" data-cat="'+cat.id+'">' +
      '<div class="cat-card-top">' +
        '<div class="cat-emoji" style="background:'+cor+'20">'+cat.emoji+'</div>' +
        '<button class="cat-card-edit" data-edit="'+cat.id+'" aria-label="Editar">✏️</button>' +
      '</div>' +
      '<span class="cat-card-name">'+cat.nome+'</span>' +
      '<span class="cat-card-value" style="color:'+cor+'">'+fmtBRL(total)+'</span>' +
      (limite>0
        ? '<div class="cat-progress-bar"><div class="cat-progress-fill" style="width:'+pct+'%;background:'+(overLimit?'var(--red)':cor)+'"></div></div>' +
          '<span class="cat-limit-text">'+(overLimit?'⚠️ acima do ':'')+'limite '+fmtBRL(limite)+'</span>'
        : '<span class="cat-limit-text">Sem limite definido</span>') +
    '</div>';
  });

  // Botão adicionar
  html += '<div class="cat-card-add" id="btn-add-cat-card"><span>+</span><p>Nova categoria</p></div>';

  grid.innerHTML = html;

  // Clique no card → lançar nessa categoria
  grid.querySelectorAll('.cat-card').forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.cat-card-edit')) return;
      abrirModalLanc('saida', card.dataset.cat);
    });
  });

  // Clique editar
  grid.querySelectorAll('.cat-card-edit').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      abrirModalCat(btn.dataset.edit);
    });
  });

  // Botão nova categoria
  const addBtn = document.getElementById('btn-add-cat-card');
  if (addBtn) addBtn.addEventListener('click', function(){ abrirModalCat(null); });
}

// ============================================
// HTML DE UM LANÇAMENTO
// ============================================
function htmlLanc(l) {
  const cats = getCats();
  const cat  = cats.find(function(c){ return c.id===l.catId; }) || {emoji:'📦', cor:'#888', nome:'Outros'};
  const sinal = l.tipo==='entrada' ? '+' : '−';
  const cls   = l.tipo==='entrada' ? 'entrada' : 'saida';
  const cartTag = l.cartao ? ' <span style="font-size:10px;opacity:0.7">💳</span>' : '';
  return '<div class="item" data-id="'+l.id+'">' +
    '<div class="item-icon" style="background:'+cat.cor+'20">'+cat.emoji+'</div>' +
    '<div class="item-info">' +
      '<span class="item-desc">'+(l.descricao||cat.nome)+cartTag+'</span>' +
      '<span class="item-meta">'+fmtData(l.data)+' · '+cat.nome+'</span>' +
    '</div>' +
    '<span class="item-val '+cls+'">'+sinal+' '+fmtBRL(l.valor)+'</span>' +
    '<button class="item-del" data-id="'+l.id+'" aria-label="Excluir">🗑</button>' +
  '</div>';
}

function bindDelLancs(container) {
  container.querySelectorAll('.item-del').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      estado.excluirId   = btn.dataset.id;
      estado.excluirTipo = 'lancamento';
      const l = getLancs().find(function(x){ return x.id===btn.dataset.id; });
      const el = document.getElementById('confirm-text');
      if (el && l) el.textContent = 'Excluir "'+( l.descricao||'lançamento')+'" ('+fmtBRL(l.valor)+')?';
      document.getElementById('modal-confirm').classList.add('open');
    });
  });
}

// ============================================
// LANÇAMENTOS RECENTES
// ============================================
function renderLancsRecentes() {
  const el = document.getElementById('lancamentos-recentes');
  if (!el) return;
  const ls = getLancsMes().sort(function(a,b){ return b.data.localeCompare(a.data); }).slice(0,5);
  if (!ls.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">💸</span><p>Nenhum lançamento ainda.<br/>Toque em uma categoria ou no <strong>+</strong></p></div>';
    return;
  }
  el.innerHTML = ls.map(htmlLanc).join('');
  bindDelLancs(el);
}

// ============================================
// LANÇAMENTOS FULL
// ============================================
function renderLancsFull() {
  const el = document.getElementById('lancamentos-full');
  if (!el) return;
  let ls = getLancsMes().sort(function(a,b){ return b.data.localeCompare(a.data); });
  if (estado.filtro !== 'todos') ls = ls.filter(function(l){ return l.tipo===estado.filtro; });
  if (!ls.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><p>Nenhum lançamento neste período.</p></div>';
    return;
  }
  el.innerHTML = ls.map(htmlLanc).join('');
  bindDelLancs(el);
}

// ============================================
// CARTÃO
// ============================================
function renderCartao() {
  const cartao = getCartao();
  const ls = getLancsMes().filter(function(l){ return l.tipo==='saida' && l.cartao; });
  const fat = ls.reduce(function(s,l){ return s+l.valor; }, 0);

  const elN = document.getElementById('cc-nome-display');
  const elF = document.getElementById('cc-fatura-val');
  const elL = document.getElementById('cc-limite-val');
  const elV = document.getElementById('cc-venc-val');
  if (elN) elN.textContent = cartao.nome || 'Meu Cartão';
  if (elF) elF.textContent = fmtBRL(fat);
  if (elL) elL.textContent = cartao.limite ? fmtBRL(cartao.limite) : '—';
  if (elV) elV.textContent = cartao.vencimento ? 'dia '+cartao.vencimento : '—';

  const elNI = document.getElementById('cc-nome');
  const elLI = document.getElementById('cc-limite-input');
  const elVI = document.getElementById('cc-vencimento');
  if (elNI) elNI.value = cartao.nome||'';
  if (elLI) elLI.value = cartao.limite||'';
  if (elVI) elVI.value = cartao.vencimento||'';

  const elC = document.getElementById('lancamentos-cartao');
  if (!elC) return;
  if (!ls.length) { elC.innerHTML='<div class="empty-sm">Nenhum gasto no cartão este mês</div>'; return; }
  elC.innerHTML = ls.sort(function(a,b){ return b.data.localeCompare(a.data); }).map(htmlLanc).join('');
  bindDelLancs(elC);
}

// ============================================
// MODAL: LANÇAMENTO
// ============================================
function abrirModalLanc(tipo, catId) {
  tipo  = tipo  || 'saida';
  catId = catId || (getCats()[0] || {id:'outros'}).id;
  estado.tipoLanc = tipo;
  estado.catSel   = catId;

  const elV = document.getElementById('input-valor');
  const elD = document.getElementById('input-descricao');
  const elDt= document.getElementById('input-data');
  const elC = document.getElementById('input-cartao');
  if (elV)  elV.value   = '';
  if (elD)  elD.value   = '';
  if (elDt) elDt.value  = hoje();
  if (elC)  elC.checked = false;

  setTipoLanc(tipo);
  renderChipsCats();
  selCat(catId);

  document.getElementById('modal-lancamento').classList.add('open');
  setTimeout(function(){ if(elV) elV.focus(); }, 300);
}

function fecharModalLanc() {
  document.getElementById('modal-lancamento').classList.remove('open');
}

function setTipoLanc(tipo) {
  estado.tipoLanc = tipo;
  document.querySelectorAll('.tipo-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.tipo===tipo);
  });
}

function selCat(id) {
  estado.catSel = id;
  document.querySelectorAll('.chip').forEach(function(c){
    c.classList.toggle('selected', c.dataset.cat===id);
  });
}

function renderChipsCats() {
  const el = document.getElementById('cat-chips');
  if (!el) return;
  const cats = getCats();
  el.innerHTML = cats.map(function(c){
    return '<button class="chip" data-cat="'+c.id+'" type="button">'+c.emoji+' '+c.nome+'</button>';
  }).join('');
  el.querySelectorAll('.chip').forEach(function(chip){
    chip.addEventListener('click', function(){ selCat(chip.dataset.cat); });
  });
  selCat(estado.catSel || (cats[0]||{id:''}).id);
}

function salvarLanc() {
  const elV  = document.getElementById('input-valor');
  const elD  = document.getElementById('input-descricao');
  const elDt = document.getElementById('input-data');
  const elC  = document.getElementById('input-cartao');

  const valor = parseFloat(elV ? elV.value : 0);
  const data  = elDt ? elDt.value : '';

  if (!valor || valor<=0) { toast('Informe um valor válido'); if(elV) elV.focus(); return; }
  if (!data)               { toast('Informe uma data'); return; }

  const ls = getLancs();
  ls.push({
    id:       gerarId(),
    tipo:     estado.tipoLanc,
    valor:    valor,
    descricao:(elD ? elD.value.trim() : ''),
    catId:    estado.catSel || 'outros',
    data:     data,
    cartao:   elC ? elC.checked : false,
    criadoEm: new Date().toISOString(),
  });
  setLancs(ls);
  fecharModalLanc();
  renderAll();
  toast(estado.tipoLanc==='saida' ? 'Gasto registrado ✓' : 'Entrada registrada ✓');
  if (navigator.vibrate) navigator.vibrate(40);
}

// ============================================
// MODAL: CATEGORIA
// ============================================
function abrirModalCat(catId) {
  estado.editandoCatId = catId;
  const titulo = document.getElementById('modal-cat-title');
  const btnEx  = document.getElementById('btn-excluir-categoria');

  if (catId) {
    if (titulo) titulo.textContent = 'Editar categoria';
    if (btnEx)  btnEx.style.display = 'block';
    const cat = getCats().find(function(c){ return c.id===catId; });
    if (cat) {
      const elN = document.getElementById('cat-nome-input');
      const elL = document.getElementById('cat-limite-input');
      if (elN) elN.value = cat.nome;
      if (elL) elL.value = cat.limite||'';
      estado.emojiSel = cat.emoji;
      estado.corSel   = cat.cor;
    }
  } else {
    if (titulo) titulo.textContent = 'Nova categoria';
    if (btnEx)  btnEx.style.display = 'none';
    const elN = document.getElementById('cat-nome-input');
    const elL = document.getElementById('cat-limite-input');
    if (elN) elN.value = '';
    if (elL) elL.value = '';
    estado.emojiSel = EMOJIS[0];
    estado.corSel   = CORES[0];
  }

  renderEmojiGrid();
  renderColorGrid();
  document.getElementById('modal-categoria').classList.add('open');
}

function fecharModalCat() {
  document.getElementById('modal-categoria').classList.remove('open');
}

function renderEmojiGrid() {
  const el = document.getElementById('emoji-grid');
  if (!el) return;
  el.innerHTML = EMOJIS.map(function(e){
    return '<button class="emoji-opt'+(e===estado.emojiSel?' selected':'')+'" data-e="'+e+'" type="button">'+e+'</button>';
  }).join('');
  el.querySelectorAll('.emoji-opt').forEach(function(btn){
    btn.addEventListener('click', function(){
      estado.emojiSel = btn.dataset.e;
      el.querySelectorAll('.emoji-opt').forEach(function(b){ b.classList.remove('selected'); });
      btn.classList.add('selected');
    });
  });
}

function renderColorGrid() {
  const el = document.getElementById('color-grid');
  if (!el) return;
  el.innerHTML = CORES.map(function(c){
    return '<div class="color-opt'+(c===estado.corSel?' selected':'')+'" data-cor="'+c+'" style="background:'+c+'"></div>';
  }).join('');
  el.querySelectorAll('.color-opt').forEach(function(btn){
    btn.addEventListener('click', function(){
      estado.corSel = btn.dataset.cor;
      el.querySelectorAll('.color-opt').forEach(function(b){ b.classList.remove('selected'); });
      btn.classList.add('selected');
    });
  });
}

function salvarCat() {
  const elN = document.getElementById('cat-nome-input');
  const elL = document.getElementById('cat-limite-input');
  const nome  = elN ? elN.value.trim() : '';
  const limite = parseFloat(elL ? elL.value : 0) || 0;

  if (!nome) { toast('Informe o nome da categoria'); if(elN) elN.focus(); return; }

  const cats = getCats();
  if (estado.editandoCatId) {
    const idx = cats.findIndex(function(c){ return c.id===estado.editandoCatId; });
    if (idx!==-1) {
      cats[idx].nome   = nome;
      cats[idx].emoji  = estado.emojiSel;
      cats[idx].cor    = estado.corSel;
      cats[idx].limite = limite;
    }
    toast('Categoria atualizada ✓');
  } else {
    cats.push({ id:gerarId(), nome:nome, emoji:estado.emojiSel, cor:estado.corSel, limite:limite });
    toast('Categoria criada ✓');
  }
  setCats(cats);
  fecharModalCat();
  renderAll();
}

function excluirCat() {
  if (!estado.editandoCatId) return;
  estado.excluirId   = estado.editandoCatId;
  estado.excluirTipo = 'categoria';
  const cat = getCats().find(function(c){ return c.id===estado.editandoCatId; });
  const el  = document.getElementById('confirm-text');
  if (el && cat) el.textContent = 'Excluir a categoria "'+cat.nome+'"? Os lançamentos não serão apagados.';
  fecharModalCat();
  document.getElementById('modal-confirm').classList.add('open');
}

// ============================================
// CONFIRMAÇÃO EXCLUSÃO
// ============================================
function confirmarExclusao() {
  if (estado.excluirTipo==='lancamento') {
    const ls = getLancs().filter(function(l){ return l.id!==estado.excluirId; });
    setLancs(ls);
    toast('Lançamento excluído');
  } else if (estado.excluirTipo==='categoria') {
    const cats = getCats().filter(function(c){ return c.id!==estado.excluirId; });
    setCats(cats);
    toast('Categoria excluída');
  }
  estado.excluirId = null;
  estado.excluirTipo = null;
  document.getElementById('modal-confirm').classList.remove('open');
  renderAll();
  if (navigator.vibrate) navigator.vibrate([30,20,30]);
}

// ============================================
// PERFIL
// ============================================
function carregarPerfil() {
  const p = getPerfil();
  const elN  = document.getElementById('input-nome');
  const elR  = document.getElementById('input-renda');
  const elAv = document.getElementById('avatar');
  const elPA = document.getElementById('perfil-avatar-big');
  const elPN = document.getElementById('perfil-nome-big');
  const elG  = document.getElementById('greeting');

  if (elN)  elN.value   = p.nome||'';
  if (elR)  elR.value   = p.renda||'';
  const ini = (p.nome||'U').charAt(0).toUpperCase();
  if (elAv) elAv.textContent = ini;
  if (elPA) elPA.textContent = ini;
  if (elPN) elPN.textContent = p.nome||'Usuário';
  if (elG)  elG.textContent  = 'Olá, '+(p.nome||'usuário')+'! 👋';
}

function salvarPerfil() {
  const elN = document.getElementById('input-nome');
  const elR = document.getElementById('input-renda');
  setPerfil({ nome: elN?elN.value.trim():'', renda: parseFloat(elR?elR.value:0)||0 });
  carregarPerfil();
  toast('Perfil salvo ✓');
}

// ============================================
// CARTÃO: SALVAR
// ============================================
function salvarCartao() {
  setCartao({
    nome:       (document.getElementById('cc-nome')||{}).value||'Meu Cartão',
    limite:     parseFloat((document.getElementById('cc-limite-input')||{}).value)||0,
    vencimento: parseInt((document.getElementById('cc-vencimento')||{}).value)||10,
  });
  renderCartao();
  toast('Cartão salvo ✓');
}

// ============================================
// EXPORTAR / LIMPAR
// ============================================
function exportar() {
  const dados = { lancamentos:getLancs(), perfil:getPerfil(), cartao:getCartao(), categorias:getCats(), em:new Date().toISOString() };
  const blob = new Blob([JSON.stringify(dados,null,2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download='grana-backup-'+hoje()+'.json'; a.click();
  URL.revokeObjectURL(url);
  toast('Dados exportados ✓');
}

function limpar() {
  if (!confirm('Apagar TODOS os dados? Isso não pode ser desfeito.')) return;
  localStorage.clear();
  toast('Dados apagados');
  setTimeout(function(){ location.reload(); }, 800);
}

// ============================================
// MODAL: FECHAR AO CLICAR FORA
// ============================================
function bindOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', function(e){
    if (e.target===el) el.classList.remove('open');
  });
}

// ============================================
// INIT
// ============================================
function init() {
  // Splash
  const splash = document.getElementById('splash');
  if (splash) {
    setTimeout(function(){
      splash.classList.add('hide');
      setTimeout(function(){ splash.style.display='none'; }, 400);
    }, 1000);
  }

  // Mês
  updateMesHeader();
  const elPrev = document.getElementById('prev-month');
  const elNext = document.getElementById('next-month');
  if (elPrev) elPrev.addEventListener('click', prevMes);
  if (elNext) elNext.addEventListener('click', nextMes);

  // Nav
  document.querySelectorAll('.nav-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ navegar(btn.dataset.page); });
  });
  const av = document.getElementById('avatar-btn');
  if (av) av.addEventListener('click', function(){ navegar('perfil'); });

  // FAB
  const fab = document.getElementById('fab');
  if (fab) fab.addEventListener('click', function(){ abrirModalLanc('saida'); });

  // Modal lançamento
  const closeL = document.getElementById('close-lancamento');
  const saveL  = document.getElementById('btn-salvar-lancamento');
  if (closeL) closeL.addEventListener('click', fecharModalLanc);
  if (saveL)  saveL.addEventListener('click', salvarLanc);
  bindOverlay('modal-lancamento');

  document.querySelectorAll('.tipo-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ setTipoLanc(btn.dataset.tipo); });
  });

  // Modal categoria
  const btnNovaCat = document.getElementById('btn-nova-categoria');
  const closeCat   = document.getElementById('close-categoria');
  const saveCat    = document.getElementById('btn-salvar-categoria');
  const excCat     = document.getElementById('btn-excluir-categoria');
  if (btnNovaCat) btnNovaCat.addEventListener('click', function(){ abrirModalCat(null); });
  if (closeCat)   closeCat.addEventListener('click', fecharModalCat);
  if (saveCat)    saveCat.addEventListener('click', salvarCat);
  if (excCat)     excCat.addEventListener('click', excluirCat);
  bindOverlay('modal-categoria');

  // Modal confirmação
  const closeConf  = document.getElementById('close-confirm');
  const cancelConf = document.getElementById('btn-cancel-confirm');
  const okConf     = document.getElementById('btn-ok-confirm');
  if (closeConf)  closeConf.addEventListener('click',  function(){ document.getElementById('modal-confirm').classList.remove('open'); });
  if (cancelConf) cancelConf.addEventListener('click', function(){ document.getElementById('modal-confirm').classList.remove('open'); });
  if (okConf)     okConf.addEventListener('click', confirmarExclusao);
  bindOverlay('modal-confirm');

  // Ver todos
  const btnVT = document.getElementById('btn-ver-todos');
  if (btnVT) btnVT.addEventListener('click', function(){ navegar('lancamentos'); });

  // Filtros
  document.querySelectorAll('.ftab').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.ftab').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      estado.filtro = btn.dataset.filter;
      renderLancsFull();
    });
  });

  // Cartão
  const btnSalvCart = document.getElementById('btn-salvar-cartao');
  const btnAddFat   = document.getElementById('btn-add-fatura');
  if (btnSalvCart) btnSalvCart.addEventListener('click', salvarCartao);
  if (btnAddFat)   btnAddFat.addEventListener('click', function(){
    abrirModalLanc('saida');
    setTimeout(function(){
      const el = document.getElementById('input-cartao');
      if (el) el.checked = true;
    }, 350);
  });

  // Perfil
  const btnSP = document.getElementById('btn-salvar-perfil');
  const btnEx = document.getElementById('btn-exportar');
  const btnLi = document.getElementById('btn-limpar');
  if (btnSP) btnSP.addEventListener('click', salvarPerfil);
  if (btnEx) btnEx.addEventListener('click', exportar);
  if (btnLi) btnLi.addEventListener('click', limpar);

  carregarPerfil();
  renderAll();

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function(){});
  }
}

if (document.readyState==='loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================
// FASE 1: COMPARATIVO + GRÁFICO + ALERTAS
// ============================================

/** Retorna lançamentos de um mês/ano específico */
function getLancsDe(mes, ano) {
  return getLancs().filter(function(l) {
    const p = l.data.split('-');
    return parseInt(p[1]) === mes+1 && parseInt(p[0]) === ano;
  });
}

/** Total de saídas de um array de lançamentos */
function totalSaidas(ls) {
  return ls.filter(function(l){ return l.tipo==='saida'; })
           .reduce(function(s,l){ return s+l.valor; }, 0);
}

/** Renderiza o comparativo com mês anterior */
function renderComparativo() {
  // Calcula mês anterior
  let mesAnt = estado.mes - 1;
  let anoAnt = estado.ano;
  if (mesAnt < 0) { mesAnt = 11; anoAnt--; }

  const lsAtual = getLancsDe(estado.mes, estado.ano);
  const lsAnt   = getLancsDe(mesAnt, anoAnt);

  const totalAtual = totalSaidas(lsAtual);
  const totalAnt   = totalSaidas(lsAnt);

  const elAntVal   = document.getElementById('comp-ant-val');
  const elAtualVal = document.getElementById('comp-atual-val');
  const elMsg      = document.getElementById('comp-msg');
  const elBadge    = document.getElementById('comp-badge');
  const elMesAnt   = document.getElementById('comp-mes-ant');

  if (elMesAnt) elMesAnt.textContent = MESES[mesAnt];
  if (elAntVal)   elAntVal.textContent   = fmtBRL(totalAnt);
  if (elAtualVal) elAtualVal.textContent = fmtBRL(totalAtual);

  if (!elMsg || !elBadge) return;

  if (totalAnt === 0 && totalAtual === 0) {
    elMsg.textContent = 'Registre gastos para ver o comparativo.';
    elMsg.className   = 'comp-msg';
    elBadge.textContent = '';
    elBadge.className   = 'comp-badge';
    return;
  }

  if (totalAnt === 0) {
    elMsg.textContent = 'Primeiro mês com dados 🎉';
    elMsg.className   = 'comp-msg';
    elBadge.textContent = 'novo';
    elBadge.className   = 'comp-badge igual';
    return;
  }

  const diff    = totalAtual - totalAnt;
  const diffPct = Math.abs(Math.round((diff / totalAnt) * 100));

  if (diff > 0) {
    elMsg.textContent = '↑ Você gastou ' + diffPct + '% a mais que ' + MESES[mesAnt] + '. Fique de olho!';
    elMsg.className   = 'comp-msg negativo';
    elBadge.textContent = '+' + diffPct + '%';
    elBadge.className   = 'comp-badge up';
  } else if (diff < 0) {
    elMsg.textContent = '↓ Parabéns! Gastou ' + diffPct + '% a menos que ' + MESES[mesAnt] + ' 💚';
    elMsg.className   = 'comp-msg positivo';
    elBadge.textContent = '-' + diffPct + '%';
    elBadge.className   = 'comp-badge down';
  } else {
    elMsg.textContent = 'Gastos iguais ao mês anterior.';
    elMsg.className   = 'comp-msg';
    elBadge.textContent = '=';
    elBadge.className   = 'comp-badge igual';
  }
}

/** Desenha o gráfico de donut no canvas */
function renderGrafico() {
  const canvas = document.getElementById('chart-donut');
  const legend = document.getElementById('chart-legend');
  if (!canvas || !legend) return;

  const ls   = getLancsMes().filter(function(l){ return l.tipo==='saida'; });
  const cats = getCats();

  if (!ls.length) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    legend.innerHTML = '<p class="chart-empty">Nenhum gasto ainda</p>';
    return;
  }

  // Agrupa por categoria
  const grupos = {};
  ls.forEach(function(l) {
    if (!grupos[l.catId]) grupos[l.catId] = 0;
    grupos[l.catId] += l.valor;
  });

  const total = Object.keys(grupos).reduce(function(s,k){ return s+grupos[k]; }, 0);

  // Ordena por valor
  const items = Object.keys(grupos)
    .map(function(id) {
      const cat = cats.find(function(c){ return c.id===id; }) || {nome:'Outros', cor:'#888', emoji:'📦'};
      return { id:id, nome:cat.nome, cor:cat.cor, emoji:cat.emoji, val:grupos[id] };
    })
    .sort(function(a,b){ return b.val-a.val; });

  // Desenha donut
  const ctx    = canvas.getContext('2d');
  const cx     = canvas.width / 2;
  const cy     = canvas.height / 2;
  const radius = 68;
  const inner  = 42;
  let angle    = -Math.PI / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  items.forEach(function(item) {
    const slice = (item.val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = item.cor;
    ctx.fill();
    angle += slice;
  });

  // Furo central
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = '#161616';
  ctx.fill();

  // Texto central
  ctx.fillStyle = '#f5f5f5';
  ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtBRL(total).replace('R$','').trim(), cx, cy);

  // Legenda
  const topItems = items.slice(0, 5);
  legend.innerHTML = topItems.map(function(item) {
    const pct = Math.round((item.val / total) * 100);
    return '<div class="legend-item">' +
      '<div class="legend-dot" style="background:'+item.cor+'"></div>' +
      '<span class="legend-name">'+item.emoji+' '+item.nome+'</span>' +
      '<span class="legend-pct">'+pct+'%</span>' +
    '</div>';
  }).join('');
}

/** Atualiza os cards de categoria com alertas visuais */
function renderCatGridComAlerta() {
  const grid = document.getElementById('cat-grid');
  if (!grid) return;
  const cats = getCats();
  const ls   = getLancsMes().filter(function(l){ return l.tipo==='saida'; });

  let html = '';
  cats.forEach(function(cat) {
    const total = ls.filter(function(l){ return l.catId===cat.id; })
                    .reduce(function(s,l){ return s+l.valor; }, 0);
    const limite    = cat.limite || 0;
    const pct       = limite>0 ? Math.min(100,(total/limite)*100) : 0;
    const cor       = cat.cor || '#888';
    const overLimit = limite>0 && total>limite;
    const nearLimit = limite>0 && pct>=80 && !overLimit;

    // Classes de alerta
    let cardClass = 'cat-card';
    if (overLimit) cardClass += ' alerta-limite';
    else if (nearLimit) cardClass += ' alerta-aviso';

    // Badge de alerta
    let alertBadge = '';
    if (overLimit)  alertBadge = '<span class="cat-alert-badge red">⚠️ Limite ultrapassado</span>';
    else if (nearLimit) alertBadge = '<span class="cat-alert-badge yellow">⚡ '+Math.round(pct)+'% do limite</span>';

    html += '<div class="'+cardClass+'" data-cat="'+cat.id+'">' +
      '<div class="cat-card-top">' +
        '<div class="cat-emoji" style="background:'+cor+'20">'+cat.emoji+'</div>' +
        '<button class="cat-card-edit" data-edit="'+cat.id+'" aria-label="Editar">✏️</button>' +
      '</div>' +
      '<span class="cat-card-name">'+cat.nome+'</span>' +
      '<span class="cat-card-value" style="color:'+(overLimit?'var(--red)':cor)+'">'+fmtBRL(total)+'</span>' +
      (limite>0
        ? '<div class="cat-progress-bar"><div class="cat-progress-fill" style="width:'+pct+'%;background:'+(overLimit?'var(--red)':nearLimit?'#f59e0b':cor)+'"></div></div>' +
          '<span class="cat-limit-text">limite '+fmtBRL(limite)+'</span>' +
          alertBadge
        : '<span class="cat-limit-text">Sem limite</span>') +
    '</div>';
  });

  html += '<div class="cat-card-add" id="btn-add-cat-card"><span>+</span><p>Nova categoria</p></div>';
  grid.innerHTML = html;

  // Clique no card
  grid.querySelectorAll('.cat-card').forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.cat-card-edit')) return;
      abrirModalLanc('saida', card.dataset.cat);
    });
  });

  // Clique editar
  grid.querySelectorAll('.cat-card-edit').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      abrirModalCat(btn.dataset.edit);
    });
  });

  const addBtn = document.getElementById('btn-add-cat-card');
  if (addBtn) addBtn.addEventListener('click', function(){ abrirModalCat(null); });
}
