/**
 * 🎯 TESTE ESPECÍFICO DE IDEMPOTÊNCIA
 * Testa se o sistema bloqueia pagamentos duplicados usando idempotency keys
 */

const BASE_URL = 'http://localhost:5000';

async function testIdempotencyWithRealData() {
  console.log('🔑 TESTE DE IDEMPOTÊNCIA COM DADOS REAIS\n');
  
  // Usar dados que existem no banco
  const idempotencyKey = `IDEM-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  const orderData = {
    eventId: 1, // Evento que existe
    addressId: 1, // Endereço que existe 
    kitQuantity: 1,
    kits: [{ 
      name: 'Teste Silva', 
      cpf: '11144477735', // CPF válido que existe no sistema
      shirtSize: 'M' 
    }],
    idempotencyKey: idempotencyKey
  };
  
  console.log(`🔑 Idempotency Key: ${idempotencyKey}`);
  
  // Simular criação de pedido direto para testar idempotência
  try {
    const response1 = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    const result1 = await response1.json();
    console.log('📤 Primeira tentativa:', response1.status, result1.message || 'OK');
    
    // Segunda tentativa com MESMO idempotency key
    const response2 = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    
    const result2 = await response2.json();
    console.log('📤 Segunda tentativa:', response2.status, result2.message || 'OK');
    
    if (response2.status === 409 || (result2.message && result2.message.includes('já processado'))) {
      console.log('✅ IDEMPOTÊNCIA FUNCIONANDO! Duplicata foi bloqueada.');
      return true;
    } else {
      console.log('❌ FALHA: Segunda requisição não foi bloqueada.');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Erro no teste:', error.message);
    return false;
  }
}

// Executar teste
testIdempotencyWithRealData();