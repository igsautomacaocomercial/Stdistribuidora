const { Router } = require('express');
const router = Router();
const db = require('../db');

// GET /api/clientes?q=&status=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { q, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const wheres = [];
    let i = 1;

    if (status) { wheres.push(`c.status = $${i++}`); params.push(status); }
    else wheres.push(`c.status = 'Ativo'`);

    if (q && q.trim()) {
      const t = `%${q.trim()}%`;
      wheres.push(`(c.nome_razao_social ILIKE $${i} OR c.cpf_cnpj ILIKE $${i} OR c.telefone ILIKE $${i})`);
      params.push(t); i++;
    }

    const where = 'WHERE ' + wheres.join(' AND ');

    const count = await db.query(`SELECT COUNT(*) FROM clientes c ${where}`, params);
    const total = parseInt(count.rows[0].count);

    params.push(parseInt(limit), offset);
    const data = await db.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM ordens_servico os WHERE os.cliente_id = c.id) AS total_os,
        (SELECT COALESCE(SUM(os.valor_total),0) FROM ordens_servico os WHERE os.cliente_id = c.id AND os.status='Finalizado') AS total_gasto
      FROM clientes c ${where}
      ORDER BY c.nome_razao_social
      LIMIT $${i++} OFFSET $${i}
    `, params);

    res.json({ success: true, data: data.rows, pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / +limit) } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res) => {
  try {
    const c = await db.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (!c.rows.length) return res.status(404).json({ success: false, error: 'Cliente nao encontrado' });

    const h = await db.query('SELECT * FROM vw_historico_cliente WHERE cliente_id = $1 ORDER BY data_entrada DESC', [req.params.id]);
    res.json({ success: true, data: { ...c.rows[0], historico: h.rows } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  try {
    const { tipo, cpf_cnpj, nome_razao_social, nome_fantasia, inscricao_estadual, telefone, whatsapp, email, cep, logradouro, numero, complemento, bairro, cidade, uf } = req.body;
    if (!tipo || !cpf_cnpj || !nome_razao_social) return res.status(400).json({ success: false, error: 'tipo, cpf_cnpj e nome_razao_social sao obrigatorios' });

    const dup = await db.query('SELECT id FROM clientes WHERE cpf_cnpj = $1', [cpf_cnpj]);
    if (dup.rows.length) return res.status(409).json({ success: false, error: 'CPF/CNPJ ja cadastrado' });

    const r = await db.query(`
      INSERT INTO clientes (tipo,cpf_cnpj,nome_razao_social,nome_fantasia,inscricao_estadual,telefone,whatsapp,email,cep,logradouro,numero,complemento,bairro,cidade,uf)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id
    `, [tipo, cpf_cnpj, nome_razao_social, nome_fantasia||null, inscricao_estadual||null, telefone||null, whatsapp||null, email||null, cep||null, logradouro||null, numero||null, complemento||null, bairro||null, cidade||null, uf?.toUpperCase()||null]);
    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['tipo','cpf_cnpj','nome_razao_social','nome_fantasia','inscricao_estadual','telefone','whatsapp','email','cep','logradouro','numero','complemento','bairro','cidade','uf'];
    const sets = []; const params = []; let i = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f}=$${i++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo para alterar' });
    params.push(id);
    const r = await db.query(`UPDATE clientes SET ${sets.join(',')} WHERE id=$${i} RETURNING id,nome_razao_social,status`, params);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Cliente nao encontrado' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH /api/clientes/:id/inativar
router.patch('/:id/inativar', async (req, res) => {
  try {
    const check = await db.query('SELECT id,status FROM clientes WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, error: 'Cliente nao encontrado' });
    if (check.rows[0].status === 'Inativo') return res.status(400).json({ success: false, error: 'Cliente ja inativo' });

    const ab = await db.query("SELECT COUNT(*) FROM ordens_servico WHERE cliente_id=$1 AND status NOT IN ('Finalizado','Cancelado')", [req.params.id]);
    if (parseInt(ab.rows[0].count) > 0) return res.status(400).json({ success: false, error: `Cliente possui ${ab.rows[0].count} OS em aberto` });

    await db.query("UPDATE clientes SET status='Inativo' WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: 'Cliente inativado. Historico mantido.' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH /api/clientes/:id/reativar
router.patch('/:id/reativar', async (req, res) => {
  try {
    const r = await db.query("UPDATE clientes SET status='Ativo' WHERE id=$1 AND status='Inativo' RETURNING id", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Cliente nao encontrado ou ja ativo' });
    res.json({ success: true, message: 'Cliente reativado' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
