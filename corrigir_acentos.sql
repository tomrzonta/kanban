-- Corrige textos cujos acentos viraram "??" (corrupção antiga de encoding em
-- migrações). Só afeta linhas corrompidas; dados corretos não são tocados.
-- Seguro rodar mais de uma vez.
--
-- Como rodar (na pasta do projeto, com os containers no ar):
--   Get-Content corrigir_acentos.sql -Encoding UTF8 | docker compose exec -T db psql -U postgres -d garantias3d
--
-- IMPORTANTE: passar por -Encoding UTF8 acima, senão o PowerShell reintroduz o
-- problema. (É a mesma pegadinha que corrompeu os dados na migração.)

-- Estados de impressora retida
UPDATE estados_retida SET name = 'Aguardando destinação' WHERE name LIKE 'Aguardando destina%' AND name <> 'Aguardando destinação';
UPDATE estados_retida SET name = 'Em recuperação'        WHERE name LIKE 'Em recupera%'         AND name <> 'Em recuperação';
UPDATE estados_retida SET name = 'Cemitério de peças'    WHERE name LIKE 'Cemit%'                AND name <> 'Cemitério de peças';
UPDATE estados_retida SET name = 'Em uso — Farm'         WHERE name LIKE 'Em uso%Farm%'          AND name <> 'Em uso — Farm';

-- Componentes de checklist
UPDATE checklist_componentes SET name = 'Fonte de alimentação'            WHERE name LIKE 'Fonte de alimenta%'   AND name <> 'Fonte de alimentação';
UPDATE checklist_componentes SET name = 'Placa-mãe'                       WHERE name LIKE 'Placa-m%'             AND name <> 'Placa-mãe';
UPDATE checklist_componentes SET name = 'Cama / placa de construção'      WHERE name LIKE 'Cama / placa de constru%' AND name <> 'Cama / placa de construção';
UPDATE checklist_componentes SET name = 'Placa de construção (PEI)'       WHERE name LIKE 'Placa de constru%(PEI)%' AND name <> 'Placa de construção (PEI)';
UPDATE checklist_componentes SET name = 'Placa de construção'             WHERE name LIKE 'Placa de constru%'    AND name NOT LIKE '%PEI%' AND name <> 'Placa de construção';
UPDATE checklist_componentes SET name = 'Cabo de força'                   WHERE name LIKE 'Cabo de for%'         AND name <> 'Cabo de força';
UPDATE checklist_componentes SET name = 'Manual / acessórios'             WHERE name LIKE 'Manual / acess%'      AND name <> 'Manual / acessórios';
UPDATE checklist_componentes SET name = 'Tampa / carcaça'                 WHERE name LIKE 'Tampa / carca%'       AND name <> 'Tampa / carcaça';
UPDATE checklist_componentes SET name = 'Módulo de troca de cor'          WHERE name LIKE 'M%dulo de troca%'     AND name <> 'Módulo de troca de cor';

-- Peças canibalizáveis (pecas_padrao)
UPDATE pecas_padrao SET name = 'Placa-mãe'                    WHERE name LIKE 'Placa-m%'          AND name <> 'Placa-mãe';
UPDATE pecas_padrao SET name = 'Fonte de alimentação'        WHERE name LIKE 'Fonte de alimenta%' AND name <> 'Fonte de alimentação';
UPDATE pecas_padrao SET name = 'Módulo LiDAR / câmera'       WHERE name LIKE 'M%dulo LiDAR%'     AND name <> 'Módulo LiDAR / câmera';
UPDATE pecas_padrao SET name = 'Ventoinha (hotend / peça / placa)' WHERE name LIKE 'Ventoinha (hotend%' AND name <> 'Ventoinha (hotend / peça / placa)';

-- Categorias de gasto
UPDATE categorias_gasto SET name = 'Mão de obra'       WHERE name LIKE 'M%o de obra'    AND name <> 'Mão de obra';
UPDATE categorias_gasto SET name = 'Peça de reposição' WHERE name LIKE 'Pe%a de reposi%' AND name <> 'Peça de reposição';

-- Colunas do kanban
UPDATE columns SET name = 'Análise interna'    WHERE name LIKE 'An%lise interna'  AND name <> 'Análise interna';
UPDATE columns SET name = 'Concluído'          WHERE name LIKE 'Conclu%'          AND name <> 'Concluído';
UPDATE columns SET name = 'Aguardando peça'    WHERE name LIKE 'Aguardando pe%a'  AND name <> 'Aguardando peça';

-- Mostra o resultado para conferência
SELECT 'estados_retida' AS tabela, name FROM estados_retida
UNION ALL SELECT 'checklist', name FROM checklist_componentes
UNION ALL SELECT 'pecas_padrao', name FROM pecas_padrao
UNION ALL SELECT 'categorias_gasto', name FROM categorias_gasto
UNION ALL SELECT 'columns', name FROM columns
ORDER BY tabela, name;
