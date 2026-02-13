 const { 
    
    dataUpload, 
    importExcelFile,
    
  } 
= require('../controllers/Sheet.controller');

 const googleSheet = async(app,options)=>{
    // app.get('/',(req,reply)=>{
    //     return reply.send('this project is running successfully')
    // })

  
  app.get("/dataUpload", { preHandler: [app.authenticate] }, dataUpload);
  
  app.post("/importExcelFile", importExcelFile);
  
 

}

module.exports = googleSheet