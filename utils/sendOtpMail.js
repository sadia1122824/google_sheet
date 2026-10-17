const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_PORT === "465",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// Server start par ek baar SMTP check
transporter.verify((err) => {
  if (err) console.error("❌ SMTP ERROR:", err.message);
  else console.log("✅ SMTP ready");
});

module.exports = async (to, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: "Tu código de verificación",
      text: `Tu código de verificación es ${otp}. Vence en 5 minutos.`,
      html: `<div style="font-family:Arial,sans-serif">
        <p>Tu código de verificación es:</p>
        <h2 style="letter-spacing:6px">${otp}</h2>
        <p>Vence en 5 minutos. Si no fuiste tú, ignora este correo.</p>
      </div>`,
    });
  } catch (err) {
    console.error("❌ MAIL SEND ERROR:", err.message);
    throw err;
  }
};