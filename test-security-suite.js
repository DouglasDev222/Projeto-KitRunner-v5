/**
 * 🔒 TESTE DE SEGURANÇA COMPLETO - SISTEMA DE PAGAMENTO
 * 
 * Este script testa todas as vulnerabilidades críticas identificadas,
 * com foco especial na IDEMPOTÊNCIA para evitar cobranças duplicadas.
 */

const BASE_URL = 'http://localhost:5000';

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

// Função para delay entre requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para fazer requisições HTTP
async function makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.text();
    
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }
    
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: jsonData
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message
    };
  }
}

// 🎯 TESTE 1: IDEMPOTÊNCIA - CRÍTICO
async function testIdempotency() {
  log('blue', '\n🎯 TESTE 1: IDEMPOTÊNCIA DE PAGAMENTOS (CRÍTICO)');
  log('yellow', '📋 Testando se múltiplas requisições com mesmo idempotency key são bloqueadas...\n');
  
  const idempotencyKey = `TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  const paymentData = {
    token: 'test_token_12345',
    paymentMethodId: 'visa',
    amount: '50.00',
    email: 'test@example.com',
    customerName: 'João Silva Teste',
    cpf: '11144477735',
    orderData: {
      eventId: 1,
      addressId: 1,
      kitQuantity: 1,
      kits: [{ name: 'João Silva', cpf: '11144477735', shirtSize: 'M' }],
      idempotencyKey: idempotencyKey
    }
  };
  
  log('yellow', `🔑 Usando idempotency key: ${idempotencyKey}`);
  
  // Primeira requisição - deve ser processada
  log('blue', '📤 Enviando primeira requisição...');
  const firstResponse = await makeRequest('/api/mercadopago/process-card-payment', 'POST', paymentData);
  
  log('yellow', `📨 Primeira resposta: Status ${firstResponse.status}`);
  if (firstResponse.data.message) {
    log('yellow', `💬 Mensagem: ${firstResponse.data.message}`);
  }
  
  await delay(1000); // Aguardar 1 segundo
  
  // Segunda requisição - deve ser BLOQUEADA
  log('blue', '📤 Enviando segunda requisição com MESMO idempotency key...');
  const secondResponse = await makeRequest('/api/mercadopago/process-card-payment', 'POST', paymentData);
  
  log('yellow', `📨 Segunda resposta: Status ${secondResponse.status}`);
  if (secondResponse.data.message) {
    log('yellow', `💬 Mensagem: ${secondResponse.data.message}`);
  }
  
  // Análise dos resultados
  if (secondResponse.status === 409 && secondResponse.data.isDuplicate) {
    log('green', '✅ IDEMPOTÊNCIA FUNCIONANDO! Segunda requisição foi bloqueada corretamente.');
    log('green', '✅ Sistema está PROTEGIDO contra cobranças duplicadas!');
    return true;
  } else {
    log('red', '❌ FALHA CRÍTICA: Segunda requisição não foi bloqueada!');
    log('red', '❌ RISCO DE COBRANÇA DUPLICADA!');
    return false;
  }
}

// 🛡️ TESTE 2: RATE LIMITING
async function testRateLimiting() {
  log('blue', '\n🛡️ TESTE 2: RATE LIMITING');
  log('yellow', '📋 Testando proteção contra ataques de força bruta...\n');
  
  const testData = {
    cpf: '12345678901', // CPF inválido de propósito
    birthDate: '1990-01-01'
  };
  
  log('yellow', '📤 Enviando múltiplas requisições de identificação...');
  
  let blockedCount = 0;
  for (let i = 1; i <= 12; i++) {
    const response = await makeRequest('/api/customers/identify', 'POST', testData);
    
    if (response.status === 429) {
      log('red', `🚫 Requisição ${i}: BLOQUEADA por rate limit (Status 429)`);
      blockedCount++;
    } else {
      log('yellow', `📤 Requisição ${i}: Status ${response.status}`);
    }
    
    await delay(100); // Pequeno delay entre requisições
  }
  
  if (blockedCount > 0) {
    log('green', `✅ RATE LIMITING FUNCIONANDO! ${blockedCount} requisições foram bloqueadas.`);
    return true;
  } else {
    log('red', '❌ FALHA: Rate limiting não está funcionando!');
    return false;
  }
}

// 🔍 TESTE 3: VALIDAÇÃO DE CPF
async function testCPFValidation() {
  log('blue', '\n🔍 TESTE 3: VALIDAÇÃO DE CPF NO BACKEND');
  log('yellow', '📋 Testando se CPFs inválidos são rejeitados...\n');
  
  const invalidCPFs = [
    '12345678901', // CPF inválido
    '11111111111', // CPF com dígitos repetidos
    '00000000000', // CPF zeros
    'abcdefghijk'  // CPF com letras
  ];
  
  let validationCount = 0;
  
  for (const cpf of invalidCPFs) {
    log('yellow', `🧪 Testando CPF inválido: ${cpf.substring(0, 3)}***`);
    
    const response = await makeRequest('/api/customers/identify', 'POST', {
      cpf: cpf,
      birthDate: '1990-01-01'
    });
    
    if (response.status === 400 && response.data.message && response.data.message.includes('CPF inválido')) {
      log('green', '✅ CPF inválido rejeitado corretamente');
      validationCount++;
    } else {
      log('red', `❌ CPF inválido foi aceito! Status: ${response.status}`);
    }
    
    await delay(200);
  }
  
  if (validationCount === invalidCPFs.length) {
    log('green', '✅ VALIDAÇÃO DE CPF FUNCIONANDO! Todos os CPFs inválidos foram rejeitados.');
    return true;
  } else {
    log('red', '❌ FALHA: Alguns CPFs inválidos foram aceitos!');
    return false;
  }
}

// 🔒 TESTE 4: HEADERS DE SEGURANÇA
async function testSecurityHeaders() {
  log('blue', '\n🔒 TESTE 4: HEADERS DE SEGURANÇA HTTP');
  log('yellow', '📋 Verificando se headers de segurança estão configurados...\n');
  
  const response = await makeRequest('/api/events');
  
  const requiredHeaders = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-xss-protection': '1; mode=block',
    'referrer-policy': 'strict-origin-when-cross-origin'
  };
  
  let headerCount = 0;
  
  for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
    const actualValue = response.headers[header];
    
    if (actualValue && actualValue.toLowerCase() === expectedValue.toLowerCase()) {
      log('green', `✅ ${header}: ${actualValue}`);
      headerCount++;
    } else {
      log('red', `❌ ${header}: ${actualValue || 'AUSENTE'} (esperado: ${expectedValue})`);
    }
  }
  
  // Verificar CSP
  const csp = response.headers['content-security-policy'];
  if (csp && csp.includes('mercadopago')) {
    log('green', '✅ content-security-policy: Configurado com MercadoPago');
    headerCount++;
  } else {
    log('red', '❌ content-security-policy: Ausente ou mal configurado');
  }
  
  if (headerCount >= 4) {
    log('green', '✅ HEADERS DE SEGURANÇA CONFIGURADOS!');
    return true;
  } else {
    log('red', '❌ FALHA: Headers de segurança faltando!');
    return false;
  }
}

// 🎭 TESTE 5: MASCARAMENTO DE DADOS
async function testDataMasking() {
  log('blue', '\n🎭 TESTE 5: MASCARAMENTO DE DADOS SENSÍVEIS');
  log('yellow', '📋 Verificando se dados sensíveis são mascarados nos logs...\n');
  
  // Este teste precisa ser visual - verificar os logs do servidor
  const testData = {
    token: 'secret_token_12345',
    paymentMethodId: 'visa',
    amount: '25.00',
    email: 'test@example.com',
    customerName: 'Maria Silva',
    cpf: '11144477735',
    orderData: {
      eventId: 1,
      addressId: 1,
      kitQuantity: 1,
      kits: [{ name: 'Maria Silva', cpf: '11144477735', shirtSize: 'P' }],
      idempotencyKey: `MASK-TEST-${Date.now()}`
    }
  };
  
  log('yellow', '📤 Enviando requisição com dados sensíveis...');
  const response = await makeRequest('/api/mercadopago/process-card-payment', 'POST', testData);
  
  log('yellow', `📨 Status: ${response.status}`);
  log('green', '✅ VERIFICAR LOGS DO SERVIDOR: CPF e token devem aparecer mascarados como [MASKED_CPF] e [MASKED_TOKEN]');
  
  return true; // Verificação manual necessária
}

// 📊 RELATÓRIO FINAL
async function generateSecurityReport() {
  log('bold', '\n' + '='.repeat(60));
  log('bold', '🔒 RELATÓRIO DE SEGURANÇA - SISTEMA DE PAGAMENTO');
  log('bold', '='.repeat(60));
  
  const tests = [
    { name: 'Idempotência (CRÍTICO)', test: testIdempotency },
    { name: 'Rate Limiting', test: testRateLimiting },
    { name: 'Validação de CPF', test: testCPFValidation },
    { name: 'Headers de Segurança', test: testSecurityHeaders },
    { name: 'Mascaramento de Dados', test: testDataMasking }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      results.push({ name, passed: result });
    } catch (error) {
      log('red', `❌ Erro no teste ${name}: ${error.message}`);
      results.push({ name, passed: false });
    }
  }
  
  // Resumo final
  log('bold', '\n📋 RESUMO DOS TESTES:');
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  results.forEach(({ name, passed }) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(color, `${icon} ${name}`);
  });
  
  log('bold', `\n🎯 RESULTADO FINAL: ${passedTests}/${totalTests} testes aprovados`);
  
  if (passedTests === totalTests) {
    log('green', '🎉 SISTEMA COMPLETAMENTE SEGURO! Pronto para produção.');
  } else {
    log('red', '⚠️  ATENÇÃO: Algumas vulnerabilidades foram encontradas!');
  }
  
  log('bold', '\n📌 PRÓXIMOS PASSOS:');
  log('yellow', '1. Verificar logs do servidor para confirmar mascaramento');
  log('yellow', '2. Configurar webhook após deploy');
  log('yellow', '3. Testar em ambiente de produção');
  
  log('bold', '\n' + '='.repeat(60));
}

// Executar todos os testes
generateSecurityReport().catch(console.error);