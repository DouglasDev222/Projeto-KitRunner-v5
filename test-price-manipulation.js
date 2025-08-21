// 🔍 SCRIPT DE TESTE DE MANIPULAÇÃO DE PREÇOS
// Execute este script no Console do navegador (F12 > Console)

console.log('🔍 INICIANDO TESTE DE SEGURANÇA - MANIPULAÇÃO DE PREÇOS');
console.log('📍 Vá para a página de pagamento e execute este script');

// Função principal de teste
function testPriceManipulation() {
    console.log('\n🚨 TESTE 1: Tentando modificar variáveis globais...');
    
    // Teste 1: Modificar pricing global
    try {
        if (window.pricing) {
            const originalPricing = {...window.pricing};
            window.pricing.totalCost = 0.01;
            console.log('✓ Variável pricing.totalCost modificada para R$ 0.01');
            console.log('Original:', originalPricing);
            console.log('Modificado:', window.pricing);
        } else {
            console.log('ℹ️ Variável pricing não encontrada globalmente');
        }
    } catch(e) {
        console.log('✗ Erro ao modificar pricing:', e.message);
    }

    // Teste 2: Interceptar requisições fetch
    console.log('\n🚨 TESTE 2: Instalando interceptador de requisições...');
    
    if (!window.originalFetch) {
        window.originalFetch = window.fetch;
        
        window.fetch = function(...args) {
            const url = args[0];
            const options = args[1] || {};
            
            console.log('📡 Interceptando requisição:', url);
            
            // Interceptar requisições de pagamento
            if (url.includes('payment') || url.includes('orders')) {
                console.log('🎯 ALVO ENCONTRADO: Requisição de pagamento detectada');
                
                if (options.body) {
                    try {
                        const originalBody = JSON.parse(options.body);
                        console.log('📋 Dados originais:', originalBody);
                        
                        // Modificar valores
                        const modifiedBody = {...originalBody};
                        if (modifiedBody.totalCost) modifiedBody.totalCost = 0.01;
                        if (modifiedBody.amount) modifiedBody.amount = 0.01;
                        if (modifiedBody.deliveryCost) modifiedBody.deliveryCost = 0.01;
                        
                        options.body = JSON.stringify(modifiedBody);
                        console.log('🚨 PAYLOAD MODIFICADO:', modifiedBody);
                        console.log('⚠️ Tentando enviar com preços alterados...');
                        
                    } catch(e) {
                        console.log('✗ Erro ao modificar payload:', e.message);
                    }
                }
            }
            
            return window.originalFetch.apply(this, args);
        };
        
        console.log('✓ Interceptador instalado com sucesso');
    } else {
        console.log('ℹ️ Interceptador já estava instalado');
    }

    // Teste 3: Modificar sessionStorage
    console.log('\n🚨 TESTE 3: Modificando sessionStorage...');
    
    try {
        // Procurar chaves relacionadas a preços
        const storageKeys = Object.keys(sessionStorage);
        console.log('🔍 Chaves no sessionStorage:', storageKeys);
        
        // Tentar modificar dados de pedido
        storageKeys.forEach(key => {
            try {
                const value = sessionStorage.getItem(key);
                if (value && (key.includes('pricing') || key.includes('order') || key.includes('payment'))) {
                    console.log(`📋 Encontrada chave suspeita: ${key}`);
                    console.log(`📄 Valor original: ${value}`);
                    
                    // Tentar parsear e modificar
                    const parsed = JSON.parse(value);
                    if (parsed.totalCost) {
                        parsed.totalCost = 0.01;
                        sessionStorage.setItem(key, JSON.stringify(parsed));
                        console.log(`🚨 MODIFICADO: ${key} - totalCost alterado para R$ 0.01`);
                    }
                }
            } catch(e) {
                // Não é JSON, ignorar
            }
        });
        
        // Criar entrada maliciosa
        sessionStorage.setItem('malicious_pricing', JSON.stringify({
            totalCost: 0.01,
            amount: 0.01,
            deliveryCost: 0.01
        }));
        console.log('🚨 Entrada maliciosa criada no sessionStorage');
        
    } catch(e) {
        console.log('✗ Erro ao modificar sessionStorage:', e.message);
    }

    // Teste 4: Procurar React state
    console.log('\n🚨 TESTE 4: Procurando estado React...');
    
    try {
        // Procurar componentes React no DOM
        const reactElements = document.querySelectorAll('[data-reactroot], [data-react-*, *[class*="react"]');
        console.log(`🔍 Encontrados ${reactElements.length} elementos React`);
        
        // Tentar acessar React DevTools
        if (window.React && window.React.version) {
            console.log('⚛️ React detectado, versão:', window.React.version);
        }
        
        // Procurar por variáveis de estado expostas
        const suspiciousVars = ['pricing', 'order', 'payment', 'total', 'amount'];
        suspiciousVars.forEach(varName => {
            if (window[varName]) {
                console.log(`🎯 Variável global encontrada: ${varName}`, window[varName]);
            }
        });
        
    } catch(e) {
        console.log('✗ Erro ao analisar React:', e.message);
    }

    console.log('\n📊 RESUMO DO TESTE:');
    console.log('1. ✓ Interceptador de requisições instalado');
    console.log('2. ✓ SessionStorage modificado');
    console.log('3. ✓ Variáveis globais testadas');
    console.log('\n🎯 PRÓXIMO PASSO: Tente finalizar um pagamento agora');
    console.log('🔍 Observe os logs para ver se a manipulação foi detectada');
    console.log('\n⚠️ SE O PAGAMENTO FOR PROCESSADO COM VALORES ALTERADOS = VULNERABILIDADE DETECTADA');
    console.log('✅ SE O PAGAMENTO FOR REJEITADO = SISTEMA SEGURO');
}

// Função para remover interceptadores
function cleanupTests() {
    console.log('🧹 Limpando testes...');
    
    if (window.originalFetch) {
        window.fetch = window.originalFetch;
        delete window.originalFetch;
        console.log('✓ Interceptador removido');
    }
    
    try {
        sessionStorage.removeItem('malicious_pricing');
        console.log('✓ Dados maliciosos removidos do sessionStorage');
    } catch(e) {
        console.log('✗ Erro ao limpar sessionStorage:', e.message);
    }
}

// Função para testar cURL (copie e execute no terminal)
function generateCurlTest() {
    console.log('\n📋 TESTE CURL (execute no terminal):');
    console.log('curl -X POST "http://localhost:5000/api/mercadopago/create-card-payment" \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Authorization: Bearer SEU_TOKEN" \\');
    console.log('  -d \'{"orderId":"KR2025123456","amount":0.01,"email":"test@test.com"}\'');
}

// Executar testes automaticamente
console.log('🚀 Executando testes automaticamente...');
testPriceManipulation();

console.log('\n🔧 COMANDOS DISPONÍVEIS:');
console.log('- testPriceManipulation() - Executar todos os testes');
console.log('- cleanupTests() - Limpar interceptadores');
console.log('- generateCurlTest() - Gerar comando cURL para teste');

console.log('\n📖 INSTRUÇÕES:');
console.log('1. Vá para a página de pagamento');
console.log('2. Preencha os dados normalmente');
console.log('3. Antes de clicar em "Pagar", execute este script');
console.log('4. Clique em "Pagar" e observe os logs');
console.log('5. Verifique se o sistema bloqueou a manipulação');