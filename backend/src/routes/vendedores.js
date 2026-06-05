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

    const count = await db.query(`SELECT COUNT(*) FROM vendedores ${where}`, params);
    const total = parseInt(count.rows[0].count);

    params.push(parseInt(limit), offset);
    const data = await db.query(`SELECT * FROM vendedores ${where} ORDER BY nome LIMIT $${i++} OFFSET $${i}`, params);

    res.json({ success: true, data: data.rows, pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / +limit) } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM vendedores WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Vendedor nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nome, telefone, percentual_comissao } = req.body;
    if (!nome) return res.status(400).json({ success: false, error: 'nome obrigatorio' });
    const r = await db.query('INSERT INTO vendedores (nome,telefone,percentual_comissao) VALUES ($1,$2,$3) RETURNING id', [nome, telefone||null, percentual_comissao||0]);
    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['nome','telefone','percentual_comissao','status'];
    const sets = []; const params = []; let i = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f}=$${i++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo para alterar' });
    params.push(req.params.id);
    const r = await db.query(`UPDATE vendedores SET ${sets.join(',')} WHERE id=$${i} RETURNING id,nome,status`, params);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Vendedor nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch('/:id/inativar', async (req, res) => {
  try {
    const check = await db.query('SELECT id,status FROM vendedores WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, error: 'Vendedor nao encontrado' });
    if (check.rows[0].status === 'Inativo') return res.status(400).json({ success: false, error: 'Vendedor ja inativo' });

    await db.query("UPDATE vendedores SET status='Inativo' WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: 'Vendedor inativado' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch('/:id/reativar', async (req, res) => {
  try {
    const r = await db.query("UPDATE vendedores SET status='Ativo' WHERE id=$1 AND status='Inativo' RETURNING id", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Vendedor nao encontrado ou ja ativo' });
    res.json({ success: true, message: 'Vendedor reativado' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
