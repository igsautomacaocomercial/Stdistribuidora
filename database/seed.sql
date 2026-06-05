-- ============================================================================
-- DADOS DE EXEMPLO (SEED) - Ambiente de Testes/Homologacao
-- ============================================================================

-- Emitente (ST Distribuidora)
INSERT INTO emitente (cnpj, razao_social, nome_fantasia, logradouro, numero, bairro, cidade, uf, cep, telefone, email)
VALUES (
    '00.000.000/0001-00',
    'ST Distribuidora de Informatica Ltda',
    'ST Distribuidora',
    'Rua Exemplo',
    '123',
    'Centro',
    'Sao Paulo',
    'SP',
    '00000-000',
    '(11) 0000-0000',
    'contato@stdistribuidora.com.br'
);

-- Tecnicos
INSERT INTO tecnicos (nome, especialidade) VALUES
    ('Carlos Silva',      'Hardware / Notebooks'),
    ('Ana Oliveira',      'Software / Redes'),
    ('Roberto Santos',    'Macbook / Apple'),
    ('Juliana Costa',     'Componentes Nivel 2');

-- Clientes PF
INSERT INTO clientes (tipo, cpf_cnpj, nome_razao_social, telefone, whatsapp, email, logradouro, numero, bairro, cidade, uf, cep)
VALUES
    ('PF', '111.111.111-11', 'Joao Silva',          '(11) 91111-1111', '(11) 91111-1111', 'joao@email.com',    'Rua A', '100', 'Centro',   'Sao Paulo', 'SP', '01001-000'),
    ('PF', '222.222.222-22', 'Maria Souza',         '(11) 92222-2222', '(11) 92222-2222', 'maria@email.com',   'Rua B', '200', 'Vila Mariana', 'Sao Paulo', 'SP', '04001-000'),
    ('PF', '333.333.333-33', 'Pedro Almeida',       '(11) 93333-3333', '(11) 93333-3333', 'pedro@email.com',   'Rua C', '300', 'Moema',     'Sao Paulo', 'SP', '05001-000');

-- Clientes PJ
INSERT INTO clientes (tipo, cpf_cnpj, nome_razao_social, nome_fantasia, inscricao_estadual, telefone, whatsapp, email, logradouro, numero, bairro, cidade, uf, cep)
VALUES
    ('PJ', '44.444.444/0001-44', 'Tech Solutions Ltda',          'Tech Solutions',          '123.456.789.000', '(11) 94444-4444', '(11) 94444-4444', 'contato@techsol.com.br',  'Av D', '400', 'Barra Funda',  'Sao Paulo', 'SP', '02001-000'),
    ('PJ', '55.555.555/0001-55', 'Escola Digital Ensino Ltda',   'Escola Digital',          '987.654.321.000', '(11) 95555-5555', '(11) 95555-5555', 'ti@escoladigital.com.br', 'Av E', '500', 'Pinheiros',   'Sao Paulo', 'SP', '03001-000');

