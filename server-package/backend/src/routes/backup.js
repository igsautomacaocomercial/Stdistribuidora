const { Router } = require('express');
const router = Router();
const db = require('../db');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function getDestino() {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'backup_config.json'), 'utf8'));
  return config.caminho_destino;
}

// GET /api/backup/config
router.get('/config', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM config_backup LIMIT 1');
    const cfg = r.rows[0] || { horarios: '["09:00","13:00","18:00"]', caminho_destino: 'C:\\Stdistribuidora\\backups', max_backups: 10, ativo: true };
    if (cfg.horarios && typeof cfg.horarios === 'string') {
      try { cfg.horarios = JSON.parse(cfg.horarios); } catch (_) { cfg.horarios = ['09:00','13:00','18:00']; }
    }
    res.json({ success: true, data: cfg });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT /api/backup/config
router.put('/config', async (req, res) => {
  try {
    const { horarios, caminho_destino, max_backups, ativo } = req.body;
    const horariosStr = JSON.stringify(horarios || ['09:00','13:00','18:00']);
    const r = await db.query(`
      UPDATE config_backup SET horarios=$1, caminho_destino=$2, max_backups=$3, ativo=$4, updated_at=NOW()
      WHERE id=(SELECT id FROM config_backup LIMIT 1) RETURNING id
    `, [horariosStr, caminho_destino || 'C:\\Stdistribuidora\\backups', max_backups || 10, ativo !== false]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Config nao encontrada' });
    res.json({ success: true, message: 'Configuracao salva' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/backup/executar
router.post('/executar', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM config_backup LIMIT 1');
    const cfg = r.rows[0];
    if (!cfg) return res.status(400).json({ success: false, error: 'Configure o backup primeiro' });

    const dir = cfg.caminho_destino;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const now = new Date();
    const fileName = `backup_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}.sql`;
    const filePath = path.join(dir, fileName);

    // Run pg_dump
    const pgDump = '"C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe"';
    const cmd = `set PGPASSWORD=123 && ${pgDump} -U postgres -d st_distribuidora --clean --if-exists -f "${filePath}"`;

    exec(cmd, { timeout: 120000, shell: 'cmd.exe' }, async (err) => {
      try {
        if (err) {
          await db.query('UPDATE config_backup SET ultimo_backup=NOW(), ultimo_status=$1, updated_at=NOW() WHERE id=$2', ['Erro: ' + err.message.slice(0,200), cfg.id]);
          return res.json({ success: false, error: err.message });
        }

        await db.query('UPDATE config_backup SET ultimo_backup=NOW(), ultimo_status=$1, updated_at=NOW() WHERE id=$2', ['Concluido', cfg.id]);

        // Limpa backups antigos (mantem só os ultimos N)
        limparBackupsAntigos(dir, cfg.max_backups);

        res.json({ success: true, message: 'Backup concluido!', file: fileName });
      } catch (e2) {
        res.status(500).json({ success: false, error: e2.message });
      }
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/backup/listar
router.get('/listar', async (req, res) => {
  try {
    const r = await db.query('SELECT caminho_destino FROM config_backup LIMIT 1');
    const dir = r.rows[0]?.caminho_destino || 'C:\\Stdistribuidora\\backups';
    if (!fs.existsSync(dir)) return res.json({ success: true, data: [] });

    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
      .map(f => {
        const stat = fs.statSync(path.join(dir, f));
        return { nome: f, tamanho: stat.size, data: stat.mtime };
      })
      .sort((a, b) => b.data - a.data);

    res.json({ success: true, data: files });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/backup/limpar
router.delete('/limpar', async (req, res) => {
  try {
    const r = await db.query('SELECT caminho_destino, max_backups FROM config_backup LIMIT 1');
    const cfg = r.rows[0];
    const dir = cfg?.caminho_destino || 'C:\\Stdistribuidora\\backups';
    const max = cfg?.max_backups || 10;
    const removidos = limparBackupsAntigos(dir, max);
    res.json({ success: true, message: `${removidos} backup(s) antigo(s) removido(s)` });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

function limparBackupsAntigos(dir, max) {
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
    .sort()
    .reverse();
  let removidos = 0;
  while (files.length > max) {
    const f = files.pop();
    try {
      fs.unlinkSync(path.join(dir, f));
      removidos++;
    } catch (_) {}
  }
  return removidos;
}

module.exports = router;
