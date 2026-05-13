
 const { client , addClient ,webLogin,clientLogin , getClients,showClients,deleteClient} = require('../controllers/add_client');


const clientRouts = async(app,options)=>{
    // app.get('/',(req,reply)=>{
    //     return reply.send('this project is running successfully')
    // })

  app.get('/AddClients',{ preHandler: [app.authenticate] },client);
  app.post('/AddClients',addClient);

  
  app.get('/showClients',{ preHandler: [app.authenticate] },showClients);
  app.get('/getClients',getClients);
  app.delete('/deleteClient/:id',deleteClient);

  app.get('/webLogin',webLogin);
  app.post('/webLogin',clientLogin);

}

module.exports = clientRouts