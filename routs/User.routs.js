
 const {getLoginUser,loginUser ,Logout} = require('../controllers/Auth.controller');


const userRouts = async(app,options)=>{
    app.get('/',(req,reply)=>{
        return reply.send('this project is running successfully')
    })

  
    app.get('/login',getLoginUser);
    app.post('/login',loginUser);
    app.post('/logout',Logout);

}

module.exports = userRouts