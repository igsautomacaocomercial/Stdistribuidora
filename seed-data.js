const { Pool } = require('pg');

// Database connection - uses DATABASE_URL in Render, fallback for local
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
    
    // 1. Insert sample services
    console.log('Inserting sample services...');
    const services = [
      { nome: 'Reparo de Placa Mãe', valor: 150.00, comissao: 20.00, tempo: 120 },
      { nome: 'Formatação e Instalação de SO', valor: 80.00, comissao: 15.00, tempo: 90 },
      { nome: 'Limpeza e Manutenção Preventiva', valor: 60.00, comissao: 10.00, tempo: 60 },
      { nome: 'Recuperação de Dados', valor: 200.00, comissao: 25.00, tempo: 180 },
      { nome: 'Upgrade de Memória RAM', valor: 40.00, comissao: 10.00, tempo: 30 },
      { nome: 'Instalação de Placa de Vídeo', valor: 100.00, comissao: 15.00, tempo: 60 },
      { nome: 'Configuração de Rede Wi-Fi', valor: 120.00, comissao: 20.00, tempo: 90 },
      { nome: 'Remoção de Vírus e Malware', valor: 90.00, comissao: 15.00, tempo: 120 },
      { nome: 'Solda de Componentes SMD', valor: 180.00, comissao: 25.00, tempo: 150 },
      { nome: 'Troca de Tela de Notebook', valor: 250.00, comissao: 30.00, tempo: 120 }
    ];
    
    for (const service of services) {
      const result = await client.query(
        `INSERT INTO servicos (nome_servico, valor_servico, comissao_tecnico, tempo_estimado) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT DO NOTHING 
         RETURNING id`,
        [service.nome, service.valor, service.comissao, service.tempo]
      );
      if (result.rowCount > 0) {
        console.log(`  ✓ Inserted service: ${service.nome}`);
      } else {
        console.log(`  - Service already exists: ${service.nome}`);
      }
    }
    
    // 2. Insert sample unidades de medida
    console.log('\\nInserting sample unidades de medida...');
    const unidades = [
      { sigla: 'UN', nome: 'Unidade' },
      { sigla: 'PC', nome: 'Peça' },
      { sigla: 'KT', nome: 'Kit' },
      { sigla: 'MT', nome: 'Metro' },
      { sigla: 'KG', nome: 'Quilograma' }
    ];
    
    for (const unidade of unidades) {
      const result = await client.query(
        `INSERT INTO unidades_medida (sigla, nome) 
         VALUES ($1, $2) 
         ON CONFLICT DO NOTHING 
         RETURNING id`,
        [unidade.sigla, unidade.nome]
      );
      if (result.rowCount > 0) {
        console.log(`  ✓ Inserted unidade: ${unidade.sigla}`);
      } else {
        console.log(`  - Unidade already exists: ${unidade.sigla}`);
      }
    }
    
    // 3. Insert sample grupos de produtos
    console.log('\\nInserting sample grupos de produtos...');
    const grupos = [
      { nome: 'Componentes de PC' },
      { nome: 'Periféricos' },
      { nome: 'Armazenamento' },
      { nome: 'Memória' },
      { nome: 'Placas de Vídeo' },
      { nome: 'Fonte de Alimentação' },
      { nome: 'Cabos e Adaptadores' },
      { nome: 'Refrigeração' },
      { nome: 'Notebooks' },
      { nome: 'Impressoras' }
    ];
    
    for (const grupo of grupos) {
      const result = await client.query(
        `INSERT INTO grupos_produtos (nome) 
         VALUES ($1) 
         ON CONFLICT DO NOTHING 
         RETURNING id`,
        [grupo.nome]
      );
      if (result.rowCount > 0) {
        console.log(`  ✓ Inserted grupo: ${grupo.nome}`);
      } else {
        console.log(`  - Grupo already exists: ${grupo.nome}`);
      }
    }
    
    // Get IDs for foreign keys
    const unidadeUnResult = await client.query("SELECT id FROM unidades_medida WHERE sigla = 'UN'");
    const unidadePcResult = await client.query("SELECT id FROM unidades_medida WHERE sigla = 'PC'");
    const unidadeKtResult = await client.query("SELECT id FROM unidades_medida WHERE sigla = 'KT'");
    
    const unidadeUnId = unidadeUnResult.rows[0]?.id || 1;
    const unidadePcId = unidadePcResult.rows[0]?.id || 2;
    const unidadeKtId = unidadeKtResult.rows[0]?.id || 3;
    
    const grupoComponentesResult = await client.query("SELECT id FROM grupos_produtos WHERE nome = 'Componentes de PC'");
    const grupoPerifericosResult = await client.query("SELECT id FROM grupos_produtos WHERE nome = 'Periféricos'");
    const grupoArmazenamentoResult = await client.query("SELECT id FROM grupos_produtos WHERE nome = 'Armazenamento'");
    const grupoMemoriaResult = await client.query("SELECT id FROM grupos_produtos WHERE nome = 'Memória'");
    const grupoPlacasVideoResult = await client.query("SELECT id FROM grupos_produtos WHERE nome = 'Placas de Vídeo'");
    const grupoFonteResult = await client.query("SELECT id FROM grupos_produtos WHERE nome = 'Fonte de Alimentação'");
    const grupoNotebooksResult = await client.query("SELECT id FROM grupos_produtos WHERE nome = 'Notebooks'");
    
    const grupoComponentesId = grupoComponentesResult.rows[0]?.id || 1;
    const grupoPerifericosId = grupoPerifericosResult.rows[0]?.id || 2;
    const grupoArmazenamentoId = grupoArmazenamentoResult.rows[0]?.id || 3;
    const grupoMemoriaId = grupoMemoriaResult.rows[0]?.id || 4;
    const grupoPlacasVideoId = grupoPlacasVideoResult.rows[0]?.id || 5;
    const grupoFonteId = grupoFonteResult.rows[0]?.id || 6;
    const grupoNotebooksId = grupoNotebooksResult.rows[0]?.id || 7;
    
    // 4. Insert sample products
    console.log('\\nInserting sample products...');
    const products = [
      // Periféricos
      { codigo: 'MOUSE001', desc: 'Mouse Óptico USB', grupo: grupoPerifericosId, unidade: unidadeUnId, precoCusto: 15.00, margem: 50.00, estoque: 50, estoqueMin: 10 },
      { codigo: 'TECLADO001', desc: 'Teclado Membrane USB', grupo: grupoPerifericosId, unidade: unidadeUnId, precoCusto: 35.00, margem: 45.00, estoque: 30, estoqueMin: 5 },
      { codigo: 'TECLADO002', desc: 'Teclado Mecânico RGB', grupo: grupoPerifericosId, unidade: unidadeUnId, precoCusto: 120.00, margem: 40.00, estoque: 15, estoqueMin: 3 },
      
      // Componentes de PC
      { codigo: 'Mae001', desc: 'Placa Mãe B550 AMD AM4', grupo: grupoComponentesId, unidade: unidadeUnId, precoCusto: 450.00, margem: 25.00, estoque: 8, estoqueMin: 2 },
      { codigo: 'Mae002', desc: 'Placa Mãe Z690 Intel LGA1700', grupo: grupoComponentesId, unidade: unidadeUnId, precoCusto: 650.00, margem: 25.00, estoque: 5, estoqueMin: 2 },
      { codigo: 'Ram001', desc: 'Memória RAM 8GB DDR4 3200MHz', grupo: grupoMemoriaId, unidade: unidadeUnId, precoCusto: 80.00, margem: 35.00, estoque: 25, estoqueMin: 5 },
      { codigo: 'Ram002', desc: 'Memória RAM 16GB DDR4 3200MHz', grupo: grupoMemoriaId, unidade: unidadeUnId, precoCusto: 150.00, margem: 35.00, estoque: 20, estoqueMin: 4 },
      { codigo: 'Ssd001', desc: 'SSD NVMe 500GB', grupo: grupoArmazenamentoId, unidade: unidadeUnId, precoCosto: 180.00, margem: 30.00, estoque: 15, estoqueMin: 3 },
      { codigo: 'Ssd002', desc: 'SSD SATA 1TB', grupo: grupoArmazenamentoId, unidade: unidadeUnId, precoCusto: 220.00, margem: 30.00, estoque: 12, estoqueMin: 3 },
      { codigo: 'PlacaVideo001', desc: 'Placa de Vídeo RTX 3060 12GB', grupo: grupoPlacasVideoId, unidade: unidadeUnId, precoCusto: 800.00, margem: 20.00, estoque: 6, estoqueMin: 1 },
      { codigo: 'Fonte001', desc: 'Fonte 650W 80Plus Bronze', grupo: grupoFonteId, unidade: unidadeUnId, precoCusto: 180.00, margem: 25.00, estoque: 10, estoqueMin: 2 },
      
      // Notebooks
      { codigo: 'Note001', desc: 'Notebook 14\" i5 8GB RAM 256GB SSD', grupo: grupoNotebooksId, unidade: unidadeUnId, precoCusto: 1800.00, margem: 15.00, estoque: 5, estoqueMin: 1 },
      { codigo: 'Note002', desc: 'Notebook 15,6\" i7 16GB RAM 512GB SSD', grupo: grupoNotebooksId, unidade: unidadeUnId, precoCusto: 2800.00, margem: 15.00, estoque: 3, estoqueMin: 1 },
      
      // Kits
      { codigo: 'Kit001', desc: 'Kit Básico Informática (Mouse+Teclado+Pad)', grupo: grupoPerifericosId, unidade: unidadeKtId, precoCusto: 40.00, margem: 50.00, estoque: 20, estoqueMin: 5 }
    ];
    
    for (const product of products) {
      // Calculate preco_venda based on markup
      const precoVenda = product.precoCusto * (1 + product.margem / 100);
      
      const result = await client.query(
        `INSERT INTO produtos (codigo_barras, descricao, grupo_id, unidade_medida_id, preco_custo, margem_lucro, preco_venda, estoque_atual, estoque_minimo) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         ON CONFLICT (codigo_barras) DO NOTHING 
         RETURNING id`,
        [product.codigo, product.desc, product.grupo, product.unidade, product.precoCusto, product.margem, precoVenda, product.estoque, product.estoqueMin]
      );
      
      if (result.rowCount > 0) {
        console.log(`  ✓ Inserted product: ${product.desc}`);
      } else {
        console.log(`  - Product already exists: ${product.desc}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('\\n✅ Database seeding completed successfully!');
    
  } catch (err) {
    // Rollback on error
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Error seeding database:', err);
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