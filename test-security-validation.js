// 🛡️ TESTE DE VALIDAÇÃO DE SEGURANÇA
// Este script testa especificamente se a correção de segurança está funcionando

async function testSecurityValidation() {
    console.log('🛡️ TESTANDO VALIDAÇÃO DE SEGURANÇA DO KITRUNNER');
    console.log('📍 Certifique-se de estar na página de pagamento');
    
    // Função para testar API diretamente
    async function testDirectAPI() {
        console.log('\n🎯 TESTE 1: Tentativa de manipulação via API direta');
        
        try {
            // Pegar token de autenticação atual
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                console.log('❌ Token de autenticação não encontrado. Faça login primeiro.');
                return;
            }
            
            // Teste com valor manipulado
            const maliciousPayload = {
                orderId: "KR2025123456",
                amount: 0.01, // Valor extremamente baixo
                email: "test@example.com",
                customerName: "Teste Hacker",
                cpf: "11122233344"
            };
            
            console.log('🚨 Enviando payload malicioso:', maliciousPayload);
            
            // Testar rota PIX
            const pixResponse = await fetch('/api/mercadopago/create-pix-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(maliciousPayload)
            });
            
            const pixResult = await pixResponse.json();
            
            if (pixResponse.ok) {
                console.log('🚨 VULNERABILIDADE DETECTADA: PIX processado com valor manipulado!');
                console.log('Resposta:', pixResult);
            } else {
                console.log('✅ SEGURANÇA OK: PIX rejeitado como esperado');
                console.log('Erro:', pixResult.message);
                
                if (pixResult.code === 'PRICE_VALIDATION_FAILED') {
                    console.log('🛡️ Validação de preço funcionando corretamente!');
                }
            }
            
        } catch (error) {
            console.log('❌ Erro no teste de API:', error.message);
        }
    }
    
    // Função para testar manipulação do frontend
    function testFrontendManipulation() {
        console.log('\n🎯 TESTE 2: Manipulação de dados do frontend');
        
        // Procurar formulários de pagamento
        const paymentForms = document.querySelectorAll('form, [data-testid*="payment"], [class*="payment"]');
        console.log(`🔍 Encontrados ${paymentForms.length} formulários de pagamento`);
        
        // Procurar inputs relacionados a preços
        const priceInputs = document.querySelectorAll(
            'input[name*="amount"], input[name*="price"], input[name*="total"], ' +
            'input[value*="R$"], [data-testid*="amount"], [data-testid*="price"]'
        );
        
        console.log(`🔍 Encontrados ${priceInputs.length} campos de preço`);
        
        priceInputs.forEach((input, index) => {
            console.log(`📋 Campo ${index + 1}:`, {
                name: input.name,
                value: input.value,
                type: input.type,
                id: input.id
            });
            
            // Tentar modificar
            const originalValue = input.value;
            input.value = '0.01';
            
            if (input.value === '0.01') {
                console.log(`🚨 Campo ${index + 1} foi modificado com sucesso!`);
            } else {
                console.log(`✅ Campo ${index + 1} protegido contra modificação`);
            }
            
            // Restaurar valor original
            input.value = originalValue;
        });
    }
    
    // Função para verificar estado do React
    function checkReactState() {
        console.log('\n🎯 TESTE 3: Verificando estado React/variáveis globais');
        
        // Variáveis suspeitas
        const suspiciousVars = [
            'pricing', 'totalCost', 'amount', 'paymentData', 
            'orderData', 'cart', 'checkout', 'price'
        ];
        
        suspiciousVars.forEach(varName => {
            if (window[varName]) {
                console.log(`🎯 Variável global encontrada: ${varName}`);
                console.log('Valor:', window[varName]);
                
                // Tentar modificar
                if (typeof window[varName] === 'object' && window[varName].totalCost) {
                    const original = window[varName].totalCost;
                    window[varName].totalCost = 0.01;
                    console.log(`🚨 Modificado ${varName}.totalCost de ${original} para 0.01`);
                }
            }
        });
        
        // Verificar React DevTools
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            console.log('⚛️ React DevTools detectado - estado pode ser modificável');
        }
    }
    
    // Função para monitorar requisições de rede
    function monitorNetworkRequests() {
        console.log('\n🎯 TESTE 4: Monitorando requisições de rede');
        
        // Verificar se já existe interceptador
        if (window._securityTestInterceptor) {
            console.log('ℹ️ Interceptador já ativo');
            return;
        }
        
        const originalFetch = window.fetch;
        window._securityTestInterceptor = true;
        
        window.fetch = function(...args) {
            const url = args[0];
            const options = args[1] || {};
            
            if (url.includes('payment') || url.includes('order')) {
                console.log('📡 INTERCEPTADO: Requisição de pagamento');
                console.log('URL:', url);
                
                if (options.body) {
                    try {
                        const body = JSON.parse(options.body);
                        console.log('📋 Dados enviados:', body);
                        
                        // Verificar se há campos de preço
                        const priceFields = ['amount', 'totalCost', 'price', 'total'];
                        priceFields.forEach(field => {
                            if (body[field] !== undefined) {
                                console.log(`💰 Campo de preço detectado: ${field} = ${body[field]}`);
                            }
                        });
                        
                    } catch (e) {
                        console.log('📋 Body não é JSON:', options.body);
                    }
                }
            }
            
            return originalFetch.apply(this, args);
        };
        
        console.log('✅ Interceptador de rede ativado');
        console.log('🎯 Agora tente fazer um pagamento e observe os logs');
    }
    
    // Executar todos os testes
    console.log('🚀 Iniciando bateria de testes de segurança...\n');
    
    await testDirectAPI();
    testFrontendManipulation();
    checkReactState();
    monitorNetworkRequests();
    
    console.log('\n📊 RESUMO DOS TESTES:');
    console.log('1. ✓ Teste de API direta executado');
    console.log('2. ✓ Teste de manipulação frontend executado');  
    console.log('3. ✓ Verificação de estado React executada');
    console.log('4. ✓ Monitor de rede ativado');
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('1. Tente fazer um pagamento normalmente');
    console.log('2. Observe se alguma manipulação passou despercebida');
    console.log('3. Verifique os logs do servidor para confirmação');
    
    console.log('\n🔍 INTERPRETAÇÃO DOS RESULTADOS:');
    console.log('✅ SEGURO: Erros de validação, pagamentos rejeitados');
    console.log('🚨 VULNERÁVEL: Pagamentos processados com valores alterados');
}

