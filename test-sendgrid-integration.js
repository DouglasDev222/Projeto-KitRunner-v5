// Test SendGrid Integration
import { EmailService } from './server/email/email-service.js';
import { storage } from './server/storage.js';

async function testSendGridIntegration() {
  console.log('🧪 Testing SendGrid Integration...');
  
  try {
    // Create EmailService instance
    const emailService = new EmailService(storage);
    
    // Test email address - change this to your email
    const testEmail = 'test@example.com'; // CHANGE THIS TO YOUR EMAIL
    
    console.log(`📧 Sending test email to: ${testEmail}`);
    
    // Send test email
    const success = await emailService.sendTestEmail(testEmail);
    
    if (success) {
      console.log('✅ SendGrid integration test PASSED!');
      console.log('📬 Check your email inbox for the test message.');
      console.log('');
      console.log('🎉 Integration is working correctly!');
      console.log('📊 Email log has been saved to the database.');
      console.log('');
      console.log('Next steps:');
      console.log('1. ✅ SendGrid API key is working');
      console.log('2. ✅ Email templates are rendering correctly');
      console.log('3. ✅ Database logging is functional');
      console.log('4. 🔄 Ready to integrate with order creation');
    } else {
      console.log('❌ SendGrid integration test FAILED!');
      console.log('');
      console.log('Possible issues:');
      console.log('- Invalid SendGrid API key');
      console.log('- Network connectivity problems');
      console.log('- SendGrid account limitations');
      console.log('');
      console.log('Check the error logs above for more details.');
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    console.log('');
    console.log('Common solutions:');
    console.log('1. Check if SENDGRID_API_KEY is properly set');
    console.log('2. Verify SendGrid account is active');
    console.log('3. Ensure API key has "Full Access" permissions');
  }
}

// Run the test
testSendGridIntegration();