/**
 * Test script for Payment Pending Email System
 * Tests the complete implementation of payment pending email with 1-minute delay
 */

console.log('🧪 Testing Payment Pending Email System...\n');

// Test data for a sample order that would trigger payment pending email
const testOrderData = {
  eventId: 1, // Use existing event from seed data
  customerId: 1, // Use existing customer
  addressId: 1, // Use existing address
  kitQuantity: 2,
  deliveryCost: "15.00",
  extraKitsCost: "10.00", 
  donationCost: "5.00",
  totalCost: "30.00",
  paymentMethod: "pix",
  kits: [
    {
      name: "João Silva Teste",
      cpf: "11144477735",
      shirtSize: "M"
    },
    {
      name: "Maria Silva Teste", 
      cpf: "22233344456",
      shirtSize: "P"
    }
  ],
  idempotencyKey: `test-${Date.now()}`
};

// Test order creation endpoint
async function testPaymentPendingFlow() {
  try {
    console.log('📦 Creating test order...');
    
    const response = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testOrderData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Failed to create order:', response.status, errorData);
      return;
    }

    const result = await response.json();
    console.log('✅ Order created successfully:', result.order.orderNumber);
    console.log('⏰ Payment pending email should be sent in 1 minute...');
    console.log('📧 Check server logs and email dashboard for confirmation');
    
    // Test scheduler status
    console.log('\n📊 Testing scheduler endpoints...');
    
    const schedulerResponse = await fetch('http://localhost:5000/api/admin/email-scheduler/status');
    if (schedulerResponse.ok) {
      const schedulerStatus = await schedulerResponse.json();
      console.log('📈 Scheduled emails count:', schedulerStatus.scheduledCount);
    }

    console.log('\n🔍 To verify the email system:');
    console.log('1. Wait 1 minute and check server logs for email sending');
    console.log('2. Check email logs via: GET /api/admin/email-logs');
    console.log('3. Order should remain in "aguardando_pagamento" status');
    console.log('4. Payment pending email should contain order details and 24h expiration warning');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPaymentPendingFlow();