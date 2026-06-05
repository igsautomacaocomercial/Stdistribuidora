const { Router } = require('express');
const router = Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [resumo, statusGeral, servicosTop, tecnicosTop, faturamentoMensal] = await Promise.all([
      db.query('SELECT * FROM vw_dashboard_resumo'),
      db.query('SELECT * FROM vw_painel_status_geral'),
      db.query('SELECT * FROM vw_servicos_mais_recorrentes LIMIT 10'),
      db.query('SELECT * FROM vw_produtividade_tecnico'),
      db.query('SELECT * FROM vw_faturamento_mensal ORDER BY ano_mes DESC LIMIT 12')
    ]);

    res.json({
      success: true,
      data: {
        resumo: resumo.rows[0],
        status_geral: statusGeral.rows,
        servicos_top: servicosTop.rows,
        tecnicos_top: tecnicosTop.rows,
        faturamento_mensal: faturamentoMensal.rows
      }
     });
   } catch (e) {
  console.error('ERRO DASHBOARD:', e);
  res.status(500).json({
    success: false,
    error: e.message || e.toString(),
    detail: e
  });
}
});

// GET /api/dashboard/reports?data_inicio=&data_fim=
router.get('/reports', async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    let filtro = '';
    const params = [];

    if (data_inicio && data_fim) {
      filtro = 'AND os.data_saida >= $1 AND os.data_saida <= $2';
      params.push(data_inicio, data_fim);
    }

    const [servicos, defeitos, tecnicos] = await Promise.all([
      db.query(`
        SELECT oi.descricao, oi.tipo, COUNT(*) AS total, SUM(oi.valor_total) AS receita
        FROM os_itens oi JOIN ordens_servico os ON os.id=oi.os_id
        WHERE os.status='Finalizado' ${filtro}
        GROUP BY oi.descricao, oi.tipo ORDER BY total DESC LIMIT 15
      `, params),
      db.query(`SELECT * FROM vw_defeitos_categorizados`),
      db.query(`
        SELECT t.nome, COUNT(DISTINCT os.id) AS os_count, COALESCE(SUM(os.valor_total),0) AS valor
        FROM tecnicos t LEFT JOIN ordens_servico os ON os.tecnico_id=t.id AND os.status='Finalizado' ${filtro ? 'AND ' + filtro.slice(4) : ''}
        GROUP BY t.id, t.nome ORDER BY valor DESC
      `, params)
    ]);

    res.json({ success: true, data: { servicos: servicos.rows, defeitos: defeitos.rows, tecnicos: tecnicos.rows } });
   } catch (e) {
  console.error('ERRO DASHBOARD:', e);
  res.status(500).json({
    success: false,
    error: e.message || e.toString(),
    detail: e
  });
}
});

// GET /api/dashboard/charts - dados para graficos
router.get('/charts', async (req, res) => {
  try {
    const [faturamento, vendasPagamento, produtosVendidos, vendasVendedor, produtosGrupo] = await Promise.all([
      db.query('SELECT * FROM vw_faturamento_mensal ORDER BY ano_mes ASC LIMIT 12'),

      db.query(`
        SELECT fp.descricao, COALESCE(SUM(vp.valor),0) AS total
        FROM venda_pagamentos vp
        JOIN formas_pagamento fp ON fp.id=vp.forma_pagamento_id
        JOIN vendas v ON v.id=vp.venda_id AND v.status='Finalizada'
        GROUP BY fp.descricao ORDER BY total DESC
      `),

      db.query(`
        SELECT vi.descricao, SUM(vi.quantidade) AS qtd, SUM(vi.valor_total) AS total
        FROM venda_itens vi
        JOIN vendas v ON v.id=vi.venda_id AND v.status='Finalizada'
        GROUP BY vi.descricao ORDER BY total DESC LIMIT 10
      `),

      db.query(`
        SELECT vd.nome, COUNT(v.id) AS qtd_vendas, COALESCE(SUM(v.valor_total),0) AS total
        FROM vendas v
        JOIN vendedores vd ON vd.id=v.vendedor_id
        WHERE v.status='Finalizada'
        GROUP BY vd.nome ORDER BY total DESC
      `),

      db.query(`
        SELECT gp.nome AS grupo, COUNT(vi.id) AS qtd, COALESCE(SUM(vi.valor_total),0) AS total
        FROM venda_itens vi
        JOIN vendas v ON v.id=vi.venda_id AND v.status='Finalizada'
        LEFT JOIN produtos p ON p.id=vi.produto_id
        LEFT JOIN grupos_produtos gp ON gp.id=p.grupo_id
        GROUP BY gp.nome ORDER BY total DESC
      `)
    ]);

    res.json({ success: true, data: {
      faturamento_mensal: faturamento.rows,
      vendas_por_pagamento: vendasPagamento.rows,
      produtos_mais_vendidos: produtosVendidos.rows,
      vendas_por_vendedor: vendasVendedor.rows,
      produtos_por_grupo: produtosGrupo.rows
    }});
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
