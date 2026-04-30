 const { 
    
    dataUpload, 
    importExcelFile,
    getLatestSheetResult,
    LiveSheetData,
    previousSheetData,
    getPreviousSheetResult,
    AI_chat
    
    
  } 
= require('../controllers/Sheet.controller');

 const googleSheet = async(app,options)=>{
    // app.get('/debug',(req,reply)=>{
    //     return reply.send('this project is running successfully')
    // })

  
  app.get("/", { preHandler: [app.authenticate] }, dataUpload);
  
  app.post("/importExcelFile", importExcelFile);
  app.post("/AI_chat", AI_chat);
  
  
  app.get("/LiveSheetData",{ preHandler: [app.webauthenticate] },  LiveSheetData);
  app.get("/getLatestSheetResult", getLatestSheetResult);
  app.get("/previousSheetData",{ preHandler: [app.webauthenticate] }, previousSheetData);
  app.get("/getPreviousSheetResult", getPreviousSheetResult);

  
 

}

module.exports = googleSheet