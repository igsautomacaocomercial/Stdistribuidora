-- ============================================================================
-- MODULO PDV / CAIXA - ST Distribuidora
-- ============================================================================

-- Formas de Pagamento
CREATE TABLE formas_pagamento (
    id                   SERIAL PRIMARY KEY,
    descricao            VARCHAR(100) NOT NULL,
    tipo                 VARCHAR(20) NOT NULL DEFAULT 'Outros',
    permite_troco        BOOLEAN NOT NULL DEFAULT false,
    permite_parcelamento BOOLEAN NOT NULL DEFAULT false,
    taxa_percentual      NUMERIC(5,2) NOT NULL DEFAULT 0,
    ativo                BOOLEAN NOT NULL DEFAULT true,
    criado_em            TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO formas_pagamento (descricao, tipo, permite_troco, permite_parcelamento) VALUES
('Dinheiro', 'Dinheiro', true, false),
('Pix', 'Pix', false, false),
('Cartao Debito', 'Debito', false, false),
('Cartao Credito', 'Credito', false, true),
('Vale/Convenio', 'Prazo', false, false),
('Transferencia', 'Pix', false, false),
('Outros', 'Outros', false, false);

-- Vendedores
CREATE TABLE vendedores (
    id                   SERIAL PRIMARY KEY,
    nome                 VARCHAR(200) NOT NULL,
    telefone             VARCHAR(20),
    percentual_comissao  NUMERIC(5,2) NOT NULL DEFAULT 0,
    status               VARCHAR(20) NOT NULL DEFAULT 'Ativo',
    criado_em            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Caixas (abertura/fechamento)
CREATE TABLE caixas (
    id                      SERIAL PRIMARY KEY,
    data_abertura           TIMESTAMP NOT NULL DEFAULT NOW(),
    data_fechamento         TIMESTAMP,
    usuario_abertura        VARCHAR(100) NOT NULL,
    usuario_fechamento      VARCHAR(100),
    valor_inicial           NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_dinheiro          NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_pix               NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_debito            NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_credito           NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_vale              NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_outros            NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_vendido           NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_sangrias          NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_reforcos          NUMERIC(12,2) NOT NULL DEFAULT 0,
    diferenca_caixa         NUMERIC(12,2) NOT NULL DEFAULT 0,
    observacao_abertura     TEXT,
    observacao_fechamento   TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'Aberto',
    criado_em               TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_caixas_status ON caixas(status);
CREATE INDEX idx_caixas_data_abertura ON caixas(data_abertura);

-- Movimentos de caixa (sangria/reforco)
CREATE TABLE caixa_movimentos (
    id              SERIAL PRIMARY KEY,
    caixa_id        INTEGER NOT NULL REFERENCES caixas(id),
    tipo            VARCHAR(20) NOT NULL,
    valor           NUMERIC(12,2) NOT NULL,
    motivo          TEXT,
    responsavel     VARCHAR(100),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_caixa_movimentos_caixa_id ON caixa_movimentos(caixa_id);

-- Vendas
CREATE TYPE status_venda AS ENUM ('Aberta', 'Finalizada', 'Cancelada');
CREATE TYPE origem_venda AS ENUM ('PDV', 'OS', 'Orcamento');

CREATE TABLE vendas (
    id                  SERIAL PRIMARY KEY,
    numero_venda        INTEGER NOT NULL,
    caixa_id            INTEGER NOT NULL REFERENCES caixas(id),
    cliente_id          INTEGER REFERENCES clientes(id),
    vendedor_id         INTEGER NOT NULL REFERENCES vendedores(id),
    data_hora           TIMESTAMP NOT NULL DEFAULT NOW(),
    status              status_venda NOT NULL DEFAULT 'Aberta',
    subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
    desconto_tipo       VARCHAR(10) DEFAULT 'Valor',
    desconto_valor      NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_desconto      NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_total         NUMERIC(12,2) NOT NULL DEFAULT 0,
    observacao          TEXT,
    origem              origem_venda NOT NULL DEFAULT 'PDV',
    os_id               INTEGER REFERENCES ordens_servico(id),
    motivo_cancelamento TEXT,
    cancelado_por       VARCHAR(100),
    cancelado_em        TIMESTAMP,
    criado_em           TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_numero_venda UNIQUE (numero_venda)
);

CREATE INDEX idx_vendas_caixa_id ON vendas(caixa_id);
CREATE INDEX idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX idx_vendas_vendedor_id ON vendas(vendedor_id);
CREATE INDEX idx_vendas_status ON vendas(status);
CREATE INDEX idx_vendas_data_hora ON vendas(data_hora);

CREATE TABLE venda_itens (
    id                  SERIAL PRIMARY KEY,
    venda_id            INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id          INTEGER REFERENCES produtos(id),
    descricao           VARCHAR(500) NOT NULL,
    quantidade          NUMERIC(12,2) NOT NULL DEFAULT 1,
    valor_unitario      NUMERIC(12,2) NOT NULL DEFAULT 0,
    desconto_tipo       VARCHAR(10),
    desconto_valor      NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_desconto      NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_total         NUMERIC(12,2) NOT NULL DEFAULT 0,
    custo_unitario      NUMERIC(12,2) NOT NULL DEFAULT 0,
    comissao_percentual NUMERIC(5,2),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venda_itens_venda_id ON venda_itens(venda_id);

CREATE TABLE venda_pagamentos (
    id                  SERIAL PRIMARY KEY,
    venda_id            INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    forma_pagamento_id  INTEGER NOT NULL REFERENCES formas_pagamento(id),
    valor               NUMERIC(12,2) NOT NULL,
    parcelas            INTEGER DEFAULT 1,
    valor_recebido      NUMERIC(12,2),
    troco               NUMERIC(12,2) NOT NULL DEFAULT 0,
    autorizacao_cartao  VARCHAR(100),
    observacao          TEXT,
    criado_em           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venda_pagamentos_venda_id ON venda_pagamentos(venda_id);

-- Comissoes
CREATE TABLE comissoes (
    id                  SERIAL PRIMARY KEY,
    venda_id            INTEGER NOT NULL REFERENCES vendas(id),
    vendedor_id         INTEGER NOT NULL REFERENCES vendedores(id),
    valor_base          NUMERIC(12,2) NOT NULL,
    percentual          NUMERIC(5,2) NOT NULL,
    valor_comissao      NUMERIC(12,2) NOT NULL,
    pago                BOOLEAN NOT NULL DEFAULT false,
    pago_em             TIMESTAMP,
    criado_em           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comissoes_vendedor_id ON comissoes(vendedor_id);
CREATE INDEX idx_comissoes_venda_id ON comissoes(venda_id);
CREATE INDEX idx_comissoes_pago ON comissoes(pago);

-- Movimentacao de Estoque
CREATE TABLE estoque_movimentos (
    id                  SERIAL PRIMARY KEY,
    produto_id          INTEGER NOT NULL REFERENCES produtos(id),
    tipo                VARCHAR(20) NOT NULL,
    quantidade          NUMERIC(12,2) NOT NULL,
    saldo_anterior      NUMERIC(12,2) NOT NULL,
    saldo_posterior     NUMERIC(12,2) NOT NULL,
    venda_id            INTEGER REFERENCES vendas(id),
    observacao          TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estoque_movimentos_produto_id ON estoque_movimentos(produto_id);
CREATE INDEX idx_estoque_movimentos_venda_id ON estoque_movimentos(venda_id);

-- Funcao para proximo numero de venda
CREATE OR REPLACE FUNCTION proximo_numero_venda()
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
BEGIN
    SELECT COALESCE(MAX(numero_venda), 0) + 1 INTO next_val FROM vendas;
    RETURN next_val;
END;
$$ LANGUAGE plpgsql;
