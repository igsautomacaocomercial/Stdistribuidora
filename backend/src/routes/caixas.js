const { Router } = require('express');
const router = Router();
const db = require('../db');

// GET /api/caixas/atual - caixa aberto do dia
router.get('/atual', async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM caixas WHERE status='Aberto' ORDER BY id DESC LIMIT 1");
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/caixas - historico
router.get('/', async (req, res) => {
  try {
    const { data_inicio, data_fim, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = []; const wheres = []; let i = 1;

    if (data_inicio) { wheres.push(`data_aberture >= $${i++}`); params.push(data_inicio); }
    if (data_fim) { wheres.push(`data_aberture <= $${i++} + interval '1 day'`); params.push(data_fim); }

    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

    const count = await db.query(`SELECT COUNT(*) FROM caixas ${where}`, params);
    const total = parseInt(count.rows[0].count);

    params.push(parseInt(limit), offset);
    const data = await db.query(`SELECT * FROM caixas ${where} ORDER BY id DESC LIMIT $${i++} OFFSET $${i}`, params);

    res.json({ success: true, data: data.rows, pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / +limit) } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/caixas/abrir
router.post('/abrir', async (req, res) => {
  try {
    const { usuario_abertura, valor_inicial, observacao } = req.body;
    if (!usuario_abertura) return res.status(400).json({ success: false, error: 'usuario_abertura obrigatorio' });

    // Verifica se ja existe caixa aberto
    const aberto = await db.query("SELECT id FROM caixas WHERE status='Aberto' LIMIT 1");
    if (aberto.rows.length) return res.status(400).json({ success: false, error: 'Ja existe um caixa aberto' });

    const r = await db.query(
      'INSERT INTO caixas (usuario_abertura, valor_inicial, observacao_abertura) VALUES ($1,$2,$3) RETURNING id',
      [usuario_abertura, valor_inicial||0, observacao||null]
    );

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/caixas/fechar/:id
router.post('/fechar/:id', async (req, res) => {
  try {
    const { valor_dinheiro, valor_pix, valor_debito, valor_credito, valor_vale, valor_outros, observacao, usuario_fechamento } = req.body;

    const caixa = await db.query('SELECT * FROM caixas WHERE id=$1 AND status=$2', [req.params.id, 'Aberto']);
    if (!caixa.rows.length) return res.status(404).json({ success: false, error: 'Caixa nao encontrado ou ja fechado' });

    // Verificar se ha vendas abertas
    const abertas = await db.query("SELECT COUNT(*) FROM vendas WHERE caixa_id=$1 AND status='Aberta'", [req.params.id]);
    if (parseInt(abertas.rows[0].count) > 0) {
      return res.status(400).json({ success: false, error: 'Existem vendas abertas neste caixa. Finalize ou cancele antes de fechar.' });
    }

    const c = caixa.rows[0];
    const totalVendido = parseFloat(c.total_vendido) || 0;
    const dinheiro = valor_dinheiro !== undefined ? parseFloat(valor_dinheiro) : (c.valor_dinheiro || 0);
    const pix = valor_pix !== undefined ? parseFloat(valor_pix) : (c.valor_pix || 0);
    const debito = valor_debito !== undefined ? parseFloat(valor_debito) : (c.valor_debito || 0);
    const credito = valor_credito !== undefined ? parseFloat(valor_credito) : (c.valor_credito || 0);
    const vale = valor_vale !== undefined ? parseFloat(valor_vale) : (c.valor_vale || 0);
    const outros = valor_outros !== undefined ? parseFloat(valor_outros) : (c.valor_outros || 0);

    const totalDeclarado = dinheiro + pix + debito + credito + vale + outros;
    const diferenca = totalDeclarado - (totalVendido + parseFloat(c.valor_inicial) - parseFloat(c.total_sangrias) + parseFloat(c.total_reforcos));

    await db.query(`
      UPDATE caixas SET
        data_fechamento=NOW(), usuario_fechamento=$1, status='Fechado',
        valor_dinheiro=$2, valor_pix=$3, valor_debito=$4, valor_credito=$5,
        valor_vale=$6, valor_outros=$7, diferenca_caixa=$8, observacao_fechamento=$9
      WHERE id=$10
    `, [usuario_fechamento||null, dinheiro, pix, debito, credito, vale, outros, diferenca, observacao||null, req.params.id]);

    res.json({ success: true, message: 'Caixa fechado com sucesso', data: { diferenca } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/caixas/:id/movimentos
router.get('/:id/movimentos', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM caixa_movimentos WHERE caixa_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/caixas/:id/sangria
router.post('/:id/sangria', async (req, res) => {
  try {
    const { valor, motivo, responsavel } = req.body;
    if (!valor || valor <= 0) return res.status(400).json({ success: false, error: 'Valor invalido' });
    if (!motivo) return res.status(400).json({ success: false, error: 'Motivo obrigatorio' });

    const caixa = await db.query('SELECT id FROM caixas WHERE id=$1 AND status=$2', [req.params.id, 'Aberto']);
    if (!caixa.rows.length) return res.status(400).json({ success: false, error: 'Caixa nao encontrado ou ja fechado' });

    await db.query('INSERT INTO caixa_movimentos (caixa_id, tipo, valor, motivo, responsavel) VALUES ($1,$2,$3,$4,$5)',
      [req.params.id, 'Sangria', valor, motivo, responsavel||null]);
    await db.query('UPDATE caixas SET total_sangrias = total_sangrias + $1 WHERE id=$2', [valor, req.params.id]);

    res.status(201).json({ success: true, message: 'Sangria registrada' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/caixas/:id/reforco
router.post('/:id/reforco', async (req, res) => {
  try {
    const { valor, motivo, responsavel } = req.body;
    if (!valor || valor <= 0) return res.status(400).json({ success: false, error: 'Valor invalido' });

    const caixa = await db.query('SELECT id FROM caixas WHERE id=$1 AND status=$2', [req.params.id, 'Aberto']);
    if (!caixa.rows.length) return res.status(400).json({ success: false, error: 'Caixa nao encontrado ou ja fechado' });

    await db.query('INSERT INTO caixa_movimentos (caixa_id, tipo, valor, motivo, responsavel) VALUES ($1,$2,$3,$4,$5)',
      [req.params.id, 'Reforco', valor, motivo||null, responsavel||null]);
    await db.query('UPDATE caixas SET total_reforcos = total_reforcos + $1 WHERE id=$2', [valor, req.params.id]);

    res.status(201).json({ success: true, message: 'Reforco registrado' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/caixas/:id - detalhe do caixa
router.get('/:id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM caixas WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Caixa nao encontrado' });

    const movimentos = await db.query('SELECT * FROM caixa_movimentos WHERE caixa_id=$1 ORDER BY created_at', [req.params.id]);
    const vendas = await db.query('SELECT v.*, c.nome_razao_social AS cliente_nome FROM vendas v LEFT JOIN clientes c ON c.id=v.cliente_id WHERE v.caixa_id=$1 ORDER BY v.data_hora', [req.params.id]);

    res.json({ success: true, data: { ...r.rows[0], movimentos: movimentos.rows, vendas: vendas.rows } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/caixas/resumo/dashboard
router.get('/resumo/dashboard', async (req, res) => {
  try {
    const caixa = await db.query("SELECT * FROM caixas WHERE status='Aberto' ORDER BY id DESC LIMIT 1");
    if (!caixa.rows.length) return res.json({ success: true, data: { caixa_aberto: false } });

    const c = caixa.rows[0];
    const vendas = await db.query("SELECT COUNT(*) as qtd, COALESCE(SUM(valor_total),0) as total FROM vendas WHERE caixa_id=$1 AND status='Finalizada'", [c.id]);
    const maisVendido = await db.query(`
      SELECT vi.descricao, SUM(vi.quantidade) as qtd FROM venda_itens vi
      JOIN vendas v ON v.id=vi.venda_id WHERE v.caixa_id=$1 AND v.status='Finalizada'
      GROUP BY vi.descricao ORDER BY qtd DESC LIMIT 1
    `, [c.id]);

    res.json({ success: true, data: {
      caixa_aberto: true, caixa_id: c.id,
      valor_inicial: c.valor_inicial, total_vendido: c.total_vendido,
      total_sangrias: c.total_sangrias, total_reforcos: c.total_reforcos,
      vendas_hoje: parseInt(vendas.rows[0].qtd),
      total_hoje: parseFloat(vendas.rows[0].total),
      produto_mais_vendido: maisVendido.rows.length ? maisVendido.rows[0].descricao : null
    }});
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
