-- ============================================================================
-- SISTEMA DE GESTAO DE ORDENS DE SERVICO (OS) - ASSISTENCIA TECNICA
-- PostgreSQL 15+
-- ============================================================================

-- ############################################################################
-- DOMINIOS / ENUMS
-- ############################################################################

CREATE TYPE tipo_pessoa AS ENUM ('PF', 'PJ');
CREATE TYPE status_cliente AS ENUM ('Ativo', 'Inativo');
CREATE TYPE status_tecnico AS ENUM ('Ativo', 'Inativo');
CREATE TYPE tipo_item AS ENUM ('Servico', 'Produto');
CREATE TYPE status_os AS ENUM (
    'Orcamento',
    'Aprovado',
    'Em Manutencao',
    'Aguardando Peca',
    'Pronto para Retirada',
    'Finalizado',
    'Cancelado'
);
CREATE TYPE status_tela AS ENUM ('OK', 'Esbranquicada', 'Dead Pixel');
CREATE TYPE status_teclado AS ENUM ('OK', 'Faltam Teclas', 'Teclas Nao Funcionam');
CREATE TYPE status_componente AS ENUM ('OK', 'Ruim');
CREATE TYPE status_bateria AS ENUM ('Sem Bateria', 'Com Bateria');

-- ############################################################################
-- TABELA: emitente (Empresa / Assistencia Tecnica)
-- ############################################################################

