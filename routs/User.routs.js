
 const {getLoginUser,loginUser , webLogin, webLoginUser ,Logout} = require('../controllers/Auth.controller');


const userRouts = async(app,options)=>{
    // app.get('/',(req,reply)=>{
    //     return reply.send('this project is running successfully')
    // })

  
    app.get('/login',getLoginUser);
    app.post('/login',loginUser);
    app.get("/webLogin", webLogin);
    app.post("/webLogin", webLoginUser);
    app.post('/logout',Logout);

}

module.exports = userRouts