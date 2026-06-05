-- ============================================================================
-- MODULO DE ORCAMENTOS - ST Distribuidora
-- ============================================================================

CREATE TYPE status_orcamento AS ENUM (
    'Aberto',
    'Enviado',
    'Aprovado',
    'Reprovado',
    'Cancelado',
    'Convertido OS'
);

CREATE TABLE orcamentos (
    id                  SERIAL PRIMARY KEY,
    numero_orcamento    INTEGER NOT NULL,
    cliente_id          INTEGER NOT NULL REFERENCES clientes(id),
    tecnico_id          INTEGER REFERENCES tecnicos(id),
    data_orcamento      DATE NOT NULL DEFAULT CURRENT_DATE,
    validade_orcamento  DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
    status              status_orcamento NOT NULL DEFAULT 'Aberto',
    equipamento_marca   VARCHAR(100),
    equipamento_modelo  VARCHAR(100),
    numero_serie        VARCHAR(100),
    defeito_relatado    TEXT,
    observacoes         TEXT,
    valor_produtos      NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_servicos      NUMERIC(12,2) NOT NULL DEFAULT 0,
    desconto_tipo       VARCHAR(10) DEFAULT 'Valor',
    desconto_valor      NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_desconto      NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_total         NUMERIC(12,2) NOT NULL DEFAULT 0,
    forma_pagamento     VARCHAR(100),
    prazo_entrega       VARCHAR(100),
    garantia            VARCHAR(100),
    criado_em           TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_numero_orcamento UNIQUE (numero_orcamento)
);

CREATE TABLE orcamento_itens (
    id              SERIAL PRIMARY KEY,
    orcamento_id    INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    tipo            tipo_item NOT NULL,
    produto_id      INTEGER REFERENCES produtos(id),
    servico_id      INTEGER REFERENCES servicos(id),
    descricao       VARCHAR(500) NOT NULL,
    quantidade      NUMERIC(12,2) NOT NULL DEFAULT 1,
    valor_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orcamentos_cliente_id ON orcamentos(cliente_id);
CREATE INDEX idx_orcamentos_status ON orcamentos(status);
CREATE INDEX idx_orcamentos_data_orcamento ON orcamentos(data_orcamento);
CREATE INDEX idx_orcamentos_numero_orcamento ON orcamentos(numero_orcamento);
CREATE INDEX idx_orcamento_itens_orcamento_id ON orcamento_itens(orcamento_id);

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_orcamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orcamentos_updated_at
    BEFORE UPDATE ON orcamentos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_orcamento_updated_at();

-- Funcao para gerar proximo numero de orcamento
CREATE OR REPLACE FUNCTION proximo_numero_orcamento()
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
BEGIN
    SELECT COALESCE(MAX(numero_orcamento), 0) + 1 INTO next_val FROM orcamentos;
    RETURN next_val;
END;
$$ LANGUAGE plpgsql;
