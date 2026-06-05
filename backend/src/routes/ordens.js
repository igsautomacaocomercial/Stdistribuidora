const { Router } = require('express');
const router = Router();
const db = require('../db');

// GET /api/ordens?status=&q=&cliente_id=&tecnico_id=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { status, q, cliente_id, tecnico_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = []; const wheres = []; let i = 1;

    if (status) { wheres.push(`os.status = $${i++}`); params.push(status); }
    if (cliente_id) { wheres.push(`os.cliente_id = $${i++}`); params.push(cliente_id); }
    if (tecnico_id) { wheres.push(`os.tecnico_id = $${i++}`); params.push(tecnico_id); }
    if (q && q.trim()) {
      const t = `%${q.trim()}%`;
      wheres.push(`(c.nome_razao_social ILIKE $${i} OR os.marca ILIKE $${i} OR os.modelo ILIKE $${i} OR os.numero_serie ILIKE $${i} OR os.numero_os::text ILIKE $${i})`);
      params.push(t); i++;
    }

    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

    const count = await db.query(`SELECT COUNT(*) FROM ordens_servico os JOIN clientes c ON c.id=os.cliente_id ${where}`, params);
    const total = parseInt(count.rows[0].count);

    params.push(parseInt(limit), offset);
    const data = await db.query(`
      SELECT os.*, c.nome_razao_social AS cliente_nome, c.whatsapp AS cliente_whatsapp,
        t.nome AS tecnico_nome
      FROM ordens_servico os
      JOIN clientes c ON c.id=os.cliente_id
      LEFT JOIN tecnicos t ON t.id=os.tecnico_id
      ${where}
      ORDER BY os.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `, params);

    res.json({ success: true, data: data.rows, pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / +limit) } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/ordens/:id
