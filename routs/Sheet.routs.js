 const { 
    
    dataUpload, 
    importExcelFile,
    getLatestSheetResult,
    LiveSheetData,
    previousSheetData,
    getPreviousSheetResult,
    AI_chat,
    uploadExcell,
    
    
    
  } 
= require('../controllers/Sheet.controller');
const{
AssignedClients
}

 =require('../controllers/Add_Staff');

 const googleSheet = async(app,options)=>{
    // app.get('/debug',(req,reply)=>{
    //     return reply.send('this project is running successfully')
    // })

  // admin prehandler
  app.get("/", { preHandler: [app.authenticate] }, dataUpload); 
  
  app.post("/importExcelFile", importExcelFile);
  app.post("/AI_chat", AI_chat);
  
  // web prehandler
  app.get("/LiveSheetData",{ preHandler: [app.webauthenticate] },  LiveSheetData);
  app.get("/getLatestSheetResult", getLatestSheetResult);
  app.get("/previousSheetData",{ preHandler: [app.webauthenticate] }, previousSheetData);
  app.get("/getPreviousSheetResult", getPreviousSheetResult);

  // staff prehandler
  app.get('/uploadExcell',{ preHandler: [app.staffauthenticate] }, uploadExcell);
   app.get('/AssignedClients/:staffId',{ preHandler: [app.staffauthenticate] }, AssignedClients);


}

module.exports = googleSheet