-- Ordens de Servico (exemplos)
INSERT INTO ordens_servico (cliente_id, tecnico_id, marca, modelo, numero_serie, defeito_relatado, laudo_tecnico, status, data_entrada, data_saida, valor_total)
VALUES
    (1, 1, 'Dell',   'Inspiron 15 3000', 'ABC123XYZ',   'Nao liga, LED de carga acende mas nao da boot',           'Placa mae com curto no circuito de alimentacao - solda BGA',                                     'Finalizado',    '2026-05-20 09:00', '2026-05-25 17:00', 389.90),
    (2, 2, 'Lenovo', 'ThinkPad T480',    'DEF456UVW',   'Lento, travando ao abrir programas',                       'HD com setores defeituosos - substituir por SSD',                                                 'Finalizado',    '2026-05-22 10:30', '2026-05-24 16:00', 269.90),
    (3, 3, 'Apple',  'MacBook Air M1',   'GHI789RST',   'Tela com riscos verticais e mancha escura no canto',       'Display com dano fisico - substituicao necessaria, aguardando peca',                              'Aguardando Peca','2026-05-28 14:00', NULL,             450.00),
    (4, 1, 'HP',     'Pavilion 14',      'JKL012MNO',   'Teclado com teclas W, A, S, D nao funcionam',             'Derramamento de liquido no teclado - substituir teclado completo',                                'Em Manutencao',  '2026-06-01 08:30', NULL,             185.00),
    (5, 4, 'Positivo','Motion Q232C',    'PQR345STU',   'Nao carrega, LED da fonte apaga ao conectar no notebook',  'Conector DC da placa mae com solda fria - refazer solda e testar',                                'Orcamento',      '2026-06-03 11:00', NULL,             0.00),
    (1, 2, 'Samsung','Book E40',         'VWX678YZA',   'Alto falante chiando e microfone interno nao capta audio', 'Auto falante danificado e microfone com sujeira - substituir auto falante e limpar conector',     'Pronto para Retirada','2026-06-02 15:00', '2026-06-04 10:00', 120.00);

-- Itens das OS
INSERT INTO os_itens (os_id, descricao, tipo, quantidade, valor_unitario) VALUES
    -- OS 1 (Finalizada)
    (1, 'Reparo em Placa Mae (solda BGA)',  'Servico', 1, 180.00),
    (1, 'Pasta Termica',                    'Produto', 1, 25.00),
    (1, 'Formatacao c/ Instalacao Windows', 'Servico', 1, 120.00),
    (1, 'Teste de Estresse',                'Servico', 1, 64.90),
    -- OS 2 (Finalizada)
    (2, 'SSD 240GB',                        'Produto', 1, 189.90),
    (2, 'Formatacao c/ Instalacao Windows', 'Servico', 1, 80.00),
    -- OS 3 (Aguardando Peca)
    (3, 'Tela Notebook 15.6 LED',           'Produto', 1, 299.90),
    (3, 'Troca de Tela',                    'Servico', 1, 150.10),
    -- OS 4 (Em Manutencao)
    (4, 'Teclado Notebook Universal',       'Produto', 1, 120.00),
    (4, 'Troca de Teclado',                 'Servico', 1, 65.00),
    -- OS 6 (Pronto para Retirada)
    (6, 'Auto Falante Notebook',            'Produto', 1, 70.00),
    (6, 'Limpeza Interna Preventiva',       'Servico', 1, 50.00);

-- Checklists
INSERT INTO checklists (os_id, tela, teclado, camera, som, rede_rj45, rede_wifi, usb, microfone, touchpad, bateria, tempo_autonomia, carcaca, observacoes) VALUES
    (1, 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'Com Bateria', '2h 30min aprox', 'Risco superficial na quina inferior direita', 'Cliente solicitou backup antes do reparo'),
    (2, 'OK', 'OK', 'OK', 'OK', 'Ruim', 'OK', 'OK', 'OK', 'OK', 'Sem Bateria', NULL, 'Conector RJ45 com pino torto', 'Substituir conector RJ45 em breve'),
    (3, 'Dead Pixel', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'Com Bateria', '4h aprox', 'Tampa com amassado leve na regiao central', 'Aguardando peca - display em falta no fornecedor'),
    (4, 'OK', 'Teclas Nao Funcionam', 'OK', 'Ruim', 'OK', 'OK', 'OK', 'OK', 'OK', 'Sem Bateria', NULL, 'Teclado com marcas de liquido', 'Teclas afetadas: W, A, S, D, Espaco, Enter'),
    (6, 'OK', 'OK', 'OK', 'Ruim', 'OK', 'OK', 'OK', 'Ruim', 'OK', 'Com Bateria', '1h 50min', 'Sem danos aparentes na carcaca', 'Auto falante esquerdo substituido, microfone limpo com alcool isopropilico');
