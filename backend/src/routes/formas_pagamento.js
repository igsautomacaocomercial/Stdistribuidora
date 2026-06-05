const { Router } = require('express');
const router = Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { ativo, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = '';
    let i = 1;

    if (ativo !== undefined) { where = `WHERE ativo=$${i++}`; params.push(ativo === 'true'); }

    const count = await db.query(`SELECT COUNT(*) FROM formas_pagamento ${where}`, params);
    const total = parseInt(count.rows[0].count);

    params.push(parseInt(limit), offset);
    const data = await db.query(`SELECT * FROM formas_pagamento ${where} ORDER BY descricao LIMIT $${i++} OFFSET $${i}`, params);

    res.json({ success: true, data: data.rows, pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / +limit) } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM formas_pagamento WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Forma de pagamento nao encontrada' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { descricao, tipo, permite_troco, permite_parcelamento, taxa_percentual, ativo } = req.body;
    if (!descricao) return res.status(400).json({ success: false, error: 'descricao obrigatoria' });

    const r = await db.query(`
      INSERT INTO formas_pagamento (descricao,tipo,permite_troco,permite_parcelamento,taxa_percentual,ativo)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
    `, [descricao, tipo||'Outros', permite_troco||false, permite_parcelamento||false, taxa_percentual||0, ativo !== undefined ? ativo : true]);
    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['descricao','tipo','permite_troco','permite_parcelamento','taxa_percentual','ativo'];
    const sets = []; const params = []; let i = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f}=$${i++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo para alterar' });
    params.push(req.params.id);
    const r = await db.query(`UPDATE formas_pagamento SET ${sets.join(',')} WHERE id=$${i} RETURNING id,descricao,ativo`, params);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Forma de pagamento nao encontrada' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await db.query('DELETE FROM formas_pagamento WHERE id=$1 RETURNING id,descricao', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Forma de pagamento nao encontrada' });
    res.json({ success: true, message: 'Forma de pagamento excluida', data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
