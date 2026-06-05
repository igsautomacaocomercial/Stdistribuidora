const { Router } = require('express');
const router = Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const r = await db.query('SELECT id, nome, tipo, ativo FROM usuarios ORDER BY nome');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nome, senha, tipo } = req.body;
    if (!nome || !senha) return res.status(400).json({ success: false, error: 'Nome e senha obrigatorios' });
    const r = await db.query(
      'INSERT INTO usuarios (nome, senha, tipo) VALUES ($1, $2, $3) RETURNING id',
      [nome.toUpperCase().trim(), senha, tipo || 'operador']
    );
    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Usuario ja existe' });
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome, senha, tipo, ativo } = req.body;
    const sets = [];
    const params = [];
    let i = 1;
    if (nome !== undefined) { sets.push(`nome=$${i++}`); params.push(nome.toUpperCase().trim()); }
    if (senha !== undefined) { sets.push(`senha=$${i++}`); params.push(senha); }
    if (tipo !== undefined) { sets.push(`tipo=$${i++}`); params.push(tipo); }
    if (ativo !== undefined) { sets.push(`ativo=$${i++}`); params.push(ativo); }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo' });
    params.push(req.params.id);
    const r = await db.query(`UPDATE usuarios SET ${sets.join(',')} WHERE id=$${i} RETURNING id`, params);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await db.query('DELETE FROM usuarios WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Nao encontrado' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;