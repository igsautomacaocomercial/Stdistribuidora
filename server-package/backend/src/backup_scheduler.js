// Backup scheduler - verifica a cada 60s se deve executar backup
const db = require('./db');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let interval = null;

function startBackupScheduler() {
  if (interval) clearInterval(interval);
  interval = setInterval(checkAndRun, 60000);
  console.log('[Backup] Agendador iniciado (verificacao a cada 60s)');
}

function stopBackupScheduler() {
  if (interval) { clearInterval(interval); interval = null; }
}

async function checkAndRun() {
  try {
    const r = await db.query('SELECT * FROM config_backup LIMIT 1');
    const cfg = r.rows[0];
    if (!cfg || !cfg.ativo) return;

    let horarios;
    try { horarios = JSON.parse(cfg.horarios); } catch (_) { return; }
    if (!Array.isArray(horarios) || !horarios.length) return;

    const now = new Date();
    const horaAtual = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    if (!horarios.includes(horaAtual)) return;

    // Verifica se ja rodou neste minuto (evita duplicatas)
    const ultimo = cfg.ultimo_backup ? new Date(cfg.ultimo_backup) : null;
    if (ultimo && Math.abs(now - ultimo) < 120000) return;

    const dir = cfg.caminho_destino;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileName = `backup_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}.sql`;
    const filePath = path.join(dir, fileName);

    const pgDump = '"C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe"';
    const cmd = `set PGPASSWORD=123 && ${pgDump} -U postgres -d st_distribuidora --clean --if-exists -f "${filePath}"`;

    exec(cmd, { timeout: 120000, shell: 'cmd.exe' }, async (err) => {
      try {
        if (err) {
          await db.query('UPDATE config_backup SET ultimo_backup=NOW(), ultimo_status=$1, updated_at=NOW() WHERE id=$2', ['Erro: ' + err.message.slice(0,200), cfg.id]);
          return;
        }
        await db.query('UPDATE config_backup SET ultimo_backup=NOW(), ultimo_status=$1, updated_at=NOW() WHERE id=$2', ['Concluido', cfg.id]);
        limparAntigos(dir, cfg.max_backups);
      } catch (_) {}
    });
  } catch (_) {}
}

function limparAntigos(dir, max) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
    .sort().reverse();
  while (files.length > max) {
    const f = files.pop();
    try { fs.unlinkSync(path.join(dir, f)); } catch (_) {}
  }
}

module.exports = { startBackupScheduler, stopBackupScheduler };
