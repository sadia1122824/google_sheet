const { getLoginUser, loginUser, Logout, signup, register, home ,otp,verifyOtp ,resendOtp} = require('../controllers/Auth.controller');

const userRouts = async (app, options) => {

    // Home "/" : admin ko admin home page, staff ko staff home page
    app.get('/', { preHandler: [app.authenticate] }, home);

    // Single login (admin + staff)
    app.get('/login', getLoginUser);
    app.post('/login', loginUser);

    // Purane staff login URLs, ab wahi single login chalega
    app.get('/loginStaff', (req, reply) => reply.redirect('/login'));
    app.post('/loginStaff', loginUser);

    app.post('/logout', Logout);
    app.get('/signup', signup);
    app.post('/register', register);
    app.get('/otp', otp);
    app.post('/verifyOtp', verifyOtp);
app.post('/resendOtp', resendOtp);

}

module.exports = userRouts