const { Router } = require('express');
const router = Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = 'SELECT * FROM unidades_medida';
    const params = [];
    if (q && q.trim()) {
      const t = `%${q.trim()}%`;
      sql += ' WHERE sigla ILIKE $1 OR descricao ILIKE $1';
      params.push(t);
    }
    sql += ' ORDER BY sigla';
    const r = await db.query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM unidades_medida WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { sigla, descricao } = req.body;
    if (!sigla || !descricao) return res.status(400).json({ success: false, error: 'Sigla e descricao obrigatorias' });
    const r = await db.query('INSERT INTO unidades_medida (sigla,descricao) VALUES ($1,$2) RETURNING id', [sigla.toUpperCase(), descricao]);
    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Sigla ja existe' });
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { sigla, descricao } = req.body;
    if (!sigla || !descricao) return res.status(400).json({ success: false, error: 'Sigla e descricao obrigatorias' });
    const r = await db.query('UPDATE unidades_medida SET sigla=$1,descricao=$2 WHERE id=$3 RETURNING id', [sigla.toUpperCase(), descricao, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Sigla ja existe' });
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await db.query('DELETE FROM unidades_medida WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true });
  } catch (e) {
    if (e.code === '23503') return res.status(400).json({ success: false, error: 'Unidade em uso por produtos' });
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
