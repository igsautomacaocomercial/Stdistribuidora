// ============================================================================
// ST DISTRIBUIDORA - APP
// ============================================================================

const $ = id => document.getElementById(id);
const pageTitle = $('pageTitle');
const contentBody = $('contentBody');
const topbarActions = $('topbarActions');

// Auth check
const currentUser = JSON.parse(sessionStorage.getItem('user'));
if (!currentUser) {
  window.location.href = 'login.html';
}

function logout() {
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('userName');
  window.location.href = 'login.html';
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================
function toast(message, type) {
  const container = document.getElementById('toastContainer') || (() => {
    const c = document.createElement('div');
    c.id = 'toastContainer';
    c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:400px';
    document.body.appendChild(c);
    return c;
  })();

  const colors = {
    success: '#2ecc71',
    danger: '#e74c3c',
    warning: '#f39c12',
    info: '#3498db'
  };
  const bg = colors[type] || '#333';

  const toast = document.createElement('div');
  toast.innerHTML = message;
  toast.style.cssText = `
    padding:14px 20px;background:${bg};color:#fff;border-radius:10px;
    font-size:14px;font-weight:500;box-shadow:0 6px 20px rgba(0,0,0,.2);
    animation:slideInRight .3s ease-out;cursor:pointer;
    max-width:100%;word-break:break-word
  `;
  toast.onclick = () => { toast.style.animation = 'slideOutRight .3s ease-in'; setTimeout(() => toast.remove(), 300); };
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) { toast.style.animation = 'slideOutRight .3s ease-in'; setTimeout(() => toast.remove(), 300); } }, 4000);
}

function setTitle(t) { pageTitle.textContent = t; }

function html(literals, ...vals) {
  let s = literals[0];
  for (let i = 0; i < vals.length; i++) s += vals[i] + literals[i + 1];
  return s;
}

function escape(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function loading() { return '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>'; }

function alertBox(type, msg) {
  return `<div class="alert alert-${type}">${escape(msg)}</div>`;
}

function badge(status) {
  const map = {
    'Orcamento':'badge-orcamento','Aprovado':'badge-aprovado','Em Manutencao':'badge-em-manutencao',
    'Aguardando Peca':'badge-aguardando-peca','Pronto para Retirada':'badge-pronto-para-retirada',
    'Finalizado':'badge-finalizado','Cancelado':'badge-cancelado',
    'Ativo':'badge-ativo','Inativo':'badge-inativo'
  };
  const cls = map[status] || '';
  return `<span class="badge ${cls}">${escape(status)}</span>`;
}

function statusFlow(current) {
  const steps = ['Orcamento','Aprovado','Em Manutencao','Aguardando Peca','Pronto para Retirada','Finalizado'];
  const idx = steps.indexOf(current);
  let html = '<div class="status-bar">';
  steps.forEach((s, i) => {
    if (i > 0) html += `<div class="line ${i <= idx ? 'active' : ''}"></div>`;
    let cls = 'step';
    if (i < idx) cls += ' active';
    else if (i === idx) cls += ' current';
    html += `<div class="${cls}" title="${s}">${s.charAt(0)}</div>`;
  });
  html += '</div>';
  return html;
}

// Date format helpers
function todayISO() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtDateShort(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR');
}

// ============================================================================
// ROUTING
// ============================================================================

function toggleSubmenu(e) {
  e.preventDefault();
  const trigger = e.currentTarget;
  trigger.classList.toggle('open');
  document.getElementById('submenuCadastros').classList.toggle('open');
}

function navigate(page, params) {
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  // Fecha submenu se pagina for de cadastro
  if (['clientes','cliente-form','cliente-detail','tecnicos','unidades-medida','grupos-produtos','produtos','servicos','usuarios'].includes(page)) {
    document.querySelector('.has-submenu')?.classList.add('open');
    document.getElementById('submenuCadastros')?.classList.add('open');
  } else {
    document.querySelector('.has-submenu')?.classList.remove('open');
    document.getElementById('submenuCadastros')?.classList.remove('open');
  }
  renderPage(page, params);
}

document.querySelectorAll('.sidebar-nav a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    if (a.dataset.page) navigate(a.dataset.page);
  });
});

async function renderPage(page, params) {
  topbarActions.innerHTML = '';
  contentBody.innerHTML = loading();

  try {
    switch (page) {
      case 'dashboard': await renderDashboard(); break;
      case 'ordens': await renderOrdensList(); break;
      case 'orcamentos': await renderOrcamentosList(); break;
      case 'orcamento-form': await renderOrcamentoForm(params); break;
      case 'orcamento-detail': await renderOrcamentoDetail(params); break;
      case 'ordem-form': await renderOrdemForm(params); break;
      case 'ordem-detail': await renderOrdemDetail(params); break;
      case 'clientes': await renderClientesList(); break;
      case 'cliente-form': await renderClienteForm(params); break;
      case 'cliente-detail': await renderClienteDetail(params); break;
      case 'unidades-medida': await renderUnidadesMedida(); break;
      case 'grupos-produtos': await renderGruposProdutos(); break;
      case 'produtos': await renderProdutos(); break;
      case 'servicos': await renderServicos(); break;
      case 'tecnicos': await renderTecnicosList(); break;
      case 'emitente': await renderEmitente(); break;
      case 'usuarios': await renderUsuarios(); break;
      default: contentBody.innerHTML = '<div class="empty"><p>Pagina nao encontrada</p></div>';
    }
  } catch (e) {
    contentBody.innerHTML = alertBox('danger', 'Erro: ' + e.message);
  }
}

// ============================================================================
// DASHBOARD
// ============================================================================

async function renderDashboard() {
  setTitle('Dashboard');
  const res = await API.get('/dashboard');
  const d = res.data;

  let html = `
  <div class="metrics">
    <div class="metric blue"><div class="label">Total de OS</div><div class="value">${d.resumo.total_os_geral}</div></div>
    <div class="metric yellow"><div class="label">Em Orcamento</div><div class="value">${d.resumo.os_em_orcamento}</div></div>
    <div class="metric pink"><div class="label">Em Manutencao</div><div class="value">${d.resumo.os_em_manutencao}</div></div>
    <div class="metric green"><div class="label">Prontas Retirada</div><div class="value">${d.resumo.os_prontas_retirar}</div></div>
    <div class="metric blue"><div class="label">Clientes Ativos</div><div class="value">${d.resumo.clientes_ativos}</div></div>
    <div class="metric blue"><div class="label">Tecnicos Ativos</div><div class="value">${d.resumo.tecnicos_ativos}</div></div>
  </div>`;

  // Status geral
  html += `<div class="card"><div class="card-title">Status das OS</div><div class="table-wrap"><table><tr><th>Status</th><th>Qtd</th><th>Valor</th><th>%</th></tr>`;
  d.status_geral.forEach(s => {
    html += `<tr><td>${badge(s.status)}</td><td><strong>${s.quantidade}</strong></td><td>R$ ${(+s.valor_total_acumulado).toFixed(2)}</td><td>${s.status === 'Cancelado' || s.status === 'Finalizado' ? '-' : ''}</td></tr>`;
  });
  html += `</table></div></div>`;

  // Servicos mais recorrentes
  html += `<div class="card"><div class="card-title">Servicos Mais Recorrentes</div><div class="table-wrap"><table><tr><th>Servico</th><th>Tipo</th><th>Vezes</th><th>Receita</th></tr>`;
  d.servicos_top.forEach(s => {
    html += `<tr><td>${escape(s.descricao)}</td><td>${badge(s.tipo)}</td><td>${s.vezes_realizado}</td><td>R$ ${(+s.receita_gerada).toFixed(2)}</td></tr>`;
  });
  html += `</table></div></div>`;

  // Tecnicos top
  html += `<div class="card"><div class="card-title">Produtividade por Tecnico</div><div class="table-wrap"><table><tr><th>Tecnico</th><th>OS Finalizadas</th><th>Valor Gerado</th><th>Ticket Medio</th></tr>`;
  d.tecnicos_top.forEach(t => {
    html += `<tr><td><strong>${escape(t.tecnico)}</strong></td><td>${t.total_os_finalizadas}</td><td>R$ ${(+t.valor_total_gerado).toFixed(2)}</td><td>R$ ${(+t.ticket_medio_tecnico).toFixed(2)}</td></tr>`;
  });
  html += `</table></div></div>`;

  contentBody.innerHTML = html;
}

// ============================================================================
// ORDENS LIST
// ============================================================================

async function renderOrdensList(page = 1, filtros = {}) {
  setTitle('Ordens de Servico');
  topbarActions.innerHTML = `<button class="btn btn-primary" onclick="navigate('ordem-form')">+ Nova OS</button>`;

  const params = new URLSearchParams({ page, limit: 15 });
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.q) params.set('q', filtros.q);

  const res = await API.get('/ordens?' + params.toString());
  const ordens = res.data;
  const pag = res.pagination;

  let html = `
  <div class="search-bar">
    <input class="form-control" placeholder="Buscar por cliente, marca, modelo, serie, numero OS..." id="searchOS" value="${escape(filtros.q || '')}">
    <select class="form-control" id="filterStatusOS">
      <option value="">Todos os Status</option>
      <option value="Orcamento" ${filtros.status === 'Orcamento' ? 'selected':''}>Orcamento</option>
      <option value="Aprovado" ${filtros.status === 'Aprovado' ? 'selected':''}>Aprovado</option>
      <option value="Em Manutencao" ${filtros.status === 'Em Manutencao' ? 'selected':''}>Em Manutencao</option>
      <option value="Aguardando Peca" ${filtros.status === 'Aguardando Peca' ? 'selected':''}>Aguardando Peca</option>
      <option value="Pronto para Retirada" ${filtros.status === 'Pronto para Retirada' ? 'selected':''}>Pronto Retirada</option>
      <option value="Finalizado" ${filtros.status === 'Finalizado' ? 'selected':''}>Finalizado</option>
      <option value="Cancelado" ${filtros.status === 'Cancelado' ? 'selected':''}>Cancelado</option>
    </select>
    <button class="btn btn-primary btn-sm" onclick="buscarOS()">Buscar</button>
  </div>

  <div class="card"><div class="table-wrap">
  <table>
    <tr>
      <th># OS</th><th>Cliente</th><th>Equipamento</th><th>Tecnico</th><th>Status</th><th>Entrada</th><th>Valor</th><th>Acoes</th>
    </tr>`;

  if (ordens.length === 0) {
    html += `<tr><td colspan="8"><div class="empty"><div class="icon">&#128196;</div><p>Nenhuma ordem de servico encontrada</p></div></td></tr>`;
  } else {
    ordens.forEach(os => {
      html += `<tr>
        <td><strong>${os.numero_os}</strong></td>
        <td>${escape(os.cliente_nome)}</td>
        <td>${escape(os.marca||'')} ${escape(os.modelo||'')}</td>
        <td>${escape(os.tecnico_nome||'-')}</td>
        <td>${badge(os.status)}</td>
        <td>${fmtDateShort(os.data_entrada)}</td>
        <td>R$ ${(+os.valor_total).toFixed(2)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="navigate('ordem-detail',${os.id})">Detalhes</button>
          <button class="btn btn-outline btn-sm" onclick="window.open('/print/os.html?id=${os.id}','_blank')">Imprimir</button>
        </td>
      </tr>`;
    });
  }

  html += `</table></div></div>`;

  // Pagination
  if (pag.totalPages > 1) {
    html += `<div class="pagination">`;
    html += `<button onclick="renderOrdensList(${pag.page - 1}, ${JSON.stringify(filtros).replace(/"/g,"'")})" ${pag.page <= 1 ? 'disabled':''}>&laquo;</button>`;
    html += `<span>Pag ${pag.page} de ${pag.totalPages} (${pag.total} registros)</span>`;
    html += `<button onclick="renderOrdensList(${pag.page + 1}, ${JSON.stringify(filtros).replace(/"/g,"'")})" ${pag.page >= pag.totalPages ? 'disabled':''}>&raquo;</button>`;
    html += `</div>`;
  }

  contentBody.innerHTML = html;
}

window.buscarOS = function() {
  const q = $('searchOS').value;
  const status = $('filterStatusOS').value;
  renderOrdensList(1, { q, status });
};

// ============================================================================
// ORDEM DETAIL
// ============================================================================

async function renderOrdemDetail(id) {
  setTitle('Detalhes da OS');
  topbarActions.innerHTML = `<button class="btn btn-outline" onclick="navigate('ordens')">Voltar</button>
    <button class="btn btn-warning btn-sm" onclick="window.print()">Imprimir</button>`;

  const res = await API.get(`/ordens/${id}`);
  const os = res.data;

  let html = `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div class="card-title" style="border:none;margin:0;padding:0;">OS #${os.numero_os}</div>
      <div>${badge(os.status)}</div>
    </div>
    ${statusFlow(os.status)}
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;" class="no-print">
      <select class="form-control" id="changeStatusOS" style="width:auto;min-width:200px;">
        <option value="">Alterar Status...</option>
        <option value="Orcamento">Orcamento</option>
        <option value="Aprovado">Aprovado</option>
        <option value="Em Manutencao">Em Manutencao</option>
        <option value="Aguardando Peca">Aguardando Peca</option>
        <option value="Pronto para Retirada">Pronto Retirada</option>
        <option value="Finalizado">Finalizado</option>
        <option value="Cancelado">Cancelado</option>
      </select>
      <button class="btn btn-primary btn-sm" onclick="changeStatus(${id})">Alterar</button>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">Cliente</div>
      <p><strong>${escape(os.cliente_nome)}</strong></p>
      <p>${escape(os.cliente_doc||'')}</p>
      <p>${escape(os.cliente_telefone||'')} ${os.cliente_whatsapp ? '| WhatsApp: ' + escape(os.cliente_whatsapp) : ''}</p>
      <p>${escape(os.cliente_email||'')}</p>
    </div>
    <div class="card">
      <div class="card-title">Equipamento</div>
      <p><strong>${escape(os.marca||'')} ${escape(os.modelo||'')}</strong></p>
      <p>NS: ${escape(os.numero_serie||'-')}</p>
      <p>Senha BIOS: ${escape(os.senha_bios||'-')}</p>
      <p>Data Entrada: ${fmtDate(os.data_entrada)}</p>
      <p>Data Saida: ${os.data_saida ? fmtDate(os.data_saida) : '-'}</p>
      <div style="margin-top:8px;"><button class="btn btn-outline btn-sm no-print" onclick="abrirGaleria(${id})">Fotos (${os.fotos ? os.fotos.length : 0}/5)</button></div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">Defeito Relatado</div>
      <p>${escape(os.defeito_relatado||'Nao informado')}</p>
    </div>
    <div class="card">
      <div class="card-title">Laudo Tecnico</div>
      <p>${escape(os.laudo_tecnico||'Aguardando laudo')}</p>
      <div style="margin-top:8px;"><button class="btn btn-outline btn-sm no-print" onclick="editarLaudo(${id})">Editar Laudo</button></div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Itens / Servicos</div>
    <div class="table-wrap"><table>
      <tr><th>#</th><th>Descricao</th><th>Tipo</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th><th class="no-print">Acoes</th></tr>`;
      if (os.itens && os.itens.length) {
        os.itens.forEach((item, i) => {
          html += `<tr><td>${i+1}</td><td>${escape(item.descricao)}</td><td>${badge(item.tipo)}</td><td>${item.quantidade}</td><td>R$ ${(+item.valor_unitario).toFixed(2)}</td><td>R$ ${(+item.valor_total).toFixed(2)}</td><td class="actions no-print"><button class="btn btn-danger btn-sm" onclick="removerItemOS(${os.id},${item.id})" title="Remover item">&times;</button></td></tr>`;
        });
      } else {
        html += `<tr><td colspan="7"><div class="empty"><p>Nenhum item adicionado</p></div></td></tr>`;
      }
      html += `<tr style="font-weight:bold;background:var(--bg);"><td colspan="5" style="text-align:right;">TOTAL</td><td>R$ ${(+os.valor_total).toFixed(2)}</td></tr>
    </table></div>
    <div style="margin-top:12px;" class="no-print">
      <button class="btn btn-primary btn-sm" onclick="addItem(${id})">+ Adicionar Item</button>
    </div>
  </div>`;

  // Checklist
  html += `<div class="card">
    <div class="card-title">Checklist de Inspecao</div>`;

  if (os.tela) {
    html += renderChecklistView(os);
  } else {
    html += `<p>Checklist ainda nao preenchido.</p>`;
  }
  html += `<div style="margin-top:8px;"><button class="btn btn-outline btn-sm no-print" onclick="editChecklist(${id})">${os.tela ? 'Editar' : 'Preencher'} Checklist</button></div>`;
  html += `</div>`;

  // Auditoria
  html += `<div class="card">
    <div class="card-title">Auditoria de Status</div>
    <div class="table-wrap"><table>
      <tr><th>Data</th><th>Status Anterior</th><th>Status Novo</th><th>Alterado Por</th></tr>`;
      if (os.auditoria && os.auditoria.length) {
        os.auditoria.forEach(log => {
          html += `<tr><td>${fmtDate(log.data_alteracao)}</td><td>${log.status_anterior ? badge(log.status_anterior) : '-'}</td><td>${badge(log.status_novo)}</td><td>${escape(log.alterado_por)}</td></tr>`;
        });
      } else {
        html += `<tr><td colspan="4"><div class="empty"><p>Nenhuma alteracao registrada</p></div></td></tr>`;
      }
    html += `</table></div>
  </div>`;

  contentBody.innerHTML = html;
}

