 const { 
    
    dataUpload, 
    importExcelFile,
    getLatestSheetResult,
    spreadsheetData
    
  } 
= require('../controllers/Sheet.controller');

 const googleSheet = async(app,options)=>{
    // app.get('/',(req,reply)=>{
    //     return reply.send('this project is running successfully')
    // })

  
  app.get("/", { preHandler: [app.authenticate] }, dataUpload);
  
  app.post("/importExcelFile", importExcelFile);
  
  
  app.get("/spreadsheetData",{ preHandler: [app.authenticate] }, spreadsheetData);
  app.get("/getLatestSheetResult", getLatestSheetResult);
  
 

}

module.exports = googleSheet