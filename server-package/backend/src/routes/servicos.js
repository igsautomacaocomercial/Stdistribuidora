const { Router } = require('express');
const router = Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = 'SELECT * FROM servicos';
    const params = [];
    if (q && q.trim()) {
      sql += ' WHERE nome_servico ILIKE $1';
      params.push(`%${q.trim()}%`);
    }
    sql += ' ORDER BY nome_servico';
    const r = await db.query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM servicos WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nome_servico, valor_servico, comissao_tecnico, tempo_estimado } = req.body;
    if (!nome_servico) return res.status(400).json({ success: false, error: 'Nome obrigatorio' });
    const r = await db.query(
      'INSERT INTO servicos (nome_servico,valor_servico,comissao_tecnico,tempo_estimado) VALUES ($1,$2,$3,$4) RETURNING id',
      [nome_servico, valor_servico||0, comissao_tecnico||0, tempo_estimado||null]
    );
    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['nome_servico','valor_servico','comissao_tecnico','tempo_estimado'];
    const sets = []; const params = []; let i = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f}=$${i++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo' });
    sets.push(`data_alteracao=NOW()`);
    params.push(req.params.id);
    const r = await db.query(`UPDATE servicos SET ${sets.join(',')} WHERE id=$${i} RETURNING id`, params);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch('/:id/inativar', async (req, res) => {
  try {
    const r = await db.query("UPDATE servicos SET status='Inativo', data_alteracao=NOW() WHERE id=$1 AND status='Ativo' RETURNING id", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado ou ja inativo' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch('/:id/reativar', async (req, res) => {
  try {
    const r = await db.query("UPDATE servicos SET status='Ativo', data_alteracao=NOW() WHERE id=$1 AND status='Inativo' RETURNING id", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado ou ja ativo' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
