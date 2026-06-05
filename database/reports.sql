-- ============================================================================
-- RELATORIOS E METRICAS GERENCIAIS (DASHBOARD)
-- ============================================================================

-- ############################################################################
-- 1. FATURAMENTO TOTAL POR PERIODO (Mensal / Semanal)
-- ############################################################################

-- Faturamento Mensal (considera data_saida como data de conclusao)
CREATE OR REPLACE VIEW vw_faturamento_mensal AS
SELECT
    TO_CHAR(data_saida, 'YYYY-MM')           AS ano_mes,
    TO_CHAR(data_saida, 'Mon/YYYY')          AS mes_ano,
    EXTRACT(YEAR FROM data_saida)::INT       AS ano,
    EXTRACT(MONTH FROM data_saida)::INT      AS mes,
    COUNT(*)                                 AS total_os,
    SUM(valor_total)                         AS faturamento_total,
    ROUND(AVG(valor_total), 2)              AS ticket_medio
FROM ordens_servico
WHERE status = 'Finalizado'
  AND data_saida IS NOT NULL
GROUP BY ano_mes, mes_ano, ano, mes
ORDER BY ano DESC, mes DESC;

-- Faturamento Semanal
CREATE OR REPLACE VIEW vw_faturamento_semanal AS
SELECT
    EXTRACT(YEAR FROM data_saida)::INT       AS ano,
    EXTRACT(WEEK FROM data_saida)::INT       AS semana,
    DATE_TRUNC('week', data_saida)::DATE     AS inicio_semana,
    COUNT(*)                                 AS total_os,
    SUM(valor_total)                         AS faturamento_total
FROM ordens_servico
WHERE status = 'Finalizado'
  AND data_saida IS NOT NULL
GROUP BY ano, semana, inicio_semana
ORDER BY ano DESC, semana DESC;

-- ############################################################################
-- 2. PRODUTIVIDADE POR TECNICO
-- Quantidade de OS finalizadas e valor gerado por profissional
-- ############################################################################

CREATE OR REPLACE VIEW vw_produtividade_tecnico AS
SELECT
    t.id                      AS tecnico_id,
    t.nome                    AS tecnico,
    t.especialidade,
    COUNT(*)                  AS total_os_finalizadas,
    SUM(os.valor_total)       AS valor_total_gerado,
    ROUND(AVG(os.valor_total), 2) AS ticket_medio_tecnico,
    ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(os.data_saida, NOW()) - os.data_entrada)) / 86400), 1) AS dias_medio_por_os
FROM ordens_servico os
JOIN tecnicos t ON t.id = os.tecnico_id
WHERE os.status = 'Finalizado'
GROUP BY t.id, t.nome, t.especialidade
ORDER BY valor_total_gerado DESC;

CREATE OR REPLACE VIEW vw_produtividade_tecnico_periodo AS
SELECT
    t.id                      AS tecnico_id,
    t.nome                    AS tecnico,
    DATE_TRUNC('month', os.data_saida)::DATE AS mes_referencia,
    COUNT(*)                  AS os_finalizadas,
    SUM(os.valor_total)       AS valor_gerado
FROM ordens_servico os
JOIN tecnicos t ON t.id = os.tecnico_id
WHERE os.status = 'Finalizado'
  AND os.data_saida IS NOT NULL
GROUP BY t.id, t.nome, DATE_TRUNC('month', os.data_saida)
ORDER BY mes_referencia DESC, valor_gerado DESC;

-- ############################################################################
-- 3. STATUS DAS OS EM TEMPO REAL
-- Quantas estao em cada status
-- ############################################################################

CREATE OR REPLACE VIEW vw_status_os_tempo_real AS
SELECT
    status,
    COUNT(*)                            AS quantidade,
    SUM(valor_total)                    AS valor_em_aberto,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentual
FROM ordens_servico
WHERE status != 'Finalizado'
  AND status != 'Cancelado'
