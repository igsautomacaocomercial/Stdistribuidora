/**
 * ============================================================================
 * MODULO: CRUD DE CLIENTES
 * Acoes: Localizar (com filtros), Alterar dados, Inativar (Soft Delete)
 * ============================================================================
 *
 * Exemplo em Node.js com Express e PostgreSQL (node-postgres)
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Pool de conexao com PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'st_distribuidora',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123'
});

// ============================================================================
// 1. LOCALIZAR / LISTAR CLIENTES
// Filtros por nome, CPF, CNPJ, status
// GET /api/clientes?q=nome&status=Ativo&page=1&limit=20
// ============================================================================

router.get('/clientes', async (req, res) => {
    try {
        const { q, status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let where = [];
        let params = [];
        let paramIndex = 1;

        // Filtro por status (padrao: Ativo)
        if (status) {
            where.push(`c.status = $${paramIndex++}`);
            params.push(status);
        } else {
            where.push(`c.status = 'Ativo'`);
        }

        // Filtro por termo de busca (nome, CPF, CNPJ, email, telefone)
        if (q && q.trim()) {
            const termo = `%${q.trim()}%`;
            where.push(`(
                c.nome_razao_social ILIKE $${paramIndex}
                OR c.cpf_cnpj ILIKE $${paramIndex}
                OR c.email ILIKE $${paramIndex}
                OR c.telefone ILIKE $${paramIndex}
                OR c.whatsapp ILIKE $${paramIndex}
            )`);
            params.push(termo);
            paramIndex++;
        }

        const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

        // Query de listagem com paginacao
        const query = `
            SELECT
                c.id,
                c.tipo,
                c.cpf_cnpj,
                c.nome_razao_social,
                c.inscricao_estadual,
                c.telefone,
                c.whatsapp,
                c.email,
                c.cep,
                c.logradouro,
                c.numero,
                c.complemento,
                c.bairro,
                c.cidade,
                c.uf,
                c.status,
                c.data_cadastro,
                (SELECT COUNT(*) FROM ordens_servico os WHERE os.cliente_id = c.id) AS total_os,
                (SELECT COALESCE(SUM(os.valor_total), 0) FROM ordens_servico os WHERE os.cliente_id = c.id AND os.status = 'Finalizado') AS total_gasto
            FROM clientes c
            ${whereClause}
            ORDER BY c.nome_razao_social ASC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        // Query de total (para paginacao)
        const countQuery = `
            SELECT COUNT(*) FROM clientes c ${whereClause}
        `;
        const countResult = await pool.query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// 2. EXIBIR CLIENTE POR ID (com historico de OS)
// GET /api/clientes/:id
// ============================================================================

router.get('/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Dados do cliente
        const clienteResult = await pool.query(
            'SELECT * FROM clientes WHERE id = $1',
            [id]
        );

        if (clienteResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cliente nao encontrado' });
        }

        // Historico de OS do cliente (usa a view criada no banco)
        const historicoResult = await pool.query(
            'SELECT * FROM vw_historico_cliente WHERE cliente_id = $1 ORDER BY data_entrada DESC',
            [id]
        );

        res.json({
            success: true,
            data: {
                ...clienteResult.rows[0],
                historico: historicoResult.rows
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// 3. CRIAR CLIENTE
// POST /api/clientes
// ============================================================================

router.post('/clientes', async (req, res) => {
    try {
        const {
            tipo, cpf_cnpj, nome_razao_social,
            inscricao_estadual, telefone, whatsapp, email,
            cep, logradouro, numero, complemento, bairro, cidade, uf
        } = req.body;

        // Validacoes basicas
        if (!tipo || !cpf_cnpj || !nome_razao_social) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatorios: tipo, cpf_cnpj, nome_razao_social'
            });
        }

        // Verifica duplicidade de CPF/CNPJ
        const dupCheck = await pool.query(
            'SELECT id FROM clientes WHERE cpf_cnpj = $1',
            [cpf_cnpj]
        );
        if (dupCheck.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'CPF/CNPJ ja cadastrado para outro cliente'
            });
        }

        const result = await pool.query(`
            INSERT INTO clientes
                (tipo, cpf_cnpj, nome_razao_social, inscricao_estadual,
                 telefone, whatsapp, email, cep, logradouro, numero,
                 complemento, bairro, cidade, uf)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
        `, [
            tipo, cpf_cnpj, nome_razao_social, inscricao_estadual || null,
            telefone || null, whatsapp || null, email || null,
            cep || null, logradouro || null, numero || null,
            complemento || null, bairro || null, cidade || null,
            uf ? uf.toUpperCase() : null
        ]);

        res.status(201).json({
            success: true,
            data: { id: result.rows[0].id },
            message: 'Cliente cadastrado com sucesso'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// 4. ALTERAR DADOS DO CLIENTE
// PUT /api/clientes/:id
// ============================================================================

router.put('/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const fields = req.body;

        // Verifica se o cliente existe
        const check = await pool.query(
            'SELECT id, status FROM clientes WHERE id = $1',
            [id]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cliente nao encontrado' });
        }

        // Verifica duplicidade de CPF/CNPJ (se estiver sendo alterado)
        if (fields.cpf_cnpj) {
            const dupCheck = await pool.query(
                'SELECT id FROM clientes WHERE cpf_cnpj = $1 AND id != $2',
                [fields.cpf_cnpj, id]
            );
            if (dupCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'CPF/CNPJ ja cadastrado para outro cliente'
                });
            }
        }

        // Constroi UPDATE dinamicamente (apenas campos fornecidos)
        const allowedFields = [
            'tipo', 'cpf_cnpj', 'nome_razao_social', 'inscricao_estadual',
            'telefone', 'whatsapp', 'email', 'cep', 'logradouro',
            'numero', 'complemento', 'bairro', 'cidade', 'uf'
        ];

        const sets = [];
        const params = [];
        let paramIndex = 1;

        for (const field of allowedFields) {
            if (fields[field] !== undefined) {
                sets.push(`${field} = $${paramIndex++}`);
                params.push(fields[field]);
            }
        }

        if (sets.length === 0) {
            return res.status(400).json({ success: false, error: 'Nenhum campo para alterar' });
        }

        // Atualiza updated_at manualmente (o trigger ja cuida disso)
        params.push(id);
        const query = `
            UPDATE clientes
            SET ${sets.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, nome_razao_social, cpf_cnpj, status
        `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Cliente atualizado com sucesso'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// 5. INATIVAR CLIENTE (Soft Delete)
// PATCH /api/clientes/:id/inativar
// ============================================================================

router.patch('/clientes/:id/inativar', async (req, res) => {
    try {
        const { id } = req.params;

        const check = await pool.query(
            'SELECT id, status FROM clientes WHERE id = $1',
            [id]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cliente nao encontrado' });
        }

        if (check.rows[0].status === 'Inativo') {
            return res.status(400).json({ success: false, error: 'Cliente ja esta inativo' });
        }

        // Verifica se ha OS em aberto para este cliente
        const osAbertas = await pool.query(`
            SELECT COUNT(*) FROM ordens_servico
            WHERE cliente_id = $1
              AND status NOT IN ('Finalizado', 'Cancelado')
        `, [id]);

        if (parseInt(osAbertas.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: `Cliente possui ${osAbertas.rows[0].count} OS em aberto. Finalize ou cancele antes de inativar.`
            });
        }

        // Soft delete: altera status para Inativo
        await pool.query(
            "UPDATE clientes SET status = 'Inativo' WHERE id = $1",
            [id]
        );

        res.json({
            success: true,
            message: 'Cliente inativado com sucesso. O historico de servicos foi mantido.'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// 6. REATIVAR CLIENTE
// PATCH /api/clientes/:id/reativar
// ============================================================================

router.patch('/clientes/:id/reativar', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "UPDATE clientes SET status = 'Ativo' WHERE id = $1 AND status = 'Inativo' RETURNING id",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cliente nao encontrado ou ja esta ativo' });
        }

        res.json({ success: true, message: 'Cliente reativado com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
