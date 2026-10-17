const bcrypt = require("bcrypt");
const crypto = require("crypto");
const StaffRecord = require("../models/staffData");
const UserRecord = require("../models/register"); // Admin (signup wale users)
const OtpRecord = require("../models/otp");
const sendOtpMail = require("../utils/sendOtpMail");

const SALT_ROUNDS = 10;
const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 din (seconds)

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minute
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 second
const OTP_COOKIE = "otpToken";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: COOKIE_MAX_AGE,
});

const otpCookieOptions = () => ({ ...cookieOptions(), maxAge: 60 * 10 }); // 10 minute


// ****************************Helpers****************************

// OTP banao, hash karke DB mein rakho, email bhejo
const generateAndSendOtp = async (account, role) => {
  const otp = String(crypto.randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);

  await OtpRecord.findOneAndUpdate(
    { accountId: account._id, role },
    {
      otpHash,
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    { upsert: true, new: true }
  );

  if (process.env.NODE_ENV !== "production") {
    console.log(`🔑 OTP for ${account.email}: ${otp}`); // sirf testing ke liye
  }

  await sendOtpMail(account.email, otp);
};

// otpToken cookie se temporary OTP session nikalo
const getOtpSession = (request) => {
  const token = request.cookies?.[OTP_COOKIE];
  if (!token) return null;
  try {
    const data = request.server.jwt.verify(token);
    return data.purpose === "otp" ? data : null;
  } catch {
    return null;
  }
};

const buildUser = (account, role) => ({
  _id: account._id,
  fullName: account.fullName,
  email: account.email,
  ...(role === "staff" && { staffId: account.staffId }),
});


// ****************************Signup****************************

const signup = async (request, reply) => {
  return reply.sendFile("./admin/signup.html");
};

const register = async (request, reply) => {
  try {
    const { name, useremail, userpassword } = request.body;

    if (!name || !useremail || !userpassword) {
      return reply.code(400).send({
        success: false,
        message: "Por favor completa todos los campos",
      });
    }

    if (userpassword.length < 6) {
      return reply.code(400).send({
        success: false,
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    const email = useremail.toLowerCase();

    const existingUser = await UserRecord.findOne({ email });
    if (existingUser) {
      return reply.code(409).send({
        success: false,
        message: "Este correo ya está registrado",
      });
    }

    const hashedPassword = await bcrypt.hash(userpassword, SALT_ROUNDS);

    const user = await UserRecord.create({
      fullName: name,
      email,
      password: hashedPassword,
    });

    const token = request.server.jwt.sign(
      { id: user._id, email: user.email, role: "admin" },
      { expiresIn: "1d" }
    );

    reply.setCookie("accessToken", token, cookieOptions());

    return reply.code(201).send({
      success: true,
      message: "Registro exitoso",
    });
  } catch (error) {
    request.log.error(error);

    if (error.code === 11000) {
      return reply.code(409).send({
        success: false,
        message: "Este correo ya está registrado",
      });
    }

    return reply.code(500).send({
      success: false,
      message: "Error del servidor",
    });
  }
};


// ****************************Single Login (Admin + Staff)****************************

// Login page: agar user pehle se login hai to seedha "/" par bhej do
const getLoginUser = async (request, reply) => {
  try {
    await request.jwtVerify();
    return reply.redirect("/");
  } catch (err) {
    return reply.sendFile("./admin/index.html");
  }
};

// Step 1: email/ID + password check -> OTP email par bhejo
const loginUser = async (request, reply) => {
  try {
    const { useremail, userpassword } = request.body;

    if (!useremail || !userpassword) {
      return reply.code(400).send({
        success: false,
        message: "All fields are required",
      });
    }

    const identifier = String(useremail).trim();
    const email = identifier.toLowerCase();

    let account = null;
    let role = null;

    // 1) Pehle Admin check karo (email se)
    const admin = await UserRecord.findOne({ email });
    if (admin && (await bcrypt.compare(userpassword, admin.password))) {
      account = admin;
      role = "admin";
    }

    // 2) Admin nahi mila to Staff check karo (email YA staffId se)
    if (!account) {
      const staff = await StaffRecord.findOne({
        $or: [{ email }, { staffId: identifier }],
      });
      if (staff && (await bcrypt.compare(userpassword, staff.password))) {
        account = staff;
        role = "staff";
      }
    }

    if (!account) {
      return reply.code(401).send({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!account.email) {
      return reply.code(400).send({
        success: false,
        message: "No email found for this account",
      });
    }

    // OTP bhejo
    await generateAndSendOtp(account, role);

    // Temporary token. Isme "role" field jaan bujh kar nahi hai,
    // taake isse asli login token ki tarah use na ho sake.
    const otpToken = request.server.jwt.sign(
      { purpose: "otp", uid: account._id, accType: role },
      { expiresIn: "10m" }
    );
    reply.setCookie(OTP_COOKIE, otpToken, otpCookieOptions());

    return reply.send({
      success: true,
      message: "Código enviado a tu correo",
      otpRequired: true,
      redirect: "/otp",
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};


// ****************************OTP****************************

// OTP page: sirf tab khule jab password step pass ho chuka ho
const otp = async (request, reply) => {
  if (!getOtpSession(request)) return reply.redirect("/login");
  return reply.sendFile("./admin/otp.html");
};

// Step 2: OTP verify -> asli login token -> "/" par redirect
const verifyOtp = async (request, reply) => {
  try {
    const session = getOtpSession(request);
    if (!session) {
      return reply.code(401).send({
        success: false,
        message: "Sesión expirada. Inicia sesión de nuevo.",
        redirect: "/login",
      });
    }

    const code = String(request.body?.otp || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return reply.code(400).send({
        success: false,
        message: "Ingresa los 6 dígitos del código.",
      });
    }

    const record = await OtpRecord.findOne({
      accountId: session.uid,
      role: session.accType,
    });

    if (!record || record.expiresAt < new Date()) {
      return reply.code(400).send({
        success: false,
        message: "El código ha vencido. Solicita uno nuevo.",
      });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await record.deleteOne();
      return reply.code(429).send({
        success: false,
        message: "Demasiados intentos. Solicita un nuevo código.",
      });
    }

    const ok = await bcrypt.compare(code, record.otpHash);
    if (!ok) {
      record.attempts += 1;
      await record.save();
      return reply.code(400).send({
        success: false,
        message: "Código incorrecto. Inténtalo de nuevo.",
      });
    }

    // OTP sahi hai, ek hi baar use ho sakta hai
    await record.deleteOne();

    const role = session.accType;
    const Model = role === "admin" ? UserRecord : StaffRecord;
    const account = await Model.findById(session.uid);
    if (!account) {
      return reply.code(401).send({
        success: false,
        message: "Cuenta no encontrada",
        redirect: "/login",
      });
    }

    // Ab asli login token (role ke sath)
    const payload = { id: account._id, email: account.email, role };
    if (role === "staff") payload.staffId = account.staffId;

    const token = request.server.jwt.sign(payload, { expiresIn: "1d" });
    reply.setCookie("accessToken", token, cookieOptions());
    reply.clearCookie(OTP_COOKIE, { path: "/" });

    // Staff ka last login update
    if (role === "staff") {
      account.lastLogin = new Date();
      await account.save();
    }

    return reply.send({
      success: true,
      message: "Login successful",
      role,
      redirect: "/", // home controller role ke hisaab se page dega
      user: buildUser(account, role),
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      success: false,
      message: "Error del servidor",
    });
  }
};

const resendOtp = async (request, reply) => {
  try {
    const session = getOtpSession(request);
    if (!session) {
      return reply.code(401).send({
        success: false,
        message: "Sesión expirada. Inicia sesión de nuevo.",
        redirect: "/login",
      });
    }

    const role = session.accType;

    const record = await OtpRecord.findOne({ accountId: session.uid, role });
    if (record && Date.now() - record.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return reply.code(429).send({
        success: false,
        message: "Espera unos segundos antes de reenviar.",
      });
    }

    const Model = role === "admin" ? UserRecord : StaffRecord;
    const account = await Model.findById(session.uid);
    if (!account) {
      return reply.code(401).send({
        success: false,
        message: "Cuenta no encontrada",
        redirect: "/login",
      });
    }

    await generateAndSendOtp(account, role);

    return reply.send({ success: true, message: "Código reenviado" });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      success: false,
      message: "Error del servidor",
    });
  }
};


// ****************************Home "/" (role ke hisaab se)****************************

const home = async (request, reply) => {
  const { role } = request.user;
  console.log("HOME role:", role);

  if (role === "admin") return reply.sendFile("./admin/googleSheet.html"); // <- admin home page

  if (role === "staff") {
    try {
      return await reply.sendFile("staff/staff_dashboard.html"); // <- staff home page
    } catch (err) {
      console.error("STAFF SENDFILE ERROR:", err);
      return reply.code(500).send(err.message);
    }
  }

  // Unknown role (e.g. purana token ya otpToken): cookie hata kar login par bhejo
  reply.clearCookie("accessToken", { path: "/" });
  return reply.redirect("/login");
};


// ****************************Logout****************************

const Logout = async (request, reply) => {
  reply.clearCookie("accessToken", { path: "/" });
  reply.clearCookie(OTP_COOKIE, { path: "/" });
  return reply.send({
    success: true,
    message: "Logout successful",
  });
};


module.exports = {
  signup,
  register,
  getLoginUser,
  loginUser,
  home,
  Logout,
  otp,
  verifyOtp,
  resendOtp,
};