const { Router } = require('express');
const router = Router();
const https = require('https');

function fetchAPI(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000, headers: { 'User-Agent': 'STDistribuidora/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          let msg = `HTTP ${res.statusCode}`;
          try {
            const errJson = JSON.parse(data);
            if (errJson.message) msg = errJson.message;
            else if (errJson.error) msg = errJson.error;
          } catch (_) {
            msg = data.slice(0, 200) || `HTTP ${res.statusCode}`;
          }
          return reject(new Error(msg));
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Resposta invalida da Receita (nao foi possivel interpretar os dados)')); }
      });
    }).on('error', e => reject(new Error('Falha de conexao: ' + e.message)))
      .on('timeout', function() { this.destroy(); reject(new Error('A consulta ao CNPJ excedeu o tempo limite')); });
  });
}

router.get('/:cnpj', async (req, res) => {
  try {
    const cnpj = req.params.cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return res.status(400).json({ success: false, error: 'CNPJ invalido' });

    let data;
    try {
      data = await fetchAPI(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    } catch (err) {
      // Fallback para ReceitaWS se BrasilAPI falhar
      console.warn(`[CNPJ] BrasilAPI falhou (${err.message}), tentando ReceitaWS...`);
      const raw = await fetchAPI(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
      data = {
        cnpj: raw.cnpj,
        razao_social: raw.nome,
        nome_fantasia: raw.fantasia || raw.nome,
        logradouro: raw.logradouro,
        numero: raw.numero || 'S/N',
        complemento: raw.complemento || '',
        bairro: raw.bairro,
        municipio: raw.municipio,
        uf: raw.uf,
        cep: raw.cep,
        ddd_telefone_1: raw.telefone || '',
        email: raw.email || ''
      };
    }

    const mapped = {
      cnpj: data.cnpj,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia || data.razao_social,
      logradouro: data.logradouro,
      numero: data.numero || 'S/N',
      complemento: data.complemento || '',
      bairro: data.bairro,
      cidade: data.municipio,
      uf: data.uf,
      cep: data.cep,
      telefone: data.ddd_telefone_1 || '',
      email: data.email || ''
    };

    res.json({ success: true, data: mapped });
  } catch (e) {
    res.status(400).json({ success: false, error: `Erro ao consultar CNPJ: ${e.message}` });
  }
});

module.exports = router;
