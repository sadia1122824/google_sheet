const ClientRecord = require('../models/clientData');
const StaffRecord = require("../models/staffData");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");



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


const webLogin = async(req,reply)=>{
  return reply.sendFile("users/index.html");
}

const clientLogin = async (request, reply) => {

    try {

        const { useremail, userpassword } = request.body;

        // Validation
        if (!useremail || !userpassword) {

            return reply.code(400).send({
                success: false,
                message: "All fields are required"
            });
        }

        // Find Client By Email OR Client ID
        const client = await ClientRecord.findOne({
            $or: [
                { email: useremail },
                { clientId: useremail }
            ]
        });

        // Client Not Found
        if (!client) {

            return reply.code(401).send({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Compare Password
        const isMatch = await bcrypt.compare(
            userpassword,
            client.password
        );

        if (!isMatch) {

            return reply.code(401).send({
                success: false,
                message: "Invalid email or password"
            });
        }

        // JWT Token
        const token = request.server.jwt.sign({

            id: client._id,
            email: client.email,
            clientId: client.clientId,
            role: "client"

        });

        // Cookie
        reply.setCookie("accessToken", token, {

            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"

        });

        // Last Login
        client.lastLogin = new Date();

        await client.save();

        // Response
        return reply.send({

            success: true,
            message: "Client login successful",

            client: {

                _id: client._id,
                fullName: client.fullName,
                email: client.email,
                clientId: client.clientId,
                assignStaff: client.assignStaff,
                role: "client"
            }
        });

    } catch (err) {

        console.log(err);

        return reply.code(500).send({
            success: false,
            message: "Internal server error"
        });
    }
};




module.exports = {
    client,
    addClient,
    getClients,
    showClients,
    deleteClient,
    webLogin,
    clientLogin
}