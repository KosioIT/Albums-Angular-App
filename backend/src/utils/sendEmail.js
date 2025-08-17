import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, text, html }) => {
  // Creating a SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, //e.g. smtp.gmail.com, smtp.abv.bg
    port: process.env.SMTP_PORT, // 465 for SSL, 587 for TLS
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
    auth: {
      user: process.env.SMTP_USER, // email address
      pass: process.env.SMTP_PASS  // password или app password
    }
  });

  const mailOptions = {
    from: `"Album App" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html // optional, html version
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Email could not be sent');
  }
};
