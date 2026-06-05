const { Router } = require('express');
const router = Router();
const db = require('../db');

// GET /api/pdv/buscar-produto?q=
router.get('/buscar-produto', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ success: true, data: [] });

    const t = `%${q.trim()}%`;
    const r = await db.query(`
      SELECT id, descricao, codigo_barras, codigo_interno, preco_venda, estoque_atual, status
      FROM produtos
      WHERE (descricao ILIKE $1 OR codigo_barras ILIKE $1 OR codigo_interno ILIKE $1)
        AND status='Ativo'
      ORDER BY descricao LIMIT 20
    `, [t]);

    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/pdv/importar-os/:os_id
router.get('/importar-os/:os_id', async (req, res) => {
  try {
    const os = await db.query(`
      SELECT os.*, c.nome_razao_social AS cliente_nome
      FROM ordens_servico os
      JOIN clientes c ON c.id=os.cliente_id
      WHERE os.id=$1 AND os.status IN ('Pronto para Retirada', 'Finalizado')
    `, [req.params.os_id]);

    if (!os.rows.length) return res.status(404).json({ success: false, error: 'OS nao encontrada ou nao liberada para venda' });

    const itens = await db.query(`
      SELECT osi.*, p.id AS produto_id, p.preco_venda, p.estoque_atual
      FROM os_itens osi
      LEFT JOIN produtos p ON p.descricao = osi.descricao
      WHERE osi.os_id=$1 AND osi.tipo='Produto'
    `, [req.params.os_id]);

    res.json({ success: true, data: { os: os.rows[0], itens: itens.rows } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/pdv/relatorios - relatorios consolidados
router.get('/relatorios', async (req, res) => {
  try {
    const { data_inicio, data_fim, vendedor_id, forma_pagamento_id } = req.query;

    let params = []; let i = 1;
    let whereVendas = "WHERE v.status='Finalizada'";
    let wherePag = "";

    if (data_inicio) { whereVendas += ` AND v.data_hora >= $${i++}`; params.push(data_inicio); }
    if (data_fim) { whereVendas += ` AND v.data_hora <= $${i++} + interval '1 day'`; params.push(data_fim); }
    if (vendedor_id) { whereVendas += ` AND v.vendedor_id = $${i++}`; params.push(vendedor_id); }

    // Vendas por periodo
    const vendas = await db.query(`
      SELECT COUNT(*) as qtd, COALESCE(SUM(valor_total),0) as total, COALESCE(AVG(valor_total),0) as ticket_medio
      FROM vendas v ${whereVendas}
    `, params);

    // Vendas por forma de pagamento
    let pagSql = `
      SELECT fp.descricao, fp.tipo, COALESCE(SUM(vp.valor),0) as total
      FROM venda_pagamentos vp
      JOIN formas_pagamento fp ON fp.id=vp.forma_pagamento_id
      JOIN vendas v ON v.id=vp.venda_id ${whereVendas}
      GROUP BY fp.descricao, fp.tipo ORDER BY total DESC
    `;
    const pag = await db.query(pagSql, params);

    // Produtos mais vendidos
    const produtos = await db.query(`
      SELECT vi.descricao, SUM(vi.quantidade) as qtd, SUM(vi.valor_total) as total
      FROM venda_itens vi
      JOIN vendas v ON v.id=vi.venda_id ${whereVendas}
      GROUP BY vi.descricao ORDER BY qtd DESC LIMIT 10
    `, params);

    res.json({ success: true, data: {
      resumo: vendas.rows[0],
      pagamentos: pag.rows,
      produtos_mais_vendidos: produtos.rows
    }});
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
