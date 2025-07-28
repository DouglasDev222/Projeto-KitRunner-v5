// Test script to force payment rejection
const fetch = require('node-fetch');

async function testRejection() {
    // Test with known rejection card
    const testData = {
        token: 'test_token_rejected',
        paymentMethodId: 'master',
        orderId: 'TEST-REJECT-' + Date.now(),
        amount: 23.50,
        email: 'test@test.com',
        customerName: 'Test User',
        cpf: '46435426325'
    };

    // Try with different rejection scenarios
    const rejectionCards = [
        {
            name: 'OTHE',
            cardNumber: '5031433215406365', // insufficient_funds
            description: 'Fundos insuficientes'
        },
        {
            name: 'OTHE', 
            cardNumber: '4013540682746260', // rejected
            description: 'Recusa genérica'
        },
        {
            name: 'CONT',
            cardNumber: '4009175701008020', // pending
            description: 'Pagamento pendente'
        }
    ];

    console.log('🧪 Testing payment rejection scenarios...\n');
    
    for (const card of rejectionCards) {
        console.log(`Testing ${card.description} with card ${card.cardNumber}...`);
        
        try {
            // First create a token for this card
            const tokenResponse = await fetch('http://localhost:5000/api/mercadopago/create-card-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardNumber: card.cardNumber,
                    cardholderName: card.name,
                    cardExpirationMonth: '11',
                    cardExpirationYear: '2030',
                    securityCode: '123',
                    identificationType: 'CPF',
                    identificationNumber: '46435426325'
                })
            });
            
            const tokenData = await tokenResponse.json();
            console.log(`Token created: ${tokenData.success ? tokenData.token : 'ERROR'}`);
            
            if (tokenData.success) {
                // Now process payment with this token
                const paymentResponse = await fetch('http://localhost:5000/api/mercadopago/process-card-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: tokenData.token,
                        paymentMethodId: card.cardNumber.startsWith('4') ? 'visa' : 'master',
                        orderId: 'TEST-' + card.name + '-' + Date.now(),
                        amount: 23.50,
                        email: 'test@test.com',
                        customerName: 'Test User',
                        cpf: '46435426325'
                    })
                });
                
                const paymentData = await paymentResponse.json();
                console.log(`Payment Status: ${paymentData.status || 'ERROR'}`);
                console.log(`Success: ${paymentData.success}`);
                console.log(`Message: ${paymentData.message || 'N/A'}`);
            }
            
        } catch (error) {
            console.log(`Error: ${error.message}`);
        }
        
        console.log('---\n');
    }
}

testRejection().catch(console.error);