function renderChecklistView(os) {
  const sel = (v) => v === 'OK' ? '[OK]' : `[${v}]`;
  const comp = (v) => v === 'OK' ? '<span style="color:var(--success)">OK</span>' : '<span style="color:var(--danger)">Ruim</span>';

  return `
  <div class="table-wrap"><table class="checklist-grid">
    <tr><th>Componente</th><th>Estado</th><th>Detalhes</th></tr>
    <tr><td>Tela</td><td>${sel(os.tela)}</td><td></td></tr>
    <tr><td>Camera</td><td>${comp(os.camera)}</td><td></td></tr>
    <tr><td>Som</td><td>${comp(os.som)}</td><td></td></tr>
    <tr><td>Rede RJ45</td><td>${comp(os.rede_rj45)}</td><td></td></tr>
    <tr><td>Rede WiFi</td><td>${comp(os.rede_wifi)}</td><td></td></tr>
    <tr><td>USB</td><td>${comp(os.usb)}</td><td></td></tr>
    <tr><td>Microfone</td><td>${comp(os.microfone)}</td><td></td></tr>
    <tr><td>Touchpad</td><td>${comp(os.touchpad)}</td><td></td></tr>
    <tr><td>Teclado</td><td>${sel(os.teclado)}</td><td>${escape(os.teclas_especificar||'')}</td></tr>
    <tr><td>Bateria</td><td>${os.bateria}</td><td>Autonomia: ${escape(os.tempo_autonomia||'N/A')}</td></tr>
    <tr><td colspan="3"><strong>Carcaca:</strong> ${escape(os.carcaca||'Nenhum dano reportado')}</td></tr>
    <tr><td colspan="3"><strong>Observacoes:</strong> ${escape(os.observacoes||'')}</td></tr>
  </table></div>`;
}

window.changeStatus = async function(id) {
  const status = $('changeStatusOS').value;
  if (!status) return toast('Selecione um status', 'warning');
  if (!confirm(`Alterar status da OS #${id} para "${status}"?`)) return;
  try {
    await API.patch(`/ordens/${id}/status`, { status });
    renderOrdemDetail(id);
  } catch (e) { toast(e.message, 'danger'); }
};

window.addItem = async function(osId) {
  window._addItemOsId = osId;
  // Carrega catalagos
  const [prodRes, servRes] = await Promise.all([
    API.get('/produtos'),
    API.get('/servicos')
  ]);
  const produtos = prodRes.data.filter(p => p.status === 'Ativo');
  const servicos = servRes.data.filter(s => s.status === 'Ativo');

  _itensCache.produtos = produtos;
  _itensCache.servicos = servicos;

  let html = `
  <h3>Adicionar Item a OS #${osId}</h3>
  <div class="tabs" style="margin-bottom:12px;">
    <div class="tab active" onclick="switchItemTab('produtos',this)" id="tabProdutos">Produtos</div>
    <div class="tab" onclick="switchItemTab('servicos',this)" id="tabServicos">Servicos</div>
  </div>
  <div class="search-bar" style="margin-bottom:8px;">
    <input class="form-control" id="itemSearch" placeholder="Buscar..." onkeyup="filtrarItens()" autofocus>
  </div>
  <div id="itemListContainer" style="max-height:300px;overflow-y:auto;">`;

  html += renderItemList(produtos, 'Produto');
  html += `</div>
  <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
    <div class="form-row">
      <div class="form-group"><label>Item</label><input class="form-control" id="itemDesc" placeholder="Selecione um item acima" readonly></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Tipo</label><select class="form-control" id="itemTipo"><option>Produto</option><option>Servico</option></select></div>
      <div class="form-group"><label>Quantidade</label><input class="form-control" id="itemQtd" type="number" value="1" min="1" step="1"></div>
      <div class="form-group"><label>Valor Unit. (R$)</label><input class="form-control" id="itemValor" value="0.00" onblur="fmtMoeda(this)"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="confirmarAddItem()">Adicionar</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    </div>
  </div>`;

  openModal(html);
  setTimeout(() => document.getElementById('itemSearch')?.focus(), 100);
};

let _itensCache = { produtos: [], servicos: [] };

function renderItemList(itens, tipo) {
  _itensCache[tipo === 'Produto' ? 'produtos' : 'servicos'] = itens;
  if (!itens.length) return '<div class="empty"><p>Nenhum item disponivel</p></div>';
  return itens.map(item => {
    const nome = tipo === 'Produto' ? item.descricao : item.nome_servico;
    const valor = tipo === 'Produto' ? item.preco_venda : item.valor_servico;
    const extra = tipo === 'Produto' ? (item.codigo_barras ? ' [' + escape(item.codigo_barras) + ']' : '') : '';
    return `<div class="item-option" onclick="selecionarItem('${escape(nome)}','${tipo}',${valor},${item.id})">
      <strong>${escape(nome)}</strong>${extra}<br>
      <span style="font-size:12px;color:var(--muted);">R$ ${(+valor).toFixed(2)}${tipo === 'Produto' ? ' | Est: ' + item.estoque_atual : ''}</span>
    </div>`;
  }).join('');
}

window.switchItemTab = function(tab, el) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const container = document.getElementById('itemListContainer');
  const itens = _itensCache[tab];
  container.innerHTML = renderItemList(itens, tab === 'produtos' ? 'Produto' : 'Servico');
};

