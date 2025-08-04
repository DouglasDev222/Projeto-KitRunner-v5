-- Update existing CEP zones to have default priority values
-- This ensures backward compatibility with existing zones

UPDATE cep_zones 
SET priority = CASE 
    WHEN name LIKE '%Centro%' OR name LIKE '%Z1%' THEN 1
    WHEN name LIKE '%Zona Sul%' OR name LIKE '%Z2%' THEN 2  
    WHEN name LIKE '%Bayeux%' OR name LIKE '%Z3%' THEN 3
    ELSE 1
END
WHERE priority IS NULL;

-- Ensure all zones have priority values
UPDATE cep_zones SET priority = 1 WHERE priority IS NULL;