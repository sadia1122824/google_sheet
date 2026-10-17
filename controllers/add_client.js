const ClientRecord = require('../models/clientData');
const StaffRecord = require("../models/staffData");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const sendOtpMail = require("../utils/sendOtpMail");



const client = async (req, reply) => {
    return reply.sendFile('admin/add_client.html');
}



const addClient = async (request, reply) => {

    try {

        const {
            fullName,
            email,
            password,
            phone,
            clientId,
            assignStaff
        } = request.body;

        // Check Existing Email
        const existingEmail = await ClientRecord.findOne({ email });

        if (existingEmail) {

            return reply.status(400).send({
                success: false,
                message: "Email already exists"
            });
        }

        // =========================
        // PASSWORD HASHING
        // =========================
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create Client
        const newClient = new ClientRecord({
            fullName,
            email,
            password: hashedPassword, // 👈 hashed password saved
            phone,
            clientId,
            assignStaff
        });

        await newClient.save();

        return reply.send({
            success: true,
            message: "Client Added Successfully",
            data: newClient
        });

    } catch (error) {

        console.log(error);

        return reply.status(500).send({
            success: false,
            message: "Server Error"
        });
    }
};

const getClients = async (request, reply) => {

    try {

        const staff = await ClientRecord.find().sort({ createdAt: -1 });

        return reply.send({
            success: true,
            data: staff
        });

    } catch (error) {

        console.log(error);

        return reply.status(500).send({
            success: false,
            message: "Server Error"
        });
    }
};

const showClients = async (req, reply) => {
    return reply.sendFile('admin/show_clients.html');
}



const deleteClient = async (request, reply) => {

    try {

        const { id } = request.params;

        if (!id) {
            return reply.code(400).send({
                success: false,
                message: "ID is required"
            });
        }

        const result = await ClientRecord.deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            return reply.code(404).send({
                success: false,
                message: "Client not found"
            });
        }

        return reply.send({
            success: true,
            message: "Client deleted successfully"
        });

    } catch (error) {

        console.log(error);

        return reply.code(500).send({
            success: false,
            message: "Delete failed"
        });
    }
}



// const updateClient = async (request, reply) => {
//     try {
//         const { id } = request.params;
//         const { fullName, email, phone, clientId, assignStaff, password } = request.body;

//         const updateData = { fullName, email, phone, clientId, assignStaff };

//         if (password && password.trim() !== "") {
//             const hashedPassword = await bcrypt.hash(password, 10);
//             updateData.password = hashedPassword;
//         }

//         const updated = await ClientRecord.findByIdAndUpdate(
//             id,
//             updateData,
//             { new: true }
//         );

//         if (!updated) {
//             return reply.status(404).send({ 
//                 success: false, 
//                 message: "Client not found" 
//             });
//         }

//         return reply.send({ 
//             success: true, 
//             message: "Client updated successfully", 
//             data: updated 
//         });

//     } catch (error) {
//         console.log(error);
//         return reply.status(500).send({ 
//             success: false, 
//             message: "Server Error" 
//         });
//     }
// };

const updateClient = async (request, reply) => {
    try {
        const { id } = request.params;
        
        // ✅ Step 1: Check karo ID aa rahi hai?
        console.log("=== UPDATE CLIENT CALLED ===");
        console.log("ID:", id);
        console.log("Body:", request.body);

        const { fullName, email, phone, clientId, assignStaff, password } = request.body;

        const updateData = { fullName, email, phone, clientId, assignStaff };

        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        // ✅ Step 2: Check karo DB call se pehle data sahi hai?
        console.log("Update Data:", updateData);

        const updated = await ClientRecord.findByIdAndUpdate(
            id,
            { $set: updateData },   // $set lagao
            { new: true }
        );

        // ✅ Step 3: DB ne kya return kiya?
        console.log("Updated Result:", updated);

        if (!updated) {
            return reply.status(404).send({ 
                success: false, 
                message: "Client not found" 
            });
        }

        return reply.send({ 
            success: true, 
            message: "Client updated successfully", 
            data: updated 
        });

    } catch (error) {
        // ✅ Step 4: Exact error dekho
        console.log("UPDATE ERROR:", error.message);
        return reply.status(500).send({ 
            success: false, 
            message: "Server Error" 
        });
    }
};

