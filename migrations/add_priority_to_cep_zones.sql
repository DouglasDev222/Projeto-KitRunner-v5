-- Migração para adicionar campo de prioridade às zonas CEP
-- Sistema de Prioridades CEP Zones

-- Adicionar campo de prioridade
ALTER TABLE cep_zones ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;

-- Criar índice para otimizar consultas por prioridade
CREATE INDEX IF NOT EXISTS idx_cep_zones_priority ON cep_zones(priority);

-- Atualizar zonas existentes com prioridades baseadas no ID (menores IDs = maior prioridade)
UPDATE cep_zones SET priority = id WHERE priority IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN cep_zones.priority IS 'Prioridade da zona (menor número = maior prioridade). Sistema permite sobreposições controladas.';
COMMENT ON INDEX idx_cep_zones_priority IS 'Índice para otimizar busca de zonas por ordem de prioridade';