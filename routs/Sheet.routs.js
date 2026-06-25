 const { 
    
    showDashboard, 
    importExcelFile,
    getLatestSheetResult,
    LiveSheetData,
    previousSheetData,
    getPreviousSheetResult,
    getMostRecentSheet,
    showTable,
    deleteSheetData,
    AI_chat,
    speech_to_text,
    
    text_to_speech,
    uploadExcell,
    liveSheetGraphs,
    previousSheetGraphs,
   
    
    
    
  } 
= require('../controllers/Sheet.controller');
const{
AssignedClients
}

 =require('../controllers/Add_Staff');

 const{
  loanSheet,
  importDebtFile,
   showLatestdept,
   getLatestdeptResult,
   showPreviousdept,
   getPreviousdeptResult
 }
 = require('../controllers/dept.controller');

 const googleSheet = async(app,options)=>{
    // app.get('/debug',(req,reply)=>{
    //     return reply.send('this project is running successfully')
    // })

  // admin prehandler
  app.get("/", { preHandler: [app.authenticate] }, showDashboard); 
  
  app.post("/importExcelFile", importExcelFile);
  app.post("/AI_chat", AI_chat);
  app.post("/speech_to_text", speech_to_text);
  app.post("/text_to_speech", text_to_speech);
  // web prehandler
  app.get("/LiveSheetData",{ preHandler: [app.webauthenticate] },  LiveSheetData);
  app.get("/getLatestSheetResult", getLatestSheetResult);
  app.get("/previousSheetData",{ preHandler: [app.webauthenticate] }, previousSheetData);
  app.get("/getPreviousSheetResult", getPreviousSheetResult);
  app.get("/showLatestdept",{ preHandler: [app.webauthenticate] }, showLatestdept);
  app.get("/getLatestdeptResult", getLatestdeptResult);
  app.get("/showPreviousdept",{ preHandler: [app.webauthenticate] }, showPreviousdept);
  app.get("/getPreviousdeptResult", getPreviousdeptResult);

  // staff prehandler
  app.get('/uploadExcell',{ preHandler: [app.staffauthenticate] }, uploadExcell);
   app.get('/AssignedClients/:staffName',{ preHandler: [app.staffauthenticate] }, AssignedClients);
   app.get('/getMostRecentSheet/:clientId',getMostRecentSheet);
    app.get('/showTable',{ preHandler: [app.staffauthenticate] }, showTable);
    app.delete('/deleteSheetData/:clientId', deleteSheetData);

  app.get('/liveSheetGraphs',{ preHandler: [app.webauthenticate] }, liveSheetGraphs);
  app.get('/previousSheetGraphs',{ preHandler: [app.webauthenticate] }, previousSheetGraphs);

  app.get('/loanSheet',{ preHandler: [app.staffauthenticate] }, loanSheet);
  app.post('/importDebtFile', importDebtFile);
}

module.exports = googleSheet