window.filtrarItens = function() {
  const q = (document.getElementById('itemSearch').value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const activeTab = document.querySelector('.tabs .tab.active');
  const tab = activeTab?.id === 'tabServicos' ? 'servicos' : 'produtos';
  const tipo = tab === 'produtos' ? 'Produto' : 'Servico';
  const all = _itensCache[tab];
  const filtrados = all.filter(item => {
    const nome = (tipo === 'Produto' ? item.descricao : item.nome_servico) || '';
    return nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
  });
  document.getElementById('itemListContainer').innerHTML = renderItemList(filtrados, tipo);
};

window.selecionarItem = function(nome, tipo, valor) {
  document.getElementById('itemDesc').value = nome;
  document.getElementById('itemTipo').value = tipo;
  document.getElementById('itemValor').value = valor.toFixed(2);
  document.getElementById('itemQtd').focus();
};

window.confirmarAddItem = async function() {
  const desc = document.getElementById('itemDesc').value.trim();
  const tipo = document.getElementById('itemTipo').value;
  const qtd = parseFloat(document.getElementById('itemQtd').value) || 1;
  const valor = parseFloat(document.getElementById('itemValor').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0;
  if (!desc) { toast('Selecione um item da lista', 'warning'); return; }
  try {
    await API.post(`/ordens/${window._addItemOsId}/itens`, { descricao: desc, tipo, quantidade: qtd, valor_unitario: valor });
    closeModal();
    window._onModalClose = function() { renderOrdemDetail(window._addItemOsId); };
  } catch (e) { toast(e.message, 'danger'); }
};

window.removerItemOS = async function(osId, itemId) {
  if (!confirm('Remover este item da OS?')) return;
  try {
    await API.del(`/ordens/${osId}/itens/${itemId}`);
    renderOrdemDetail(osId);
  } catch (e) { toast(e.message, 'danger'); }
};

window.editarLaudo = async function(id) {
  const laudo = prompt('Laudo Tecnico:');
  if (laudo === null) return;
  try {
    await API.put(`/ordens/${id}`, { laudo_tecnico: laudo });
    renderOrdemDetail(id);
  } catch (e) { toast(e.message, 'danger'); }
};

window.editChecklist = async function(id) {
  const res = await API.get(`/ordens/${id}/checklist`);
  const c = res.data || {};
  const fields = [
    { label: 'Tela', name: 'tela', type: 'select', options: ['OK','Esbranquicada','Dead Pixel'], value: c.tela || 'OK' },
    { label: 'Teclado', name: 'teclado', type: 'select', options: ['OK','Faltam Teclas','Teclas Nao Funcionam'], value: c.teclado || 'OK' },
    { label: 'Teclas (especificar)', name: 'teclas_especificar', type: 'text', value: c.teclas_especificar || '' },
    { label: 'Camera', name: 'camera', type: 'select', options: ['OK','Ruim'], value: c.camera || 'OK' },
    { label: 'Som', name: 'som', type: 'select', options: ['OK','Ruim'], value: c.som || 'OK' },
    { label: 'Rede RJ45', name: 'rede_rj45', type: 'select', options: ['OK','Ruim'], value: c.rede_rj45 || 'OK' },
    { label: 'Rede WiFi', name: 'rede_wifi', type: 'select', options: ['OK','Ruim'], value: c.rede_wifi || 'OK' },
    { label: 'USB', name: 'usb', type: 'select', options: ['OK','Ruim'], value: c.usb || 'OK' },
    { label: 'Microfone', name: 'microfone', type: 'select', options: ['OK','Ruim'], value: c.microfone || 'OK' },
    { label: 'Touchpad', name: 'touchpad', type: 'select', options: ['OK','Ruim'], value: c.touchpad || 'OK' },
    { label: 'Bateria', name: 'bateria', type: 'select', options: ['Sem Bateria','Com Bateria'], value: c.bateria || 'Sem Bateria' },
    { label: 'Tempo Autonomia', name: 'tempo_autonomia', type: 'text', value: c.tempo_autonomia || '' },
    { label: 'Carcaca', name: 'carcaca', type: 'textarea', value: c.carcaca || '' },
    { label: 'Observacoes', name: 'observacoes', type: 'textarea', value: c.observacoes || '' }
  ];

  let formHtml = `<h3>Checklist de Inspecao</h3>`;
  fields.forEach(f => {
    formHtml += `<div class="form-group"><label>${f.label}</label>`;
    if (f.type === 'select') {
      formHtml += `<select class="form-control" id="chk_${f.name}">`;
      f.options.forEach(o => formHtml += `<option value="${o}" ${o===f.value?'selected':''}>${o}</option>`);
      formHtml += `</select>`;
    } else if (f.type === 'textarea') {
      formHtml += `<textarea class="form-control" id="chk_${f.name}" rows="2">${escape(f.value)}</textarea>`;
    } else {
      formHtml += `<input class="form-control" id="chk_${f.name}" value="${escape(f.value)}">`;
    }
    formHtml += `</div>`;
  });
  formHtml += `<div class="form-actions"><button class="btn btn-primary" onclick="saveChecklist(${id})">Salvar</button><button class="btn btn-outline" onclick="closeModal()">Cancelar</button></div>`;

  openModal(formHtml);
};

window.saveChecklist = async function(id) {
  const data = {};
  const fields = ['tela','teclado','teclas_especificar','camera','som','rede_rj45','rede_wifi','usb','microfone','touchpad','bateria','tempo_autonomia','carcaca','observacoes'];
  fields.forEach(f => { data[f] = $(`chk_${f}`)?.value; });
  try {
    await API.post(`/ordens/${id}/checklist`, data);
    closeModal();
    renderOrdemDetail(id);
  } catch (e) { toast(e.message, 'danger'); }
};

// ============================================================================
// ORCAMENTOS
// ============================================================================

async function renderOrcamentosList(page = 1, filtros = {}) {
  setTitle('Orcamentos');
  topbarActions.innerHTML = `<button class="btn btn-primary" onclick="navigate('orcamento-form')">+ Novo Orcamento</button>`;

  const params = new URLSearchParams({ page, limit: 15 });
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.q) params.set('q', filtros.q);
  if (filtros.data_inicio) params.set('data_inicio', filtros.data_inicio);
  if (filtros.data_fim) params.set('data_fim', filtros.data_fim);

  const res = await API.get('/orcamentos?' + params.toString());
  const orcamentos = res.data;
  const pag = res.pagination;

  let html = `
  <div class="search-bar">
    <input class="form-control" placeholder="Buscar por cliente, marca, modelo, numero..." id="searchOrc" value="${escape(filtros.q || '')}">
    <select class="form-control" id="filterStatusOrc" style="width:auto;">
      <option value="">Todos os Status</option>
      <option value="Aberto" ${filtros.status === 'Aberto' ? 'selected':''}>Aberto</option>
      <option value="Enviado" ${filtros.status === 'Enviado' ? 'selected':''}>Enviado</option>
      <option value="Aprovado" ${filtros.status === 'Aprovado' ? 'selected':''}>Aprovado</option>
      <option value="Reprovado" ${filtros.status === 'Reprovado' ? 'selected':''}>Reprovado</option>
      <option value="Cancelado" ${filtros.status === 'Cancelado' ? 'selected':''}>Cancelado</option>
      <option value="Convertido OS" ${filtros.status === 'Convertido OS' ? 'selected':''}>Convertido OS</option>
    </select>
    <input class="form-control" type="date" id="filterDataInicioOrc" value="${escape(filtros.data_inicio||'')}" style="width:auto;" title="Data inicio">
    <input class="form-control" type="date" id="filterDataFimOrc" value="${escape(filtros.data_fim||'')}" style="width:auto;" title="Data fim">
    <button class="btn btn-primary btn-sm" onclick="buscarOrcamentos()">Buscar</button>
  </div>

  <div class="card"><div class="table-wrap">
  <table>
    <tr>
      <th>#</th><th>Cliente</th><th>Equipamento</th><th>Data</th><th>Validade</th><th>Status</th><th>Valor</th><th>Acoes</th>
    </tr>`;

  if (orcamentos.length === 0) {
    html += `<tr><td colspan="8"><div class="empty"><div class="icon">&#128196;</div><p>Nenhum orcamento encontrado</p></div></td></tr>`;
  } else {
    const statusLabels = { 'Aberto':'badge-orcamento','Enviado':'badge-enviado','Aprovado':'badge-aprovado','Reprovado':'badge-cancelado','Cancelado':'badge-cancelado','Convertido OS':'badge-finalizado' };
    orcamentos.forEach(o => {
      const cls = statusLabels[o.status] || '';
      html += `<tr>
        <td><strong>${o.numero_orcamento}</strong></td>
        <td>${escape(o.cliente_nome)}</td>
        <td>${escape(o.equipamento_marca||'')} ${escape(o.equipamento_modelo||'')}</td>
        <td>${fmtDateShort(o.data_orcamento)}</td>
        <td>${fmtDateShort(o.validade_orcamento)}</td>
        <td><span class="badge ${cls}">${escape(o.status)}</span></td>
        <td>R$ ${(+o.valor_total).toFixed(2)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="navigate('orcamento-detail',${o.id})">Detalhes</button>
          ${o.status !== 'Convertido OS' ? `<button class="btn btn-outline btn-sm" onclick="navigate('orcamento-form',${o.id})">Editar</button>` : ''}
          <button class="btn btn-outline btn-sm" onclick="window.open('/print/orcamento.html?id=${o.id}','_blank')">Imprimir</button>
        </td>
      </tr>`;
    });
  }

  html += `</table></div></div>`;

  if (pag.totalPages > 1) {
    html += `<div class="pagination">`;
    html += `<button onclick="renderOrcamentosList(${pag.page - 1}, ${JSON.stringify(filtros).replace(/"/g,"'")})" ${pag.page <= 1 ? 'disabled':''}>&laquo;</button>`;
    html += `<span>Pag ${pag.page} de ${pag.totalPages} (${pag.total} registros)</span>`;
    html += `<button onclick="renderOrcamentosList(${pag.page + 1}, ${JSON.stringify(filtros).replace(/"/g,"'")})" ${pag.page >= pag.totalPages ? 'disabled':''}>&raquo;</button>`;
    html += `</div>`;
  }

  contentBody.innerHTML = html;
}

window.buscarOrcamentos = function() {
  const q = $('searchOrc').value;
  const status = $('filterStatusOrc').value;
  const data_inicio = $('filterDataInicioOrc').value;
  const data_fim = $('filterDataFimOrc').value;
  renderOrcamentosList(1, { q, status, data_inicio, data_fim });
};

// ============================================================================
// ORCAMENTO DETAIL
// ============================================================================

async function renderOrcamentoDetail(id) {
  setTitle('Detalhes do Orcamento');
  topbarActions.innerHTML = `<button class="btn btn-outline" onclick="navigate('orcamentos')">Voltar</button>
    <button class="btn btn-warning btn-sm" onclick="window.open('/print/orcamento.html?id=${id}','_blank')">Imprimir</button>`;

  const res = await API.get(`/orcamentos/${id}`);
  const o = res.data;

  const statusLabels = { 'Aberto':'badge-orcamento','Enviado':'badge-enviado','Aprovado':'badge-aprovado','Reprovado':'badge-cancelado','Cancelado':'badge-cancelado','Convertido OS':'badge-finalizado' };
  const statusCls = statusLabels[o.status] || '';

  let html = `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div class="card-title" style="border:none;margin:0;padding:0;">Orcamento #${o.numero_orcamento}</div>
      <div><span class="badge ${statusCls}">${escape(o.status)}</span></div>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;" class="no-print">
      ${o.status === 'Aberto' ? `<button class="btn btn-primary btn-sm" onclick="alterarStatusOrcamento(${id},'Enviado')">Enviar</button>` : ''}
      ${o.status === 'Aberto' || o.status === 'Enviado' ? `<button class="btn btn-success btn-sm" onclick="alterarStatusOrcamento(${id},'Aprovado')">Aprovar</button>` : ''}
      ${o.status === 'Aberto' || o.status === 'Enviado' ? `<button class="btn btn-warning btn-sm" onclick="alterarStatusOrcamento(${id},'Reprovado')">Reprovar</button>` : ''}
      ${o.status !== 'Convertido OS' && o.status !== 'Cancelado' ? `<button class="btn btn-danger btn-sm" onclick="alterarStatusOrcamento(${id},'Cancelado')">Cancelar</button>` : ''}
      ${o.status === 'Aprovado' ? `<button class="btn btn-primary btn-sm" onclick="converterOrcamentoEmOS(${id})">Converter em OS</button>` : ''}
      ${o.status !== 'Convertido OS' ? `<button class="btn btn-outline btn-sm" onclick="navigate('orcamento-form',${id})">Editar</button>` : ''}
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">Cliente</div>
      <p><strong>${escape(o.cliente_nome)}</strong></p>
      <p>${escape(o.cliente_doc||'')}</p>
      <p>${escape(o.cliente_telefone||'')}</p>
      <p>${escape(o.cliente_email||'')}</p>
    </div>
    <div class="card">
      <div class="card-title">Datas</div>
      <p>Emissao: ${fmtDateShort(o.data_orcamento)}</p>
      <p>Validade: ${fmtDateShort(o.validade_orcamento)}</p>
      <p>Tecnico: ${escape(o.tecnico_nome||'-')}</p>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">Equipamento</div>
      <p><strong>${escape(o.equipamento_marca||'')} ${escape(o.equipamento_modelo||'')}</strong></p>
      <p>NS: ${escape(o.numero_serie||'-')}</p>
    </div>
    <div class="card">
      <div class="card-title">Informacoes</div>
      <p>Pagamento: ${escape(o.forma_pagamento||'-')}</p>
      <p>Prazo entrega: ${escape(o.prazo_entrega||'-')}</p>
      <p>Garantia: ${escape(o.garantia||'-')}</p>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Defeito Relatado</div>
    <p>${escape(o.defeito_relatado||'Nao informado')}</p>
  </div>

  <div class="card">
    <div class="card-title">Itens do Orcamento</div>
    <div class="table-wrap"><table>
      <tr><th>#</th><th>Descricao</th><th>Tipo</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th></tr>`;
      if (o.itens && o.itens.length) {
        o.itens.forEach((item, i) => {
          html += `<tr><td>${i+1}</td><td>${escape(item.descricao)}</td><td>${badge(item.tipo)}</td><td>${item.quantidade}</td><td>R$ ${(+item.valor_unitario).toFixed(2)}</td><td>R$ ${(+item.valor_total).toFixed(2)}</td></tr>`;
        });
      } else {
        html += `<tr><td colspan="6"><div class="empty"><p>Nenhum item adicionado</p></div></td></tr>`;
      }
      html += `<tr style="font-weight:bold;background:var(--bg);"><td colspan="3" style="text-align:right;">Subtotal Produtos</td><td colspan="3">R$ ${(+o.valor_produtos).toFixed(2)}</td></tr>
      <tr style="font-weight:bold;background:var(--bg);"><td colspan="3" style="text-align:right;">Subtotal Servicos</td><td colspan="3">R$ ${(+o.valor_servicos).toFixed(2)}</td></tr>
      <tr><td colspan="3" style="text-align:right;">Desconto (${escape(o.desconto_tipo)})</td><td colspan="3">R$ ${(+o.valor_desconto).toFixed(2)}</td></tr>
      <tr style="font-weight:bold;font-size:15px;"><td colspan="3" style="text-align:right;">TOTAL</td><td colspan="3">R$ ${(+o.valor_total).toFixed(2)}</td></tr>
    </table></div>
  </div>

  <div class="card">
    <div class="card-title">Observacoes</div>
    <p>${escape(o.observacoes||'Sem observacoes')}</p>
  </div>`;

  contentBody.innerHTML = html;
}

window.alterarStatusOrcamento = async function(id, status) {
  const msgs = { 'Aprovado':'Aprovar este orcamento?','Reprovado':'Reprovar este orcamento?','Cancelado':'Cancelar este orcamento?','Enviado':'Marcar como Enviado?' };
  if (!confirm(msgs[status] || `Alterar status para ${status}?`)) return;
  try {
    await API.patch(`/orcamentos/${id}/status`, { status });
    toast(`Status alterado para ${status}`, 'success');
    renderOrcamentoDetail(id);
  } catch (e) { toast(e.message, 'danger'); }
};

window.converterOrcamentoEmOS = async function(id) {
  if (!confirm('Converter este orcamento em Ordem de Servico? Uma nova OS sera criada.')) return;
  try {
    const res = await API.post(`/orcamentos/${id}/converter-os`);
    toast(`OS #${res.data.numero_os} criada com sucesso!`, 'success');
    renderOrcamentoDetail(id);
  } catch (e) { toast(e.message, 'danger'); }
};

// ============================================================================
// ORCAMENTO FORM
// ============================================================================

async function renderOrcamentoForm(editId) {
  setTitle(editId ? 'Editar Orcamento' : 'Novo Orcamento');
  topbarActions.innerHTML = `<button class="btn btn-outline" onclick="navigate('orcamentos')">Voltar</button>`;

  const [clientes, tecnicos] = await Promise.all([
    API.get('/clientes?limit=500'),
    API.get('/tecnicos?status=Ativo')
  ]);

  let orc = { cliente_id: '', tecnico_id: '', data_orcamento: todayISO(), validade_orcamento: '', equipamento_marca: '', equipamento_modelo: '', numero_serie: '', defeito_relatado: '', observacoes: '', desconto_tipo: 'Valor', desconto_valor: 0, forma_pagamento: '', prazo_entrega: '', garantia: '', itens: [] };

  if (editId) {
    try {
      const res = await API.get(`/orcamentos/${editId}`);
      orc = res.data;
      orc.data_orcamento = (orc.data_orcamento || '').slice(0, 10);
      orc.validade_orcamento = (orc.validade_orcamento || '').slice(0, 10);
    } catch (e) { contentBody.innerHTML = alertBox('danger', 'Erro: ' + e.message); return; }
  }

  let html = `
  <div class="card">
    <div class="card-title">${editId ? 'Editar' : 'Novo'} Orcamento</div>
    <div id="formAlert"></div>
    <div class="form-row">
      <div class="form-group">
        <label>Cliente *</label>
        <select class="form-control" id="orc_cliente_id">
          <option value="">Selecione...</option>
          ${clientes.data.map(c => `<option value="${c.id}" ${+orc.cliente_id === c.id ? 'selected':''}>${escape(c.nome_razao_social)} (${escape(c.cpf_cnpj)})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Tecnico</label>
        <select class="form-control" id="orc_tecnico_id">
          <option value="">Selecione...</option>
          ${tecnicos.data.map(t => `<option value="${t.id}" ${+orc.tecnico_id === t.id ? 'selected':''}>${escape(t.nome)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Data</label><input class="form-control" id="orc_data" type="date" value="${orc.data_orcamento}"></div>
      <div class="form-group"><label>Validade</label><input class="form-control" id="orc_validade" type="date" value="${orc.validade_orcamento}"></div>
    </div>
    <div class="form-row-3">
      <div class="form-group"><label>Marca</label><input class="form-control" id="orc_marca" value="${escape(orc.equipamento_marca)}"></div>
      <div class="form-group"><label>Modelo</label><input class="form-control" id="orc_modelo" value="${escape(orc.equipamento_modelo)}"></div>
      <div class="form-group"><label>N/S</label><input class="form-control" id="orc_ns" value="${escape(orc.numero_serie)}"></div>
    </div>
    <div class="form-group"><label>Defeito Relatado</label><textarea class="form-control" id="orc_defeito" rows="2">${escape(orc.defeito_relatado)}</textarea></div>

    <div class="card-title" style="margin-top:16px;">Itens do Orcamento</div>
    <div class="search-bar" style="margin-bottom:8px;">
      <input class="form-control" id="orcItemSearch" placeholder="Buscar produto ou servico..." onkeyup="filtrarItensOrc()" autocomplete="off">
      <select class="form-control" id="orcItemTipo" style="width:auto;">
        <option value="Produto">Produto</option>
        <option value="Servico">Servico</option>
      </select>
      <button class="btn btn-primary btn-sm" onclick="abrirCatalogoOrc()">+ Adicionar</button>
    </div>
    <div class="table-wrap"><table>
      <tr><th>#</th><th>Descricao</th><th>Tipo</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th><th class="no-print">Acao</th></tr>
      <tbody id="orcItensTbody">
        ${(orc.itens || []).map((item, i) => `
          <tr>
            <td>${i+1}</td>
            <td>${escape(item.descricao)}</td>
            <td>${badge(item.tipo)}</td>
            <td>${item.quantidade}</td>
            <td>R$ ${(+item.valor_unitario).toFixed(2)}</td>
            <td>R$ ${(+item.valor_total).toFixed(2)}</td>
            <td class="no-print"><button class="btn btn-danger btn-sm" onclick="removerItemOrcExistente(${editId},${item.id})">&times;</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>
    <div id="orcTotals" style="text-align:right;margin-top:8px;padding:8px;background:var(--bg);border-radius:6px;"></div>

    <div class="form-row" style="margin-top:12px;">
      <div class="form-group"><label>Desconto Tipo</label>
        <select class="form-control" id="orc_desc_tipo" onchange="calcOrcTotals()">
          <option value="Valor" ${orc.desconto_tipo==='Valor'?'selected':''}>Valor (R$)</option>
          <option value="Percentual" ${orc.desconto_tipo==='Percentual'?'selected':''}>Percentual (%)</option>
        </select>
      </div>
      <div class="form-group"><label>Desconto</label><input class="form-control" id="orc_desc_valor" value="${(+orc.desconto_valor).toFixed(2)}" onblur="fmtMoeda(this);calcOrcTotals()"></div>
      <div class="form-group"><label>Forma Pagamento</label><input class="form-control" id="orc_pagamento" value="${escape(orc.forma_pagamento)}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Prazo Entrega</label><input class="form-control" id="orc_prazo" value="${escape(orc.prazo_entrega)}"></div>
      <div class="form-group"><label>Garantia</label><input class="form-control" id="orc_garantia" value="${escape(orc.garantia)}"></div>
    </div>
    <div class="form-group"><label>Observacoes</label><textarea class="form-control" id="orc_obs" rows="2">${escape(orc.observacoes)}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="salvarOrcamento(${editId || 'null'})">Salvar Orcamento</button>
      <button class="btn btn-outline" onclick="navigate('orcamentos')">Cancelar</button>
    </div>
  </div>`;

  contentBody.innerHTML = html;

  if (editId) {
    // Carregar itens do servidor para o cache local
    try {
      const full = await API.get(`/orcamentos/${editId}`);
      window._orcItensCache = (full.data.itens || []).map(item => ({
        _tempId: 'srv_' + item.id,
        id: item.id,
        descricao: item.descricao,
        tipo: item.tipo,
        quantidade: parseFloat(item.quantidade),
        valor_unitario: parseFloat(item.valor_unitario),
        valor_total: parseFloat(item.valor_total)
      }));
    } catch (e) {}
  } else {
    window._orcItensCache = [];
  }

  calcOrcTotals();
}

window._orcItensCache = [];

window.abrirCatalogoOrc = async function() {
  const [prodRes, servRes] = await Promise.all([
    API.get('/produtos'),
    API.get('/servicos')
  ]);
  const produtos = prodRes.data.filter(p => p.status === 'Ativo');
  const servicos = servRes.data.filter(s => s.status === 'Ativo');

  window._orcProdutosCache = produtos;
  window._orcServicosCache = servicos;

  let html = `
  <h3>Adicionar Item ao Orcamento</h3>
  <div class="tabs" style="margin-bottom:12px;">
    <div class="tab active" onclick="switchOrcItemTab('produtos',this)" id="tabOrcProdutos">Produtos</div>
    <div class="tab" onclick="switchOrcItemTab('servicos',this)" id="tabOrcServicos">Servicos</div>
  </div>
  <div class="search-bar" style="margin-bottom:8px;">
    <input class="form-control" id="orcCatSearch" placeholder="Buscar..." onkeyup="filtrarOrcCatalogo()" autofocus>
  </div>
  <div id="orcCatList" style="max-height:300px;overflow-y:auto;">
    ${renderOrcItemList(produtos, 'Produto')}
  </div>
  <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
    <div class="form-group"><label>Item</label><input class="form-control" id="orcCatDesc" readonly></div>
    <div class="form-row">
      <div class="form-group"><label>Qtd</label><input class="form-control" id="orcCatQtd" type="number" value="1" min="0.01" step="1"></div>
      <div class="form-group"><label>Valor Unit.</label><input class="form-control" id="orcCatValor" value="0.00" onblur="fmtMoeda(this)"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="confirmarAddItemOrc()">Adicionar</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    </div>
  </div>`;
  openModal(html);
  setTimeout(() => document.getElementById('orcCatSearch')?.focus(), 100);
};

function renderOrcItemList(itens, tipo) {
  if (!itens.length) return '<div class="empty"><p>Nenhum item disponivel</p></div>';
  return itens.map(item => {
    const nome = tipo === 'Produto' ? item.descricao : item.nome_servico;
    const valor = tipo === 'Produto' ? item.preco_venda : item.valor_servico;
    return `<div class="item-option" onclick="selecionarOrcItem('${escape(nome)}','${tipo}',${valor})">
      <strong>${escape(nome)}</strong><br>
      <span style="font-size:12px;color:var(--muted);">R$ ${(+valor).toFixed(2)}</span>
    </div>`;
  }).join('');
}

window.switchOrcItemTab = function(tab, el) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const container = document.getElementById('orcCatList');
  const itens = tab === 'produtos' ? window._orcProdutosCache : window._orcServicosCache;
  container.innerHTML = renderOrcItemList(itens, tab === 'produtos' ? 'Produto' : 'Servico');
};

window.filtrarOrcCatalogo = function() {
  const q = (document.getElementById('orcCatSearch').value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const activeTab = document.querySelector('.tabs .tab.active');
  const tab = activeTab?.id === 'tabOrcServicos' ? 'servicos' : 'produtos';
  const tipo = tab === 'produtos' ? 'Produto' : 'Servico';
  const all = tab === 'produtos' ? window._orcProdutosCache : window._orcServicosCache;
  const filtrados = all.filter(item => {
    const nome = (tipo === 'Produto' ? item.descricao : item.nome_servico) || '';
    return nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
  });
  document.getElementById('orcCatList').innerHTML = renderOrcItemList(filtrados, tipo);
};

window.selecionarOrcItem = function(nome, tipo, valor) {
  document.getElementById('orcCatDesc').value = nome;
  document.getElementById('orcCatValor').value = valor.toFixed(2);
  document.getElementById('orcCatQtd').focus();
};

window.confirmarAddItemOrc = function() {
  const desc = document.getElementById('orcCatDesc').value.trim();
  const tipo = document.querySelector('.tabs .tab.active')?.id === 'tabOrcServicos' ? 'Servico' : 'Produto';
  const qtd = parseFloat(document.getElementById('orcCatQtd').value) || 1;
  const valor = parseFloat(document.getElementById('orcCatValor').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0;
  if (!desc) { toast('Selecione um item da lista', 'warning'); return; }

  const total = qtd * valor;
  const item = {
    _tempId: 'tmp_' + Date.now() + Math.random(),
    descricao: desc,
    tipo,
    quantidade: qtd,
    valor_unitario: valor,
    valor_total: total
  };
  window._orcItensCache.push(item);
  closeModal();
  renderOrcFormItens();
  calcOrcTotals();
};

function renderOrcFormItens() {
  const tbody = document.getElementById('orcItensTbody');
  if (!tbody) return;
  if (!window._orcItensCache.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><p>Nenhum item adicionado</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = window._orcItensCache.map((item, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${escape(item.descricao)}</td>
      <td>${badge(item.tipo)}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${(+item.valor_unitario).toFixed(2)}</td>
      <td>R$ ${(+item.valor_total).toFixed(2)}</td>
      <td class="no-print"><button class="btn btn-danger btn-sm" onclick="removerItemOrcTemp('${item._tempId}')">&times;</button></td>
    </tr>
  `).join('');
}

window.removerItemOrcTemp = function(tempId) {
  window._orcItensCache = window._orcItensCache.filter(i => i._tempId !== tempId);
  renderOrcFormItens();
  calcOrcTotals();
};

window.removerItemOrcExistente = async function(orcId, itemId) {
  if (!confirm('Remover este item do orcamento?')) return;
  try {
    await API.del(`/orcamentos/${orcId}/itens/${itemId}`);
    window._orcItensCache = window._orcItensCache.filter(i => i.id !== itemId);
    renderOrcFormItens();
    calcOrcTotals();
  } catch (e) { toast(e.message, 'danger'); }
};

function calcOrcTotals() {
  const container = document.getElementById('orcTotals');
  if (!container) return;

  let totalProd = 0, totalServ = 0;
  (window._orcItensCache || []).forEach(item => {
    if (item.tipo === 'Produto') totalProd += parseFloat(item.valor_total) || 0;
    else totalServ += parseFloat(item.valor_total) || 0;
  });
  const subtotal = totalProd + totalServ;

  const descTipo = document.getElementById('orc_desc_tipo')?.value || 'Valor';
  const descValor = parseFloat(document.getElementById('orc_desc_valor')?.value?.replace(/[^\d.,]/g,'').replace(',','.') || 0) || 0;

  let descFinal = 0;
  if (descTipo === 'Percentual') {
    descFinal = subtotal * (descValor / 100);
  } else {
    descFinal = Math.min(descValor, subtotal);
  }

  const total = subtotal - descFinal;

  container.innerHTML = `
    <strong>Subtotal Produtos:</strong> R$ ${totalProd.toFixed(2)}<br>
    <strong>Subtotal Servicos:</strong> R$ ${totalServ.toFixed(2)}<br>
    <strong>Desconto (${descTipo}):</strong> R$ ${descFinal.toFixed(2)}<br>
    <span style="font-size:18px;font-weight:bold;">TOTAL: R$ ${total.toFixed(2)}</span>
  `;
}

window.salvarOrcamento = async function(editId) {
  const cliente_id = $('orc_cliente_id').value;
  if (!cliente_id) { $('formAlert').innerHTML = alertBox('danger', 'Selecione um cliente'); return; }

  const descTipo = $('orc_desc_tipo').value;
  const descValor = parseFloat($('orc_desc_valor').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0;

  try {
    const body = {
      cliente_id: parseInt(cliente_id),
      tecnico_id: parseInt($('orc_tecnico_id').value) || null,
      data_orcamento: $('orc_data').value || todayISO(),
      validade_orcamento: $('orc_validade').value || null,
      equipamento_marca: $('orc_marca').value,
      equipamento_modelo: $('orc_modelo').value,
      numero_serie: $('orc_ns').value,
      defeito_relatado: $('orc_defeito').value,
      observacoes: $('orc_obs').value,
      desconto_tipo: descTipo,
      desconto_valor: descValor,
      forma_pagamento: $('orc_pagamento').value,
      prazo_entrega: $('orc_prazo').value,
      garantia: $('orc_garantia').value
    };

    let orcId;
    if (editId) {
      await API.put(`/orcamentos/${editId}`, body);
      orcId = editId;
    } else {
      const res = await API.post('/orcamentos', body);
      orcId = res.data.id;
    }

    // Salvar itens (enviar novos ou atualizados)
    if (window._orcItensCache && window._orcItensCache.length) {
      // Remover itens que foram deletados (nao estao no cache mas estao no BD)
      if (editId) {
        // Nao podemos saber quais foram removidos, entao vamos remover todos e reinserir
        // Primeiro pegar os que existem no BD
        const existentes = await API.get(`/orcamentos/${orcId}`);
        for (const item of existentes.data.itens || []) {
          const aindaTem = window._orcItensCache.some(i => i.id === item.id);
          if (!aindaTem) {
            await API.del(`/orcamentos/${orcId}/itens/${item.id}`);
          }
        }
      }

      // Adicionar itens que sao temporarios (novos)
      for (const item of window._orcItensCache) {
        if (!item.id || String(item._tempId).startsWith('tmp_')) {
          await API.post(`/orcamentos/${orcId}/itens`, {
            tipo: item.tipo,
            descricao: item.descricao,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            produto_id: item.produto_id || null,
            servico_id: item.servico_id || null
          });
        }
      }
    }

    $('formAlert').innerHTML = alertBox('success', `Orcamento #${orcId} salvo com sucesso!`);
    setTimeout(() => navigate('orcamento-detail', orcId), 1000);
  } catch (e) { $('formAlert').innerHTML = alertBox('danger', 'Erro: ' + e.message); }
};

// ============================================================================
// ORDEM FORM (Create)
// ============================================================================

async function renderOrdemForm(editId) {
  setTitle(editId ? 'Editar OS' : 'Nova Ordem de Servico');
  topbarActions.innerHTML = `<button class="btn btn-outline" onclick="navigate('ordens')">Voltar</button>`;

  const [clientes, tecnicos] = await Promise.all([
    API.get('/clientes?limit=500'),
    API.get('/tecnicos?status=Ativo')
  ]);

  let html = `
  <div class="card">
    <div class="card-title">${editId ? 'Editar' : 'Nova'} Ordem de Servico</div>
    <div id="formAlert"></div>
    <div class="form-row">
      <div class="form-group">
        <label>Cliente *</label>
        <select class="form-control" id="os_cliente_id">
          <option value="">Selecione...</option>
          ${clientes.data.map(c => `<option value="${c.id}">${escape(c.nome_razao_social)} (${escape(c.cpf_cnpj)})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Tecnico</label>
        <select class="form-control" id="os_tecnico_id">
          <option value="">Selecione...</option>
          ${tecnicos.data.map(t => `<option value="${t.id}">${escape(t.nome)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row-3">
      <div class="form-group"><label>Marca</label><input class="form-control" id="os_marca" placeholder="Ex: Dell, Lenovo"></div>
      <div class="form-group"><label>Modelo</label><input class="form-control" id="os_modelo" placeholder="Ex: Inspiron 15"></div>
      <div class="form-group"><label>Numero de Serie</label><input class="form-control" id="os_numero_serie" placeholder="Ex: SN-12345" autocomplete="off"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Senha BIOS</label><input class="form-control" id="os_senha_bios" type="password"></div>
      <div class="form-group"><label></label><div></div></div>
    </div>
    <div class="form-group"><label>Defeito Relatado</label><textarea class="form-control" id="os_defeito" rows="3"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="salvarOS(${editId || 'null'})">Salvar OS</button>
      <button class="btn btn-outline" onclick="navigate('ordens')">Cancelar</button>
    </div>
  </div>`;

  contentBody.innerHTML = html;
}

window.salvarOS = async function(editId) {
  const cliente_id = $('os_cliente_id').value;
  if (!cliente_id) { $('formAlert').innerHTML = alertBox('danger', 'Selecione um cliente'); return; }

  try {
    const body = {
      cliente_id: parseInt(cliente_id),
      tecnico_id: parseInt($('os_tecnico_id').value) || null,
      marca: $('os_marca').value,
      modelo: $('os_modelo').value,
      numero_serie: $('os_numero_serie').value,
      senha_bios: $('os_senha_bios').value,
      defeito_relatado: $('os_defeito').value
    };

    const res = await API.post('/ordens', body);
    $('formAlert').innerHTML = alertBox('success', `OS #${res.data.numero_os} criada!`);
    setTimeout(() => navigate('ordem-detail', res.data.id), 1000);
  } catch (e) { $('formAlert').innerHTML = alertBox('danger', 'Erro: ' + e.message); }
};

// ============================================================================
// CLIENTES LIST
// ============================================================================

async function renderClientesList(page = 1, filtros = {}) {
  setTitle('Clientes');
  topbarActions.innerHTML = `<button class="btn btn-primary" onclick="navigate('cliente-form')">+ Novo Cliente</button>`;

  const params = new URLSearchParams({ page, limit: 20 });
  if (filtros.q) params.set('q', filtros.q);
  if (filtros.status) params.set('status', filtros.status);

  const res = await API.get('/clientes?' + params.toString());
  const clientes = res.data;
  const pag = res.pagination;

  let html = `
  <div class="search-bar">
    <input class="form-control" placeholder="Buscar por nome, CPF, CNPJ, telefone..." id="searchCliente" value="${escape(filtros.q||'')}">
    <select class="form-control" id="filterClienteStatus" style="width:auto;">
      <option value="">Todos</option>
      <option value="Ativo" ${filtros.status==='Ativo'?'selected':''}>Ativos</option>
      <option value="Inativo" ${filtros.status==='Inativo'?'selected':''}>Inativos</option>
    </select>
    <button class="btn btn-primary btn-sm" onclick="buscarClientes()">Buscar</button>
  </div>

  <div class="card"><div class="table-wrap">
  <table>
    <tr><th>Nome / Razao Social</th><th>Fantasia</th><th>CPF/CNPJ</th><th>Telefone</th><th>Status</th><th>OS</th><th>Total Gasto</th><th>Acoes</th></tr>`;

  if (clientes.length === 0) {
    html += `<tr><td colspan="8"><div class="empty"><div class="icon">&#9787;</div><p>Nenhum cliente encontrado</p></div></td></tr>`;
  } else {
    clientes.forEach(c => {
      html += `<tr>
        <td><strong>${escape(c.nome_razao_social)}</strong></td>
        <td>${escape(c.nome_fantasia||'-')}</td>
        <td>${escape(c.cpf_cnpj)}</td>
        <td>${escape(c.telefone||'-')}</td>
        <td>${badge(c.status)}</td>
        <td>${c.total_os}</td>
        <td>R$ ${(+c.total_gasto).toFixed(2)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="navigate('cliente-detail',${c.id})">Detalhes</button>
          <button class="btn btn-outline btn-sm" onclick="navigate('cliente-form',${c.id})">Editar</button>
        </td>
      </tr>`;
    });
  }

  html += `</table></div></div>`;

  if (pag.totalPages > 1) {
    html += `<div class="pagination">`;
    html += `<button onclick="renderClientesList(${pag.page-1},${JSON.stringify(filtros).replace(/"/g,"'")})" ${pag.page<=1?'disabled':''}>&laquo;</button>`;
    html += `<span>Pag ${pag.page} de ${pag.totalPages} (${pag.total} registros)</span>`;
    html += `<button onclick="renderClientesList(${pag.page+1},${JSON.stringify(filtros).replace(/"/g,"'")})" ${pag.page>=pag.totalPages?'disabled':''}>&raquo;</button>`;
    html += `</div>`;
  }

  contentBody.innerHTML = html;
}

window.buscarClientes = function() {
  renderClientesList(1, { q: $('searchCliente').value, status: $('filterClienteStatus').value });
};

// ============================================================================
// CLIENTE DETAIL
// ============================================================================

async function renderClienteDetail(id) {
  setTitle('Detalhes do Cliente');
  topbarActions.innerHTML = `<button class="btn btn-outline" onclick="navigate('clientes')">Voltar</button>
    <button class="btn btn-outline" onclick="navigate('cliente-form',${id})">Editar</button>`;

  const res = await API.get(`/clientes/${id}`);
  const c = res.data;

  let html = `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div class="card-title" style="border:none;margin:0;padding:0;">${escape(c.nome_razao_social)}</div>
      <div>${badge(c.status)}</div>
    </div>
    <div class="grid-2" style="margin-top:12px;">
      <div>
        <p><strong>CPF/CNPJ:</strong> ${escape(c.cpf_cnpj)}</p>
        <p><strong>Tipo:</strong> ${c.tipo}</p>
        <p><strong>Nome Fantasia:</strong> ${escape(c.nome_fantasia||'-')}</p>
        <p><strong>Insc. Estadual:</strong> ${escape(c.inscricao_estadual||'-')}</p>
      </div>
      <div>
        <p><strong>Telefone:</strong> ${escape(c.telefone||'-')}</p>
        <p><strong>WhatsApp:</strong> ${escape(c.whatsapp||'-')}</p>
        <p><strong>Email:</strong> ${escape(c.email||'-')}</p>
        <p><strong>Endereco:</strong> ${escape(c.logradouro||'')}${c.numero ? ', '+escape(c.numero):''}${c.bairro ? ' - '+escape(c.bairro):''}${c.cidade ? ' - '+escape(c.cidade):''}${c.uf ? '/'+escape(c.uf):''}</p>
      </div>
    </div>
    <div style="margin-top:12px;" class="no-print">
      ${c.status === 'Ativo'
        ? `<button class="btn btn-warning btn-sm" onclick="inativarCliente(${id})">Inativar Cliente</button>`
        : `<button class="btn btn-success btn-sm" onclick="reativarCliente(${id})">Reativar Cliente</button>`
      }
    </div>
  </div>

  <div class="card">
    <div class="card-title">Historico de Servicos</div>
    <div class="table-wrap"><table>
      <tr><th>Data</th><th># OS</th><th>Tecnico</th><th>Servicos</th><th>Valor</th></tr>`;
      if (c.historico && c.historico.length) {
        c.historico.forEach(h => {
          html += `<tr>
            <td>${fmtDateShort(h.data_entrada)}</td>
            <td><a href="#" onclick="navigate('ordem-detail',${h.os_id});return false;"><strong>${h.numero_os}</strong></a></td>
            <td>${escape(h.tecnico_responsavel||'-')}</td>
            <td>${escape(h.servicos_realizados||'-')}</td>
            <td>R$ ${(+h.valor_cobrado).toFixed(2)}</td>
          </tr>`;
        });
      } else {
        html += `<tr><td colspan="5"><div class="empty"><p>Nenhum servico realizado</p></div></td></tr>`;
      }
    html += `</table></div>
  </div>`;

  contentBody.innerHTML = html;
}

window.inativarCliente = async function(id) {
  if (!confirm('Tem certeza que deseja inativar este cliente?')) return;
  try {
    await API.patch(`/clientes/${id}/inativar`);
    renderClienteDetail(id);
  } catch (e) { toast(e.message, 'danger'); }
};

window.reativarCliente = async function(id) {
  try {
    await API.patch(`/clientes/${id}/reativar`);
    renderClienteDetail(id);
  } catch (e) { toast(e.message, 'danger'); }
};

// ============================================================================
// CLIENTE FORM
// ============================================================================

async function renderClienteForm(editId) {
  setTitle(editId ? 'Editar Cliente' : 'Novo Cliente');
  topbarActions.innerHTML = `<button class="btn btn-outline" onclick="navigate('clientes')">Voltar</button>`;

  let c = { tipo: 'PF', cpf_cnpj: '', nome_razao_social: '', nome_fantasia: '', inscricao_estadual: '', telefone: '', whatsapp: '', email: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };

  if (editId) {
    const res = await API.get(`/clientes/${editId}`);
    c = res.data;
  }

  let html = `
  <div class="card">
    <div class="card-title">${editId ? 'Editar' : 'Novo'} Cliente</div>
    <div id="formAlert"></div>

    <div class="form-row">
      <div class="form-group">
        <label>Tipo *</label>
        <select class="form-control" id="cli_tipo" onchange="togglePFPJ()">
          <option value="PF" ${c.tipo==='PF'?'selected':''}>Pessoa Fisica (CPF)</option>
          <option value="PJ" ${c.tipo==='PJ'?'selected':''}>Pessoa Juridica (CNPJ)</option>
        </select>
      </div>
      <div class="form-group">
        <label id="labelDoc">CPF *</label>
        <div style="display:flex;gap:4px;">
          <input class="form-control" id="cli_cpf_cnpj" value="${escape(c.cpf_cnpj)}" placeholder="000.000.000-00">
          <button class="btn btn-outline btn-sm" onclick="buscarCNPJ()" id="btnBuscarCNPJ" style="${c.tipo==='PF'?'display:none':''}">Buscar CNPJ</button>
        </div>
      </div>
    </div>
    <div class="form-group"><label id="labelNome">Nome *</label><input class="form-control" id="cli_nome" value="${escape(c.nome_razao_social)}"></div>
    <div class="form-row">
      <div class="form-group"><label>Nome Fantasia</label><input class="form-control" id="cli_fantasia" value="${escape(c.nome_fantasia||'')}" placeholder="Nome fantasia (apenas PJ)"></div>
      <div class="form-group"><label>Inscricao Estadual</label><input class="form-control" id="cli_ie" value="${escape(c.inscricao_estadual||'')}" placeholder="Somente PJ"></div>
    </div>
    <div class="form-row-3">
      <div class="form-group"><label>Telefone</label><input class="form-control" id="cli_telefone" value="${escape(c.telefone||'')}" placeholder="(00) 00000-0000"></div>
      <div class="form-group"><label>WhatsApp</label><input class="form-control" id="cli_whatsapp" value="${escape(c.whatsapp||'')}" placeholder="(00) 00000-0000"></div>
      <div class="form-group"><label>Email</label><input class="form-control" id="cli_email" value="${escape(c.email||'')}" type="email"></div>
    </div>
    <div class="form-row-4">
      <div class="form-group"><label>CEP</label><input class="form-control" id="cli_cep" value="${escape(c.cep||'')}" placeholder="00000-000" onblur="buscarCEP()"></div>
      <div class="form-group" style="grid-column:span 2;"><label>Logradouro</label><input class="form-control" id="cli_logradouro" value="${escape(c.logradouro||'')}"></div>
      <div class="form-group"><label>Numero</label><input class="form-control" id="cli_numero" value="${escape(c.numero||'')}"></div>
    </div>
    <div class="form-row-4">
      <div class="form-group"><label>Complemento</label><input class="form-control" id="cli_complemento" value="${escape(c.complemento||'')}"></div>
      <div class="form-group"><label>Bairro</label><input class="form-control" id="cli_bairro" value="${escape(c.bairro||'')}"></div>
      <div class="form-group"><label>Cidade</label><input class="form-control" id="cli_cidade" value="${escape(c.cidade||'')}"></div>
      <div class="form-group"><label>UF</label><input class="form-control" id="cli_uf" value="${escape(c.uf||'')}" maxlength="2" style="text-transform:uppercase;"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="salvarCliente(${editId || 'null'})">${editId ? 'Atualizar' : 'Salvar'}</button>
      <button class="btn btn-outline" onclick="navigate('clientes')">Cancelar</button>
    </div>
  </div>`;

  contentBody.innerHTML = html;
}

window.togglePFPJ = function() {
  const tipo = $('cli_tipo').value;
  $('labelDoc').textContent = tipo === 'PF' ? 'CPF *' : 'CNPJ *';
  $('labelNome').textContent = tipo === 'PF' ? 'Nome *' : 'Razao Social *';
  $('btnBuscarCNPJ').style.display = tipo === 'PF' ? 'none' : 'inline-flex';
  $('cli_cpf_cnpj').placeholder = tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00';
  const fantasiaRow = document.getElementById('cli_fantasia')?.closest('.form-row');
  if (fantasiaRow) fantasiaRow.style.display = tipo === 'PJ' ? '' : 'none';
};

window.buscarCEP = async function() {
  const cep = $('cli_cep').value.replace(/\D/g, '');
  if (cep.length !== 8) return;
  try {
    const res = await API.get(`/cep/${cep}`);
    const d = res.data;
    if (!document.getElementById('cli_logradouro').value)
      $('cli_logradouro').value = d.logradouro || '';
    if (!document.getElementById('cli_complemento').value)
      $('cli_complemento').value = d.complemento || '';
    if (!document.getElementById('cli_bairro').value)
      $('cli_bairro').value = d.bairro || '';
    if (!document.getElementById('cli_cidade').value)
      $('cli_cidade').value = d.cidade || '';
    if (!document.getElementById('cli_uf').value)
      $('cli_uf').value = (d.uf || '').toUpperCase();
  } catch (_) { /* silencioso */ }
};

window.buscarCNPJ = async function() {
  const cnpj = $('cli_cpf_cnpj').value.replace(/\D/g, '');
  if (cnpj.length !== 14) { toast('CNPJ deve ter 14 digitos', 'warning'); return; }
  try {
    const res = await API.get(`/cnpj/${cnpj}`);
    const d = res.data;
    $('cli_nome').value = d.razao_social || '';
    $('cli_fantasia').value = d.nome_fantasia || d.razao_social || '';
    $('cli_logradouro').value = d.logradouro || '';
    $('cli_numero').value = d.numero || '';
    $('cli_complemento').value = d.complemento || '';
    $('cli_bairro').value = d.bairro || '';
    $('cli_cidade').value = d.cidade || '';
    $('cli_uf').value = (d.uf || '').toUpperCase();
    $('cli_cep').value = d.cep || '';
    if (d.telefone) $('cli_telefone').value = d.telefone;
    if (d.email) $('cli_email').value = d.email;
    $('cli_tipo').value = 'PJ';
    togglePFPJ();
    // Fallback: se CEP existe mas logradouro veio vazio, busca pelo CEP
    if (d.cep && !d.logradouro) buscarCEP();
    toast('Dados preenchidos automaticamente da Receita Federal!', 'success');
  } catch (e) { toast('Erro ao buscar CNPJ: ' + e.message, 'danger'); }
};

window.salvarCliente = async function(editId) {
  const body = {
    tipo: $('cli_tipo').value,
    cpf_cnpj: $('cli_cpf_cnpj').value,
    nome_razao_social: $('cli_nome').value,
    nome_fantasia: $('cli_fantasia').value,
    inscricao_estadual: $('cli_ie').value,
    telefone: $('cli_telefone').value,
    whatsapp: $('cli_whatsapp').value,
    email: $('cli_email').value,
    cep: $('cli_cep').value,
    logradouro: $('cli_logradouro').value,
    numero: $('cli_numero').value,
    complemento: $('cli_complemento').value,
    bairro: $('cli_bairro').value,
    cidade: $('cli_cidade').value,
    uf: $('cli_uf').value
  };

  if (!body.cpf_cnpj || !body.nome_razao_social) {
    $('formAlert').innerHTML = alertBox('danger', 'CPF/CNPJ e Nome sao obrigatorios');
    return;
  }

  try {
    if (editId) {
      await API.put(`/clientes/${editId}`, body);
      $('formAlert').innerHTML = alertBox('success', 'Cliente atualizado!');
    } else {
      const res = await API.post('/clientes', body);
      $('formAlert').innerHTML = alertBox('success', 'Cliente criado!');
      setTimeout(() => navigate('cliente-detail', res.data.id), 1000);
    }
  } catch (e) { $('formAlert').innerHTML = alertBox('danger', 'Erro: ' + e.message); }
};

// ============================================================================
// TECNICOS
// ============================================================================

async function renderTecnicosList() {
  setTitle('Tecnicos');
  topbarActions.innerHTML = `<button class="btn btn-primary" onclick="novoTecnico()">+ Novo Tecnico</button>`;

  const res = await API.get('/tecnicos?limit=100');
  const tecnicos = res.data;

  let html = `
  <div class="card"><div class="table-wrap">
  <table>
    <tr><th>Nome</th><th>Especialidade</th><th>Status</th><th>Acoes</th></tr>`;

  if (tecnicos.length === 0) {
    html += `<tr><td colspan="4"><div class="empty"><p>Nenhum tecnico cadastrado</p></div></td></tr>`;
  } else {
    tecnicos.forEach(t => {
      html += `<tr>
        <td><strong>${escape(t.nome)}</strong></td>
        <td>${escape(t.especialidade||'-')}</td>
        <td>${badge(t.status)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="editarTecnico(${t.id},'${escape(t.nome)}','${escape(t.especialidade||'')}','${t.status}')">Editar</button>
        </td>
      </tr>`;
    });
  }

  html += `</table></div></div>`;
  contentBody.innerHTML = html;
}

window.novoTecnico = function() {
  openModal(`
    <h3>Novo Tecnico</h3>
    <div class="form-group"><label>Nome</label><input class="form-control" id="tec_nome"></div>
    <div class="form-group"><label>Especialidade</label><input class="form-control" id="tec_especialidade"></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="salvarTecnico()">Salvar</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    </div>
  `);
};

window.editarTecnico = function(id, nome, especialidade, status) {
  openModal(`
    <h3>Editar Tecnico</h3>
    <div class="form-group"><label>Nome</label><input class="form-control" id="tec_nome" value="${nome}"></div>
    <div class="form-group"><label>Especialidade</label><input class="form-control" id="tec_especialidade" value="${especialidade}"></div>
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="tec_status">
        <option value="Ativo" ${status==='Ativo'?'selected':''}>Ativo</option>
        <option value="Inativo" ${status==='Inativo'?'selected':''}>Inativo</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="salvarTecnico(${id})">Salvar</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    </div>
  `);
};

window.salvarTecnico = async function(id) {
  const nome = $('tec_nome')?.value;
  if (!nome) { toast('Nome obrigatorio', 'warning'); return; }
  try {
    if (id) {
      await API.put(`/tecnicos/${id}`, { nome, especialidade: $('tec_especialidade')?.value, status: $('tec_status')?.value });
    } else {
      await API.post('/tecnicos', { nome, especialidade: $('tec_especialidade')?.value });
    }
    closeModal();
    renderTecnicosList();
  } catch (e) { toast(e.message, 'danger'); }
};

// ============================================================================
// EMITENTE (Config Empresa)
// ============================================================================

async function renderEmitente() {
  setTitle('Configuracao');
  _logoBase64 = null;
  const [empRes, backupRes] = await Promise.all([
    API.get('/emitente'),
    API.get('/backup/config')
  ]);
  const e = empRes.data || {};
  const bc = backupRes.data;

  let html = `
  <div class="tabs" style="margin-bottom:16px;">
    <div class="tab active" onclick="switchConfTab('empresa',this)" id="confTabEmpresa">Empresa</div>
    <div class="tab" onclick="switchConfTab('backup',this)" id="confTabBackup">Backup</div>
  </div>
  <div id="confContent">`;

  html += renderEmpresaForm(e);
  html += `</div>`;

  contentBody.innerHTML = html;
}

window._backupConfig = null;

window.switchConfTab = function(tab, el) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (tab === 'backup') renderBackupTab();
  else renderEmpresaFormCached();
};

function renderEmpresaForm(e) {
  return `
  <div class="card">
    <div class="card-title">Dados da Assistencia Tecnica</div>
    <div id="formAlert"></div>
    <div class="form-row">
      <div class="form-group">
        <label>CNPJ *</label>
        <div style="display:flex;gap:4px;">
          <input class="form-control" id="emp_cnpj" value="${escape(e.cnpj||'')}" placeholder="00.000.000/0000-00">
          <button class="btn btn-outline btn-sm" onclick="buscarCNPJEmpresa()">Buscar</button>
        </div>
      </div>
      <div class="form-group"><label>Razao Social *</label><input class="form-control" id="emp_razao" value="${escape(e.razao_social||'')}"></div>
    </div>
    <div class="form-group"><label>Nome Fantasia</label><input class="form-control" id="emp_fantasia" value="${escape(e.nome_fantasia||'')}"></div>
    <div class="form-row-4">
      <div class="form-group"><label>Logradouro</label><input class="form-control" id="emp_logradouro" value="${escape(e.logradouro||'')}"></div>
      <div class="form-group"><label>Numero</label><input class="form-control" id="emp_numero" value="${escape(e.numero||'')}"></div>
      <div class="form-group"><label>Complemento</label><input class="form-control" id="emp_complemento" value="${escape(e.complemento||'')}"></div>
      <div class="form-group"><label>Bairro</label><input class="form-control" id="emp_bairro" value="${escape(e.bairro||'')}"></div>
    </div>
    <div class="form-row-4">
      <div class="form-group"><label>CEP</label><input class="form-control" id="emp_cep" value="${escape(e.cep||'')}" placeholder="00000-000"></div>
      <div class="form-group"><label>Cidade</label><input class="form-control" id="emp_cidade" value="${escape(e.cidade||'')}"></div>
      <div class="form-group"><label>UF</label><input class="form-control" id="emp_uf" value="${escape(e.uf||'')}" maxlength="2" style="text-transform:uppercase;"></div>
      <div class="form-group"><label>Telefone</label><input class="form-control" id="emp_telefone" value="${escape(e.telefone||'')}" placeholder="(00) 00000-0000"></div>
    </div>
    <div class="form-row-4">
      <div class="form-group"><label>Email</label><input class="form-control" id="emp_email" value="${escape(e.email||'')}" type="email"></div>
      <div class="form-group"><label></label><div></div></div>
      <div class="form-group"><label></label><div></div></div>
      <div class="form-group"><label></label><div></div></div>
    </div>

    <!-- LOGO -->
    <div class="card-title" style="margin-top:16px;">Logotipo</div>
    <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
      <div style="width:180px;height:180px;border:2px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fafafa;position:relative;" id="logoPreviewWrap">
        ${e.logotipo
          ? `<img src="${escape(e.logotipo)}" style="max-width:100%;max-height:100%;object-fit:contain;" id="logoPreview">`
          : `<span style="color:var(--text-light);font-size:12px;" id="logoPlaceholder">Sem logo</span>`
        }
      </div>
      <div style="flex:1;">
        <div class="form-group">
          <label>Selecionar imagem</label>
          <input type="file" class="form-control" id="emp_logo_input" accept="image/png,image/jpeg,image/webp" style="padding:6px;">
        </div>
        <p style="font-size:11px;color:var(--text-light);">Formatos: PNG, JPG, WEBP. Tamanho max: 2MB.</p>
        <div id="logoInfo" style="font-size:12px;margin-top:4px;"></div>
        ${e.logotipo ? `<button class="btn btn-danger btn-sm" onclick="removerLogo()" style="margin-top:8px;">Remover Logo</button>` : ''}
      </div>
    </div>

    <div class="form-actions" style="margin-top:16px;">
      <button class="btn btn-primary" onclick="salvarEmitente()">Salvar</button>
    </div>
  </div>`;
}

function renderEmpresaFormCached() {
  const el = document.getElementById('confContent');
  if (el) {
    // Re-renderiza buscando dados atuais
    API.get('/emitente').then(r => {
      el.innerHTML = renderEmpresaForm(r.data || {});
    });
  }
}

// ============================================================================
// BACKUP - Config
// ============================================================================

async function renderBackupTab() {
  const res = await API.get('/backup/config');
  const bc = res.data;
  window._backupConfig = bc;

  const horarios = Array.isArray(bc.horarios) ? bc.horarios : ['09:00','13:00','18:00'];

  let html = `
  <div class="card">
    <div class="card-title">Agendamento de Backup</div>
    <div id="backupAlert"></div>
    <div class="form-group">
      <label>Ativo</label>
      <select class="form-control" id="backupAtivo" style="width:auto;">
        <option value="true" ${bc.ativo ? 'selected' : ''}>Sim</option>
        <option value="false" ${!bc.ativo ? 'selected' : ''}>Nao</option>
      </select>
    </div>
    <div class="form-group">
      <label>Caminho de destino</label>
      <input class="form-control" id="backupCaminho" value="${escape(bc.caminho_destino)}" placeholder="Ex: C:\\Stdistribuidora\\backups">
      <span style="font-size:11px;color:var(--muted);">Pasta onde os arquivos .sql serao salvos</span>
    </div>
    <div class="form-group">
      <label>Horarios agendados</label>
      <div id="backupHorarios">`;

  horarios.forEach((h, i) => {
    html += `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
        <input class="form-control" type="time" id="backupHora${i}" value="${h}" style="width:auto;">
        <button class="btn btn-danger btn-sm" onclick="removerHorarioBackup(${i})" ${horarios.length <= 1 ? 'disabled' : ''}>&times;</button>
      </div>`;
  });

  html += `
      </div>
      <button class="btn btn-outline btn-sm" onclick="adicionarHorarioBackup()" style="margin-top:4px;">+ Adicionar horario</button>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Manter ultimos</label><input class="form-control" id="backupMax" type="number" value="${bc.max_backups}" min="1" max="50" style="width:100px;"></div>
      <div class="form-group"><label>Ultimo backup</label><input class="form-control" value="${bc.ultimo_backup ? fmtDate(bc.ultimo_backup) : 'Nunca'}" readonly style="background:var(--bg);"></div>
      <div class="form-group"><label>Status</label><input class="form-control" value="${bc.ultimo_status || '-'}" readonly style="background:var(--bg);"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="salvarBackupConfig()">Salvar Configuracao</button>
      <button class="btn btn-success" onclick="executarBackupAgora()">Realizar Backup Agora</button>
    </div>
  </div>

  <div class="card">
    <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
      <span>Backups Realizados</span>
      <button class="btn btn-outline btn-sm" onclick="renderBackupLista()">Atualizar</button>
    </div>
    <div id="backupLista"><p class="empty" style="padding:20px;">Carregando...</p></div>
  </div>`;

  document.getElementById('confContent').innerHTML = html;
  renderBackupLista();
}

window._backupHoraCount = null;

window.adicionarHorarioBackup = function() {
  const container = document.getElementById('backupHorarios');
  const i = container.children.length;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:4px;';
  div.innerHTML = '<input class="form-control" type="time" id="backupHora' + i + '" value="12:00" style="width:auto;"><button class="btn btn-danger btn-sm" onclick="removerHorarioBackup(' + i + ')">&times;</button>';
  container.appendChild(div);
};

window.removerHorarioBackup = function(i) {
  const el = document.getElementById('backupHora' + i)?.closest('div');
  if (el) el.remove();
};

window.salvarBackupConfig = async function() {
  const horarios = [];
  document.querySelectorAll('#backupHorarios input[type=time]').forEach(input => {
    if (input.value) horarios.push(input.value);
  });
  if (!horarios.length) { toast('Adicione pelo menos 1 horario', 'warning'); return; }

  const body = {
    horarios,
    caminho_destino: document.getElementById('backupCaminho').value.trim(),
    max_backups: parseInt(document.getElementById('backupMax').value) || 10,
    ativo: document.getElementById('backupAtivo').value === 'true'
  };
  try {
    await API.put('/backup/config', body);
    document.getElementById('backupAlert').innerHTML = alertBox('success', 'Configuracao salva!');
  } catch (e) { document.getElementById('backupAlert').innerHTML = alertBox('danger', 'Erro: ' + e.message); }
};

window.executarBackupAgora = async function() {
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Realizando...'; }
  try {
    const res = await API.post('/backup/executar');
    document.getElementById('backupAlert').innerHTML = alertBox('success', res.message);
    renderBackupLista();
  } catch (e) {
    document.getElementById('backupAlert').innerHTML = alertBox('danger', 'Erro: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Realizar Backup Agora'; }
};

async function renderBackupLista() {
  const container = document.getElementById('backupLista');
  if (!container) return;
  try {
    const res = await API.get('/backup/listar');
    const files = res.data;
    if (!files.length) {
      container.innerHTML = '<p class="empty" style="padding:20px;">Nenhum backup realizado</p>';
      return;
    }
    let html = '<div class="table-wrap"><table><tr><th>Arquivo</th><th>Data</th><th>Tamanho</th></tr>';
    files.forEach(f => {
      const size = f.tamanho > 1024 ? (f.tamanho / 1024).toFixed(1) + ' KB' : f.tamanho + ' B';
      if (size > 1024 * 1024) (size / 1024).toFixed(1) + ' MB';
      html += '<tr><td>' + escape(f.nome) + '</td><td>' + fmtDate(f.data) + '</td><td>' + size + '</td></tr>';
    });
    html += '</table></div>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<p class="empty" style="padding:20px;">Erro ao carregar: ' + escape(e.message) + '</p>';
  }
}

window.buscarCNPJEmpresa = async function() {
  const cnpj = $('emp_cnpj').value.replace(/\D/g, '');
  if (cnpj.length !== 14) { toast('CNPJ deve ter 14 digitos', 'warning'); return; }
  try {
    const res = await API.get(`/cnpj/${cnpj}`);
    const d = res.data;
    $('emp_razao').value = d.razao_social || '';
    $('emp_fantasia').value = d.nome_fantasia || '';
    $('emp_logradouro').value = d.logradouro || '';
    $('emp_numero').value = d.numero || '';
    $('emp_complemento').value = d.complemento || '';
    $('emp_bairro').value = d.bairro || '';
    $('emp_cidade').value = d.cidade || '';
    $('emp_uf').value = (d.uf || '').toUpperCase();
    $('emp_cep').value = d.cep || '';
    if (d.telefone) $('emp_telefone').value = d.telefone;
    if (d.email) $('emp_email').value = d.email;
    toast('Dados preenchidos automaticamente da Receita Federal!', 'success');
  } catch (e) { toast('Erro ao buscar CNPJ: ' + e.message, 'danger'); }
};

let _logoBase64 = null;

document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'emp_logo_input') {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      $('logoInfo').innerHTML = '<span style="color:var(--danger);">Arquivo muito grande. Maximo 2MB.</span>';
      e.target.value = '';
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      $('logoInfo').innerHTML = '<span style="color:var(--danger);">Formato invalido. Use PNG, JPG ou WEBP.</span>';
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
      _logoBase64 = ev.target.result;
      const wrap = $('logoPreviewWrap');
      wrap.innerHTML = `<img src="${_logoBase64}" style="max-width:100%;max-height:100%;object-fit:contain;" id="logoPreview">`;
      $('logoInfo').innerHTML = `<span style="color:var(--success);">Logo carregada: ${file.name} (${(file.size/1024).toFixed(0)}KB)</span>`;
    };
    reader.readAsDataURL(file);
  }
});

window.removerLogo = function() {
  _logoBase64 = '__REMOVED__';
  const wrap = $('logoPreviewWrap');
  wrap.innerHTML = '<span style="color:var(--text-light);font-size:12px;" id="logoPlaceholder">Sem logo</span>';
  $('logoInfo').innerHTML = '<span style="color:var(--text-light);">Logo removida. Salve para confirmar.</span>';
  const input = $('emp_logo_input');
  if (input) input.value = '';
};

window.salvarEmitente = async function() {
  const previewImg = document.querySelector('#logoPreviewWrap img');
  let logotipo = previewImg ? previewImg.getAttribute('src') : null;

  if (_logoBase64 === '__REMOVED__') {
    logotipo = '';
  } else if (_logoBase64 !== null) {
    logotipo = _logoBase64;
  }

  const body = {
    cnpj: $('emp_cnpj').value,
    razao_social: $('emp_razao').value,
    nome_fantasia: $('emp_fantasia').value,
    logradouro: $('emp_logradouro').value,
    numero: $('emp_numero').value,
    complemento: $('emp_complemento').value,
    bairro: $('emp_bairro').value,
    cep: $('emp_cep').value,
    cidade: $('emp_cidade').value,
    uf: $('emp_uf').value,
    telefone: $('emp_telefone').value,
    email: $('emp_email').value,
    logotipo: logotipo
  };

  // If no logo was ever set and user didn't select one, don't send the field
  if (logotipo === null) delete body.logotipo;

  if (!body.cnpj || !body.razao_social) {
    $('formAlert').innerHTML = alertBox('danger', 'CNPJ e Razao Social sao obrigatorios');
    return;
  }

  try {
    await API.put('/emitente', body);
    _logoBase64 = null;
    $('formAlert').innerHTML = alertBox('success', 'Dados salvos com sucesso!');
  } catch (e) { $('formAlert').innerHTML = alertBox('danger', 'Erro: ' + e.message); }
};

// ============================================================================
// MODAL
// ============================================================================

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Close sidebar on nav click (mobile)
document.addEventListener('click', function(e) {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target.id !== 'sidebarToggle') {
    sidebar.classList.remove('open');
  }
});

