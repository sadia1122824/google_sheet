
 const { staff ,addStaff ,getStaff,showStaff ,deleteStaff ,updateStaff,loginStaff,loginCredentials ,dashboard} = require('../controllers/Add_Staff');


const staffRouts = async(app,options)=>{
    // app.get('/',(req,reply)=>{
    //     return reply.send('this project is running successfully')
    // })

  app.get('/staffRecord',{ preHandler: [app.authenticate] },staff);
  app.post('/staffRecord',addStaff);
  app.get('/getStaff',getStaff);
  app.get('/showStaffRecord',{ preHandler: [app.authenticate] },showStaff);
  app.delete('/deleteStaff/:id',deleteStaff);
  app.put('/updateStaff/:id',updateStaff);
  app.get('/loginStaff', loginStaff);
   app.post('/loginStaff', loginCredentials);
   app.get('/staffDashboard',{ preHandler: [app.staffauthenticate] }, dashboard);

}

module.exports = staffRouts