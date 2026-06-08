const StaffRecord = require("../models/staffData");
const ClientRecord = require("../models/clientData");
const UploadRecord = require("../models/UploadRecord");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");

const staff = async (req, reply) => {
  return reply.sendFile("admin/Add_Staff.html");
};

// const addStaff = async (request, reply) => {

//     try {

//         const {
//             fullName,
//             email,
//             password,
//             phone,
//             staffId,
//             role
//         } = request.body;

//         // Check Existing Email
//         const existingEmail = await StaffRecord.findOne({ email });

//         if (existingEmail) {

//             return reply.status(400).send({
//                 success: false,
//                 message: "Email already exists"
//             });
//         }

//         // Create Staff
//         const newStaff = new StaffRecord({
//             fullName,
//             email,
//             password,
//             phone,
//             staffId,
//             role
//         });

//         await newStaff.save();

//         return reply.send({
//             success: true,
//             message: "Staff Added Successfully",
//             data: newStaff
//         });

//     } catch (error) {

//         console.log(error);

//         return reply.status(500).send({
//             success: false,
//             message: "Server Error"
//         });
//     }
// };

const addStaff = async (request, reply) => {
  try {
    const { fullName, email, password, phone, staffId, role } = request.body;

    // Validation
    if (!fullName || !email || !password || !phone || !staffId) {
      return reply.status(400).send({
        success: false,
        message: "All fields are required",
      });
    }

    // Check Existing Email
    const existingEmail = await StaffRecord.findOne({ email });

    if (existingEmail) {
      return reply.status(400).send({
        success: false,
        message: "Email already exists",
      });
    }

    // Check Existing Staff ID
    const existingStaffId = await StaffRecord.findOne({ staffId });

    if (existingStaffId) {
      return reply.status(400).send({
        success: false,
        message: "Staff ID already exists",
      });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Staff
    const newStaff = new StaffRecord({
      fullName,
      email,

      // Save Hashed Password
      password: hashedPassword,

      phone,
      staffId,
      role,
    });

    await newStaff.save();

    return reply.send({
      success: true,
      message: "Staff Added Successfully",
      data: newStaff,
    });
  } catch (error) {
    console.log(error);

    return reply.status(500).send({
      success: false,
      message: "Server Error",
    });
  }
};

const showStaff = async (request, reply) => {
  return reply.sendFile("admin/ShowStaff.html");
};

const getStaff = async (request, reply) => {
  try {
    const staff = await StaffRecord.find().sort({ createdAt: -1 });

    return reply.send({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.log(error);

    return reply.status(500).send({
      success: false,
      message: "Server Error",
    });
  }
};

// DELETE API
const deleteStaff = async (request, reply) => {
  try {
    const { id } = request.params;

    if (!id) {
      return reply.code(400).send({
        success: false,
        message: "ID is required",
      });
    }

    const result = await StaffRecord.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return reply.code(404).send({
        success: false,
        message: "Staff not found",
      });
    }

    return reply.send({
      success: true,
      message: "Staff deleted successfully",
    });
  } catch (error) {
    console.log(error);

    return reply.code(500).send({
      success: false,
      message: "Delete failed",
    });
  }
};

// update api

const updateStaff = async (request, reply) => {
  try {
    const { id } = request.params;
    const { fullName, email, phone, staffId, role, password } = request.body;

    const updateData = { fullName, email, phone, staffId, role };

    // Password sirf tab update karo jab bheja gaya ho
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updated = await StaffRecord.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updated) {
      return reply
        .status(404)
        .send({ success: false, message: "Staff not found" });
    }

    return reply.send({
      success: true,
      message: "Staff updated successfully",
      data: updated,
    });
  } catch (error) {
    console.log(error);
    return reply.status(500).send({ success: false, message: "Server Error" });
  }
};

// login for staff side

const loginStaff = async (req, reply) => {
  return reply.sendFile("staff/login.html");
};

const loginCredentials = async (request, reply) => {
  try {
    const { useremail, userpassword } = request.body;

    // Validation
    if (!useremail || !userpassword) {
      return reply.code(400).send({
        success: false,
        message: "All fields are required",
      });
    }

    // Find Staff By Email OR Staff ID
    const staff = await StaffRecord.findOne({
      $or: [{ email: useremail }, { staffId: useremail }],
    });

    // Staff Not Found
    if (!staff) {
      return reply.code(401).send({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare Password
    const isMatch = await bcrypt.compare(userpassword, staff.password);

    if (!isMatch) {
      return reply.code(401).send({
        success: false,
        message: "Invalid email or password",
      });
    }

    // JWT Token
    const token = request.server.jwt.sign({
      id: staff._id,
      email: staff.email,
      staffId: staff.staffId,
      role: "staff",
    });

    // Cookie
    reply.setCookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // Update Last Login
    staff.lastLogin = new Date();

    await staff.save();

    // Response
    return reply.send({
      success: true,
      message: "Login successful",

      staff: {
        _id: staff._id,
        fullName: staff.fullName,
        email: staff.email,
        staffId: staff.staffId,
        role: staff.role,
      },
    });
  } catch (err) {
    request.log.error(err);

    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

// mapping staff dashboard show clients in the system
// const AssignedClients = async (request, reply) => {

//     try {

//         const { staffId } = request.params;

//         const clients = await ClientRecord.find({
//             assignStaff: String(staffId)   // 👈 THIS IS THE CORRECT FIELD
//         });

//         return reply.send({
//             success: true,
//             data: clients
//         });

//     } catch (error) {

//         return reply.status(500).send({
//             success: false,
//             message: error.message
//         });
//     }
// };

// const AssignedClients = async (request, reply) => {
//   try {
//     const { staffId } = request.params;

//     const clients = await ClientRecord.find({
//       assignStaff: String(staffId),
//     }).select("clientId fullName email _id"); // ✅ sirf zarori fields

//     return reply.send({
//       success: true,
//       data: clients.map((c) => ({
//         _id: c._id,
//         clientId: c.clientId, // numeric ID (e.g. "1234")
//         fullName: c.fullName,
//         email: c.email,
//       })),
//     });
//   } catch (error) {
//     return reply.status(500).send({ success: false, message: error.message });
//   }
// };


const AssignedClients = async (request, reply) => {
  try {
    const { staffName } = request.params;  // ✅ staffId → staffName

    const clients = await ClientRecord.find({
      assignStaff: decodeURIComponent(staffName),  // ✅ "sana%20friend" → "sana friend"
    }).select("clientId fullName email _id");

    return reply.send({
      success: true,
      data: clients.map((c) => ({
        _id: c._id,
        clientId: c.clientId,
        fullName: c.fullName,
        email: c.email,
      })),
    });
  } catch (error) {
    return reply.status(500).send({ success: false, message: error.message });
  }
};
const dashboard = async (req, reply) => {
  return reply.sendFile("staff/staff_dashboard.html");
};

const getStaffDashboard = async (request, reply) => {
  try {
    const staffId = request.query.staffId || request.params.staffId;

    console.log("🔍 staffId:", staffId);

    if (!staffId || staffId === "null") {
      return reply
        .code(400)
        .send({ success: false, error: "staffId required" });
    }

    // 1. Staff ke assigned clients
    const clients = await ClientRecord.find({
      assignStaff: String(staffId),
    }).select("clientId fullName");

    const clientIds = clients.map((c) => String(c.clientId));

    // 2. Agar koi client nahi
    if (clientIds.length === 0) {
      return reply.send({
        success: true,
        data: {
          stats: {
            totalUploads: 0,
            totalClients: 0,
            successfulImports: 0,
            todayUploads: 0,
          },
          uploadsPerClient: [],
          weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
          recentUploads: [],
          timeline: [],
        },
      });
    }

    // 3. Total uploads
    const totalUploads = await UploadRecord.countDocuments({
      staffId: String(staffId),
    });

    // 4. Successful imports
    const successfulImports = await UploadRecord.countDocuments({
      staffId: String(staffId),
      status: "success",
    });

    // 5. Today uploads
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayUploads = await UploadRecord.countDocuments({
      staffId: String(staffId),
      createdAt: { $gte: todayStart },
    });

    // 6. Uploads per client
    const uploadsPerClient = await Promise.all(
      clients.map(async (c) => {
        const count = await UploadRecord.countDocuments({
          staffId: String(staffId),
          clientId: String(c.clientId),
        });
        return {
          clientId: c.clientId,
          fullName: c.fullName,
          uploadCount: count,
        };
      }),
    );

    // 7. Last 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyRaw = await UploadRecord.aggregate([
      {
        $match: {
          staffId: String(staffId),
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // 7 din ka array (missing days = 0)
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const found = weeklyRaw.find((w) => w._id === dateStr);
      weeklyActivity.push(found ? found.count : 0);
    }

    // 8. Recent uploads (last 10)
    const recentUploads = await UploadRecord.find({ staffId: String(staffId) })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // clientName attach karo
    const clientMap = {};
    clients.forEach((c) => {
      clientMap[String(c.clientId)] = c.fullName;
    });

    const recentWithNames = recentUploads.map((u) => ({
      ...u,
      clientName: clientMap[String(u.clientId)] || "Unknown",
    }));

    // 9. Timeline (last 6 events)
    const timeline = recentWithNames.slice(0, 6);

    return reply.send({
      success: true,
      data: {
        stats: {
          totalUploads,
          totalClients: clients.length,
          successfulImports,
          todayUploads,
        },
        uploadsPerClient,
        weeklyActivity,
        recentUploads: recentWithNames,
        timeline,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return reply.code(500).send({ success: false, error: error.message });
  }
};

module.exports = {
  staff,
  addStaff,
  getStaff,
  showStaff,
  deleteStaff,
  updateStaff,
  loginStaff,
  loginCredentials,
  AssignedClients,
  dashboard,
  getStaffDashboard,
};