document.querySelectorAll('.sidebar-nav a').forEach(a => {
  a.addEventListener('click', () => {
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
  });
});

function openModal(htmlContent) {
  $('modalContent').innerHTML = htmlContent;
  $('modalOverlay').classList.add('open');
}

// ============================================================================
// GALERIA DE FOTOS
// ============================================================================

window._osDetailId = null;

window.abrirGaleria = async function(osId) {
  window._osDetailId = osId;
  window._onModalClose = function() {
    renderOrdemDetail(osId);
  };
  const res = await API.get(`/ordens/${osId}/fotos`);
  const fotos = res.data;
  renderGaleria(osId, fotos);
};

function renderGaleria(osId, fotos) {
  let html = `
  <div class="galeria-header">
    <h3>Fotos do Equipamento</h3>
    <span>${fotos.length}/5</span>
  </div>
  <div class="galeria-grid">`;

  if (fotos.length === 0) {
    html += `<div class="galeria-empty">Nenhuma foto ainda</div>`;
  } else {
    fotos.forEach(f => {
      html += `
      <div class="galeria-item">
        <img src="${escape(f.foto)}" onclick="abrirFoto('${escape(f.foto)}')">
        <button class="galeria-remover" onclick="removerFoto(${osId}, ${f.id})">&times;</button>
      </div>`;
    });
  }

  if (fotos.length < 5) {
    html += `
    <div class="galeria-adicionar" onclick="document.getElementById('fotoInput').click()">
      <span class="galeria-plus">+</span>
      <span>Adicionar Foto</span>
    </div>`;
  }

  html += `</div>
  <input type="file" id="fotoInput" accept="image/*" capture="environment" style="display:none" onchange="uploadFoto(${osId}, this)">
  <div style="margin-top:12px;text-align:center;color:var(--muted);font-size:12px;">
    Toque para capturar ou selecionar foto
  </div>`;

  openModal(html);
}

