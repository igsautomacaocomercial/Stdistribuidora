const { Pool } = require('pg');
const p = new Pool({
  connectionString: 'postgresql://stadmin:Qrp0dM4IHGgtBbnJUwjWjXu2TT3Rb5vH@dpg-d8h1bs28pkls73bqa27g-a.virginia-postgres.render.com/st_distribuidora',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await p.query("ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS localizacao VARCHAR(50)");
  await p.query("DROP VIEW IF EXISTS vw_os_detalhada CASCADE");
  await p.query(`
    CREATE VIEW vw_os_detalhada AS
    SELECT
        os.id, os.numero_os,
        c.nome_razao_social AS cliente_nome, c.cpf_cnpj AS cliente_doc,
        c.telefone AS cliente_telefone, c.whatsapp AS cliente_whatsapp, c.email AS cliente_email,
        t.nome AS tecnico_nome, t.especialidade AS tecnico_especialidade,
        os.marca, os.modelo, os.numero_serie, os.senha_bios,
        os.defeito_relatado, os.laudo_tecnico,
        os.status, os.data_entrada, os.data_saida, os.valor_total,
        os.localizacao,
        cl.tela, cl.teclado, cl.teclas_especificar, cl.camera, cl.som,
        cl.rede_rj45, cl.rede_wifi, cl.usb, cl.microfone, cl.touchpad,
        cl.bateria, cl.tempo_autonomia, cl.carcaca, cl.observacoes
    FROM ordens_servico os
    JOIN clientes c ON c.id = os.cliente_id
    LEFT JOIN tecnicos t ON t.id = os.tecnico_id
    LEFT JOIN checklists cl ON cl.os_id = os.id
  `);
  console.log('Coluna localizacao adicionada e view atualizada!');
  await p.end();
}
run().catch(e => { console.error(e.message); process.exit(); });
