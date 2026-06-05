/**
 * ============================================================================
 * INTEGRACAO: BUSCA DE CNPJ NA RECEITA FEDERAL
 * ============================================================================
 *
 * API utilizada: BrasilAPI (https://brasilapi.com.br)
 * Alternativa: ReceitaWS (https://receitaws.com.br)
 *
 * Exemplo em Node.js com Express
 */

const axios = require('axios');

// --------------------------------------------------------------------------
// Funcao principal: buscar CNPJ
// Retorna dados completos da empresa via BrasilAPI (gratuita, sem limites)
// --------------------------------------------------------------------------
async function buscarCNPJ(cnpj) {
    // Remove mascara do CNPJ (00.000.000/0000-00 -> 00000000000000)
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    if (cnpjLimpo.length !== 14) {
        throw new Error('CNPJ invalido. Deve conter 14 digitos.');
    }

    try {
        const response = await axios.get(
            `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
            { timeout: 10000 }
        );

        const data = response.data;

        // Mapeia os campos da API para o formato do sistema
        return {
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
            email: data.email || '',
            porte: data.porte,
            atividade_principal: data.cnae_fiscal_descricao || ''
        };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            throw new Error('CNPJ nao encontrado na Receita Federal.');
        }
        throw new Error(`Erro ao consultar CNPJ: ${error.message}`);
    }
}

// --------------------------------------------------------------------------
// Funcao alternativa: buscarCNPJ_ReceitaWS (fallback)
// --------------------------------------------------------------------------
async function buscarCNPJ_ReceitaWS(cnpj) {
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    try {
        const response = await axios.get(
            `https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`,
            { timeout: 10000 }
        );

        const data = response.data;

        if (data.status === 'ERROR') {
            throw new Error(data.message || 'CNPJ nao encontrado.');
        }

        return {
            cnpj: data.cnpj,
            razao_social: data.nome,
            nome_fantasia: data.fantasia || data.nome,
            logradouro: data.logradouro,
            numero: data.numero || 'S/N',
            complemento: data.complemento || '',
            bairro: data.bairro,
            cidade: data.municipio,
            uf: data.uf,
            cep: data.cep,
            telefone: data.telefone || '',
            email: data.email || '',
            porte: data.porte,
            atividade_principal: data.atividade_principal || ''
        };
    } catch (error) {
        throw new Error(`Erro ao consultar CNPJ (ReceitaWS): ${error.message}`);
    }
}

// --------------------------------------------------------------------------
// ROTA EXPRESS: GET /api/cnpj/:cnpj
// Exemplo de endpoint para ser consumido pelo frontend
// --------------------------------------------------------------------------
/*
app.get('/api/cnpj/:cnpj', async (req, res) => {
    try {
        const dados = await buscarCNPJ(req.params.cnpj);
        res.json({ success: true, data: dados });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
*/

// --------------------------------------------------------------------------
// ROTA EXPRESS: GET /api/cnpj/:cnpj/emitente
// Preenche automaticamente o cadastro do emitente (ST Distribuidora)
// --------------------------------------------------------------------------
/*
app.get('/api/cnpj/:cnpj/emitente', async (req, res) => {
    try {
        const dados = await buscarCNPJ(req.params.cnpj);

        // Mapeia para a tabela emitente
        const emitente = {
            cnpj: dados.cnpj,
            razao_social: dados.razao_social,
            nome_fantasia: dados.nome_fantasia,
            logradouro: dados.logradouro,
            numero: dados.numero,
            complemento: dados.complemento,
            bairro: dados.bairro,
            cidade: dados.cidade,
            uf: dados.uf,
            cep: dados.cep,
            telefone: dados.telefone,
            email: dados.email
        };

        res.json({ success: true, data: emitente });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
*/

module.exports = { buscarCNPJ, buscarCNPJ_ReceitaWS };
