/**
 * ============================================================================
 * INTEGRACAO: NOTIFICACAO VIA WHATSAPP
 * ============================================================================
 *
 * Duas abordagens:
 * 1. Link direto do WhatsApp Web/App (gratuito, sem API)
 * 2. Integracao com Evolution API / Z-API (recomendado para producao)
 */

// --------------------------------------------------------------------------
// ABORDAGEM 1: LINK DIRETO DO WHATSAPP
// Gera um link wa.me que abre o WhatsApp com a mensagem pre-preenchida
// --------------------------------------------------------------------------

/**
 * Gera link do WhatsApp com mensagem pre-formatada do status da OS
 *
 * @param {string} telefone - Telefone do cliente (com DDI e DDD, ex: 5511999999999)
 * @param {object} os - Dados da Ordem de Servico
 * @returns {string} URL do WhatsApp
 */
function gerarLinkWhatsApp(telefone, os) {
    // Remove caracteres nao numericos do telefone
    const telLimpo = telefone.replace(/\D/g, '');

    // Formata a mensagem
    const mensagem = formatarMensagemOS(os);

    // Codifica a mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);

    return `https://wa.me/${telLimpo}?text=${mensagemCodificada}`;
}

/**
 * Formata a mensagem resumida da OS para envio via WhatsApp
 */
function formatarMensagemOS(os) {
    const linhas = [
        `*ST Distribuidora de Informatica*`,
        `*Ordem de Servico Nº ${os.numero_os}*`,
        `--------------------------------`,
        `Cliente: ${os.cliente_nome}`,
        `Equipamento: ${os.marca || '---'} ${os.modelo || '---'}`,
        `Defeito: ${os.defeito_relatado || '---'}`,
        `Status: *${os.status}*`,
        `--------------------------------`,
    ];

    if (os.valor_total > 0) {
        linhas.push(`Valor Total: R$ ${os.valor_total.toFixed(2)}`);
    }

    if (os.data_saida) {
        linhas.push(`Previsao: ${formatarDataBR(os.data_saida)}`);
    }

    linhas.push('');
    linhas.push(`_Mensagem gerada automaticamente pelo sistema de OS._`);

    return linhas.join('\n');
}

/**
 * Formata data para o padrao brasileiro
 */
function formatarDataBR(data) {
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// --------------------------------------------------------------------------
// ABORDAGEM 2: INTEGRACAO COM EVOLUTION API
// (Recomendada para disparo automatizado sem intervencao manual)
// --------------------------------------------------------------------------

/**
 * Envia mensagem via Evolution API
 *
 * @param {string} instanceName - Nome da instancia no Evolution API
 * @param {string} apikey - Chave da API
 * @param {string} telefone - Telefone de destino (com DDI)
 * @param {string} mensagem - Texto a ser enviado
 * @returns {Promise<object>} Resposta da API
 */
async function enviarWhatsAppEvolutionAPI(instanceName, apikey, telefone, mensagem) {
    const axios = require('axios');

    const telLimpo = telefone.replace(/\D/g, '');

    const payload = {
        number: telLimpo,
        text: mensagem,
        // Opcional: anexar PDF da OS
        // media: {
        //     mediaType: 'document',
        //     fileName: `OS-${numeroOS}.pdf`,
        //     url: 'https://...'
        // }
    };

    try {
        const response = await axios.post(
            `https://evo.stdistribuidora.com.br/message/sendText/${instanceName}`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apikey
                },
                timeout: 15000
            }
        );
        return response.data;
    } catch (error) {
        throw new Error(`Erro ao enviar WhatsApp: ${error.message}`);
    }
}

/**
 * Envia mensagem via Z-API
 */
async function enviarWhatsAppZAPI(clientToken, instanceId, telefone, mensagem) {
    const axios = require('axios');

    const telLimpo = telefone.replace(/\D/g, '');

    try {
        const response = await axios.post(
            `https://api.z-api.io/instances/${instanceId}/token/${clientToken}/send-text`,
            {
                phone: telLimpo,
                message: mensagem
            },
            { timeout: 15000 }
        );
        return response.data;
    } catch (error) {
        throw new Error(`Erro ao enviar WhatsApp Z-API: ${error.message}`);
    }
}

// --------------------------------------------------------------------------
// EXEMPLO DE USO NO BACKEND (Express)
// --------------------------------------------------------------------------
/*
app.post('/api/os/:id/notificar-whatsapp', async (req, res) => {
    try {
        const { id } = req.params;

        // Busca OS e dados do cliente no banco
        const result = await db.query(`
            SELECT
                os.numero_os, os.marca, os.modelo,
                os.defeito_relatado, os.status,
                os.valor_total, os.data_saida,
                c.nome_razao_social AS cliente_nome,
                c.whatsapp
            FROM ordens_servico os
            JOIN clientes c ON c.id = os.cliente_id
            WHERE os.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'OS nao encontrada' });
        }

        const os = result.rows[0];

        if (!os.whatsapp) {
            return res.status(400).json({ error: 'Cliente nao possui WhatsApp cadastrado' });
        }

        // Abordagem 1: Link direto
        const link = gerarLinkWhatsApp(os.whatsapp, os);

        // Abordagem 2: Envio automatico via Evolution API
        // await enviarWhatsAppEvolutionAPI(
        //     'minha-instancia',
        //     process.env.EVOLUTION_API_KEY,
        //     os.whatsapp,
        //     formatarMensagemOS(os)
        // );

        res.json({
            success: true,
            link_whatsapp: link,
            mensagem: formatarMensagemOS(os)
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
*/

module.exports = {
    gerarLinkWhatsApp,
    formatarMensagemOS,
    enviarWhatsAppEvolutionAPI,
    enviarWhatsAppZAPI
};
