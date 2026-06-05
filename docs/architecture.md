# Sistema de Gestao de Ordens de Servico (OS) - ST Distribuidora

## Arquitetura do Sistema

### 1. Visao Geral

Sistema para gestao de assistencia tecnica em informatica, abrangendo:

- **Cadastro** de clientes, tecnicos, servicos e produtos
- **Ordens de Servico** com checklist de inspecao completo
- **Auditoria** de mudancas de status
- **Relatorios** gerenciais e dashboard
- **Impressao** de OS em layout ficha fisica
- **Integracoes** com API da Receita Federal e WhatsApp

### 2. Stack Tecnologica

| Componente       | Tecnologia                  |
|------------------|-----------------------------|
| Banco de Dados   | PostgreSQL 15+              |
| Backend          | Node.js + Express           |
| Frontend         | React / Vue.js (a definir)  |
| Impressao        | HTML + CSS @media print     |
| API CNPJ         | BrasilAPI (gratuita)        |
| Notificacao      | Evolution API / Z-API       |

### 3. Estrutura do Banco de Dados

```
st_distribuidora
+-- emitente            (1 registro - dados da empresa)
+-- clientes            (pessoas fisicas e juridicas)
+-- tecnicos            (profissionais)
+-- servicos_produtos   (catalogo)
+-- ordens_servico      (OS principal)
+-- os_itens            (itens da OS)
+-- checklists          (vistoria tecnica)
+-- status_log          (auditoria)
+-- [views]             (vw_historico_cliente, vw_auditoria_status, etc.)
```

### 4. Modelo Relacional

```
emitente 1---* ordens_servico *---1 clientes
                     |                   1
                     +---1 checklists
                     |
                     +---* os_itens
                     |
                     +---* status_log
                     |
                     *---1 tecnicos
```

### 5. Fluxo de uma Ordem de Servico

```
[Abertura]
    |
    v
[Orcamento] ----(cliente recusa)----> [Cancelado]
    |
    v
[Aprovado]
    |
    v
[Em Manutencao] ----(falta peca)----> [Aguardando Peca]
    |                                        |
    +<----(peca chegou)---------------------+
    |
    v
[Pronto para Retirada]
    |
    v
[Finalizado]
```

### 6. Convencoes de Desenvolvimento

#### 6.1 Nomenclatura
- Tabelas: `snake_case` no plural (ex: `ordens_servico`)
- Colunas: `snake_case` (ex: `nome_razao_social`)
- Chaves primarias: `id` (SERIAL) em todas as tabelas
- Chaves estrangeiras: `tabela_id` (ex: `cliente_id`)
- Views: prefixo `vw_` (ex: `vw_historico_cliente`)
- Triggers: prefixo `trg_`
- Funcoes: prefixo `fnc_` ou verbo no infinitivo

#### 6.2 Seguranca
- Senha de homologacao do PostgreSQL: `123`
- Em producao, utilizar variaveis de ambiente
- Soft delete para clientes (nunca apagar historico)
- Log de auditoria obrigatorio para mudancas de status

#### 6.3 UI/UX - Mascaras Obrigatorias (Frontend)
| Campo     | Mascara                  | Exemplo                    |
|-----------|--------------------------|----------------------------|
| CNPJ      | 00.000.000/0000-00      | 12.345.678/0001-90        |
| CPF       | 000.000.000-00          | 123.456.789-00            |
| Telefone  | (00) 00000-0000         | (11) 91234-5678           |
| CEP       | 00000-000               | 01310-100                 |
| Data      | DD/MM/AAAA HH:MM        | 04/06/2026 09:30          |

### 7. Arquivos do Projeto

```
C:\Stdistribuidora\
+-- database\
|   +-- ddl.sql              (DDL completo - tabelas, enums, triggers)
|   +-- views.sql            (Views de historico e auditoria)
|   +-- reports.sql          (Queries para dashboard e relatorios)
+-- print\
|   +-- os_template.html     (Template HTML/CSS para impressao)
+-- integrations\
|   +-- cnpj_lookup.js       (Busca CNPJ na BrasilAPI/ReceitaWS)
|   +-- whatsapp.js          (Notificacao via WhatsApp)
|   +-- client_crud.js       (CRUD de clientes com soft delete)
|   +-- database_connection.js (Conexao com PostgreSQL)
+-- docs\
|   +-- architecture.md      (Este documento)
+-- Imagem\
    +-- (foto do modelo fisico de referencia)
```

### 8. Como Executar

```bash
# 1. Criar banco de dados
psql -U postgres -c "CREATE DATABASE st_distribuidora;"

# 2. Executar DDL
psql -U postgres -d st_distribuidora -f database/ddl.sql

# 3. Criar views
psql -U postgres -d st_distribuidora -f database/views.sql

# 4. Criar relatorios
psql -U postgres -d st_distribuidora -f database/reports.sql
```

### 9. Exemplos de Consultas Uteis

```sql
-- OS em aberto com cliente e tecnico
SELECT os.numero_os, c.nome_razao_social, t.nome AS tecnico,
       os.status, os.data_entrada, os.valor_total
FROM ordens_servico os
JOIN clientes c ON c.id = os.cliente_id
LEFT JOIN tecnicos t ON t.id = os.tecnico_id
WHERE os.status NOT IN ('Finalizado', 'Cancelado')
ORDER BY os.data_entrada DESC;

-- Faturamento do mes atual
SELECT SUM(valor_total) AS faturamento
FROM ordens_servico
WHERE status = 'Finalizado'
  AND data_saida >= DATE_TRUNC('month', CURRENT_DATE);
```