window.uploadFoto = async function(osId, input) {
  const file = input.files[0];
  if (!file) return;

  // Redimensiona para no max 1200px pra nao sobrecarregar o DB
  const b64 = await resizeImage(file, 1200);

  try {
    await API.post(`/ordens/${osId}/fotos`, { foto: b64 });
    input.value = '';
    abrirGaleria(osId);
  } catch (e) {
    toast('Erro ao salvar foto: ' + e.message, 'danger');
  }
};

window.removerFoto = async function(osId, fotoId) {
  if (!confirm('Remover esta foto?')) return;
  try {
    await API.del(`/ordens/${osId}/fotos/${fotoId}`);
    abrirGaleria(osId);
  } catch (e) {
    toast('Erro ao remover foto: ' + e.message, 'danger');
  }
};

window.abrirFoto = function(src) {
  openModal(`<div style="text-align:center;">
    <img src="${escape(src)}" style="max-width:100%;max-height:80vh;border-radius:8px;">
    <div style="margin-top:12px;"><button class="btn btn-outline" onclick="closeModal()">Fechar</button></div>
  </div>`);
};

function resizeImage(file, maxDim) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w *= ratio; h *= ratio;
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function closeModal() {
  $('modalOverlay').classList.remove('open');
  if (window._onModalClose) {
    const cb = window._onModalClose;
    window._onModalClose = null;
    cb();
  }
}

