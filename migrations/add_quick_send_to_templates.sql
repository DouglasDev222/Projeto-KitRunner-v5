-- Add quickSend field to whatsapp_templates table
ALTER TABLE whatsapp_templates 
ADD COLUMN quick_send BOOLEAN NOT NULL DEFAULT false;

-- Update existing "entregue" status template to be quick send
UPDATE whatsapp_templates 
SET quick_send = true 
WHERE status = 'entregue' OR name ILIKE '%entregue%';

-- Update existing "Próxima entrega" template to be quick send
UPDATE whatsapp_templates 
SET quick_send = true 
WHERE name ILIKE '%próxima entrega%' OR name ILIKE '%proxima entrega%';