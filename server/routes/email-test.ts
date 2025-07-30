import { Router } from 'express';
import { EmailService } from '../email/email-service';
import { storage } from '../storage';

const router = Router();

// Test endpoint for SendGrid integration
router.post('/test-sendgrid', async (req, res) => {
  try {
    console.log('🧪 Testing SendGrid integration...');
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Create EmailService instance
    const emailService = new EmailService(storage);
    
    // Send test email
    const success = await emailService.sendTestEmail(email);
    
    if (success) {
      console.log('✅ SendGrid test email sent successfully!');
      res.json({
        success: true,
        message: 'Test email sent successfully! Check your inbox.',
        email: email
      });
    } else {
      console.log('❌ SendGrid test email failed!');
      res.status(500).json({
        success: false,
        error: 'Failed to send test email. Check server logs for details.'
      });
    }

  } catch (error) {
    console.error('💥 SendGrid test error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    });
  }
});

// Get email logs endpoint
router.get('/email-logs', async (req, res) => {
  try {
    const emailService = new EmailService(storage);
    const logs = await emailService.getEmailLogs();
    
    res.json({
      success: true,
      logs: logs
    });
  } catch (error) {
    console.error('Error getting email logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email logs'
    });
  }
});

export default router;