GROUP BY status
ORDER BY
    CASE status
        WHEN 'Orcamento' THEN 1
        WHEN 'Aprovado' THEN 2
        WHEN 'Em Manutencao' THEN 3
        WHEN 'Aguardando Peca' THEN 4
        WHEN 'Pronto para Retirada' THEN 5
        ELSE 6
    END;

-- Consolidado geral de todas as OS (incluindo finalizadas)
CREATE OR REPLACE VIEW vw_painel_status_geral AS
SELECT
    status,
    COUNT(*)                            AS quantidade,
    SUM(valor_total)                    AS valor_total_acumulado
FROM ordens_servico
GROUP BY status
ORDER BY
    CASE status
        WHEN 'Orcamento' THEN 1
        WHEN 'Aprovado' THEN 2
        WHEN 'Em Manutencao' THEN 3
        WHEN 'Aguardando Peca' THEN 4
        WHEN 'Pronto para Retirada' THEN 5
        WHEN 'Finalizado' THEN 6
        WHEN 'Cancelado' THEN 7
    END;

-- ############################################################################
-- 4. PRINCIPAIS DEFEITOS / SERVICOS MAIS RECORRENTES
-- ############################################################################

-- Servicos mais realizados
CREATE OR REPLACE VIEW vw_servicos_mais_recorrentes AS
SELECT
    oi.descricao,
    oi.tipo,
    COUNT(*)                    AS vezes_realizado,
    SUM(oi.quantidade)          AS total_itens,
    SUM(oi.valor_total)         AS receita_gerada,
    ROUND(AVG(oi.valor_unitario), 2) AS valor_medio
FROM os_itens oi
JOIN ordens_servico os ON os.id = oi.os_id
WHERE os.status = 'Finalizado'
GROUP BY oi.descricao, oi.tipo
ORDER BY vezes_realizado DESC
LIMIT 20;

-- Defeitos relatados mais comuns (analise textual do campo defeito_relatado)
CREATE OR REPLACE VIEW vw_defeitos_mais_comuns AS
SELECT * FROM (
    SELECT
        TRIM(BOTH FROM LOWER(REGEXP_SPLIT_TO_TABLE(defeito_relatado, '[\s,.;:!?]+'))) AS palavra_chave,
        COUNT(*) AS ocorrencias
    FROM ordens_servico
    WHERE defeito_relatado IS NOT NULL
      AND TRIM(defeito_relatado) != ''
    GROUP BY 1
) sub
WHERE LENGTH(palavra_chave) > 3
  AND ocorrencias >= 2
ORDER BY ocorrencias DESC
LIMIT 30;

