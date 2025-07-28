/**
 * 🔍 AUDITORIA DE VULNERABILIDADES DE ACESSO E AUTORIZAÇÃO
 * Testa se usuários não logados conseguem acessar dados que não deveriam
 */

const BASE_URL = 'http://localhost:5000';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

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

// 🚨 TESTE 1: Acesso a detalhes de pedidos sem autenticação
async function testOrderDetailsAccess() {
  log('blue', '\n🚨 TESTE 1: ACESSO A DETALHES DE PEDIDOS SEM LOGIN');
  log('yellow', '📋 Testando se usuários não logados conseguem ver detalhes de pedidos...\n');
  
  const vulnerabilities = [];
  
  // Testar acesso a pedidos por ID (1, 2, 3, 4, 5)
  for (let orderId = 1; orderId <= 5; orderId++) {
    const response = await makeRequest(`/api/orders/${orderId}`);
    
    if (response.status === 200 && response.data && typeof response.data === 'object') {
      log('red', `❌ VULNERABILIDADE: Pedido ${orderId} acessível sem login!`);
      log('yellow', `   Dados expostos: ${JSON.stringify(response.data).substring(0, 100)}...`);
      vulnerabilities.push(`Order ${orderId} details accessible without authentication`);
    } else {
      log('green', `✅ Pedido ${orderId}: ${response.status === 404 ? 'Não encontrado' : `Protegido (Status: ${response.status})`}`);
    }
  }
  
  return vulnerabilities;
}

// 🚨 TESTE 2: Acesso a pedidos por número de pedido
async function testOrderByNumberAccess() {
  log('blue', '\n🚨 TESTE 2: ACESSO A PEDIDOS POR NÚMERO');
  log('yellow', '📋 Testando se números de pedidos são acessíveis publicamente...\n');
  
  const vulnerabilities = [];
  
  // Testar padrões comuns de números de pedidos
  const orderNumbers = [
    'KR2025000001',
    'KR2025000002', 
    'KR2025000003',
    'KR2024000001',
    'KR2025123456'
  ];
  
  for (const orderNumber of orderNumbers) {
    const response = await makeRequest(`/api/orders/number/${orderNumber}`);
    
    if (response.status === 200 && response.data && typeof response.data === 'object') {
      log('red', `❌ VULNERABILIDADE: Pedido ${orderNumber} acessível sem login!`);
      vulnerabilities.push(`Order ${orderNumber} accessible by number without authentication`);
    } else {
      log('green', `✅ Pedido ${orderNumber}: Protegido ou não existe (Status: ${response.status})`);
    }
  }
  
  return vulnerabilities;
}

// 🚨 TESTE 3: Acesso a dados de clientes
async function testCustomerDataAccess() {
  log('blue', '\n🚨 TESTE 3: ACESSO A DADOS DE CLIENTES');
  log('yellow', '📋 Testando se dados pessoais de clientes são acessíveis...\n');
  
  const vulnerabilities = [];
  
  // Testar acesso a dados de clientes por ID
  for (let customerId = 1; customerId <= 5; customerId++) {
    const response = await makeRequest(`/api/customers/${customerId}`);
    
    if (response.status === 200 && response.data && typeof response.data === 'object') {
      log('red', `❌ VULNERABILIDADE: Dados do cliente ${customerId} expostos!`);
      if (response.data.cpf) {
        log('red', `   CPF exposto: ${response.data.cpf.substring(0, 3)}***`);
      }
      vulnerabilities.push(`Customer ${customerId} data accessible without authentication`);
    } else {
      log('green', `✅ Cliente ${customerId}: Protegido (Status: ${response.status})`);
    }
  }
  
  return vulnerabilities;
}

// 🚨 TESTE 4: Acesso a endereços de clientes
async function testAddressAccess() {
  log('blue', '\n🚨 TESTE 4: ACESSO A ENDEREÇOS');
  log('yellow', '📋 Testando se endereços de clientes são acessíveis...\n');
  
  const vulnerabilities = [];
  
  for (let addressId = 1; addressId <= 5; addressId++) {
    const response = await makeRequest(`/api/addresses/${addressId}`);
    
    if (response.status === 200 && response.data && typeof response.data === 'object') {
      log('red', `❌ VULNERABILIDADE: Endereço ${addressId} acessível sem login!`);
      vulnerabilities.push(`Address ${addressId} accessible without authentication`);
    } else {
      log('green', `✅ Endereço ${addressId}: Protegido (Status: ${response.status})`);
    }
  }
  
  return vulnerabilities;
}

// 🚨 TESTE 5: Acesso a histórico de status
async function testOrderHistoryAccess() {
  log('blue', '\n🚨 TESTE 5: ACESSO A HISTÓRICO DE STATUS');
  log('yellow', '📋 Testando se histórico de pedidos é acessível...\n');
  
  const vulnerabilities = [];
  
  for (let orderId = 1; orderId <= 5; orderId++) {
    const response = await makeRequest(`/api/orders/${orderId}/status-history`);
    
    if (response.status === 200 && response.data && Array.isArray(response.data.history)) {
      log('red', `❌ VULNERABILIDADE: Histórico do pedido ${orderId} acessível!`);
      vulnerabilities.push(`Order ${orderId} status history accessible without authentication`);
    } else {
      log('green', `✅ Histórico ${orderId}: Protegido (Status: ${response.status})`);
    }
  }
  
  return vulnerabilities;
}

