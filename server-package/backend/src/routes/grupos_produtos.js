const { Router } = require('express');
const router = Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = 'SELECT * FROM grupos_produtos';
    const params = [];
    if (q && q.trim()) {
      sql += ' WHERE nome ILIKE $1';
      params.push(`%${q.trim()}%`);
    }
    sql += ' ORDER BY nome';
    const r = await db.query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM grupos_produtos WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ success: false, error: 'Nome obrigatorio' });
    const r = await db.query('INSERT INTO grupos_produtos (nome) VALUES ($1) RETURNING id', [nome]);
    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Grupo ja existe' });
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome } = req.body;
    const r = await db.query('UPDATE grupos_produtos SET nome=$1 WHERE id=$2 RETURNING id', [nome, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Grupo ja existe' });
    res.status(500).json({ success: false, error: e.message });
  }
});

router.patch('/:id/inativar', async (req, res) => {
  try {
    const r = await db.query("UPDATE grupos_produtos SET status='Inativo' WHERE id=$1 AND status='Ativo' RETURNING id", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado ou ja inativo' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch('/:id/reativar', async (req, res) => {
  try {
    const r = await db.query("UPDATE grupos_produtos SET status='Ativo' WHERE id=$1 AND status='Inativo' RETURNING id", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado ou ja ativo' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
