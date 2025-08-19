-- Create WhatsApp messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    job_id VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP
);

-- Create WhatsApp settings table
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id SERIAL PRIMARY KEY,
    template_content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default template if none exists
INSERT INTO whatsapp_settings (template_content, is_active)
SELECT 
    'Olá, *{{cliente}}*! 
Confirmamos sua solicitação de *[Retirada do Kit] {{evento}}*.

Você solicitou a retirada de *{{qtd_kits}}* kits para os seguintes atletas:

{{lista_kits}}

Vamos retirar seu kit, previsão de entrega é para amanhã dia {{data_entrega}}.
Logo mais entraremos em contato e faremos a entrega no endereço informado no pedido.

Qualquer dúvida, estamos à disposição.',
    true
WHERE NOT EXISTS (SELECT 1 FROM whatsapp_settings);