// 🚨 TESTE 6: Acesso a rotas administrativas
async function testAdminAccess() {
  log('blue', '\n🚨 TESTE 6: ACESSO A ROTAS ADMINISTRATIVAS');
  log('yellow', '📋 Testando se páginas de admin são acessíveis sem autenticação...\n');
  
  const vulnerabilities = [];
  
  const adminRoutes = [
    '/api/admin/customers',
    '/api/admin/orders', 
    '/api/admin/events',
    '/api/admin/stats',
    '/api/admin/reports/events',
  ];
  
  for (const route of adminRoutes) {
    const response = await makeRequest(route);
    
    if (response.status === 200 && response.data) {
      log('red', `❌ VULNERABILIDADE CRÍTICA: Rota admin acessível: ${route}`);
      vulnerabilities.push(`Admin route ${route} accessible without authentication`);
    } else {
      log('green', `✅ ${route}: Protegido (Status: ${response.status})`);
    }
  }
  
  return vulnerabilities;
}

// 🚨 TESTE 7: Enumeração de dados
async function testDataEnumeration() {
  log('blue', '\n🚨 TESTE 7: ENUMERAÇÃO DE DADOS');
  log('yellow', '📋 Testando se é possível enumerar todos os dados...\n');
  
  const vulnerabilities = [];
  
  // Testar se é possível listar todos os eventos, clientes, etc.
  const routes = [
    { path: '/api/events', name: 'Events' },
    { path: '/api/customers', name: 'Customers' },
    { path: '/api/orders', name: 'Orders' },
    { path: '/api/addresses', name: 'Addresses' }
  ];
  
  for (const route of routes) {
    const response = await makeRequest(route.path);
    
    if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
      log('yellow', `⚠️  ${route.name}: Lista completa acessível (${response.data.length} itens)`);
      
      // Verificar se contém dados sensíveis
      if (route.name === 'Customers' || route.name === 'Orders') {
        log('red', `❌ VULNERABILIDADE: Dados sensíveis em ${route.name} expostos!`);
        vulnerabilities.push(`${route.name} enumeration possible - sensitive data exposed`);
      } else {
        log('green', `✅ ${route.name}: Dados públicos apenas`);
      }
    } else {
      log('green', `✅ ${route.name}: Protegido ou vazio`);
    }
  }
  
  return vulnerabilities;
}

// 📊 RELATÓRIO FINAL
async function generateAccessSecurityReport() {
  log('bold', '\n' + '='.repeat(70));
  log('bold', '🔍 AUDITORIA DE VULNERABILIDADES DE ACESSO E AUTORIZAÇÃO');
  log('bold', '='.repeat(70));
  
  const allVulnerabilities = [];
  
  // Executar todos os testes
  const tests = [
    { name: 'Detalhes de Pedidos', test: testOrderDetailsAccess },
    { name: 'Pedidos por Número', test: testOrderByNumberAccess },
    { name: 'Dados de Clientes', test: testCustomerDataAccess },
    { name: 'Endereços', test: testAddressAccess },
    { name: 'Histórico de Status', test: testOrderHistoryAccess },
    { name: 'Rotas Administrativas', test: testAdminAccess },
    { name: 'Enumeração de Dados', test: testDataEnumeration }
  ];
  
  for (const { name, test } of tests) {
    try {
      const vulnerabilities = await test();
      allVulnerabilities.push(...vulnerabilities);
    } catch (error) {
      log('red', `❌ Erro no teste ${name}: ${error.message}`);
    }
  }
  
  // Resumo final
  log('bold', '\n📋 RESUMO DE VULNERABILIDADES ENCONTRADAS:');
  
  if (allVulnerabilities.length === 0) {
    log('green', '🎉 NENHUMA VULNERABILIDADE DE ACESSO ENCONTRADA!');
    log('green', '✅ Sistema está bem protegido contra acesso não autorizado');
  } else {
    log('red', `⚠️  ${allVulnerabilities.length} VULNERABILIDADES ENCONTRADAS:`);
    allVulnerabilities.forEach((vuln, index) => {
      log('red', `${index + 1}. ${vuln}`);
    });
  }
  
  log('bold', '\n🎯 RECOMENDAÇÕES:');
  
  if (allVulnerabilities.length > 0) {
    log('yellow', '1. Implementar middleware de autenticação');
    log('yellow', '2. Validar propriedade dos recursos (usuário só acessa seus dados)');
    log('yellow', '3. Implementar controle de acesso baseado em função (RBAC)');
    log('yellow', '4. Proteger todas as rotas sensíveis');
  } else {
    log('green', '1. Sistema está bem protegido');
    log('green', '2. Manter práticas de segurança atuais');
    log('green', '3. Realizar auditorias regulares');
  }
  
  log('bold', '\n' + '='.repeat(70));
  
  return allVulnerabilities;
}

// Executar auditoria
generateAccessSecurityReport().catch(console.error);