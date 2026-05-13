
const StaffRecord = require("../models/staffData");
const ClientRecord = require('../models/clientData');
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");


const staff = async (req, reply) => {
    return reply.sendFile('admin/Add_Staff.html');
}



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

        const {
            fullName,
            email,
            password,
            phone,
            staffId,
            role
        } = request.body;

        // Validation
        if (
            !fullName ||
            !email ||
            !password ||
            !phone ||
            !staffId
        ) {

            return reply.status(400).send({
                success: false,
                message: "All fields are required"
            });
        }

        // Check Existing Email
        const existingEmail = await StaffRecord.findOne({ email });

        if (existingEmail) {

            return reply.status(400).send({
                success: false,
                message: "Email already exists"
            });
        }

        // Check Existing Staff ID
        const existingStaffId = await StaffRecord.findOne({ staffId });

        if (existingStaffId) {

            return reply.status(400).send({
                success: false,
                message: "Staff ID already exists"
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
            role

        });

        await newStaff.save();

        return reply.send({
            success: true,
            message: "Staff Added Successfully",
            data: newStaff
        });

    } catch (error) {

        console.log(error);

        return reply.status(500).send({
            success: false,
            message: "Server Error"
        });
    }
};



const showStaff = async (request, reply) => {
    return reply.sendFile('admin/ShowStaff.html');
}


const getStaff = async (request, reply) => {

    try {

        const staff = await StaffRecord.find().sort({ createdAt: -1 });

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

// DELETE API
const deleteStaff = async (request, reply) => {

    try {

        const { id } = request.params;

        if (!id) {
            return reply.code(400).send({
                success: false,
                message: "ID is required"
            });
        }

        const result = await StaffRecord.deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            return reply.code(404).send({
                success: false,
                message: "Staff not found"
            });
        }

        return reply.send({
            success: true,
            message: "Staff deleted successfully"
        });

    } catch (error) {

        console.log(error);

        return reply.code(500).send({
            success: false,
            message: "Delete failed"
        });
    }
}



// login for staff side 

const loginStaff = async (req, reply) => {
    return reply.sendFile('staff/login.html');
}



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
      $or: [
        { email: useremail },
        { staffId: useremail }
      ]
    });

    // Staff Not Found
    if (!staff) {

      return reply.code(401).send({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare Password
    const isMatch = await bcrypt.compare(
      userpassword,
      staff.password
    );

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
        role: staff.role
      }

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
const AssignedClients = async (request, reply) => {

    try {

        const { staffId } = request.params;

        const clients = await ClientRecord.find({
            assignStaff: String(staffId)   // 👈 THIS IS THE CORRECT FIELD
        });

        return reply.send({
            success: true,
            data: clients
        });

    } catch (error) {

        return reply.status(500).send({
            success: false,
            message: error.message
        });
    }
};





module.exports = {
    staff,
    addStaff,
    getStaff,
    showStaff,
    deleteStaff,
    loginStaff,
    loginCredentials,
    AssignedClients
    
}