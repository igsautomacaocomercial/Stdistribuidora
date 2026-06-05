const { Router } = require('express');
const router = Router();
const db = require('../db');

// GET /api/vendas - listar
router.get('/', async (req, res) => {
  try {
    const { status, caixa_id, vendedor_id, cliente_id, data_inicio, data_fim, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = []; const wheres = []; let i = 1;

    if (status) { wheres.push(`v.status = $${i++}`); params.push(status); }
    if (caixa_id) { wheres.push(`v.caixa_id = $${i++}`); params.push(caixa_id); }
    if (vendedor_id) { wheres.push(`v.vendedor_id = $${i++}`); params.push(vendedor_id); }
    if (cliente_id) { wheres.push(`v.cliente_id = $${i++}`); params.push(cliente_id); }
    if (data_inicio) { wheres.push(`v.data_hora >= $${i++}`); params.push(data_inicio); }
    if (data_fim) { wheres.push(`v.data_hora <= $${i++} + interval '1 day'`); params.push(data_fim); }

    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

    const count = await db.query(`SELECT COUNT(*) FROM vendas v ${where}`, params);
    const total = parseInt(count.rows[0].count);

    params.push(parseInt(limit), offset);
    const data = await db.query(`
      SELECT v.*, c.nome_razao_social AS cliente_nome, vd.nome AS vendedor_nome
      FROM vendas v
      LEFT JOIN clientes c ON c.id=v.cliente_id
      LEFT JOIN vendedores vd ON vd.id=v.vendedor_id
      ${where} ORDER BY v.data_hora DESC LIMIT $${i++} OFFSET $${i}
    `, params);

    res.json({ success: true, data: data.rows, pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / +limit) } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/vendas/:id - detalhe
router.get('/:id', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT v.*, c.nome_razao_social AS cliente_nome, c.cpf_cnpj AS cliente_doc, c.telefone AS cliente_telefone,
        vd.nome AS vendedor_nome
      FROM vendas v
      LEFT JOIN clientes c ON c.id=v.cliente_id
      LEFT JOIN vendedores vd ON vd.id=v.vendedor_id
      WHERE v.id=$1
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Venda nao encontrada' });

    const itens = await db.query('SELECT * FROM venda_itens WHERE venda_id=$1 ORDER BY id', [req.params.id]);
    const pagamentos = await db.query(`
      SELECT vp.*, fp.descricao AS forma_pagamento_descricao, fp.tipo AS forma_pagamento_tipo
      FROM venda_pagamentos vp
      JOIN formas_pagamento fp ON fp.id=vp.forma_pagamento_id
      WHERE vp.venda_id=$1 ORDER BY vp.id
    `, [req.params.id]);

    res.json({ success: true, data: { ...r.rows[0], itens: itens.rows, pagamentos: pagamentos.rows } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/vendas - criar nova venda
router.post('/', async (req, res) => {
  try {
    const { caixa_id, cliente_id, vendedor_id, observacao, origem, os_id } = req.body;
    if (!caixa_id) return res.status(400).json({ success: false, error: 'caixa_id obrigatorio' });
    if (!vendedor_id) return res.status(400).json({ success: false, error: 'vendedor_id obrigatorio' });

    // Verifica caixa aberto
    const caixa = await db.query('SELECT id FROM caixas WHERE id=$1 AND status=$2', [caixa_id, 'Aberto']);
    if (!caixa.rows.length) return res.status(400).json({ success: false, error: 'Caixa nao esta aberto' });

    const seq = await db.query('SELECT proximo_numero_venda() AS next');
    const numero_venda = parseInt(seq.rows[0].next);

    const r = await db.query(`
      INSERT INTO vendas (numero_venda, caixa_id, cliente_id, vendedor_id, observacao, origem, os_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, numero_venda
    `, [numero_venda, caixa_id, cliente_id||null, vendedor_id, observacao||null, origem||'PDV', os_id||null]);

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/vendas/:id/itens - adicionar item
router.post('/:id/itens', async (req, res) => {
  try {
    const { produto_id, descricao, quantidade, valor_unitario, desconto_tipo, desconto_valor, custo_unitario, comissao_percentual } = req.body;
    if (!descricao || !quantidade) return res.status(400).json({ success: false, error: 'descricao e quantidade obrigatorios' });

    const venda = await db.query("SELECT id, status FROM vendas WHERE id=$1", [req.params.id]);
    if (!venda.rows.length) return res.status(404).json({ success: false, error: 'Venda nao encontrada' });
    if (venda.rows[0].status !== 'Aberta') return res.status(400).json({ success: false, error: 'Venda ja finalizada ou cancelada' });

    const qtd = parseFloat(quantidade) || 1;
    const valUnit = parseFloat(valor_unitario) || 0;
    const descTipo = desconto_tipo || null;
    const descValor = parseFloat(desconto_valor) || 0;
    let valDesc = 0;
    if (descTipo === 'Percentual') valDesc = (qtd * valUnit) * (descValor / 100);
    else if (descTipo === 'Valor') valDesc = Math.min(descValor, qtd * valUnit);
    const valTotal = (qtd * valUnit) - valDesc;

    const r = await db.query(`
      INSERT INTO venda_itens (venda_id, produto_id, descricao, quantidade, valor_unitario,
        desconto_tipo, desconto_valor, valor_desconto, valor_total, custo_unitario, comissao_percentual)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
    `, [req.params.id, produto_id||null, descricao, qtd, valUnit,
      descTipo, descValor, valDesc, valTotal, custo_unitario||0, comissao_percentual||null]);

    // Recalcular venda
    await recalcularVenda(req.params.id);

    res.status(201).json({ success: true, data: { id: r.rows[0].id } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/vendas/:id/itens/:itemId - remover item
router.delete('/:id/itens/:itemId', async (req, res) => {
  try {
    await db.query('DELETE FROM venda_itens WHERE id=$1 AND venda_id=$2', [req.params.itemId, req.params.id]);
    await recalcularVenda(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/vendas/:id/finalizar
router.post('/:id/finalizar', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const venda = await client.query("SELECT v.*, c.nome_razao_social FROM vendas v LEFT JOIN clientes c ON c.id=v.cliente_id WHERE v.id=$1", [req.params.id]);
    if (!venda.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: 'Venda nao encontrada' }); }
    if (venda.rows[0].status !== 'Aberta') { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: 'Venda ja finalizada ou cancelada' }); }

    const { pagamentos } = req.body;
    if (!pagamentos || !pagamentos.length) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: 'Informe pelo menos uma forma de pagamento' }); }

    const v = venda.rows[0];
    const totalVenda = parseFloat(v.valor_total);

    // Validar pagamentos
    let totalPago = 0;
    for (const pg of pagamentos) {
      const fp = await client.query('SELECT * FROM formas_pagamento WHERE id=$1', [pg.forma_pagamento_id]);
      if (!fp.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: 'Forma de pagamento invalida' }); }

      const forma = fp.rows[0];
      const valorPg = parseFloat(pg.valor) || 0;
      totalPago += valorPg;

      if (!forma.permite_troco && pg.valor_recebido && parseFloat(pg.valor_recebido) > valorPg) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: `${forma.descricao} nao permite valor recebido maior que o valor` });
      }

      const valorRecebido = parseFloat(pg.valor_recebido) || valorPg;
      const troco = forma.permite_troco ? Math.max(0, valorRecebido - valorPg) : 0;

      await client.query(`
        INSERT INTO venda_pagamentos (venda_id, forma_pagamento_id, valor, parcelas, valor_recebido, troco, autorizacao_cartao, observacao)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [req.params.id, pg.forma_pagamento_id, valorPg, pg.parcelas||1, valorRecebido, troco, pg.autorizacao_cartao||null, pg.observacao||null]);
    }

    if (totalPago < totalVenda) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: `Valor total dos pagamentos (R$ ${totalPago.toFixed(2)}) e menor que o total da venda (R$ ${totalVenda.toFixed(2)})` });
    }

    // Baixar estoque dos produtos
    const itens = await client.query('SELECT * FROM venda_itens WHERE venda_id=$1', [req.params.id]);
    for (const item of itens.rows) {
      if (item.produto_id) {
        const prod = await client.query('SELECT id, descricao, estoque_atual FROM produtos WHERE id=$1', [item.produto_id]);
        if (prod.rows.length) {
          const saldoAnt = parseFloat(prod.rows[0].estoque_atual) || 0;
          const saldoNovo = saldoAnt - parseFloat(item.quantidade);
          await client.query('UPDATE produtos SET estoque_atual = estoque_atual - $1 WHERE id=$2', [item.quantidade, item.produto_id]);
          await client.query(`
            INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, venda_id, observacao)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
          `, [item.produto_id, 'Venda', item.quantidade, saldoAnt, saldoNovo, req.params.id, 'Venda #' + v.numero_venda]);
        }
      }
    }

    // Atualizar status da venda
    await client.query("UPDATE vendas SET status='Finalizada', data_hora=NOW() WHERE id=$1", [req.params.id]);

    // Atualizar totais no caixa
    const pagamentosVenda = await client.query(`
      SELECT fp.tipo, SUM(vp.valor) as total FROM venda_pagamentos vp
      JOIN formas_pagamento fp ON fp.id=vp.forma_pagamento_id
      WHERE vp.venda_id=$1 GROUP BY fp.tipo
    `, [req.params.id]);

    let dinheiro = 0, pix = 0, debito = 0, credito = 0, vale = 0, outros = 0;
    for (const p of pagamentosVenda.rows) {
      const val = parseFloat(p.total);
      switch (p.tipo) {
        case 'Dinheiro': dinheiro = val; break;
        case 'Pix': pix = val; break;
        case 'Debito': debito = val; break;
        case 'Credito': credito = val; break;
        case 'Prazo': vale = val; break;
        default: outros += val;
      }
    }

    await client.query(`
      UPDATE caixas SET
        total_vendido = total_vendido + $1,
        valor_dinheiro = valor_dinheiro + $2,
        valor_pix = valor_pix + $3,
        valor_debito = valor_debito + $4,
        valor_credito = valor_credito + $5,
        valor_vale = valor_vale + $6,
        valor_outros = valor_outros + $7
      WHERE id=$8
    `, [totalVenda, dinheiro, pix, debito, credito, vale, outros, v.caixa_id]);

    // Comissao do vendedor
    const vendedor = await client.query('SELECT percentual_comissao FROM vendedores WHERE id=$1', [v.vendedor_id]);
    if (vendedor.rows.length && parseFloat(vendedor.rows[0].percentual_comissao) > 0) {
      const perc = parseFloat(vendedor.rows[0].percentual_comissao);
      const valorComissao = totalVenda * (perc / 100);
      await client.query(`
        INSERT INTO comissoes (venda_id, vendedor_id, valor_base, percentual, valor_comissao, pago)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [req.params.id, v.vendedor_id, totalVenda, perc, valorComissao, false]);
    }

    // Se venda veio de OS, atualizar status da OS
    if (v.os_id) {
      await client.query("UPDATE ordens_servico SET status='Finalizado', data_saida=NOW() WHERE id=$1", [v.os_id]);
    }

    await client.query('COMMIT');

    res.json({ success: true, message: 'Venda finalizada com sucesso', data: { id: +req.params.id, numero_venda: v.numero_venda } });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

// POST /api/vendas/:id/cancelar
router.post('/:id/cancelar', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { motivo } = req.body;
    if (!motivo) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: 'Motivo do cancelamento obrigatorio' }); }

    const venda = await client.query('SELECT * FROM vendas WHERE id=$1', [req.params.id]);
    if (!venda.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, error: 'Venda nao encontrada' }); }

    const v = venda.rows[0];

    // Se finalizada, estornar estoque
    if (v.status === 'Finalizada') {
      const itens = await client.query('SELECT * FROM venda_itens WHERE venda_id=$1', [req.params.id]);
      for (const item of itens.rows) {
        if (item.produto_id) {
          const prod = await client.query('SELECT id, estoque_atual FROM produtos WHERE id=$1', [item.produto_id]);
          if (prod.rows.length) {
            const saldoAnt = parseFloat(prod.rows[0].estoque_atual) || 0;
            const saldoNovo = saldoAnt + parseFloat(item.quantidade);
            await client.query('UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id=$2', [item.quantidade, item.produto_id]);
            await client.query(`
              INSERT INTO estoque_movimentos (produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, venda_id, observacao)
              VALUES ($1,$2,$3,$4,$5,$6,$7)
            `, [item.produto_id, 'Cancelamento', item.quantidade, saldoAnt, saldoNovo, req.params.id, 'Cancelamento venda #' + v.numero_venda]);
          }
        }
      }
    }

    await client.query("UPDATE vendas SET status='Cancelada', motivo_cancelamento=$1, cancelado_em=NOW() WHERE id=$2", [motivo, req.params.id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Venda cancelada' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: e.message });
  } finally {
    client.release();
  }
});

// PUT /api/vendas/:id - atualizar dados da venda (cliente, vendedor, observacao, desconto)
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['cliente_id','vendedor_id','observacao','desconto_tipo','desconto_valor'];
    const sets = []; const params = []; let i = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) { sets.push(`${f}=$${i++}`); params.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Nenhum campo' });
    params.push(req.params.id);
    const r = await db.query(`UPDATE vendas SET ${sets.join(',')} WHERE id=$${i} RETURNING id`, params);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Venda nao encontrada' });
    await recalcularVenda(req.params.id);
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/vendas/:id/print - dados para cupom 80mm
router.get('/:id/print', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT v.*, c.nome_razao_social AS cliente_nome, c.cpf_cnpj AS cliente_doc,
        c.telefone AS cliente_telefone, c.logradouro AS cliente_logradouro,
        c.numero AS cliente_numero, c.bairro AS cliente_bairro,
        c.cidade AS cliente_cidade, c.uf AS cliente_uf,
        vd.nome AS vendedor_nome
      FROM vendas v
      LEFT JOIN clientes c ON c.id=v.cliente_id
      LEFT JOIN vendedores vd ON vd.id=v.vendedor_id
      WHERE v.id=$1
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, error: 'Venda nao encontrada' });

    const itens = await db.query('SELECT * FROM venda_itens WHERE venda_id=$1 ORDER BY id', [req.params.id]);
    const pagamentos = await db.query(`
      SELECT vp.*, fp.descricao AS forma_pagamento_descricao
      FROM venda_pagamentos vp
      JOIN formas_pagamento fp ON fp.id=vp.forma_pagamento_id
      WHERE vp.venda_id=$1 ORDER BY vp.id
    `, [req.params.id]);
    const emit = await db.query('SELECT * FROM emitente LIMIT 1');

    res.json({ success: true, data: { ...r.rows[0], itens: itens.rows, pagamentos: pagamentos.rows, emitente: emit.rows[0] || null } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

async function recalcularVenda(vendaId) {
  const sums = await db.query(`
    SELECT COALESCE(SUM(valor_total), 0) AS subtotal FROM venda_itens WHERE venda_id=$1
  `, [vendaId]);
  const subtotal = parseFloat(sums.rows[0].subtotal);

  const venda = await db.query('SELECT desconto_tipo, desconto_valor FROM vendas WHERE id=$1', [vendaId]);
  const v = venda.rows[0];
  const descTipo = v.desconto_tipo;
  const descValor = parseFloat(v.desconto_valor) || 0;

  let valDesc = 0;
  if (descTipo === 'Percentual') valDesc = subtotal * (descValor / 100);
  else valDesc = Math.min(descValor, subtotal);

  const total = subtotal - valDesc;

  await db.query(`
    UPDATE vendas SET subtotal=$1, valor_desconto=$2, valor_total=$3 WHERE id=$4
  `, [subtotal, valDesc, total, vendaId]);
}

module.exports = router;
