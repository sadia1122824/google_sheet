const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({

    fullName: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    staffId: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["staff", "staff_member"],
        default: "staff"
    }

}, {
    timestamps: true
});

const StaffRecord = mongoose.model("StaffRecord", staffSchema);
module.exports = StaffRecord;