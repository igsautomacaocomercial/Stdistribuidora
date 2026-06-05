const { Router } = require('express');
const router = Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = '';
    let i = 1;

    if (status) { where = 'WHERE status=$1'; params.push(status); i++; }

    const count = await db.query(`SELECT COUNT(*) FROM tecnicos ${where}`, params);
    const total = parseInt(count.rows[0].count);

    params.push(parseInt(limit), offset);
    const data = await db.query(`SELECT * FROM tecnicos ${where} ORDER BY nome LIMIT $${i++} OFFSET $${i}`, params);

    res.json({ success: true, data: data.rows, pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / +limit) } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nome, especialidade } = req.body;
    if (!nome) return res.status(400).json({ success: false, error: 'nome obrigatorio' });
    const r = await db.query('INSERT INTO tecnicos (nome,especialidade) VALUES ($1,$2) RETURNING id', [nome, especialidade||null]);
    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const sets = []; const params = []; let i = 1;
    if (req.body.nome !== undefined) { sets.push(`nome=$${i++}`); params.push(req.body.nome); }
    if (req.body.especialidade !== undefined) { sets.push(`especialidade=$${i++}`); params.push(req.body.especialidade); }
    if (req.body.status !== undefined) { sets.push(`status=$${i++}`); params.push(req.body.status); }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo' });
    params.push(req.params.id);
    const r = await db.query(`UPDATE tecnicos SET ${sets.join(',')} WHERE id=$${i} RETURNING id,nome,status`, params);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Tecnico nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
