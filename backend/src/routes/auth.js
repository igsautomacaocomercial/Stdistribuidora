const { Router } = require('express');
const router = Router();
const db = require('../db');

router.post('/login', async (req, res) => {
  try {
    const { nome, senha } = req.body;
    if (!nome || !senha) {
      return res.status(400).json({ success: false, error: 'Informe usuario e senha' });
    }
    const r = await db.query(
      'SELECT id, nome, nivel FROM usuarios WHERE nome = $1 AND senha = $2 AND ativo = true',
      [nome.toUpperCase().trim(), senha]
    );
    if (!r.rows.length) {
      return res.status(401).json({ success: false, error: 'Usuario ou senha invalidos' });
    }
    res.json({ success: true, user: r.rows[0] });
  } catch (e) {
    console.error('ERRO LOGIN:', e);
    res.status(500).json({ success: false, error: 'Erro interno no login' });
  }
});

module.exports = router;