-- ============================================================================
-- VIEWS E CONSULTAS - HISTORICO E RASTREABILIDADE
-- ============================================================================

-- ############################################################################
-- VIEW: vw_historico_cliente
-- Exibe todo o historico de servicos de um cliente especifico
-- Uso: SELECT * FROM vw_historico_cliente WHERE cliente_id = ?;
-- ############################################################################

CREATE OR REPLACE VIEW vw_historico_cliente AS
SELECT
    c.id                                          AS cliente_id,
    c.nome_razao_social                           AS cliente,
    c.cpf_cnpj                                    AS documento_cliente,
    os.id                                         AS os_id,
    os.numero_os                                  AS numero_os,
    os.data_entrada                               AS data_entrada,
    COALESCE(os.data_saida, os.data_entrada)      AS data_servico,
    t.nome                                        AS tecnico_responsavel,
    os.status                                     AS status_os,
    STRING_AGG(
        CASE
            WHEN oi.descricao IS NOT NULL
            THEN oi.descricao || ' (x' || oi.quantidade::TEXT || ')'
            ELSE NULL
        END,
        '; ' ORDER BY oi.id
    )                                             AS servicos_realizados,
    os.valor_total                                AS valor_cobrado
FROM ordens_servico os
JOIN clientes c      ON c.id = os.cliente_id
LEFT JOIN tecnicos t ON t.id = os.tecnico_id
LEFT JOIN os_itens oi ON oi.os_id = os.id
GROUP BY c.id, c.nome_razao_social, c.cpf_cnpj,
         os.id, os.numero_os, os.data_entrada, os.data_saida,
         t.nome, os.status, os.valor_total
ORDER BY os.data_entrada DESC, os.numero_os DESC;

COMMENT ON VIEW vw_historico_cliente IS
'Retorna o historico completo de ordens de servico por cliente';

-- ############################################################################
-- VIEW: vw_auditoria_status
-- Exibe o log completo de mudancas de status
-- ############################################################################

CREATE OR REPLACE VIEW vw_auditoria_status AS
SELECT
    sl.id,
    sl.os_id,
    os.numero_os,
    c.nome_razao_social AS cliente,
    sl.status_anterior,
    sl.status_novo,
    sl.alterado_por,
    sl.created_at       AS data_alteracao
FROM status_log sl
JOIN ordens_servico os ON os.id = sl.os_id
JOIN clientes c ON c.id = os.cliente_id
ORDER BY sl.created_at DESC, sl.id DESC;

COMMENT ON VIEW vw_auditoria_status IS
'Registro de auditoria de todas as alteracoes de status das OS';

-- ############################################################################
-- VIEW: vw_os_detalhada
-- Visao completa de cada OS com dados do cliente, tecnico e checklist
-- ############################################################################

CREATE OR REPLACE VIEW vw_os_detalhada AS
SELECT
    os.id,
    os.numero_os,
    -- Cliente
    c.nome_razao_social  AS cliente_nome,
    c.cpf_cnpj           AS cliente_doc,
    c.telefone           AS cliente_telefone,
    c.whatsapp           AS cliente_whatsapp,
    c.email              AS cliente_email,
    -- Tecnico
    t.nome               AS tecnico_nome,
    t.especialidade      AS tecnico_especialidade,
    -- Equipamento
    os.marca,
    os.modelo,
    os.numero_serie,
    os.senha_bios,
    -- Diagnosticos
    os.defeito_relatado,
    os.laudo_tecnico,
    -- Status e datas
    os.status,
    os.data_entrada,
    os.data_saida,
    os.valor_total,
    -- Checklist
    cl.tela,
    cl.teclado,
    cl.teclas_especificar,
    cl.camera,
    cl.som,
    cl.rede_rj45,
    cl.rede_wifi,
    cl.usb,
    cl.microfone,
    cl.touchpad,
    cl.bateria,
    cl.tempo_autonomia,
    cl.carcaca,
    cl.observacoes
FROM ordens_servico os
JOIN clientes c           ON c.id = os.cliente_id
LEFT JOIN tecnicos t      ON t.id = os.tecnico_id
LEFT JOIN checklists cl   ON cl.os_id = os.id;

COMMENT ON VIEW vw_os_detalhada IS
'Visao completa de cada OS com dados do cliente, tecnico e checklist';

-- ############################################################################
-- VIEW: vw_os_itens_detalhado
-- Itens de servico/produto por OS
-- ############################################################################

CREATE OR REPLACE VIEW vw_os_itens_detalhado AS
SELECT
    oi.id,
    oi.os_id,
    os.numero_os,
    oi.descricao,
    oi.tipo,
    oi.quantidade,
    oi.valor_unitario,
    oi.valor_total
FROM os_itens oi
JOIN ordens_servico os ON os.id = oi.os_id
ORDER BY oi.os_id, oi.id;

COMMENT ON VIEW vw_os_itens_detalhado IS
'Itens de servico e produto vinculados a cada OS';
