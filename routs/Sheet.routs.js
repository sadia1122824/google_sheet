 const { 
    
    dataUpload, 
    importExcelFile,
    getLatestSheetResult,
    spreadsheetData,
    AI_chat
    
    
  } 
= require('../controllers/Sheet.controller');

 const googleSheet = async(app,options)=>{
    // app.get('/',(req,reply)=>{
    //     return reply.send('this project is running successfully')
    // })

  
  app.get("/", { preHandler: [app.authenticate] }, dataUpload);
  
  app.post("/importExcelFile", importExcelFile);
  app.post("/AI_chat", AI_chat);
  
  
  app.get("/clientsResults",{ preHandler: [app.webauthenticate] },  spreadsheetData);
  app.get("/getLatestSheetResult", getLatestSheetResult);

  
  
 

}

module.exports = googleSheet