router.get('/:id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM vw_os_detalhada WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'OS nao encontrada' });

    const itens = await db.query('SELECT * FROM os_itens WHERE os_id=$1 ORDER BY id', [req.params.id]);
    const logs = await db.query('SELECT * FROM vw_auditoria_status WHERE os_id=$1 ORDER BY data_alteracao DESC', [req.params.id]);
    const fotos = await db.query('SELECT id, ordem FROM os_fotos WHERE os_id=$1 ORDER BY ordem', [req.params.id]);

    res.json({ success: true, data: { ...r.rows[0], itens: itens.rows, auditoria: logs.rows, fotos: fotos.rows } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/ordens
router.post('/', async (req, res) => {
  try {
    const { cliente_id, tecnico_id, marca, modelo, numero_serie, senha_bios, defeito_relatado, localizacao } = req.body;
    if (!cliente_id) return res.status(400).json({ success: false, error: 'cliente_id obrigatorio' });

    const r = await db.query(`
      INSERT INTO ordens_servico (cliente_id,tecnico_id,marca,modelo,numero_serie,senha_bios,defeito_relatado,localizacao)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, numero_os
    `, [cliente_id, tecnico_id||null, marca||null, modelo||null, numero_serie||null, senha_bios||null, defeito_relatado||null, localizacao||null]);

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT /api/ordens/:id
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['tecnico_id','marca','modelo','numero_serie','senha_bios','defeito_relatado','laudo_tecnico','valor_total','localizacao'];
    const sets = []; const params = []; let i = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f}=$${i++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo' });
    params.push(req.params.id);
    const r = await db.query(`UPDATE ordens_servico SET ${sets.join(',')} WHERE id=$${i} RETURNING id,numero_os,status`, params);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'OS nao encontrada' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PATCH /api/ordens/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status obrigatorio' });

    const valid = ['Orcamento','Aprovado','Em Manutencao','Aguardando Peca','Pronto para Retirada','Finalizado','Cancelado'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, error: 'Status invalido' });

    const check = await db.query('SELECT id,status FROM ordens_servico WHERE id=$1', [req.params.id]);
    if (!check.rows.length) return res.status(404).json({ success: false, error: 'OS nao encontrada' });

    const oldStatus = check.rows[0].status;

    // Se for Finalizar, registra data_saida
    if (status === 'Finalizado') {
      await db.query('UPDATE ordens_servico SET status=$1, data_saida=NOW() WHERE id=$2', [status, req.params.id]);
    } else {
      await db.query('UPDATE ordens_servico SET status=$1 WHERE id=$2', [status, req.params.id]);
    }

    // Log manual (trigger tambem faz, mas garantimos)
    const user = req.headers['x-user'] || 'sistema';
    await db.query(
      'INSERT INTO status_log (os_id, status_anterior, status_novo, alterado_por) VALUES ($1,$2,$3,$4)',
      [req.params.id, oldStatus, status, user]
    );

    res.json({ success: true, message: `Status alterado de ${oldStatus} para ${status}` });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/ordens/:id/itens
router.post('/:id/itens', async (req, res) => {
  try {
    const { descricao, tipo, quantidade, valor_unitario } = req.body;
    if (!descricao || !tipo) return res.status(400).json({ success: false, error: 'descricao e tipo obrigatorios' });

    const r = await db.query(
      'INSERT INTO os_itens (os_id,descricao,tipo,quantidade,valor_unitario) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [req.params.id, descricao, tipo, quantidade||1, valor_unitario||0]
    );

    // Recalcular total da OS
    await db.query(`UPDATE ordens_servico SET valor_total = (SELECT COALESCE(SUM(valor_total),0) FROM os_itens WHERE os_id=$1) WHERE id=$1`, [req.params.id]);

    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/ordens/:id/itens/:itemId
router.delete('/:id/itens/:itemId', async (req, res) => {
  try {
    await db.query('DELETE FROM os_itens WHERE id=$1 AND os_id=$2', [req.params.itemId, req.params.id]);
    await db.query(`UPDATE ordens_servico SET valor_total = (SELECT COALESCE(SUM(valor_total),0) FROM os_itens WHERE os_id=$1) WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Checklist
// GET /api/ordens/:id/checklist
router.get('/:id/checklist', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM checklists WHERE os_id=$1', [req.params.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/ordens/:id/checklist
router.post('/:id/checklist', async (req, res) => {
  try {
    const { tela, teclado, teclas_especificar, camera, som, rede_rj45, rede_wifi, usb, microfone, touchpad, bateria, tempo_autonomia, carcaca, observacoes } = req.body;

    // Upsert (INSERT ON CONFLICT DO UPDATE)
    const r = await db.query(`
      INSERT INTO checklists (os_id,tela,teclado,teclas_especificar,camera,som,rede_rj45,rede_wifi,usb,microfone,touchpad,bateria,tempo_autonomia,carcaca,observacoes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (os_id) DO UPDATE SET
        tela=EXCLUDED.tela, teclado=EXCLUDED.teclado, teclas_especificar=EXCLUDED.teclas_especificar,
        camera=EXCLUDED.camera, som=EXCLUDED.som, rede_rj45=EXCLUDED.rede_rj45,
        rede_wifi=EXCLUDED.rede_wifi, usb=EXCLUDED.usb, microfone=EXCLUDED.microfone,
        touchpad=EXCLUDED.touchpad, bateria=EXCLUDED.bateria, tempo_autonomia=EXCLUDED.tempo_autonomia,
        carcaca=EXCLUDED.carcaca, observacoes=EXCLUDED.observacoes
      RETURNING id
    `, [req.params.id, tela||'OK', teclado||'OK', teclas_especificar||null, camera||'OK', som||'OK', rede_rj45||'OK', rede_wifi||'OK', usb||'OK', microfone||'OK', touchpad||'OK', bateria||'Sem Bateria', tempo_autonomia||null, carcaca||null, observacoes||null]);

    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/ordens/:id/fotos
router.get('/:id/fotos', async (req, res) => {
  try {
    const r = await db.query('SELECT id, ordem, created_at FROM os_fotos WHERE os_id=$1 ORDER BY ordem', [req.params.id]);
    const fotos = await db.query('SELECT id, foto, ordem FROM os_fotos WHERE os_id=$1 ORDER BY ordem', [req.params.id]);
    res.json({ success: true, data: fotos.rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/ordens/:id/fotos
router.post('/:id/fotos', async (req, res) => {
  try {
    const { foto } = req.body;
    if (!foto) return res.status(400).json({ success: false, error: 'Foto obrigatoria' });

    // Conta fotos existentes
    const count = await db.query('SELECT COUNT(*) FROM os_fotos WHERE os_id=$1', [req.params.id]);
    const total = parseInt(count.rows[0].count);
    if (total >= 5) return res.status(400).json({ success: false, error: 'Maximo de 5 fotos por OS' });

    const r = await db.query(
      'INSERT INTO os_fotos (os_id, foto, ordem) VALUES ($1, $2, $3) RETURNING id, ordem',
      [req.params.id, foto, total]
    );

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/ordens/:id/fotos/:fotoId
router.delete('/:id/fotos/:fotoId', async (req, res) => {
  try {
    await db.query('DELETE FROM os_fotos WHERE id=$1 AND os_id=$2', [req.params.fotoId, req.params.id]);
    // Reordena
    await db.query(`
      UPDATE os_fotos SET ordem = n.rn
      FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY ordem) - 1 AS rn FROM os_fotos WHERE os_id=$1) n
      WHERE os_fotos.id = n.id
    `, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/ordens/print/:id - dados para impressao
router.get('/print/:id', async (req, res) => {
  try {
    const os = await db.query('SELECT * FROM vw_os_detalhada WHERE id=$1', [req.params.id]);
    if (!os.rows.length) return res.status(404).json({ success: false, error: 'OS nao encontrada' });

    const itens = await db.query('SELECT * FROM os_itens WHERE os_id=$1 ORDER BY id', [req.params.id]);
    const emit = await db.query('SELECT * FROM emitente LIMIT 1');

    res.json({ success: true, data: { ...os.rows[0], itens: itens.rows, emitente: emit.rows[0] || null } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
