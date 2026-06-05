const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/st_distribuidora',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000
});

async function seedDatabase() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Ensure service categories exist (table: categorias_servico, columns: id, nome, descricao, data_cadastro)
    console.log('Ensuring service categories...');
    const serviceCategories = [
      { nome: 'Manutenção de Hardware', descricao: 'Serviços de diagnóstico e reparo de componentes físicos de computadores' },
      { nome: 'Manutenção de Software', descricao: 'Serviços de instalação, configuração e remoção de softwares' },
      { nome: 'Recuperação de Dados', descricao: 'Serviços de tentativa de recuperação de dados de mídias danificadas' },
      { nome: 'Upgrade e Melhorias', descricao: 'Serviços de substituição de componentes por modelos superiores' },
      { nome: 'Configuração de Rede', descricao: 'Serviços de instalação e configuração de redes locais e internet' },
      { nome: 'Limpeza e Manutenção Preventiva', descricao: 'Serviços de higienização e prevenção de falhas por acúmulo de sujeira' }
    ];
    
    for (const cat of serviceCategories) {
      const result = await client.query(
        `INSERT INTO categorias_servico (nome, descricao) 
         VALUES ($1, $2) 
         ON CONFLICT (nome) DO NOTHING 
         RETURNING id`,
        [cat.nome, cat.descricao]
      );
      if (result.rowCount > 0) {
        console.log(`  ✓ Inserted service category: ${cat.nome}`);
      }
    }
    
    // Get category IDs
    const catResult = await client.query('SELECT id, nome FROM categorias_servico');
    const categoryMap = {};
    catResult.rows.forEach(row => {
      categoryMap[row.nome] = row.id;
    });
    
    // 2. Ensure measurement units exist (table: unidades_medida, columns: id, sigla, descricao)
    console.log('\\nEnsuring measurement units...');
    const measurementUnits = [
      { sigla: 'UN', descricao: 'Unidade' },
      { sigla: 'PC', descricao: 'Peça' },
      { sigla: 'KT', descricao: 'Kit' },
      { sigla: 'MT', descricao: 'Metro' },
      { sigla: 'KG', descricao: 'Quilograma' },
      { sigla: 'L', descricao: 'Litro' },
      { sigla: 'CX', descricao: 'Caixa' },
      { sigla: 'PD', descricao: 'Pacote' }
    ];
    
    for (const unit of measurementUnits) {
      const result = await client.query(
        `INSERT INTO unidades_medida (sigla, descricao) 
         VALUES ($1, $2) 
         ON CONFLICT (sigla) DO NOTHING 
         RETURNING id`,
        [unit.sigla, unit.descricao]
      );
      if (result.rowCount > 0) {
        console.log(`  ✓ Inserted measurement unit: ${unit.sigla}`);
      }
    }
    
    // Get unit IDs
    const unitResult = await client.query('SELECT id, sigla FROM unidades_medida');
    const unitMap = {};
    unitResult.rows.forEach(row => {
      unitMap[row.sigla] = row.id;
    });
    
    // 3. Ensure product groups exist (table: grupos_produtos, columns: id, nome, status)
    console.log('\\nEnsuring product groups...');
    const productGroups = [
      { nome: 'Processadores' },
      { nome: 'Placas Mae' },
      { nome: 'Memoria RAM' },
      { nome: 'Armazenamento' },
      { nome: 'Placas de Video' },
      { nome: 'Fontes de Alimentacao' },
      { nome: 'Gabinetes' },
      { nome: 'Refrigeracao' },
      { nome: 'Perifericos de Entrada' },
      { nome: 'Perifericos de Saida' },
      { nome: 'Perifericos de Armazenamento' },
      { nome: 'Cabos e Conectores' },
      { nome: 'Componentes Electronicos' },
      { nome: 'Notebooks' },
      { nome: 'Impressoras' },
      { nome: 'Monitor' },
      { nome: 'Softwares' },
      { nome: 'Acessorios' }
    ];
    
    for (const group of productGroups) {
      const result = await client.query(
        `INSERT INTO grupos_produtos (nome) 
         VALUES ($1) 
         ON CONFLICT (nome) DO NOTHING 
         RETURNING id`,
        [group.nome]
      );
      if (result.rowCount > 0) {
        console.log(`  ✓ Inserted product group: ${group.nome}`);
      }
    }
    
    // Get group IDs
    const groupResult = await client.query('SELECT id, nome FROM grupos_produtos');
    const groupMap = {};
    groupResult.rows.forEach(row => {
      groupMap[row.nome] = row.id;
    });
    
    // 4. Insert IT Services (table: servicos, columns: id, nome_servico, categoria_id, tempo_duracao, valor, comissao_profissional, descricao, cuidados_antes, cuidados_depois, status, data_cadastro)
    console.log('\\nInserting IT services...');
    const itServices = [
      // Manutenção de Hardware
      { nome: 'Reparo de Placa Mae', categoria: 'Manutenção de Hardware', tempo: 120, valor: 180.00, comissao: 20.00, descricao: 'Diagnóstico e reparo de placas mae de desktop e notebook', cuidados_antes: 'Desconectar energia e remover bateria se for notebook', cuidados_depois: 'Testar funcionamento básico apos reparo' },
      { nome: 'Troca de Fonte de Alimentacao', categoria: 'Manutenção de Hardware', tempo: 45, valor: 60.00, comissao: 15.00, descricao: 'Substituicao de fonte de alimentacao defeituosa', cuidados_antes: 'Desconectar da tomada e pressionar o botao power por 10s para descarregar capacitores', cuidados_depois: 'Verificar tensoes de saida com multimetro' },
      { nome: 'Instalacao de Cooler CPU', categoria: 'Manutenção de Hardware', tempo: 30, valor: 50.00, comissao: 15.00, descricao: 'Instalacao ou substituicao de cooler de processador com pasta termica', cuidados_antes: 'Remover cooler antigo e limpar superficie da CPU', cuidados_depois: 'Verificar fixacao e conexao do conector ao molex' },
      { nome: 'Upgrade de Memoria RAM', categoria: 'Manutenção de Hardware', tempo: 20, valor: 40.00, comissao: 10.00, descricao: 'Instalacao de modulos de memoria RAM adicionais ou substituicao', cuidados_antes: 'Desconectar energia e aposentar eletricidade estatica', cuidados_depois: 'Verificar reconhecimento no BIOS e sistema operacional' },
      { nome: 'Instalacao de Placa de Video', categoria: 'Manutenção de Hardware', tempo: 30, valor: 60.00, comissao: 15.00, descricao: 'Instalacao de placa de video discreta slot PCI express', cuidados_antes: 'Desconectar energia e remover placa antiga se houver', cuidados_depois: 'Conectar cabos de alimentacao PCIe e instalar drivers' },
      
      // Manutenção de Software
      { nome: 'Formatacao e Instalacao de Windows', categoria: 'Manutenção de Software', tempo: 60, valor: 80.00, comissao: 15.00, descricao: 'Formatacao completa do disco e instalacao de Windows 10/11 com drivers basicos', cuidados_antes: 'Fazer backup de dados importantes se possivel', cuidados_depois: 'Instalar antivirus e atualizar Windows' },
      { nome: 'Formatacao e Instalacao de Linux', categoria: 'Manutenção de Software', tempo: 45, valor: 70.00, comissao: 15.00, descricao: 'Instalacao de distribuicao Linux (Ubuntu, Mint, etc) com particionamento', cuidados_antes: 'Escolher distribuicao e fazer backup de dados', cuidados_depois: 'Configurar drivers proprietarios se necessario' },
      { nome: 'Remocao de Virus e Malware', categoria: 'Manutenção de Software', tempo: 90, valor: 100.00, comissao: 20.00, descricao: 'Varredura completa e remocao de virus, spyware, ransomware e outros malware', cuidados_antes: 'Desconectar da internet para evitar propagacao', cuidados_depois: 'Instalar antivirus em tempo real e atualizar' },
      { nome: 'Otimalizacao de Sistema', categoria: 'Manutenção de Software', tempo: 40, valor: 50.00, comissao: 10.00, descricao: 'Limpeza de arquivos temporarios, desativacao de programas de inicializacao e otimizacao de registro', cuidados_antes: 'Fechar todos os programas abertos', cuidados_depois: 'Reiniciar o sistema para aplicar mudancas' },
      { nome: 'Recuperacao de Dados de HD Danificado', categoria: 'Recuperação de Dados', tempo: 180, valor: 250.00, comissao: 25.00, descricao: 'Tentativa de recuperacao de dados de HD com falhas logicas ou leves fisicas usando software especializado', cuidados_antes: 'Nao gravar novos dados no HD afetado', cuidados_depois: 'Salvar dados recuperados em medio externo diferente' },
      
      // Upgrade e Melhorias
      { nome: 'Upgrade de SSD', categoria: 'Upgrade e Melhorias', tempo: 30, valor: 50.00, comissao: 10.00, descricao: 'Clonagem de HD para SSD ou instalacao limpa com transferencia de dados', cuidados_antes: 'Fazer backup completo dos dados', cuidados_depois: 'Verificar alinhamento SSD e habilitar TRIM' },
      { nome: 'Upgrade de Processador', categoria: 'Upgrade e Melhorias', tempo: 60, valor: 120.00, comissao: 20.00, descricao: 'Substituicao de processador por modelo compatível com mesma placa mae', cuidados_antes: 'Verificar compatibilidade de socket e TDP', cuidados_depois: 'Aplicar pasta termica nova e testar estabilidade' },
      { nome: 'Instalacao de Leitor de Cartoes', categoria: 'Upgrade e Melhorias', tempo: 20, valor: 30.00, comissao: 10.00, descricao: 'Instalacao interno de leitor de cartoes SD/MicroSD na frente do gabinetes', cuidados_antes: 'Verificar disponibilidade de bay de 3,5\\" ou 5,25\\"', cuidados_depois: 'Conectar cabos USB interno ao header da placa mae' },
      
      // Configuração de Rede
      { nome: 'Configuracao de Rede Wi-Fi Domestica', categoria: 'Configuração de Rede', tempo: 40, valor: 90.00, comissao: 15.00, descricao: 'Configuracao de roteador wireless, senha, canal e seguranca WPA2/WPA3', cuidados_antes: 'Ter senha de administrador do roteador', cuidados_depois: 'Testar conectividade em varios dispositivos' },
      { nome: 'Instalacao de Ponta a Ponta (Head End)', categoria: 'Configuração de Rede', tempo: 120, valor: 150.00, comissao: 20.00, descricao: 'Instalacao e configuracao de cabo ethernet CAT6 entre pontos com teste de certificacao', cuidados_antes: 'Verificar trajecto do cabo e obter permissoes se necessario', cuidados_depois: 'Testar com fluke ou equivalente para certificacao' },
      
      // Limpeza e Manutenção Preventiva
      { nome: 'Limpeza Preventiva de Desktop', categoria: 'Limpeza e Manutenção Preventiva', tempo: 30, valor: 50.00, comissao: 10.00, descricao: 'Limpeza completa de poeira interna com ar comprimido e escovas antistaticas', cuidados_antes: 'Desconectar energia e levar a area bem ventilada', cuidados_depois: 'Verificar funcionamento dos coolers apos limpeza' },
      { nome: 'Limpeza Preventiva de Notebook', categoria: 'Limpeza e Manutenção Preventiva', tempo: 45, valor: 60.00, comissao: 10.00, descricao: 'Desmontagem parcial para limpeza de ventoinhas e trocas de pasta termica se necessario', cuidados_antes: 'Desconectar energia e remover bateria', cuidados_depois: 'Testar temperaturas apos reaplicacao de pasta termica' },
      { nome: 'Aplicacao de Pasta Termica Premium', categoria: 'Limpeza e Manutenção Preventiva', tempo: 20, valor: 35.00, comissao: 10.00, descricao: 'Remocao de pasta termica vecchia e aplicacao de nova pasta termica de alta condutividade termica', cuidados_antes: 'Limpar superficie completamente com alcool isopropilico', cuidados_depois: 'Aplicar quantidade adequada (grao de arroz ou linha fina)' }
    ];
    
    for (const service of itServices) {
      // Check if service already exists by nome_servico
      const existCheck = await client.query('SELECT id FROM servicos WHERE nome_servico = $1', [service.nome]);
      if (existCheck.rowCount > 0) {
        console.log(`  - Service already exists: ${service.nome}`);
        continue;
      }
      
      const result = await client.query(
        `INSERT INTO servicos (nome_servico, categoria_id, tempo_duracao, valor, comissao_profissional, descricao, cuidados_antes, cuidados_depois) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING id`,
        [
          service.nome,
          categoryMap[service.categoria],
          service.tempo,
          service.valor,
          service.comissao,
          service.descricao,
          service.cuidados_antes,
          service.cuidados_depois
        ]
      );
      if (result.rowCount > 0) {
        console.log(`  ✓ Inserted service: ${service.nome}`);
      }
    }
    
    // 5. Insert IT Products (table: produtos, columns: id, codigo_barras, descricao, grupo_id, unidade_medida_id, preco_custo, margem_lucro, preco_venda, estoque_atual, estoque_minimo, ncm, cest, status, data_cadastro, data_alteracao)
    console.log('\\nInserting IT products...');
    const itProducts = [
      // Processadores
      { codigo: 'AMD001', desc: 'Processador AMD Ryzen 5 5600X', grupo: 'Processadores', unidade: 'UN', precoCusto: 800.00, margem: 15.00, estoque: 5, estoqueMin: 2 },
      { codigo: 'INT001', desc: 'Processador Intel Core i5-12400F', grupo: 'Processadores', unidade: 'UN', precoCusto: 180.00, margem: 15.00, estoque: 8, estoqueMin: 2 },
      
      // Placas Mae
      { codigo: 'MAE001', desc: 'Placa Mae ASUS B550-PLUS AM4', grupo: 'Placas Mae', unidade: 'UN', precoCusto: 650.00, margem: 20.00, estoque: 4, estoqueMin: 1 },
      { codigo: 'MAE002', desc: 'Placa Mae MSI PRO Z690-A DDR4 LGA1700', grupo: 'Placas Mae', unidade: 'UN', precoCusto: 950.00, margem: 20.00, estoque: 3, estoqueMin: 1 },
      { codigo: 'MAE003', desc: 'Placa Mae Gigabyte B660M DS3H DDR4 Micro-ATX', grupo: 'Placas Mae', unidade: 'UN', precoCusto: 550.00, margem: 20.00, estoque: 6, estoqueMin: 2 },
      
      // Memoria RAM
      { codigo: 'RAM001', desc: 'Memoria RAM Kingston Fury Beast 8GB DDR4 3200MHz', grupo: 'Memoria RAM', unidade: 'UN', precoCusto: 80.00, margem: 30.00, estoque: 15, estoqueMin: 5 },
      { codigo: 'RAM002', desc: 'Memoria RAM Corsair Vengeance 16GB DDR4 3200MHz (2x8GB)', grupo: 'Memoria RAM', unidade: 'UN', precoCusto: 150.00, margem: 30.00, estoque: 12, estoqueMin: 4 },
      { codigo: 'RAM003', desc: 'Memoria RAM G.Skill Ripjaws V 32GB DDR4 3600MHz (2x16GB)', grupo: 'Memoria RAM', unidade: 'UN', precoCusto: 280.00, margem: 25.00, estoque: 8, estoqueMin: 2 },
      
      // Armazenamento
      { codigo: 'SSD001', desc: 'SSD Kingston NV2 500GB NVMe PCIe 4.0', grupo: 'Armazenamento', unidade: 'UN', precoCusto: 180.00, margem: 25.00, estoque: 10, estoqueMin: 3 },
      { codigo: 'SSD002', desc: 'SSD Samsung 970 EVO Plus 1TB NVMe M.2', grupo: 'Armazenamento', unidade: 'UN', precoCusto: 420.00, margem: 20.00, estoque: 6, estoqueMin: 2 },
      { codigo: 'HDD001', desc: 'HD Seagate Barracuda 2TB 7200RPM SATA III', grupo: 'Armazenamento', unidade: 'UN', precoCusto: 180.00, margem: 20.00, estoque: 8, estoqueMin: 3 },
      { codigo: 'HDD002', desc: 'HD Western Digital WD Blue 4TB 5400RPM SATA III', grupo: 'Armazenamento', unidade: 'UN', precoCusto: 220.00, margem: 20.00, estoque: 6, estoqueMin: 2 },
      
      // Placas de Video
      { codigo: 'VIDEO001', desc: 'Placa de Video MSI GTX 1660 SUPER Ventus XS 6GB GDDR6', grupo: 'Placas de Video', unidade: 'UN', precoCusto: 850.00, margem: 15.00, estoque: 4, estoqueMin: 1 },
      { codigo: 'VIDEO002', desc: 'Placa de Video ASUS Dual RTX 3060 OC Edition 12GB GDDR6', grupo: 'Placas de Video', unidade: 'UN', precoCusto: 1200.00, margem: 15.00, estoque: 3, estoqueMin: 1 },
      { codigo: 'VIDEO003', desc: 'Placa de Video Sapphire Pulse RX 6600 XT 8GB GDDR6', grupo: 'Placas de Video', unidade: 'UN', precoCusto: 900.00, margem: 15.00, estoque: 4, estoqueMin: 1 },
      
      // Fontes de Alimentacao
      { codigo: 'FONTE001', desc: 'Fonte Corsair CX550M 550W 80Plus Bronze Semi-modular', grupo: 'Fontes de Alimentacao', unidade: 'UN', precoCusto: 250.00, margem: 20.00, estoque: 8, estoqueMin: 2 },
      { codigo: 'FONTE002', desc: 'Fonte EVGA 600 W1 600W 80Plus White', grupo: 'Fontes de Alimentacao', unidade: 'UN', precoCusto: 180.00, margem: 25.00, estoque: 10, estoqueMin: 3 },
      { codigo: 'FONTE003', desc: 'Fonte Cooler Master MWE 750W 80Plus White', grupo: 'Fontes de Alimentacao', unidade: 'UN', precoCusto: 220.00, margem: 20.00, estoque: 6, estoqueMin: 2 },
      
      // Gabinetes
      { codigo: 'GAB001', desc: 'Gabinete Cooler Master MasterBox Q300L Micro-ATX', grupo: 'Gabinetes', unidade: 'UN', precoCusto: 180.00, margem: 25.00, estoque: 6, estoqMin: 2 },
      { codigo: 'GAB002', desc: 'Gabinete NZXT H510 Mid-Tower com Janela Temperada', grupo: 'Gabinetes', unidade: 'UN', precoCusto: 350.00, margem: 20.00, estoque: 4, estoqueMin: 1 },
      { codigo: 'GAB003', desc: 'Gabinete Phanteks Eclipse P300A ATX Mid-Tower', grupo: 'Gabinetes', unidade: 'UN', precoCusto: 300.00, margem: 20.00, estoque: 5, estoqueMin: 2 },
      
      // Refrigeracao
      { codigo: 'COOL001', desc: 'Cooler CPU Cooler Master Hyper 212 Black Edition', grupo: 'Refrigeracao', unidade: 'UN', precoCusto: 80.00, margem: 30.00, estoque: 10, estoqueMin: 3 },
      { codigo: 'COOL002', desc: 'Cooler CPU Corsair iCUE H100i RGB ELITE 240mm AIO', grupo: 'Refrigeracao', unidade: 'UN', precoCusto: 350.00, margem: 20.00, estoque: 4, estoqueMin: 1 },
      { codigo: 'FAN001', desc: 'Ventoinha de Gabinete 120mm PWM ARGB 3-in-1 Pack', grupo: 'Refrigeracao', unidade: 'UN', precoCusto: 45.00, margem: 35.00, estoque: 15, estoqueMin: 5 },
      
      // Perifericos de Entrada
      { codigo: 'MOUSE001', desc: 'Mouse Logitech G203 Lightsync USB Optical', grupo: 'Perifericos de Entrada', unidade: 'UN', precoCusto: 60.00, margem: 35.00, estoque: 12, estoqueMin: 3 },
      { codigo: 'MOUSE002', desc: 'Mouse Razer DeathAdder V2 USB Optical 20K DPI', grupo: 'Perifericos de Entrada', unidade: 'UN', precoCusto: 120.00, margem: 30.00, estoque: 8, estoqueMin: 2 },
      { codigo: 'TECL001', desc: 'Teclado Redragon K552 RGB Mechanical Gaming English USB', grupo: 'Perifericos de Entrada', unidade: 'UN', precoCusto: 80.00, margem: 40.00, estoque: 10, estoqueMin: 3 },
      { codigo: 'TECL002', desc: 'Teclado Mecânico Redragon Kumara K552 RGB LED 87 Tecles USB', grupo: 'Perifericos de Entrada', unidade: 'UN', precoCusto: 70.00, margem: 40.00, estoque: 12, estoqueMin: 3 },
      
      // Perifericos de Saida
      { codigo: 'CAIX001', desc: 'Caixa de Som Creative Pebble Plus 2.1 USB alimentacao', grupo: 'Perifericos de Saida', unidade: 'UN', precoCusto: 80.00, margem: 30.00, estoque: 10, estoqueMin: 3 },
      { codigo: 'FONE001', desc: 'Fone de Ouvido HyperX Cloud II Gaming USB/Placa de Som', grupo: 'Perifericos de Saida', unidade: 'UN', precoCusto: 250.00, margem: 20.00, estoque: 6, estoqueMin: 2 },
      
      // Perifericos de Armazenamento
      { codigo: 'HDDEX001', desc: 'HD Externo Seagate Expansion 2TB USB 3.0', grupo: 'Perifericos de Armazenamento', unidade: 'UN', precoCusto: 180.00, margem: 25.00, estoque: 8, estoqueMin: 2 },
      { codigo: 'SSDEX001', desc: 'SSD Externo Samsung Portable T5 500GB USB 3.2', grupo: 'Perifericos de Armazenamento', unidade: 'UN', precoCusto: 300.00, margem: 20.00, estoque: 6, estoqueMin: 2 },
      
      // Cabos e Conectores
      { codigo: 'CAB001', desc: 'Cabo SATA III 0.5m Data + Pacote de 4 Energia Molex', grupo: 'Cabos e Conectores', unidade: 'UN', precoCusto: 8.00, margem: 50.00, estoque: 30, estoqueMin: 10 },
      { codigo: 'CAB002', desc: 'Cabo de Energia ATX 20+4 Pin 1.8m Para Fonte', grupo: 'Cabos e Conectores', unidade: 'UN', precoCusto: 15.00, margem: 40.00, estoque: 15, estoqueMin: 5 },
      { codigo: 'CAB003', desc: 'Cabo DisplayPort 1.4 2m Macho-Macho 4K@144Hz', grupo: 'Cabos e Conectores', unidade: 'UN', precoCusto: 25.00, margem: 40.00, estoque: 10, estoqueMin: 3 },
      { codigo: 'CAB004', desc: 'Cabo HDMI 2.0 2m Macho-Macho 4K@60Hz', grupo: 'Cabos e Conectores', unidade: 'UN', precoCusto: 15.00, margem: 40.00, estoque: 15, estoqueMin: 5 },
      
      // Componentes Electronicos
      { codigo: 'PAST001', desc: 'Pasta Termica Arctic MX-4 4g Compósito de Carbono', grupo: 'Componentes Electronicos', unidade: 'UN', precoCusto: 15.00, margem: 50.00, estoque: 20, estoqueMin: 5 },
      { codigo: 'PAST002', desc: 'Pasta Termica Thermal Grizzly Kryonaut 1g', grupo: 'Componentes Electronicos', unidade: 'UN', precoCusto: 25.00, margem: 40.00, estoque: 15, estoqueMin: 4 },
      { codigo: 'IND001', desc: 'Indutor de Ferro em Po 100µH 2A SMD para Placa Mae', grupo: 'Componentes Electronicos', unidade: 'UN', precoCusto: 0.50, margem: 100.00, estoque: 50, estoqueMin: 10 },
      
      // Notebooks
      { codigo: 'NOTE001', desc: 'Notebook Acer Aspire 5 A515-56 i5-1135G7 8GB RAM 256GB SSD 15.6\"', grupo: 'Notebooks', unidade: 'UN', precoCusto: 1800.00, margem: 12.00, estoque: 3, estoqueMin: 1 },
      { codigo: 'NOTE002', desc: 'Notebook Lenovo Ideapad 3 15ITL6 i7-1165G7 16GB RAM 512GB SSD 15.6\"', grupo: 'Notebooks', unidade: 'UN', precoCusto: 2500.00, margem: 12.00, estoque: 2, estoqueMin: 1 },
      
      // Acessorios
      { codigo: 'ACE001', desc: 'Suporte para Notebook Dobravel em Alumínio com Cooler', grupo: 'Acessorios', unidade: 'UN', precoCusto: 45.00, margem: 35.00, estoque: 12, estoqueMin: 3 },
      { codigo: 'ACE002', desc: 'Base Refrigerante para Notebook com 3 Ventoinhas 120mm USB', grupo: 'Acessorios', unidade: 'UN', precoCusto: 60.00, margem: 30.00, estoque: 10, estoqueMin: 3 },
      { codigo: 'ACE003', desc: 'Kit de Ferramentas de Precisao 45 Pcs para Eletronica e Informatica', grupo: 'Acessorios', unidade: 'UN', precoCusto: 80.00, margem: 30.00, estoque: 8, estoqueMin: 2 }
    ];
    
    for (const product of itProducts) {
      // Calculate preco_venda based on markup
      const precoVenda = Math.round((product.precoCusto * (1 + product.margem / 100)) * 100) / 100;
      
      // Check by codigo_barras if provided
      if (product.codigo) {
        const existCheck = await client.query('SELECT id FROM produtos WHERE codigo_barras = $1', [product.codigo]);
        if (existCheck.rowCount > 0) {
          console.log(`  - Product already exists (by codigo): ${product.desc}`);
          continue;
        }
      }
      
      // Check by descricao
      const existCheckDesc = await client.query('SELECT id FROM produtos WHERE descricao = $1', [product.desc]);
      if (existCheckDesc.rowCount > 0) {
        console.log(`  - Product already exists (by descricao): ${product.desc}`);
        continue;
      }
      
      const result = await client.query(
        `INSERT INTO produtos (codigo_barras, descricao, grupo_id, unidade_medida_id, preco_custo, margem_lucro, preco_venda, estoque_atual, estoque_minimo) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING id`,
        [
          product.codigo || null,
          product.desc,
          groupMap[product.grupo] || null,
          unitMap[product.unidade] || null,
          product.precoCusto,
          product.margem,
          precoVenda,
          product.estoque,
          product.estoqueMin
        ]
      );
      if (result.rowCount > 0) {
        console.log(`  ✓ Inserted product: ${product.desc}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('\\n✅ IT Store seeding completed successfully!');
    
  } catch (err) {
    // Rollback on error
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Error seeding IT Store database:', err);
    throw err;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('Seed script finished.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });