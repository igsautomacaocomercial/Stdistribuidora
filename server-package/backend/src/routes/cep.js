const { Router } = require('express');
const router = Router();
const https = require('https');

function fetchViaCEP(cep) {
  return new Promise((resolve, reject) => {
    https.get(`https://viacep.com.br/ws/${cep}/json/`, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try {
          const json = JSON.parse(data);
          if (json.erro) return reject(new Error('CEP nao encontrado'));
          resolve(json);
        } catch (e) {
          reject(new Error('Resposta invalida do ViaCEP'));
        }
      });
    }).on('error', e => reject(new Error('Falha de conexao: ' + e.message)))
      .on('timeout', function() { this.destroy(); reject(new Error('Consulta CEP excedeu tempo limite')); });
  });
}

router.get('/:cep', async (req, res) => {
  try {
    const cep = req.params.cep.replace(/\D/g, '');
    if (cep.length !== 8) return res.status(400).json({ success: false, error: 'CEP invalido' });

    const data = await fetchViaCEP(cep);
    const mapped = {
      cep: data.cep,
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
      ddd: data.ddd || ''
    };

    res.json({ success: true, data: mapped });
  } catch (e) {
    res.status(400).json({ success: false, error: `Erro ao consultar CEP: ${e.message}` });
  }
});

module.exports = router;