// Close modal on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ============================================================================
// CADASTROS - UNIDADES DE MEDIDA
// ============================================================================

async function renderUnidadesMedida() {
  setTitle('Unidades de Medida');
  topbarActions.innerHTML = `<button class="btn btn-primary" onclick="showModalUnidade()">+ Nova Unidade</button>`;

  const res = await API.get('/unidades-medida');
  const dados = res.data;

  let html = `
  <div class="search-bar">
    <input class="form-control" placeholder="Buscar unidade..." id="searchUnidade" onkeyup="buscarUnidades()">
  </div>
  <div class="card"><div class="table-wrap"><table>
    <tr><th>Sigla</th><th>Descricao</th><th>Acoes</th></tr>`;

  if (!dados.length) {
    html += `<tr><td colspan="3"><div class="empty"><p>Nenhuma unidade cadastrada</p></div></td></tr>`;
  } else {
    dados.forEach(d => {
      html += `<tr>
        <td><strong>${escape(d.sigla)}</strong></td>
        <td>${escape(d.descricao)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="showModalUnidade(${d.id},'${escape(d.sigla)}','${escape(d.descricao)}')">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="excluirUnidade(${d.id})">Excluir</button>
        </td>
      </tr>`;
    });
  }

  html += `</table></div></div>`;
  contentBody.innerHTML = html;
}

