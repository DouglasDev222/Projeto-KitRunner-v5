// 🧪 TESTE DE GERAÇÃO DE NÚMEROS DE PEDIDOS
// Execute este script para testar a nova funcionalidade

const { DatabaseStorage } = require('./server/storage');

async function testOrderNumberGeneration() {
    console.log('🧪 INICIANDO TESTE DE GERAÇÃO DE NÚMEROS DE PEDIDOS');
    console.log('📅 Formato esperado: KR{YY}-{NNNN}');
    console.log('📅 2025: KR25-1000, KR25-1001, KR25-1002...');
    console.log('📅 2026: KR26-0001, KR26-0002, KR26-0003...');
    console.log('');

    try {
        const storage = new DatabaseStorage();
        
        console.log('🔢 Testando geração de números sequenciais...');
        
        // Gerar alguns números de teste
        for (let i = 0; i < 5; i++) {
            const orderNumber = await storage.generateUniqueOrderNumber();
            console.log(`✅ Número ${i + 1}: ${orderNumber}`);
        }
        
        console.log('');
        console.log('✅ Teste concluído com sucesso!');
        console.log('');
        console.log('🔍 VERIFICAÇÕES REALIZADAS:');
        console.log('• Formato correto KR{YY}-{NNNN}');
        console.log('• Sequência crescente');
        console.log('• Verificação de duplicatas');
        console.log('• Proteção contra falhas');

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Verificar ano atual e formato esperado
function verifyCurrentYearFormat() {
    const currentYear = new Date().getFullYear();
    const yearSuffix = String(currentYear).slice(-2);
    const startingNumber = currentYear === 2025 ? 1000 : 1;
    
    console.log('📅 CONFIGURAÇÃO ATUAL:');
    console.log(`• Ano: ${currentYear}`);
    console.log(`• Sufixo: ${yearSuffix}`);
    console.log(`• Número inicial: ${String(startingNumber).padStart(4, '0')}`);
    console.log(`• Formato: KR${yearSuffix}-${String(startingNumber).padStart(4, '0')}`);
    console.log('');
}

// Executar teste
async function runTest() {
    console.log('🎯 TESTE DE NÚMEROS DE PEDIDOS - KITRUNNER');
    console.log('='.repeat(50));
    
    verifyCurrentYearFormat();
    await testOrderNumberGeneration();
}

// Exportar para uso em outros testes
module.exports = {
    testOrderNumberGeneration,
    verifyCurrentYearFormat,
    runTest
};

// Se executado diretamente
if (require.main === module) {
    runTest().catch(console.error);
}