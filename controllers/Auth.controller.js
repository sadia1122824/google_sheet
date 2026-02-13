
const bcrypt = require("bcrypt");

// ****************************Login User Controller****************************

const getLoginUser = async (request, reply) => {
  return reply.sendFile("./admin/index.html");
}


const loginUser = async (request, reply) => {
  try {
    const { useremail, userpassword } = request.body; 

   
    if (!useremail || !userpassword) {
      return reply.code(400).send({
        success: false,
        message: "All fields are required",
      });
    }

    const adminEmail = process.env.ADMIN_USERNAME; 
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    
    if (useremail !== adminEmail) {
      return reply.code(401).send({
        success: false,
        message: "Invalid email or password",
      });
    }

    
    const isMatch = await bcrypt.compare(userpassword, adminPasswordHash);
    if (!isMatch) {
      return reply.code(401).send({
        success: false,
        message: "Invalid email or password",
      });
    }

    
    const token = request.server.jwt.sign({
      email: adminEmail,
      role: "admin",
    });

    reply.setCookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return reply.send({
      success: true,
      message: "Login successful",
    });

  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};




// ****************************logout Controllers****************************

 const Logout = async (request, reply) => {
  try {
    // Clear the JWT cookie
    reply
      .clearCookie('accessToken')
      .send({ success: true, message: 'You have been logged out successfully.' });
  } catch (err) {
    reply.send({ success: false, message: 'Logout failed.' });
  }
};




module.exports = { 
  getLoginUser,
  loginUser ,
  Logout 
};
