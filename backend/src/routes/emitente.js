const { Router } = require('express');
const router = Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM emitente LIMIT 1');
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/', async (req, res) => {
  try {
    const { cnpj, razao_social, nome_fantasia, logradouro, numero, complemento, bairro, cidade, uf, cep, telefone, email, logotipo } = req.body;
    const r = await db.query(`
      INSERT INTO emitente (cnpj,razao_social,nome_fantasia,logradouro,numero,complemento,bairro,cidade,uf,cep,telefone,email,logotipo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (cnpj) DO UPDATE SET
        razao_social=EXCLUDED.razao_social, nome_fantasia=EXCLUDED.nome_fantasia,
        logradouro=EXCLUDED.logradouro, numero=EXCLUDED.numero, complemento=EXCLUDED.complemento,
        bairro=EXCLUDED.bairro, cidade=EXCLUDED.cidade, uf=EXCLUDED.uf, cep=EXCLUDED.cep,
        telefone=EXCLUDED.telefone, email=EXCLUDED.email,         logotipo=CASE WHEN EXCLUDED.logotipo = '' THEN NULL ELSE COALESCE(EXCLUDED.logotipo, emitente.logotipo) END
      RETURNING id
    `, [cnpj, razao_social, nome_fantasia, logradouro, numero, complemento||null, bairro, cidade, uf, cep, telefone||null, email||null, logotipo||null]);
    res.json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
