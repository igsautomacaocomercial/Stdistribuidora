const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/os.html', async (req, res) => {
  try {
    const id = parseInt(req.query.id);
    if (!id) return res.status(400).send('<h1>ID da OS nao informado</h1>');

    const [osRes, itensRes, checklistRes, emitRes] = await Promise.all([
      db.query('SELECT * FROM vw_os_detalhada WHERE id=$1', [id]),
      db.query('SELECT * FROM os_itens WHERE os_id=$1 ORDER BY id', [id]),
      db.query('SELECT * FROM checklists WHERE os_id=$1', [id]),
      db.query('SELECT * FROM emitente LIMIT 1')
    ]);

    if (!osRes.rows.length) return res.status(404).send('<h1>OS nao encontrada</h1>');

    const os = osRes.rows[0];
    const itens = itensRes.rows;
    const chk = checklistRes.rows[0] || {};
    const emit = emitRes.rows[0] || {};

    const sel = (v) => v === 'OK' ? '[ X ]' : '[   ]';

    const statusColors = { 'Orcamento':'#f39c12','Aprovado':'#3498db','Em Manutencao':'#e67e22','Aguardando Peca':'#e74c3c','Pronto para Retirada':'#2ecc71','Finalizado':'#27ae60','Cancelado':'#95a5a6' };

    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OS #${os.numero_os} - ${escape(emit.razao_social||'ST Distribuidora')}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px; color: #333; background: #fff; padding: 20px; }
.container { max-width: 800px; margin: 0 auto; }
.card { border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
.card-title { padding: 10px 14px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #eee; background: #f8f9fa; }
.card-body { padding: 12px 14px; }
.grid-2 { display: flex; gap: 12px; }
.grid-2 .card { flex: 1; }
.row { display: flex; gap: 12px; margin-bottom: 6px; }
.row .field { flex: 1; }
.field label { font-size: 10px; text-transform: uppercase; color: #888; font-weight: 600; display: block; }
.field .value { font-size: 13px; padding: 2px 0; min-height: 20px; border-bottom: 1px dotted #ccc; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
table th { background: #f0f2f5; border: 1px solid #ddd; padding: 5px 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #666; }
table td { border: 1px solid #ddd; padding: 5px 8px; }
.total td { font-weight: 700; background: #f8f9fa; }
.checklist-grid td { border: 1px solid #ddd; padding: 4px 8px; }
.checklist-grid td:first-child { font-weight: 600; }
.checklist-grid td:nth-child(2) { text-align: center; font-family: 'Courier New', monospace; font-weight: 700; }
.header-title { text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #1a1a2e; }
.header-title h1 { font-size: 20px; color: #1a1a2e; }
.header-title p { font-size: 11px; color: #666; margin-top: 2px; }
.os-num { font-size: 22px; font-weight: 700; text-align: center; margin: 12px 0; color: #1a1a2e; }
.badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; font-weight:600; color:#fff; text-align:center; }
.chassis { text-align: center; margin-top: 8px; }
.assinatura { display: flex; justify-content: space-between; margin-top: 24px; }
.assinatura div { text-align: center; border-top: 1px solid #333; padding-top: 6px; width: 220px; font-size: 11px; color: #555; }
.footer { text-align: center; font-size: 10px; color: #999; margin-top: 16px; border-top: 1px solid #ddd; padding-top: 8px; }
.no-print { display: none; }
@media print { body { padding: 10px; } @page { margin: 8mm; size: A4 portrait; } }
</style>
</head>
<body>
<div class="container">

<div class="header-title">
  <h1>${escape(emit.razao_social||'ST DISTRIBUIDORA DE INFORMATICA LTDA')}</h1>
  <p>${escape(emit.logradouro||'')}, ${escape(emit.numero||'')} ${escape(emit.complemento||'')} - ${escape(emit.bairro||'')} - ${escape(emit.cidade||'')}/${escape(emit.uf||'')} | CNPJ: ${escape(emit.cnpj||'')} | Tel: ${escape(emit.telefone||'')}</p>
</div>

<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
  <div class="os-num" style="margin:0;">OS #${os.numero_os}</div>
  <span class="badge" style="background:${statusColors[os.status]||'#95a5a5'}">${escape(os.status)}</span>
</div>

<div class="grid-2">
  <div class="card">
    <div class="card-title">Cliente</div>
    <div class="card-body">
      <p style="font-weight:600;">${escape(os.cliente_nome||'')}</p>
      <p>${escape(os.cliente_doc||'')}</p>
      <p>${escape(os.cliente_telefone||'')}${os.cliente_whatsapp ? ' | WhatsApp: ' + escape(os.cliente_whatsapp) : ''}</p>
      <p>${escape(os.cliente_email||'')}</p>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Equipamento</div>
    <div class="card-body">
      <p><strong>${escape(os.marca||'')} ${escape(os.modelo||'')}</strong></p>
      <p>NS: ${escape(os.numero_serie||'-')}</p>
      <p>Senha BIOS: ${escape(os.senha_bios||'-')}</p>
      <p>Data Entrada: ${fmtDate(os.data_entrada)}</p>
      <p>Data Saida: ${os.data_saida ? fmtDate(os.data_saida) : '-'}</p>
      <p>Tecnico: ${escape(os.tecnico_nome||'-')}</p>
    </div>
  </div>
</div>

<div class="grid-2">
  <div class="card">
    <div class="card-title">Defeito Relatado</div>
    <div class="card-body">
      <p style="min-height:50px;">${escape(os.defeito_relatado||'Nao informado')}</p>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Laudo Tecnico</div>
    <div class="card-body">
      <p style="min-height:50px;">${escape(os.laudo_tecnico||'Aguardando laudo')}</p>
    </div>
  </div>
</div>

<div class="card">
  <div class="card-title">Itens / Servicos</div>
  <div class="card-body" style="padding:0;">
    <table>
      <tr><th>#</th><th>Descricao</th><th>Tipo</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th></tr>
      ${itens.length ? itens.map((item, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${escape(item.descricao)}</td>
        <td>${item.tipo}</td>
        <td style="text-align:center;">${item.quantidade}</td>
        <td style="text-align:right;">R$ ${(+item.valor_unitario).toFixed(2)}</td>
        <td style="text-align:right;">R$ ${(+item.valor_total).toFixed(2)}</td>
      </tr>`).join('') : '<tr><td colspan="6" style="text-align:center;padding:16px;">Nenhum item adicionado</td></tr>'}
      <tr class="total"><td colspan="5" style="text-align:right;">TOTAL</td><td style="text-align:right;">R$ ${(+os.valor_total).toFixed(2)}</td></tr>
    </table>
  </div>
</div>

<div class="card">
  <div class="card-title">Checklist de Inspecao</div>
  <div class="card-body" style="padding:0;">
    <table class="checklist-grid">
      <tr><th>Componente</th><th>Estado</th><th>Detalhes</th></tr>
      <tr><td>Tela</td><td>${sel(chk.tela)}</td><td></td></tr>
      <tr><td>Camera</td><td>${chk.camera === 'OK' ? '[OK]' : '[  ]'}</td><td></td></tr>
      <tr><td>Som</td><td>${chk.som === 'OK' ? '[OK]' : '[  ]'}</td><td></td></tr>
      <tr><td>Rede RJ45</td><td>${chk.rede_rj45 === 'OK' ? '[OK]' : '[  ]'}</td><td></td></tr>
      <tr><td>Rede WiFi</td><td>${chk.rede_wifi === 'OK' ? '[OK]' : '[  ]'}</td><td></td></tr>
      <tr><td>USB</td><td>${chk.usb === 'OK' ? '[OK]' : '[  ]'}</td><td></td></tr>
      <tr><td>Microfone</td><td>${chk.microfone === 'OK' ? '[OK]' : '[  ]'}</td><td></td></tr>
      <tr><td>Touchpad</td><td>${chk.touchpad === 'OK' ? '[OK]' : '[  ]'}</td><td></td></tr>
      <tr><td>Teclado</td><td>${sel(chk.teclado)}</td><td>${escape(chk.teclas_especificar||'')}</td></tr>
      <tr><td>Bateria</td><td>${chk.bateria||'Sem Bateria'}</td><td>Autonomia: ${escape(chk.tempo_autonomia||'')}</td></tr>
      <tr><td colspan="3"><strong>Carcaca:</strong> ${escape(chk.carcaca||'Nenhum dano reportado')}</td></tr>
      <tr><td colspan="3"><strong>Observacoes:</strong> ${escape(chk.observacoes||'')}</td></tr>
    </table>
  </div>
</div>

<div class="chassis">
  <svg width="400" height="200" viewBox="0 0 400 200">
    <rect x="50" y="20" width="300" height="160" fill="none" stroke="#333" stroke-width="2"/>
    <rect x="100" y="30" width="200" height="60" fill="none" stroke="#333" stroke-width="1" stroke-dasharray="4,2"/>
    <text x="200" y="70" text-anchor="middle" font-size="10" fill="#333">TELA / DISPLAY</text>
    <rect x="170" y="100" width="60" height="40" rx="3" fill="none" stroke="#333" stroke-width="1"/>
    <text x="200" y="125" text-anchor="middle" font-size="8" fill="#333">TECLADO</text>
    <rect x="160" y="145" width="80" height="15" rx="5" fill="none" stroke="#333" stroke-width="1"/>
    <text x="200" y="156" text-anchor="middle" font-size="7" fill="#333">TOUCHPAD</text>
    <circle cx="60" cy="120" r="15" fill="none" stroke="#333" stroke-width="1"/>
    <text x="60" y="124" text-anchor="middle" font-size="7" fill="#333">USB</text>
    <circle cx="340" cy="120" r="15" fill="none" stroke="#333" stroke-width="1"/>
    <text x="340" y="124" text-anchor="middle" font-size="7" fill="#333">USB</text>
  </svg>
</div>

<div class="assinatura">
  <div>Assinatura do Tecnico</div>
  <div>Assinatura do Cliente</div>
</div>

<div class="footer">
  ${escape(emit.razao_social||'ST Distribuidora')} - ${escape(emit.cnpj||'')} - ${escape(emit.telefone||'')}
</div>

</div>
</body>
</html>`);
  } catch (e) {
    console.error('Print error:', e);
    res.status(500).send('<h1>Erro ao gerar impressao</h1>');
  }
});

function escape(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
}

module.exports = router;
