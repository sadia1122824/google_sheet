
 const { client , addClient ,webLogin,clientLogin , getClients,showClients,deleteClient,updateClient ,getDashboardStats,logoutController,AI_Assistant ,clientOtp,verifyOtp,resendOtp} = require('../controllers/add_client');


const clientRouts = async(app,options)=>{
    // app.get('/',(req,reply)=>{
    //     return reply.send('this project is running successfully')
    // })

  app.get('/AddClients',{ preHandler: [app.authenticate] },client);
  app.post('/AddClients',addClient);

  
  app.get('/showClients',{ preHandler: [app.authenticate] },showClients);
  app.get('/getClients',getClients);
  app.delete('/deleteClient/:id',deleteClient);
  app.put('/updateClient/:id',updateClient);

  app.get('/webLogin',webLogin);
  app.post('/webLogin',clientLogin);
  app.get('/dashboard',getDashboardStats);
  app.post('/logoutController',logoutController);
  app.get('/AI_Assistant',AI_Assistant);
  app.get('/clientOtp',clientOtp);
  app.post("/api/client/verify-otp", verifyOtp);
  app.post("/api/client/resend-otp", resendOtp);
}

module.exports = clientRouts