window.buscarUnidades = async function() {
  const q = document.getElementById('searchUnidade')?.value || '';
  const res = await API.get('/unidades-medida?q=' + encodeURIComponent(q));
  const dados = res.data;
  const tbody = document.querySelector('#contentBody table tbody') || document.querySelector('#contentBody tbody');
  if (!tbody) { renderUnidadesMedida(); return; }

  let html = '';
  if (!dados.length) {
    html = `<tr><td colspan="3"><div class="empty"><p>Nenhuma unidade encontrada</p></div></td></tr>`;
  } else {
    dados.forEach(d => {
      html += `<tr>
        <td><strong>${escape(d.sigla)}</strong></td>
        <td>${escape(d.descricao)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="showModalUnidade(${d.id},'${escape(d.sigla)}','${escape(d.descricao)}')">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="excluirUnidade(${d.id})">Excluir</button>
        </td>
      </tr>`;
    });
  }
  tbody.innerHTML = html;
};

window.showModalUnidade = function(id, sigla, descricao) {
  const edit = !!id;
  openModal(`
    <h3>${edit ? 'Editar' : 'Nova'} Unidade de Medida</h3>
    <div class="form-group"><label>Sigla *</label><input class="form-control" id="unid_sigla" value="${escape(sigla||'')}" placeholder="EX: UN, CX, KT" style="text-transform:uppercase;" maxlength="10" autofocus></div>
    <div class="form-group"><label>Descricao *</label><input class="form-control" id="unid_desc" value="${escape(descricao||'')}" placeholder="Ex: Unidade, Caixa, Kit"></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="salvarUnidade(${id||'null'})">${edit ? 'Atualizar' : 'Salvar'}</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    </div>
  `);
  setTimeout(() => document.getElementById('unid_sigla')?.focus(), 100);
};

window.salvarUnidade = async function(id) {
  const sigla = document.getElementById('unid_sigla').value.trim();
  const descricao = document.getElementById('unid_desc').value.trim();
  if (!sigla || !descricao) { toast('Preencha sigla e descricao', 'warning'); return; }
  try {
    if (id) { await API.put('/unidades-medida/' + id, { sigla, descricao }); }
    else { await API.post('/unidades-medida', { sigla, descricao }); }
    closeModal();
    renderUnidadesMedida();
  } catch (e) { toast(e.message, 'danger'); }
};

window.excluirUnidade = async function(id) {
  if (!confirm('Excluir esta unidade de medida?')) return;
  try {
    await API.del('/unidades-medida/' + id);
    renderUnidadesMedida();
  } catch (e) { toast(e.message, 'danger'); }
};

// ============================================================================
// CADASTROS - GRUPOS / CATEGORIAS
// ============================================================================

async function renderGruposProdutos() {
  setTitle('Grupos / Categorias');
  topbarActions.innerHTML = `<button class="btn btn-primary" onclick="showModalGrupo()">+ Novo Grupo</button>`;

  const res = await API.get('/grupos-produtos');
  const dados = res.data;

  let html = `
  <div class="search-bar">
    <input class="form-control" placeholder="Buscar grupo..." id="searchGrupo" onkeyup="buscarGrupos()">
  </div>
  <div class="card"><div class="table-wrap"><table>
    <tr><th>Nome do Grupo</th><th>Status</th><th>Acoes</th></tr>`;

  if (!dados.length) {
    html += `<tr><td colspan="3"><div class="empty"><p>Nenhum grupo cadastrado</p></div></td></tr>`;
  } else {
    dados.forEach(d => {
      html += `<tr>
        <td><strong>${escape(d.nome)}</strong></td>
        <td>${badge(d.status)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="showModalGrupo(${d.id},'${escape(d.nome)}')">Editar</button>
          ${d.status === 'Ativo'
            ? `<button class="btn btn-warning btn-sm" onclick="inativarGrupo(${d.id})">Inativar</button>`
            : `<button class="btn btn-success btn-sm" onclick="reativarGrupo(${d.id})">Reativar</button>`
          }
        </td>
      </tr>`;
    });
  }

  html += `</table></div></div>`;
  contentBody.innerHTML = html;
}

window.buscarGrupos = async function() {
  const q = document.getElementById('searchGrupo')?.value || '';
  const res = await API.get('/grupos-produtos?q=' + encodeURIComponent(q));
  const dados = res.data;
  const tbody = document.querySelector('#contentBody table tbody');
  if (!tbody) { renderGruposProdutos(); return; }
  let html = '';
  if (!dados.length) {
    html = `<tr><td colspan="3"><div class="empty"><p>Nenhum grupo encontrado</p></div></td></tr>`;
  } else {
    dados.forEach(d => {
      html += `<tr>
        <td><strong>${escape(d.nome)}</strong></td>
        <td>${badge(d.status)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="showModalGrupo(${d.id},'${escape(d.nome)}')">Editar</button>
          ${d.status === 'Ativo'
            ? `<button class="btn btn-warning btn-sm" onclick="inativarGrupo(${d.id})">Inativar</button>`
            : `<button class="btn btn-success btn-sm" onclick="reativarGrupo(${d.id})">Reativar</button>`
          }
        </td>
      </tr>`;
    });
  }
  tbody.innerHTML = html;
};

window.showModalGrupo = function(id, nome) {
  const edit = !!id;
  openModal(`
    <h3>${edit ? 'Editar' : 'Novo'} Grupo</h3>
    <div class="form-group"><label>Nome do Grupo *</label><input class="form-control" id="grupo_nome" value="${escape(nome||'')}" placeholder="Ex: Armazenamento, Perifericos" autofocus></div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="salvarGrupo(${id||'null'})">${edit ? 'Atualizar' : 'Salvar'}</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    </div>
  `);
  setTimeout(() => document.getElementById('grupo_nome')?.focus(), 100);
};

window.salvarGrupo = async function(id) {
  const nome = document.getElementById('grupo_nome').value.trim();
  if (!nome) { toast('Preencha o nome do grupo', 'warning'); return; }
  try {
    if (id) { await API.put('/grupos-produtos/' + id, { nome }); }
    else { await API.post('/grupos-produtos', { nome }); }
    closeModal();
    renderGruposProdutos();
  } catch (e) { toast(e.message, 'danger'); }
};

window.inativarGrupo = async function(id) {
  if (!confirm('Inativar este grupo?')) return;
  try { await API.patch('/grupos-produtos/' + id + '/inativar'); renderGruposProdutos(); }
  catch (e) { toast(e.message, 'danger'); }
};

window.reativarGrupo = async function(id) {
  try { await API.patch('/grupos-produtos/' + id + '/reativar'); renderGruposProdutos(); }
  catch (e) { toast(e.message, 'danger'); }
};

// ============================================================================
// CADASTROS - PRODUTOS
// ============================================================================

async function renderProdutos() {
  setTitle('Produtos');
  topbarActions.innerHTML = `<button class="btn btn-primary" onclick="showModalProduto()">+ Novo Produto</button>`;

  const [res, grupos, unidades] = await Promise.all([
    API.get('/produtos'),
    API.get('/grupos-produtos'),
    API.get('/unidades-medida')
  ]);
  const dados = res.data;

  let html = `
  <div class="search-bar">
    <input class="form-control" placeholder="Buscar produto ou codigo de barras..." id="searchProduto" onkeyup="buscarProdutos()">
  </div>
  <div class="card"><div class="table-wrap"><table>
    <tr><th>Descricao</th><th>Grupo</th><th>Preco Venda</th><th>Estoque</th><th>Status</th><th>Acoes</th></tr>`;

  if (!dados.length) {
    html += `<tr><td colspan="6"><div class="empty"><p>Nenhum produto cadastrado</p></div></td></tr>`;
  } else {
    dados.forEach(d => {
      const alerta = d.estoque_atual <= d.estoque_minimo ? ' style="color:var(--danger);font-weight:bold;"' : '';
      html += `<tr>
        <td><strong>${escape(d.descricao)}</strong><br><span style="font-size:11px;color:var(--muted);">${escape(d.codigo_barras||'')}</span></td>
        <td>${escape(d.grupo_nome||'-')}</td>
        <td><strong>R$ ${(+d.preco_venda).toFixed(2)}</strong></td>
        <td${alerta}>${d.estoque_atual} / ${d.estoque_minimo}</td>
        <td>${badge(d.status)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="showModalProduto(${d.id})">Editar</button>
          ${d.status === 'Ativo'
            ? `<button class="btn btn-warning btn-sm" onclick="inativarProduto(${d.id})">Inativar</button>`
            : `<button class="btn btn-success btn-sm" onclick="reativarProduto(${d.id})">Reativar</button>`
          }
        </td>
      </tr>`;
    });
  }

  html += `</table></div></div>`;
  contentBody.innerHTML = html;
}

window.buscarProdutos = async function() {
  const q = document.getElementById('searchProduto')?.value || '';
  const res = await API.get('/produtos?q=' + encodeURIComponent(q));
  const dados = res.data;
  const tbody = document.querySelector('#contentBody table tbody');
  if (!tbody) { renderProdutos(); return; }
  let html = '';
  if (!dados.length) {
    html = `<tr><td colspan="6"><div class="empty"><p>Nenhum produto encontrado</p></div></td></tr>`;
  } else {
    dados.forEach(d => {
      const alerta = d.estoque_atual <= d.estoque_minimo ? ' style="color:var(--danger);font-weight:bold;"' : '';
      html += `<tr>
        <td><strong>${escape(d.descricao)}</strong><br><span style="font-size:11px;color:var(--muted);">${escape(d.codigo_barras||'')}</span></td>
        <td>${escape(d.grupo_nome||'-')}</td>
        <td><strong>R$ ${(+d.preco_venda).toFixed(2)}</strong></td>
        <td${alerta}>${d.estoque_atual} / ${d.estoque_minimo}</td>
        <td>${badge(d.status)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="showModalProduto(${d.id})">Editar</button>
          ${d.status === 'Ativo'
            ? `<button class="btn btn-warning btn-sm" onclick="inativarProduto(${d.id})">Inativar</button>`
            : `<button class="btn btn-success btn-sm" onclick="reativarProduto(${d.id})">Reativar</button>`
          }
        </td>
      </tr>`;
    });
  }
  tbody.innerHTML = html;
};

window.showModalProduto = async function(id) {
  let p = { descricao: '', codigo_barras: '', grupo_id: '', unidade_medida_id: '', preco_custo: 0, margem_lucro: 0, preco_venda: 0, estoque_atual: 0, estoque_minimo: 0, ncm: '', cest: '' };
  if (id) {
    const r = await API.get('/produtos/' + id);
    p = r.data;
  }

  const [grupos, unidades] = await Promise.all([
    API.get('/grupos-produtos'),
    API.get('/unidades-medida')
  ]);

  computePrecoVenda(p);

  openModal(`
    <h3>${id ? 'Editar' : 'Novo'} Produto</h3>
    <div class="form-row">
      <div class="form-group"><label>Codigo de Barras</label><input class="form-control" id="prod_codigo" value="${escape(p.codigo_barras||'')}" placeholder="EAN-13" onkeyup="if(event.key==='Enter')document.getElementById('prod_descricao').focus()"></div>
      <div class="form-group"><label>NCM</label><input class="form-control" id="prod_ncm" value="${escape(p.ncm||'')}" placeholder="0000.00.00" maxlength="10"></div>
    </div>
    <div class="form-group"><label>Descricao *</label><input class="form-control" id="prod_descricao" value="${escape(p.descricao)}" placeholder="Ex: SSD 240GB Kingston SATA3" autofocus></div>
    <div class="form-row">
      <div class="form-group"><label>Grupo</label><select class="form-control" id="prod_grupo"><option value="">Selecione...</option>${
        grupos.data.map(g => `<option value="${g.id}" ${p.grupo_id==g.id?'selected':''}>${escape(g.nome)}</option>`).join('')
      }</select></div>
      <div class="form-group"><label>Unidade</label><select class="form-control" id="prod_unidade"><option value="">Selecione...</option>${
        unidades.data.map(u => `<option value="${u.id}" ${p.unidade_medida_id==u.id?'selected':''}>${escape(u.sigla)} - ${escape(u.descricao)}</option>`).join('')
      }</select></div>
      <div class="form-group"><label>CEST</label><input class="form-control" id="prod_cest" value="${escape(p.cest||'')}" placeholder="00.000.00" maxlength="10"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Preco Custo (R$)</label><input class="form-control" id="prod_custo" value="${(+p.preco_custo).toFixed(2)}" oninput="calcPrecoVenda()" onblur="fmtMoeda(this)"></div>
      <div class="form-group"><label>Margem Lucro (%)</label><input class="form-control" id="prod_margem" value="${(+p.margem_lucro).toFixed(2)}" oninput="calcPrecoVenda()" onblur="fmtPorcentagem(this)"></div>
      <div class="form-group"><label>Preco Venda (R$)</label><input class="form-control" id="prod_venda" value="${(+p.preco_venda).toFixed(2)}" oninput="calcMargem()" onblur="fmtMoeda(this)"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Estoque Atual</label><input class="form-control" id="prod_estoque" type="number" step="0.01" value="${p.estoque_atual}"></div>
      <div class="form-group"><label>Estoque Minimo</label><input class="form-control" id="prod_estoque_min" type="number" step="0.01" value="${p.estoque_minimo}"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="salvarProduto(${id||'null'})">${id ? 'Atualizar' : 'Salvar'}</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    </div>
  `);
  setTimeout(() => document.getElementById('prod_descricao')?.focus(), 100);
};

