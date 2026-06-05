const { Service } = require('node-windows');

const svc = new Service({
  name: 'ST Distribuidora - OS Server',
  description: 'Sistema de Gestao de Ordens de Servico ST Distribuidora',
  script: require('path').join(__dirname, 'backend', 'src', 'index.js'),
  nodeOptions: [],
  env: [{
    name: 'NODE_ENV',
    value: 'production'
  }]
});

svc.on('install', () => {
  console.log('Servico instalado com sucesso!');
  svc.start();
});

svc.on('error', (err) => {
  console.error('Erro:', err);
});

svc.install();
