const { Router } = require('express');
const router = Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { q, status } = req.query;
    let sql = 'SELECT p.*, g.nome AS grupo_nome, u.sigla AS unidade_sigla FROM produtos p LEFT JOIN grupos_produtos g ON g.id=p.grupo_id LEFT JOIN unidades_medida u ON u.id=p.unidade_medida_id';
    const wheres = []; const params = []; let i = 1;
    if (status) { wheres.push(`p.status = $${i++}`); params.push(status); }
    if (q && q.trim()) {
      const t = `%${q.trim()}%`;
      wheres.push(`(p.descricao ILIKE $${i} OR p.codigo_barras ILIKE $${i})`);
      params.push(t); i++;
    }
    if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
    sql += ' ORDER BY p.descricao';
    const r = await db.query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.query('SELECT p.*, g.nome AS grupo_nome, u.sigla AS unidade_sigla FROM produtos p LEFT JOIN grupos_produtos g ON g.id=p.grupo_id LEFT JOIN unidades_medida u ON u.id=p.unidade_medida_id WHERE p.id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { codigo_barras, descricao, grupo_id, unidade_medida_id, preco_custo, margem_lucro, preco_venda, estoque_atual, estoque_minimo, ncm, cest } = req.body;
    if (!descricao) return res.status(400).json({ success: false, error: 'Descricao obrigatoria' });

    const r = await db.query(`
      INSERT INTO produtos (codigo_barras,descricao,grupo_id,unidade_medida_id,preco_custo,margem_lucro,preco_venda,estoque_atual,estoque_minimo,ncm,cest)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
    `, [codigo_barras||null, descricao, grupo_id||null, unidade_medida_id||null, preco_custo||0, margem_lucro||0, preco_venda||0, estoque_atual||0, estoque_minimo||0, ncm||null, cest||null]);
    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Codigo de barras ja existe' });
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['codigo_barras','descricao','grupo_id','unidade_medida_id','preco_custo','margem_lucro','preco_venda','estoque_atual','estoque_minimo','ncm','cest'];
    const sets = []; const params = []; let i = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f}=$${i++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo' });
    params.push(req.params.id);
    const r = await db.query(`UPDATE produtos SET ${sets.join(',')}, data_alteracao=NOW() WHERE id=$${i} RETURNING id`, params);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Codigo de barras ja existe' });
    res.status(500).json({ success: false, error: e.message });
  }
});

router.patch('/:id/inativar', async (req, res) => {
  try {
    const r = await db.query("UPDATE produtos SET status='Inativo', data_alteracao=NOW() WHERE id=$1 AND status='Ativo' RETURNING id", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado ou ja inativo' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch('/:id/reativar', async (req, res) => {
  try {
    const r = await db.query("UPDATE produtos SET status='Ativo', data_alteracao=NOW() WHERE id=$1 AND status='Inativo' RETURNING id", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado ou ja ativo' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