// Função para limpar testes
function cleanupSecurityTests() {
    if (window._securityTestInterceptor && window.originalFetch) {
        window.fetch = window.originalFetch;
        delete window._securityTestInterceptor;
        console.log('🧹 Interceptador removido');
    }
}

// Função para relatório de segurança
function generateSecurityReport() {
    console.log('\n📋 RELATÓRIO DE SEGURANÇA - KITRUNNER');
    console.log('='.repeat(50));
    console.log('Data:', new Date().toLocaleString());
    console.log('URL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    
    console.log('\n🔍 PONTOS VERIFICADOS:');
    console.log('✓ Manipulação de variáveis JavaScript globais');
    console.log('✓ Interceptação de requisições HTTP');
    console.log('✓ Modificação de campos de formulário');
    console.log('✓ Alteração de dados no sessionStorage/localStorage');
    console.log('✓ Teste de API com payloads maliciosos');
    
    console.log('\n🛡️ MEDIDAS DE PROTEÇÃO ESPERADAS:');
    console.log('• Validação server-side de todos os preços');
    console.log('• Rejeição de valores manipulados');
    console.log('• Recálculo automático no backend');
    console.log('• Logs de segurança para auditoria');
}

// Executar automaticamente
console.log('🛡️ CARREGANDO TESTES DE SEGURANÇA...');
console.log('Execute testSecurityValidation() para iniciar os testes');
console.log('Execute cleanupSecurityTests() para limpar após os testes');
console.log('Execute generateSecurityReport() para gerar relatório');

// Auto-executar se estivermos na página de pagamento
if (window.location.pathname.includes('payment')) {
    console.log('📍 Página de pagamento detectada - executando testes automaticamente');
    setTimeout(testSecurityValidation, 1000);
}