CREATE TABLE emitente (
    id              SERIAL PRIMARY KEY,
    cnpj            VARCHAR(18) NOT NULL UNIQUE,
    razao_social    VARCHAR(255) NOT NULL,
    nome_fantasia   VARCHAR(255),
    logradouro      VARCHAR(255) NOT NULL,
    numero          VARCHAR(20) NOT NULL,
    complemento     VARCHAR(100),
    bairro          VARCHAR(100) NOT NULL,
    cidade          VARCHAR(100) NOT NULL,
    uf              CHAR(2) NOT NULL,
    cep             VARCHAR(10) NOT NULL,
    telefone        VARCHAR(20) NOT NULL,
    celular         VARCHAR(20),
    email           VARCHAR(255),
    site            VARCHAR(255),
    logotipo        TEXT,           -- base64 ou caminho do arquivo
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ############################################################################
-- TABELA: clientes
-- ############################################################################

CREATE TABLE clientes (
    id                  SERIAL PRIMARY KEY,
    tipo                tipo_pessoa NOT NULL,
    cpf_cnpj            VARCHAR(18) NOT NULL UNIQUE,
    nome_razao_social   VARCHAR(255) NOT NULL,
    nome_fantasia       VARCHAR(255),
    inscricao_estadual  VARCHAR(20),
    telefone            VARCHAR(20),
    whatsapp            VARCHAR(20),
    email               VARCHAR(255),
    cep                 VARCHAR(10),
    logradouro          VARCHAR(255),
    numero              VARCHAR(20),
    complemento         VARCHAR(100),
    bairro              VARCHAR(100),
    cidade              VARCHAR(100),
    uf                  CHAR(2),
    status              status_cliente NOT NULL DEFAULT 'Ativo',
    data_cadastro       DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_status ON clientes (status);
CREATE INDEX idx_clientes_cpf_cnpj ON clientes (cpf_cnpj);
CREATE INDEX idx_clientes_nome ON clientes USING btree (lower(nome_razao_social) varchar_pattern_ops);

-- ############################################################################
-- TABELA: tecnicos
-- ############################################################################

CREATE TABLE tecnicos (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(255) NOT NULL,
    especialidade   VARCHAR(255),
    status          status_tecnico NOT NULL DEFAULT 'Ativo',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tecnicos_status ON tecnicos (status);

-- ############################################################################
-- TABELA: servicos_produtos (Catalogo)
-- ############################################################################

CREATE TABLE servicos_produtos (
    id              SERIAL PRIMARY KEY,
    tipo            tipo_item NOT NULL,
    descricao       VARCHAR(255) NOT NULL,
    valor_base      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_base >= 0),
    categoria       VARCHAR(100),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_servicos_produtos_tipo ON servicos_produtos (tipo);
CREATE INDEX idx_servicos_produtos_ativo ON servicos_produtos (ativo);

-- ############################################################################
-- TABELA: ordens_servico
-- ############################################################################

CREATE TABLE ordens_servico (
    id                SERIAL PRIMARY KEY,
    numero_os         INTEGER NOT NULL UNIQUE,
    cliente_id        INTEGER NOT NULL,
    tecnico_id        INTEGER,
    marca             VARCHAR(100),
    modelo            VARCHAR(100),
    numero_serie      VARCHAR(100),
    senha_bios        VARCHAR(255),
    defeito_relatado  TEXT,
    laudo_tecnico     TEXT,
    status            status_os NOT NULL DEFAULT 'Orcamento',
    data_entrada      TIMESTAMP NOT NULL DEFAULT NOW(),
    data_saida        TIMESTAMP,
    valor_total       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_os_cliente FOREIGN KEY (cliente_id)
        REFERENCES clientes (id) ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_os_tecnico FOREIGN KEY (tecnico_id)
        REFERENCES tecnicos (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_os_cliente ON ordens_servico (cliente_id);
CREATE INDEX idx_os_tecnico ON ordens_servico (tecnico_id);
CREATE INDEX idx_os_status ON ordens_servico (status);
CREATE INDEX idx_os_data_entrada ON ordens_servico (data_entrada);
CREATE INDEX idx_os_numero ON ordens_servico (numero_os);

-- ############################################################################
-- TABELA: os_itens (Servicos/Produtos vinculados a OS)
-- ############################################################################

CREATE TABLE os_itens (
    id                  SERIAL PRIMARY KEY,
    os_id               INTEGER NOT NULL,
    descricao           VARCHAR(255) NOT NULL,
    tipo                tipo_item NOT NULL,
    quantidade          NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    valor_unitario      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_unitario >= 0),
    valor_total         NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,

    CONSTRAINT fk_os_itens_os FOREIGN KEY (os_id)
        REFERENCES ordens_servico (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_os_itens_os ON os_itens (os_id);

-- ############################################################################
-- TABELA: os_fotos (Fotos do equipamento na OS)
-- ############################################################################

CREATE TABLE os_fotos (
    id          SERIAL PRIMARY KEY,
    os_id       INTEGER NOT NULL,
    foto        TEXT NOT NULL,
    ordem       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_os_fotos_os FOREIGN KEY (os_id)
        REFERENCES ordens_servico (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_os_fotos_os_id ON os_fotos (os_id);

-- ############################################################################
-- TABELA: checklists
-- ############################################################################

CREATE TABLE checklists (
    id                  SERIAL PRIMARY KEY,
    os_id               INTEGER NOT NULL UNIQUE,

    -- Tela
    tela                status_tela NOT NULL DEFAULT 'OK',

    -- Teclado
    teclado             status_teclado NOT NULL DEFAULT 'OK',
    teclas_especificar  TEXT,

    -- Componentes
    camera              status_componente NOT NULL DEFAULT 'OK',
    som                 status_componente NOT NULL DEFAULT 'OK',
    rede_rj45           status_componente NOT NULL DEFAULT 'OK',
    rede_wifi           status_componente NOT NULL DEFAULT 'OK',
    usb                 status_componente NOT NULL DEFAULT 'OK',
    microfone           status_componente NOT NULL DEFAULT 'OK',
    touchpad            status_componente NOT NULL DEFAULT 'OK',

    -- Bateria
    bateria             status_bateria NOT NULL DEFAULT 'Sem Bateria',
    tempo_autonomia     VARCHAR(100),

    -- Carcaca
    carcaca             TEXT,

    -- Observacoes
    observacoes         TEXT,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_checklist_os FOREIGN KEY (os_id)
        REFERENCES ordens_servico (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ############################################################################
-- TABELA: status_log (Auditoria de mudancas de status)
-- ############################################################################

CREATE TABLE status_log (
    id              SERIAL PRIMARY KEY,
    os_id           INTEGER NOT NULL,
    status_anterior status_os,
    status_novo     status_os NOT NULL,
    alterado_por    VARCHAR(255) NOT NULL,
    observacao      TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_status_log_os FOREIGN KEY (os_id)
        REFERENCES ordens_servico (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_status_log_os ON status_log (os_id);
CREATE INDEX idx_status_log_data ON status_log (created_at);

-- ############################################################################
-- FUNCAO: Trigger para log automatico de mudanca de status
-- ############################################################################

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO status_log (os_id, status_anterior, status_novo, alterado_por)
        VALUES (NEW.id, OLD.status, NEW.status, COALESCE(current_setting('app.current_user', TRUE), 'sistema'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_status_change
    AFTER UPDATE OF status ON ordens_servico
    FOR EACH ROW
    EXECUTE FUNCTION log_status_change();

-- ############################################################################
-- FUNCAO: Trigger para atualizar updated_at automaticamente
-- ############################################################################

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_emitente_updated_at
    BEFORE UPDATE ON emitente FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tecnicos_updated_at
    BEFORE UPDATE ON tecnicos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_servicos_produtos_updated_at
    BEFORE UPDATE ON servicos_produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ordens_servico_updated_at
    BEFORE UPDATE ON ordens_servico FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_checklists_updated_at
    BEFORE UPDATE ON checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ############################################################################
-- FUNCAO: Auto-incremento do numero_os
-- ############################################################################

CREATE OR REPLACE FUNCTION gerar_numero_os()
RETURNS TRIGGER AS $$
BEGIN
    NEW.numero_os = (SELECT COALESCE(MAX(numero_os), 0) + 1 FROM ordens_servico);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gerar_numero_os
    BEFORE INSERT ON ordens_servico
    FOR EACH ROW
    WHEN (NEW.numero_os IS NULL)
    EXECUTE FUNCTION gerar_numero_os();

-- ############################################################################
-- FUNCAO: Calcular valor_total da OS somando os itens
-- ############################################################################

CREATE OR REPLACE FUNCTION recalcular_valor_os()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ordens_servico
    SET valor_total = (
        SELECT COALESCE(SUM(valor_total), 0)
        FROM os_itens
        WHERE os_id = COALESCE(NEW.os_id, OLD.os_id)
    )
    WHERE id = COALESCE(NEW.os_id, OLD.os_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_os_insert
    AFTER INSERT ON os_itens
    FOR EACH ROW
    EXECUTE FUNCTION recalcular_valor_os();

CREATE TRIGGER trg_recalcular_os_delete
    AFTER DELETE ON os_itens
    FOR EACH ROW
    EXECUTE FUNCTION recalcular_valor_os();

CREATE TRIGGER trg_recalcular_os_update
    AFTER UPDATE OF quantidade, valor_unitario ON os_itens
    FOR EACH ROW
    EXECUTE FUNCTION recalcular_valor_os();

-- ############################################################################
-- TABELA: config_backup (Agendamento de backups do banco)
-- ############################################################################

CREATE TABLE config_backup (
    id              SERIAL PRIMARY KEY,
    horarios        TEXT NOT NULL DEFAULT '["09:00","13:00","18:00"]',
    caminho_destino TEXT NOT NULL DEFAULT 'C:\Stdistribuidora\backups',
    max_backups     INTEGER NOT NULL DEFAULT 10,
    ultimo_backup   TIMESTAMP,
    ultimo_status   TEXT,
    ativo           BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ############################################################################
-- TABELA: unidades_medida
-- ############################################################################

CREATE TABLE unidades_medida (
    id          SERIAL PRIMARY KEY,
    sigla       VARCHAR(10) NOT NULL UNIQUE,
    descricao   VARCHAR(100) NOT NULL
);

INSERT INTO unidades_medida (sigla, descricao) VALUES
    ('UN', 'Unidade'), ('CX', 'Caixa'), ('KT', 'Kit'), ('PC', 'Peca'), ('MT', 'Metro');

-- ############################################################################
-- TABELA: grupos_produtos
-- ############################################################################

CREATE TABLE grupos_produtos (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL UNIQUE,
    status      VARCHAR(20) NOT NULL DEFAULT 'Ativo'
);

INSERT INTO grupos_produtos (nome) VALUES
    ('Armazenamento'), ('Perifericos'), ('Redes'), ('Notebooks'), ('Monitores'),
    ('Processadores'), ('Memoria RAM'), ('Gabinetes'), ('Fontes'), ('Placas Mae');

-- ############################################################################
-- TABELA: servicos (catalogo de servicos da assistencia)
-- ############################################################################

CREATE TABLE servicos (
    id              SERIAL PRIMARY KEY,
    nome_servico    VARCHAR(255) NOT NULL,
    valor_servico   NUMERIC(12,2) NOT NULL DEFAULT 0,
    comissao_tecnico NUMERIC(5,2) NOT NULL DEFAULT 0,
    tempo_estimado  VARCHAR(10),
    status          VARCHAR(20) NOT NULL DEFAULT 'Ativo',
    data_cadastro   TIMESTAMP NOT NULL DEFAULT NOW(),
    data_alteracao  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ############################################################################
-- TABELA: produtos (estoque / loja)
-- ############################################################################

CREATE TABLE produtos (
    id                  SERIAL PRIMARY KEY,
    codigo_barras       VARCHAR(20) UNIQUE,
    descricao           VARCHAR(255) NOT NULL,
    grupo_id            INTEGER REFERENCES grupos_produtos(id),
    unidade_medida_id   INTEGER REFERENCES unidades_medida(id),
    preco_custo         NUMERIC(12,2) NOT NULL DEFAULT 0,
    margem_lucro        NUMERIC(5,2) NOT NULL DEFAULT 0,
    preco_venda         NUMERIC(12,2) NOT NULL DEFAULT 0,
    estoque_atual       NUMERIC(10,2) NOT NULL DEFAULT 0,
    estoque_minimo      NUMERIC(10,2) NOT NULL DEFAULT 0,
    ncm                 VARCHAR(10),
    cest                VARCHAR(10),
    status              VARCHAR(20) NOT NULL DEFAULT 'Ativo',
    data_cadastro       TIMESTAMP NOT NULL DEFAULT NOW(),
    data_alteracao      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ############################################################################
-- INSERTS PADRAO (Catalogos iniciais)
-- ############################################################################

INSERT INTO servicos_produtos (tipo, descricao, valor_base, categoria) VALUES
    ('Servico', 'Formatacao / Instalacao de Sistema Operacional', 120.00, 'Software'),
    ('Servico', 'Limpeza Interna Preventiva', 80.00, 'Manutencao'),
    ('Servico', 'Troca de Tela', 150.00, 'Tela'),
    ('Servico', 'Troca de Teclado', 70.00, 'Teclado'),
    ('Servico', 'Troca de Bateria', 90.00, 'Bateria'),
    ('Servico', 'Upgrade de Memoria RAM', 60.00, 'Hardware'),
    ('Servico', 'Upgrade de SSD / HD', 80.00, 'Hardware'),
    ('Servico', 'Reparo em Conector de Carregador', 120.00, 'Hardware'),
    ('Servico', 'Remocao de Virus / Malware', 100.00, 'Software'),
    ('Servico', 'Backup de Dados', 50.00, 'Software'),
    ('Servico', 'Diagnostico / Orcamento', 0.00, 'Diagnostico'),
    ('Produto', 'Teclado Notebook Universal', 120.00, 'Teclado'),
    ('Produto', 'Fonte / Carregador Universal', 89.90, 'Fonte'),
    ('Produto', 'Bateria Notebook Universal', 199.90, 'Bateria'),
    ('Produto', 'SSD 240GB', 189.90, 'Armazenamento'),
    ('Produto', 'SSD 480GB', 329.90, 'Armazenamento'),
    ('Produto', 'Memoria RAM 8GB DDR4', 149.90, 'Memoria'),
    ('Produto', 'Tela Notebook 15.6 LED', 299.90, 'Tela'),
    ('Produto', 'Tecla Avulsa', 15.00, 'Teclado'),
    ('Produto', 'Pasta Termica', 25.00, 'Refrigeracao');
