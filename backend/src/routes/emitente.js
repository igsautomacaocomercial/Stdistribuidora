const { Router } = require('express');
const router = Router();
const db = require('../db');

// GET - retorna o registro mais recente (singleton)
router.get('/', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM emitente ORDER BY id DESC LIMIT 1');
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT - sempre atualiza o registro existente ou cria um novo
router.put('/', async (req, res) => {
  try {
    const { cnpj, razao_social, nome_fantasia, logradouro, numero, complemento, bairro, cidade, uf, cep, telefone, email, logotipo } = req.body;

    // Verifica se ja existe algum registro
    const existing = await db.query('SELECT id FROM emitente LIMIT 1');

    let r;
    if (existing.rows.length) {
      // Atualiza o registro existente
      r = await db.query(`
        UPDATE emitente SET
          cnpj=$1, razao_social=$2, nome_fantasia=$3,
          logradouro=$4, numero=$5, complemento=$6,
          bairro=$7, cidade=$8, uf=$9, cep=$10,
          telefone=$11, email=$12,
          logotipo=CASE WHEN $13 = '' THEN NULL ELSE COALESCE($13, logotipo) END,
          updated_at=NOW()
        WHERE id=$14
        RETURNING id
      `, [cnpj, razao_social, nome_fantasia, logradouro, numero, complemento||null, bairro, cidade, uf, cep, telefone||null, email||null, logotipo||null, existing.rows[0].id]);
    } else {
      // Cria primeiro registro
      r = await db.query(`
        INSERT INTO emitente (cnpj,razao_social,nome_fantasia,logradouro,numero,complemento,bairro,cidade,uf,cep,telefone,email,logotipo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING id
      `, [cnpj, razao_social, nome_fantasia, logradouro, numero, complemento||null, bairro, cidade, uf, cep, telefone||null, email||null, logotipo||null]);
    }

    res.json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
