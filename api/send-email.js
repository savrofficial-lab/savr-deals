import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, dealName } = req.body;

  if (!email || !dealName) {
    return res.status(400).json({ error: "Missing email or dealName" });
  }

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(to right, #d97706, #f59e0b); color: white; padding: 30px; border-radius: 10px; text-align: center; }
          .content { padding: 30px; background: white; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .button { background: #d97706; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block; margin-top: 20px; font-weight: bold; }
          .button:hover { background: #b45309; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Your Deal is Live!</h1>
          </div>
          
          <div class="content">
            <p>Hi there,</p>
            <p>Great news! The deal you requested for <strong>"${dealName}"</strong> is now live on Savrdeals!</p>
            <p>Check it out now and grab this amazing offer before it's gone.</p>
            
            <center>
              <a href="https://savrdeals.com" class="button">View Deal on Savrdeals</a>
            </center>
            
            <p style="margin-top: 30px; color: #666; border-top: 1px solid #eee; padding-top: 20px;">
              Happy saving!<br>
              <strong>The Savrdeals Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <p>© 2025 Savrdeals. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Savrdeals" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Requested Deal "${dealName}" is Now Live! 🎉`,
      html: htmlTemplate,
    });

    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