const webLogin = async(req,reply)=>{
  return reply.sendFile("users/index.html");
}



const clientLogin = async (request, reply) => {
  try {
    const { useremail, userpassword } = request.body;

    if (!useremail || !userpassword) {
      return reply.code(400).send({ success: false, message: "All fields are required" });
    }

    const client = await ClientRecord.findOne({
      $or: [{ email: useremail }, { clientId: useremail }],
    });

    if (!client) {
      return reply.code(401).send({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(userpassword, client.password);
    if (!isMatch) {
      return reply.code(401).send({ success: false, message: "Invalid email or password" });
    }

    // OTP generate (6 digit, secure random)
    const otp = crypto.randomInt(100000, 999999).toString();

    client.otp = await bcrypt.hash(otp, 10);
    client.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    client.otpAttempts = 0;
    await client.save();

    await sendOtpMail(client.email, otp);

    // Temporary token (sirf OTP verify ke liye, 10 min)
    const otpToken = request.server.jwt.sign(
      { id: client._id, purpose: "otp" },
      { expiresIn: "10m" }
    );

    reply.setCookie("otpToken", otpToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

  return reply.send({
  success: true,
  message: "OTP sent to your email",
  redirect: "/clientOtp",   // /otp ki jagah
});
  } catch (err) {
    console.log(err);
    return reply.code(500).send({ success: false, message: "Internal server error" });
  }
};



// Get Dashboard Stats
const getDashboardStats = async (request, reply) => {
    try {
        const totalStaff = await StaffRecord.countDocuments();
        const totalClients = await ClientRecord.countDocuments();

        const recentStaff = await StaffRecord.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('fullName email staffId role createdAt');

        const recentClients = await ClientRecord.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('fullName email clientId assignStaff createdAt');

        // ── Monthly chart data (last 12 months) ──────────────
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyPipeline = (Model) => Model.aggregate([
            { $match: { createdAt: { $gte: twelveMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year:  { $year:  "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const [staffMonthly, clientMonthly] = await Promise.all([
            monthlyPipeline(StaffRecord),
            monthlyPipeline(ClientRecord)
        ]);

        // ── Labels banao last 12 months ke ──────────────────
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const labels = [];
        const staffData  = [];
        const clientData = [];

        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const y = d.getFullYear();
            const m = d.getMonth() + 1; // 1-12

            labels.push(monthNames[m - 1]);

            const sf = staffMonthly.find(x => x._id.year === y && x._id.month === m);
            const cl = clientMonthly.find(x => x._id.year === y && x._id.month === m);

            staffData.push(sf ? sf.count : 0);
            clientData.push(cl ? cl.count : 0);
        }

        return reply.send({
            success: true,
            data: {
                totalStaff,
                totalClients,
                recentStaff,
                recentClients,
                monthlyChart: {        // <-- yeh naya add hua
                    labels,            // ['Jun','Jul',...,'May']
                    staff:  staffData, // [0, 0, 1, ...]
                    clients: clientData
                }
            }
        });

    } catch (error) {
        return reply.status(500).send({ success: false, message: "Server Error" });
    }
};



async function logoutController(request, reply) {
  try {
    const opts = {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // login me bhi lax hai, match hona chahiye
    };

    reply.clearCookie("accessToken", opts);
    reply.clearCookie("otpToken", opts);
    reply.clearCookie("token", opts);
    reply.clearCookie("refreshToken", opts);

    return reply.status(200).send({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: "Something went wrong during logout",
    });
  }
}

const AI_Assistant = async (request, reply) => {
    return reply.sendFile('users/Ai_assistant.html');
}

const clientOtp = async (request, reply) => {
    return reply.sendFile('users/userOtp.html');
}
const generateOtp = async (client) => {
  const otp = crypto.randomInt(100000, 999999).toString();
  client.otp = await bcrypt.hash(otp, 10);
  client.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  client.otpAttempts = 0;
  client.otpLastSent = new Date();
  await client.save();
  return otp;
};

const verifyOtp = async (request, reply) => {
  try {
    const { otp } = request.body;
    const otpToken = request.cookies.otpToken;

    if (!otp || !otpToken) {
      return reply.code(400).send({ success: false, message: "OTP is required" });
    }

    let decoded;
    try {
      decoded = request.server.jwt.verify(otpToken);
    } catch {
      return reply.code(401).send({ success: false, message: "Session expired, login again" });
    }

    if (decoded.purpose !== "otp") {
      return reply.code(401).send({ success: false, message: "Invalid session" });
    }

    const client = await ClientRecord.findById(decoded.id);
    if (!client || !client.otp) {
      return reply.code(401).send({ success: false, message: "Invalid request" });
    }

    if (client.otpAttempts >= 5) {
      return reply.code(429).send({ success: false, message: "Too many attempts, login again" });
    }

    if (!client.otpExpires || client.otpExpires < new Date()) {
      return reply.code(400).send({ success: false, message: "OTP expired" });
    }

    const valid = await bcrypt.compare(otp.toString(), client.otp);
    if (!valid) {
      client.otpAttempts += 1;
      await client.save();
      return reply.code(401).send({ success: false, message: "Invalid OTP" });
    }

    // OTP sahi: OTP data clear + asli login token
    client.otp = undefined;
    client.otpExpires = undefined;
    client.otpAttempts = 0;
    client.otpLastSent = undefined;
    client.lastLogin = new Date();
    await client.save();

    const token = request.server.jwt.sign({
      id: client._id,
      email: client.email,
      clientId: client.clientId,
      role: "client",
    });

    reply.clearCookie("otpToken", { path: "/" });
    reply.setCookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return reply.send({
      success: true,
      message: "Login successful",
      redirect: "/liveSheetGraphs", // apna dashboard route yahan dalein
      client: {
        _id: client._id,
        fullName: client.fullName,
        email: client.email,
        clientId: client.clientId,
        assignStaff: client.assignStaff,
        role: "client",
      },
    });
  } catch (err) {
    console.log(err);
    return reply.code(500).send({ success: false, message: "Internal server error" });
  }
};

const resendOtp = async (request, reply) => {
  try {
    const otpToken = request.cookies.otpToken;
    if (!otpToken) {
      return reply.code(401).send({ success: false, message: "Login again" });
    }

    let decoded;
    try {
      decoded = request.server.jwt.verify(otpToken);
    } catch {
      return reply.code(401).send({ success: false, message: "Session expired, login again" });
    }

    if (decoded.purpose !== "otp") {
      return reply.code(401).send({ success: false, message: "Invalid session" });
    }

    const client = await ClientRecord.findById(decoded.id);
    if (!client) {
      return reply.code(401).send({ success: false, message: "Invalid request" });
    }

    // 30 second cooldown
    if (client.otpLastSent && Date.now() - client.otpLastSent.getTime() < 30 * 1000) {
      return reply.code(429).send({ success: false, message: "Please wait before requesting a new OTP" });
    }

    const otp = await generateOtp(client);
    await sendOtpMail(client.email, otp);

    return reply.send({ success: true, message: "New OTP sent" });
  } catch (err) {
    console.log(err);
    return reply.code(500).send({ success: false, message: "Internal server error" });
  }
};


module.exports = {
    client,
    addClient,
    getDashboardStats,
    getClients,
    showClients,
    deleteClient,
    updateClient,
    webLogin,
    clientLogin,
    logoutController,
    AI_Assistant,
    clientOtp,
    verifyOtp,
    resendOtp
}