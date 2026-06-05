const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { startBackupScheduler } = require('./backup_scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static files - frontend
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// Routes
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/ordens', require('./routes/ordens'));
app.use('/api/tecnicos', require('./routes/tecnicos'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/cnpj', require('./routes/cnpj'));
app.use('/api/cep', require('./routes/cep'));
app.use('/api/emitente', require('./routes/emitente'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/unidades-medida', require('./routes/unidades_medida'));
app.use('/api/grupos-produtos', require('./routes/grupos_produtos'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/servicos', require('./routes/servicos'));

// Print route (HTML page)
app.use('/print', require('./routes/print'));

// Orcamentos route
app.use('/api/orcamentos', require('./routes/orcamentos'));

// Auth route
app.use('/api', require('./routes/auth'));

// Usuarios route
app.use('/api/usuarios', require('./routes/usuarios'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Frontend SPA fallback
app.get('*', (req, res) => {
  res.sendFile(
    path.join(__dirname, '..', '..', 'frontend', 'index.html')
  );
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message });
});

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const ip = getNetworkIP();
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   ST DISTRIBUIDORA - Sistema de OS          ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║   Local:    http://localhost:${PORT}            ║`);
  console.log(`║   Rede:     http://${ip}:${PORT}             ║`);
  console.log('║   Celular:  http://' + ip + ':' + PORT + '             ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  startBackupScheduler();
});
