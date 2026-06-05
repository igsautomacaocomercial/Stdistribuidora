const { Router } = require('express');
const router = Router();
const db = require('../db');

// GET /api/orcamentos?status=&q=&cliente_id=&data_inicio=&data_fim=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { status, q, cliente_id, data_inicio, data_fim, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = []; const wheres = []; let i = 1;

    if (status) { wheres.push(`o.status = $${i++}`); params.push(status); }
    if (cliente_id) { wheres.push(`o.cliente_id = $${i++}`); params.push(cliente_id); }
    if (data_inicio) { wheres.push(`o.data_orcamento >= $${i++}`); params.push(data_inicio); }
    if (data_fim) { wheres.push(`o.data_orcamento <= $${i++}`); params.push(data_fim); }
    if (q && q.trim()) {
      const t = `%${q.trim()}%`;
      wheres.push(`(c.nome_razao_social ILIKE $${i} OR o.equipamento_marca ILIKE $${i} OR o.equipamento_modelo ILIKE $${i} OR o.numero_serie ILIKE $${i} OR o.numero_orcamento::text ILIKE $${i})`);
      params.push(t); i++;
    }

    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

    const count = await db.query(`SELECT COUNT(*) FROM orcamentos o JOIN clientes c ON c.id=o.cliente_id ${where}`, params);
    const total = parseInt(count.rows[0].count);

    params.push(parseInt(limit), offset);
    const data = await db.query(`
      SELECT o.*, c.nome_razao_social AS cliente_nome, c.telefone AS cliente_telefone,
        t.nome AS tecnico_nome
      FROM orcamentos o
      JOIN clientes c ON c.id=o.cliente_id
      LEFT JOIN tecnicos t ON t.id=o.tecnico_id
      ${where}
      ORDER BY o.numero_orcamento DESC
      LIMIT $${i++} OFFSET $${i}
    `, params);

    res.json({ success: true, data: data.rows, pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / +limit) } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/orcamentos/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT o.*, c.nome_razao_social AS cliente_nome, c.cpf_cnpj AS cliente_doc,
        c.telefone AS cliente_telefone, c.email AS cliente_email,
        c.logradouro AS cliente_logradouro, c.numero AS cliente_numero,
        c.bairro AS cliente_bairro, c.cidade AS cliente_cidade, c.uf AS cliente_uf,
        c.cep AS cliente_cep,
        t.nome AS tecnico_nome
      FROM orcamentos o
      JOIN clientes c ON c.id=o.cliente_id
      LEFT JOIN tecnicos t ON t.id=o.tecnico_id
      WHERE o.id=$1
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Orcamento nao encontrado' });

    const itens = await db.query('SELECT * FROM orcamento_itens WHERE orcamento_id=$1 ORDER BY id', [req.params.id]);
    const emit = await db.query('SELECT * FROM emitente LIMIT 1');

    res.json({ success: true, data: { ...r.rows[0], itens: itens.rows, emitente: emit.rows[0] || null } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/orcamentos
router.post('/', async (req, res) => {
  try {
    const {
      cliente_id, tecnico_id, data_orcamento, validade_orcamento,
      equipamento_marca, equipamento_modelo, numero_serie,
      defeito_relatado, observacoes,
      desconto_tipo, desconto_valor,
      forma_pagamento, prazo_entrega, garantia
    } = req.body;

    if (!cliente_id) return res.status(400).json({ success: false, error: 'cliente_id obrigatorio' });

    // Gera proximo numero
    const seq = await db.query(`SELECT COALESCE(MAX(numero_orcamento), 0) + 1 AS next FROM orcamentos`);
    const numero_orcamento = parseInt(seq.rows[0].next);

    const hoje = new Date().toISOString().slice(0, 10);
    const dataOrc = data_orcamento || hoje;
    const valOrc = validade_orcamento || null;

    const r = await db.query(`
      INSERT INTO orcamentos (numero_orcamento, cliente_id, tecnico_id, data_orcamento, validade_orcamento,
        equipamento_marca, equipamento_modelo, numero_serie, defeito_relatado, observacoes,
        desconto_tipo, desconto_valor, forma_pagamento, prazo_entrega, garantia)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id, numero_orcamento
    `, [
      numero_orcamento, cliente_id, tecnico_id || null,
      dataOrc, valOrc,
      equipamento_marca || null, equipamento_modelo || null, numero_serie || null,
      defeito_relatado || null, observacoes || null,
      desconto_tipo || 'Valor', desconto_valor || 0,
      forma_pagamento || null, prazo_entrega || null, garantia || null
    ]);

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT /api/orcamentos/:id
router.put('/:id', async (req, res) => {
  try {
    const check = await db.query('SELECT id, status FROM orcamentos WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, error: 'Orcamento nao encontrado' });
    if (check.rows[0].status === 'Convertido OS') {
      return res.status(400).json({ success: false, error: 'Orcamento convertido nao pode ser editado' });
    }

    const allowed = [
      'cliente_id', 'tecnico_id', 'data_orcamento', 'validade_orcamento',
      'equipamento_marca', 'equipamento_modelo', 'numero_serie',
      'defeito_relatado', 'observacoes',
      'desconto_tipo', 'desconto_valor',
      'forma_pagamento', 'prazo_entrega', 'garantia'
    ];
    const sets = []; const params = []; let i = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f}=$${i++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo' });
    params.push(req.params.id);
    const r = await db.query(`UPDATE orcamentos SET ${sets.join(',')} WHERE id=$${i} RETURNING id,numero_orcamento,status`, params);
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/orcamentos/:id
router.delete('/:id', async (req, res) => {
  try {
    const check = await db.query('SELECT id, status FROM orcamentos WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, error: 'Orcamento nao encontrado' });
    if (check.rows[0].status === 'Convertido OS') {
      return res.status(400).json({ success: false, error: 'Orcamento convertido nao pode ser excluido' });
    }
    await db.query('DELETE FROM orcamentos WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Orcamento excluido' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH /api/orcamentos/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status obrigatorio' });

    const valid = ['Aberto', 'Enviado', 'Aprovado', 'Reprovado', 'Cancelado'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, error: 'Status invalido' });

    const check = await db.query('SELECT id, status FROM orcamentos WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, error: 'Orcamento nao encontrado' });
    if (check.rows[0].status === 'Convertido OS') {
      return res.status(400).json({ success: false, error: 'Orcamento convertido nao pode ter status alterado' });
    }

    await db.query('UPDATE orcamentos SET status=$1 WHERE id=$2', [status, req.params.id]);
    res.json({ success: true, message: `Status alterado para ${status}` });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/orcamentos/:id/itens
router.post('/:id/itens', async (req, res) => {
  try {
    const { tipo, descricao, quantidade, valor_unitario, produto_id, servico_id } = req.body;
    if (!descricao || !tipo) return res.status(400).json({ success: false, error: 'descricao e tipo obrigatorios' });

    if (!['Produto', 'Servico'].includes(tipo)) {
      return res.status(400).json({ success: false, error: 'tipo deve ser Produto ou Servico' });
    }

    const qtd = parseFloat(quantidade) || 1;
    const valUnit = parseFloat(valor_unitario) || 0;
    const valTotal = qtd * valUnit;

    const r = await db.query(
      `INSERT INTO orcamento_itens (orcamento_id, tipo, descricao, quantidade, valor_unitario, valor_total, produto_id, servico_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [req.params.id, tipo, descricao, qtd, valUnit, valTotal, produto_id || null, servico_id || null]
    );

    // Recalcular totais do orcamento
    await recalcularTotais(req.params.id);

    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/orcamentos/:id/itens/:itemId
router.delete('/:id/itens/:itemId', async (req, res) => {
  try {
    await db.query('DELETE FROM orcamento_itens WHERE id=$1 AND orcamento_id=$2', [req.params.itemId, req.params.id]);
    await recalcularTotais(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/orcamentos/:id/converter-os
router.post('/:id/converter-os', async (req, res) => {
  try {
    const orc = await db.query(`
      SELECT o.*, c.nome_razao_social AS cliente_nome
      FROM orcamentos o
      JOIN clientes c ON c.id=o.cliente_id
      WHERE o.id=$1
    `, [req.params.id]);
    if (!orc.rows.length) return res.status(404).json({ success: false, error: 'Orcamento nao encontrado' });
    const o = orc.rows[0];

    if (o.status !== 'Aprovado') {
      return res.status(400).json({ success: false, error: 'So e possivel converter orcamentos aprovados' });
    }

    // Criar OS
    const os = await db.query(`
      INSERT INTO ordens_servico (cliente_id, tecnico_id, marca, modelo, numero_serie, defeito_relatado, laudo_tecnico, valor_total, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, numero_os
    `, [
      o.cliente_id, o.tecnico_id || null,
      o.equipamento_marca || null, o.equipamento_modelo || null, o.numero_serie || null,
      o.defeito_relatado || null, null, o.valor_total, 'Orcamento'
    ]);

    // Copiar itens
    const itens = await db.query('SELECT * FROM orcamento_itens WHERE orcamento_id=$1', [req.params.id]);
    for (const item of itens.rows) {
      await db.query(
        `INSERT INTO os_itens (os_id, descricao, tipo, quantidade, valor_unitario, valor_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [os.rows[0].id, item.descricao, item.tipo, item.quantidade, item.valor_unitario, item.valor_total]
      );
    }

    // Atualizar status do orcamento
    await db.query("UPDATE orcamentos SET status='Convertido OS' WHERE id=$1", [req.params.id]);

    res.status(201).json({ success: true, data: { os_id: os.rows[0].id, numero_os: os.rows[0].numero_os, orcamento_id: +req.params.id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/orcamentos/:id/print
router.get('/:id/print', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT o.*, c.nome_razao_social AS cliente_nome, c.cpf_cnpj AS cliente_doc,
        c.telefone AS cliente_telefone, c.email AS cliente_email,
        c.logradouro AS cliente_logradouro, c.numero AS cliente_numero,
        c.bairro AS cliente_bairro, c.cidade AS cliente_cidade, c.uf AS cliente_uf,
        c.cep AS cliente_cep,
        t.nome AS tecnico_nome
      FROM orcamentos o
      JOIN clientes c ON c.id=o.cliente_id
      LEFT JOIN tecnicos t ON t.id=o.tecnico_id
      WHERE o.id=$1
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Orcamento nao encontrado' });

    const itens = await db.query('SELECT * FROM orcamento_itens WHERE orcamento_id=$1 ORDER BY id', [req.params.id]);
    const emit = await db.query('SELECT * FROM emitente LIMIT 1');

    res.json({ success: true, data: { ...r.rows[0], itens: itens.rows, emitente: emit.rows[0] || null } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

async function recalcularTotais(orcamentoId) {
  // Soma total de produtos e servicos
  const sums = await db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN tipo='Produto' THEN valor_total ELSE 0 END), 0) AS total_produtos,
      COALESCE(SUM(CASE WHEN tipo='Servico' THEN valor_total ELSE 0 END), 0) AS total_servicos,
      COALESCE(SUM(valor_total), 0) AS subtotal
    FROM orcamento_itens WHERE orcamento_id=$1
  `, [orcamentoId]);
  const s = sums.rows[0];
  const totalProdutos = parseFloat(s.total_produtos);
  const totalServicos = parseFloat(s.total_servicos);
  const subtotal = parseFloat(s.subtotal);

  // Buscar tipo e valor de desconto
  const orc = await db.query('SELECT desconto_tipo, desconto_valor FROM orcamentos WHERE id=$1', [orcamentoId]);
  const o = orc.rows[0];
  const descontoTipo = o.desconto_tipo;
  const descontoValor = parseFloat(o.desconto_valor) || 0;

  let valorDesconto = 0;
  if (descontoTipo === 'Percentual') {
    valorDesconto = subtotal * (descontoValor / 100);
  } else {
    valorDesconto = Math.min(descontoValor, subtotal);
  }

  const valorTotal = subtotal - valorDesconto;

  await db.query(`
    UPDATE orcamentos
    SET valor_produtos=$1, valor_servicos=$2, valor_desconto=$3, valor_total=$4
    WHERE id=$5
  `, [totalProdutos, totalServicos, valorDesconto, valorTotal, orcamentoId]);
}

module.exports = router;