-- Defeitos agrupados por categoria textual simplificada
CREATE OR REPLACE VIEW vw_defeitos_categorizados AS
SELECT
    CASE
        WHEN LOWER(defeito_relatado) LIKE '%tela%' OR LOWER(defeito_relatado) LIKE '%display%' OR LOWER(defeito_relatado) LIKE '%video%' OR LOWER(defeito_relatado) LIKE '%imagem%' THEN 'Tela / Video'
        WHEN LOWER(defeito_relatado) LIKE '%teclado%' OR LOWER(defeito_relatado) LIKE '%tecla%' THEN 'Teclado'
        WHEN LOWER(defeito_relatado) LIKE '%bateria%' OR LOWER(defeito_relatado) LIKE '%carrega%' OR LOWER(defeito_relatado) LIKE '%fonte%' OR LOWER(defeito_relatado) LIKE '%energia%' THEN 'Bateria / Carregador'
        WHEN LOWER(defeito_relatado) LIKE '%som%' OR LOWER(defeito_relatado) LIKE '%audio%' OR LOWER(defeito_relatado) LIKE '%auto falante%' THEN 'Audio / Som'
        WHEN LOWER(defeito_relatado) LIKE '%lento%' OR LOWER(defeito_relatado) LIKE '%travando%' OR LOWER(defeito_relatado) LIKE '%congelando%' THEN 'Desempenho Lento'
        WHEN LOWER(defeito_relatado) LIKE '%formatar%' OR LOWER(defeito_relatado) LIKE '%formata%' OR LOWER(defeito_relatado) LIKE '%windows%' OR LOWER(defeito_relatado) LIKE '%sistema%' OR LOWER(defeito_relatado) LIKE '%os%' THEN 'Software / Sistema Operacional'
        WHEN LOWER(defeito_relatado) LIKE '%virus%' OR LOWER(defeito_relatado) LIKE '%malware%' OR LOWER(defeito_relatado) LIKE '%antivirus%' THEN 'Virus / Malware'
        WHEN LOWER(defeito_relatado) LIKE '%hd%' OR LOWER(defeito_relatado) LIKE '%disco%' OR LOWER(defeito_relatado) LIKE '%ssd%' OR LOWER(defeito_relatado) LIKE '%armazenamento%' THEN 'Armazenamento (HD/SSD)'
        WHEN LOWER(defeito_relatado) LIKE '%memoria%' OR LOWER(defeito_relatado) LIKE '%ram%' THEN 'Memoria RAM'
        WHEN LOWER(defeito_relatado) LIKE '%usb%' OR LOWER(defeito_relatado) LIKE '%porta%' OR LOWER(defeito_relatado) LIKE '%conector%' THEN 'Portas / Conectores'
        WHEN LOWER(defeito_relatado) LIKE '%wifi%' OR LOWER(defeito_relatado) LIKE '%rede%' OR LOWER(defeito_relatado) LIKE '%internet%' OR LOWER(defeito_relatado) LIKE '%conexao%' THEN 'Rede / WiFi'
        ELSE 'Outros'
    END AS categoria_defeito,
    COUNT(*) AS quantidade
FROM ordens_servico
WHERE defeito_relatado IS NOT NULL AND TRIM(defeito_relatado) != ''
GROUP BY categoria_defeito
ORDER BY quantidade DESC;

-- ############################################################################
-- 5. QUERY PARA DASHBOARD (Painel Resumo)
-- ############################################################################

CREATE OR REPLACE VIEW vw_dashboard_resumo AS
SELECT
    -- Totais gerais
    (SELECT COUNT(*) FROM ordens_servico)                                           AS total_os_geral,
    (SELECT COUNT(*) FROM ordens_servico WHERE status = 'Orcamento')               AS os_em_orcamento,
    (SELECT COUNT(*) FROM ordens_servico WHERE status = 'Em Manutencao')           AS os_em_manutencao,
    (SELECT COUNT(*) FROM ordens_servico WHERE status = 'Pronto para Retirada')    AS os_prontas_retirar,
    (SELECT COUNT(*) FROM ordens_servico WHERE status = 'Aguardando Peca')         AS os_aguardando_peca,
    (SELECT COUNT(*) FROM ordens_servico WHERE status = 'Finalizado')              AS os_finalizadas,
    (SELECT COUNT(*) FROM ordens_servico WHERE status = 'Cancelado')               AS os_canceladas,

    -- Faturamento
    (SELECT COALESCE(SUM(valor_total), 0) FROM ordens_servico WHERE status = 'Finalizado')           AS faturamento_total,
    (SELECT COALESCE(SUM(valor_total), 0) FROM ordens_servico WHERE status = 'Finalizado' AND data_saida >= DATE_TRUNC('month', CURRENT_DATE)) AS faturamento_mes_atual,
    (SELECT COALESCE(SUM(valor_total), 0) FROM ordens_servico WHERE status = 'Finalizado' AND data_saida >= DATE_TRUNC('week', CURRENT_DATE))  AS faturamento_semana_atual,

    -- Clientes e tecnicos
    (SELECT COUNT(*) FROM clientes WHERE status = 'Ativo')                         AS clientes_ativos,
    (SELECT COUNT(*) FROM tecnicos WHERE status = 'Ativo')                         AS tecnicos_ativos,

    -- Ticket medio
    (SELECT COALESCE(ROUND(AVG(valor_total), 2), 0) FROM ordens_servico WHERE status = 'Finalizado') AS ticket_medio_geral;
