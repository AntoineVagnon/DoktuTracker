import { MailService } from '@sendgrid/mail';

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY || '');

async function debugSendGrid() {
  console.log("🔑 API Key exists:", !!process.env.SENDGRID_API_KEY);
  console.log("🔑 API Key starts with:", process.env.SENDGRID_API_KEY?.substring(0, 10));
  
  try {
    const result = await mailService.send({
      to: 'avagnonperso@gmail.com',
      from: 'doktu@doktu.co',
      subject: 'Test',
      text: 'Test'
    });
    console.log("Success:", result);
  } catch (error: any) {
    console.error("\n❌ SendGrid Error Code:", error.code);
    console.error("Error Message:", error.message);
    if (error.response?.body?.errors) {
      console.error("\n📝 Detailed errors from SendGrid:");
      error.response.body.errors.forEach((err: any) => {
        console.error(`  - ${err.message}`);
        if (err.field) console.error(`    Field: ${err.field}`);
        if (err.help) console.error(`    Help: ${err.help}`);
      });
    }
  }
}

debugSendGrid();