function computePrecoVenda(p) {
  if (+p.preco_custo > 0 && +p.margem_lucro > 0 && !p._manualVenda) {
    p.preco_venda = +p.preco_custo * (1 + (+p.margem_lucro / 100));
  }
}

window.calcPrecoVenda = function() {
  const custo = parseFloat(document.getElementById('prod_custo').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0;
  const margem = parseFloat(document.getElementById('prod_margem').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0;
  if (custo > 0 && margem > 0) {
    const venda = custo * (1 + margem / 100);
    document.getElementById('prod_venda').value = venda.toFixed(2);
  }
};

window.calcMargem = function() {
  const custo = parseFloat(document.getElementById('prod_custo').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0;
  const venda = parseFloat(document.getElementById('prod_venda').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0;
  if (custo > 0 && venda > 0) {
    const margem = ((venda / custo) - 1) * 100;
    document.getElementById('prod_margem').value = margem.toFixed(2);
  }
};

window.fmtMoeda = function(el) {
  const v = parseFloat(el.value.replace(/[^\d.,]/g,'').replace(',','.')) || 0;
  el.value = v.toFixed(2);
};

window.fmtPorcentagem = function(el) {
  const v = parseFloat(el.value.replace(/[^\d.,]/g,'').replace(',','.')) || 0;
  el.value = v.toFixed(2);
};

window.salvarProduto = async function(id) {
  const body = {
    descricao: document.getElementById('prod_descricao').value.trim(),
    codigo_barras: document.getElementById('prod_codigo').value.trim() || null,
    grupo_id: document.getElementById('prod_grupo').value || null,
    unidade_medida_id: document.getElementById('prod_unidade').value || null,
    preco_custo: parseFloat(document.getElementById('prod_custo').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0,
    margem_lucro: parseFloat(document.getElementById('prod_margem').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0,
    preco_venda: parseFloat(document.getElementById('prod_venda').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0,
    estoque_atual: parseFloat(document.getElementById('prod_estoque').value) || 0,
    estoque_minimo: parseFloat(document.getElementById('prod_estoque_min').value) || 0,
    ncm: document.getElementById('prod_ncm').value.trim() || null,
    cest: document.getElementById('prod_cest').value.trim() || null
  };
  if (!body.descricao) { toast('Descricao obrigatoria', 'warning'); return; }
  try {
    if (id) { await API.put('/produtos/' + id, body); }
    else { await API.post('/produtos', body); }
    closeModal();
    renderProdutos();
  } catch (e) { toast(e.message, 'danger'); }
};

window.inativarProduto = async function(id) {
  if (!confirm('Inativar este produto?')) return;
  try { await API.patch('/produtos/' + id + '/inativar'); renderProdutos(); }
  catch (e) { toast(e.message, 'danger'); }
};

window.reativarProduto = async function(id) {
  try { await API.patch('/produtos/' + id + '/reativar'); renderProdutos(); }
  catch (e) { toast(e.message, 'danger'); }
};

// ============================================================================
// CADASTROS - SERVICOS
// ============================================================================

async function renderServicos() {
  setTitle('Servicos');
  topbarActions.innerHTML = `<button class="btn btn-primary" onclick="showModalServico()">+ Novo Servico</button>`;

  const res = await API.get('/servicos');
  const dados = res.data;

  let html = `
  <div class="search-bar">
    <input class="form-control" placeholder="Buscar servico..." id="searchServico" onkeyup="buscarServicos()">
  </div>
  <div class="card"><div class="table-wrap"><table>
    <tr><th>Servico</th><th>Valor</th><th>Comissao</th><th>Tempo Est.</th><th>Status</th><th>Acoes</th></tr>`;

  if (!dados.length) {
    html += `<tr><td colspan="6"><div class="empty"><p>Nenhum servico cadastrado</p></div></td></tr>`;
  } else {
    dados.forEach(d => {
      html += `<tr>
        <td><strong>${escape(d.nome_servico)}</strong></td>
        <td>R$ ${(+d.valor_servico).toFixed(2)}</td>
        <td>${(+d.comissao_tecnico).toFixed(2)}%</td>
        <td>${escape(d.tempo_estimado||'-')}</td>
        <td>${badge(d.status)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="showModalServico(${d.id})">Editar</button>
          ${d.status === 'Ativo'
            ? `<button class="btn btn-warning btn-sm" onclick="inativarServico(${d.id})">Inativar</button>`
            : `<button class="btn btn-success btn-sm" onclick="reativarServico(${d.id})">Reativar</button>`
          }
        </td>
      </tr>`;
    });
  }

  html += `</table></div></div>`;
  contentBody.innerHTML = html;
}

window.buscarServicos = async function() {
  const q = document.getElementById('searchServico')?.value || '';
  const res = await API.get('/servicos?q=' + encodeURIComponent(q));
  const dados = res.data;
  const tbody = document.querySelector('#contentBody table tbody');
  if (!tbody) { renderServicos(); return; }
  let html = '';
  if (!dados.length) {
    html = `<tr><td colspan="6"><div class="empty"><p>Nenhum servico encontrado</p></div></td></tr>`;
  } else {
    dados.forEach(d => {
      html += `<tr>
        <td><strong>${escape(d.nome_servico)}</strong></td>
        <td>R$ ${(+d.valor_servico).toFixed(2)}</td>
        <td>${(+d.comissao_tecnico).toFixed(2)}%</td>
        <td>${escape(d.tempo_estimado||'-')}</td>
        <td>${badge(d.status)}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" onclick="showModalServico(${d.id})">Editar</button>
          ${d.status === 'Ativo'
            ? `<button class="btn btn-warning btn-sm" onclick="inativarServico(${d.id})">Inativar</button>`
            : `<button class="btn btn-success btn-sm" onclick="reativarServico(${d.id})">Reativar</button>`
          }
        </td>
      </tr>`;
    });
  }
  tbody.innerHTML = html;
};

window.showModalServico = function(id) {
  if (id) {
    API.get('/servicos/' + id).then(r => renderServicoForm(r.data));
  } else {
    renderServicoForm({ nome_servico: '', valor_servico: 0, comissao_tecnico: 0, tempo_estimado: '' });
  }
};

function renderServicoForm(s) {
  const edit = !!s.id;
  openModal(`
    <h3>${edit ? 'Editar' : 'Novo'} Servico</h3>
    <div class="form-group"><label>Nome do Servico *</label><input class="form-control" id="serv_nome" value="${escape(s.nome_servico)}" placeholder="Ex: Formatacao com Backup" autofocus></div>
    <div class="form-row">
      <div class="form-group"><label>Valor (R$)</label><input class="form-control" id="serv_valor" value="${(+s.valor_servico).toFixed(2)}" onblur="fmtMoeda(this)"></div>
      <div class="form-group"><label>Comissao Tecnico (%)</label><input class="form-control" id="serv_comissao" value="${(+s.comissao_tecnico).toFixed(2)}" placeholder="0 = sem comissao" onblur="fmtPorcentagem(this)"></div>
      <div class="form-group"><label>Tempo Estimado</label><input class="form-control" id="serv_tempo" value="${escape(s.tempo_estimado||'')}" placeholder="Ex: 02:00 horas"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="salvarServico(${edit ? s.id : 'null'})">${edit ? 'Atualizar' : 'Salvar'}</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    </div>
  `);
  setTimeout(() => document.getElementById('serv_nome')?.focus(), 100);
}

window.salvarServico = async function(id) {
  const body = {
    nome_servico: document.getElementById('serv_nome').value.trim(),
    valor_servico: parseFloat(document.getElementById('serv_valor').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0,
    comissao_tecnico: parseFloat(document.getElementById('serv_comissao').value.replace(/[^\d.,]/g,'').replace(',','.')) || 0,
    tempo_estimado: document.getElementById('serv_tempo').value.trim() || null
  };
  if (!body.nome_servico) { toast('Nome do servico obrigatorio', 'warning'); return; }
  try {
    if (id) { await API.put('/servicos/' + id, body); }
    else { await API.post('/servicos', body); }
    closeModal();
    renderServicos();
  } catch (e) { toast(e.message, 'danger'); }
};

window.inativarServico = async function(id) {
  if (!confirm('Inativar este servico?')) return;
  try { await API.patch('/servicos/' + id + '/inativar'); toast('Servico inativado', 'success'); renderServicos(); }
  catch (e) { toast(e.message, 'danger'); }
};

window.reativarServico = async function(id) {
  try { await API.patch('/servicos/' + id + '/reativar'); toast('Servico reativado', 'success'); renderServicos(); }
  catch (e) { toast(e.message, 'danger'); }
};

// ============================================================================
// USUARIOS
// ============================================================================

async function renderUsuarios() {
  setTitle('Usuarios');
  let html = `
  <div class="card">
    <div class="card-title">Gerenciar Usuarios</div>
    <div class="toolbar">
      <button class="btn btn-primary" onclick="usuarioForm()">+ Novo Usuario</button>
    </div>
    <table class="table">
      <thead><tr>
        <th>Nome</th>
        <th>Tipo</th>
        <th>Status</th>
        <th>Acoes</th>
      </tr></thead>
      <tbody id="usuariosTbody"></tbody>
    </table>
  </div>`;
  contentBody.innerHTML = html;
  await renderUsuariosList();
}

async function renderUsuariosList() {
  try {
    const res = await API.get('/usuarios');
    const tbody = document.getElementById('usuariosTbody');
    if (!tbody) return;
    if (!res.data.length) {
      tbody.innerHTML = '<tr><td colspan="4"><div class="empty"><p>Nenhum usuario cadastrado</p></div></td></tr>';
      return;
    }
    const tipoLabel = { admin: 'Admin', supervisor: 'Supervisor', operador: 'Operador', tecnico: 'Tecnico', vendedor: 'Vendedor', ambos: 'Tecnico/Vendedor' };
    tbody.innerHTML = res.data.map(u => `
      <tr>
        <td><strong>${escape(u.nome)}</strong></td>
        <td>${tipoLabel[u.tipo] || u.tipo}</td>
        <td>${u.ativo ? badge('Ativo') : badge('Inativo')}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="usuarioForm(${u.id})">Editar</button>
          <button class="btn btn-outline btn-sm" onclick="toggleUsuarioStatus(${u.id}, ${u.ativo})">${u.ativo ? 'Inativar' : 'Reativar'}</button>
          <button class="btn btn-outline btn-sm btn-danger" onclick="deletarUsuario(${u.id})">Excluir</button>
        </td>
      </tr>
    `).join('');
  } catch (e) { toast(e.message, 'danger'); }
}

window.usuarioForm = async function(id) {
  let u = { nome: '', tipo: 'operador' };
  if (id) {
    try {
      const res = await API.get('/usuarios');
      u = res.data.find(x => x.id === id) || u;
    } catch (e) { toast(e.message, 'danger'); return; }
  }
  const tipoLabel = { admin: 'Admin', supervisor: 'Supervisor', operador: 'Operador', tecnico: 'Tecnico', vendedor: 'Vendedor', ambos: 'Tecnico/Vendedor' };
  const tipos = ['operador', 'tecnico', 'vendedor', 'ambos'];
  openModal(`
    <h3>${id ? 'Editar' : 'Novo'} Usuario</h3>
    <div class="form-group">
      <label>Nome *</label>
      <input class="form-control" id="usr_nome" value="${escape(u.nome)}">
    </div>
    <div class="form-group">
      <label>Senha ${id ? '(deixe em branco para manter)' : '*'} </label>
      <input class="form-control" id="usr_senha" type="password">
    </div>
    <div class="form-group">
      <label>Tipo</label>
      <select class="form-control" id="usr_tipo">
        ${tipos.map(t => `<option value="${t}" ${u.tipo === t ? 'selected' : ''}>${tipoLabel[t]}</option>`).join('')}
      </select>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn btn-primary" onclick="salvarUsuario(${id || ''})">Salvar</button>
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
    </div>
  `);
};

window.salvarUsuario = async function(id) {
  const nome = $('usr_nome').value.trim();
  const senha = $('usr_senha').value;
  const tipo = $('usr_tipo').value;
  if (!nome) { toast('Nome obrigatorio', 'warning'); return; }
  if (!id && !senha) { toast('Senha obrigatoria para novo usuario', 'warning'); return; }
  try {
    if (id) {
      const body = { nome, tipo };
      if (senha) body.senha = senha;
      await API.put('/usuarios/' + id, body);
      toast('Usuario atualizado', 'success');
    } else {
      await API.post('/usuarios', { nome, senha, tipo });
      toast('Usuario criado', 'success');
    }
    closeModal();
    renderUsuariosList();
  } catch (e) { toast(e.message, 'danger'); }
};

window.toggleUsuarioStatus = async function(id, ativo) {
  try {
    await API.put('/usuarios/' + id, { ativo: !ativo });
    toast(ativo ? 'Usuario inativado' : 'Usuario reativado', 'success');
    renderUsuariosList();
  } catch (e) { toast(e.message, 'danger'); }
};

window.deletarUsuario = async function(id) {
  if (!confirm('Excluir permanentemente este usuario?')) return;
  try {
    await API.del('/usuarios/' + id);
    toast('Usuario excluido', 'success');
    renderUsuariosList();
  } catch (e) { toast(e.message, 'danger'); }
};

// ============================================================================
// PRINT PAGE
// ============================================================================

// The print template is a separate HTML file, but we serve it dynamically
// via /print/os.html route

// ============================================================================
// INIT
// ============================================================================

// Show user info
const userInfo = $('userInfo');
if (userInfo && currentUser) {
  const nivelLabel = { admin: 'Admin', supervisor: 'Supervisor', operador: 'Operador' };
  userInfo.innerHTML = `<span class="user-badge">${escape(currentUser.nome)}</span>`;
}

navigate('dashboard');
