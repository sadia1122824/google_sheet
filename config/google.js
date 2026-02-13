
require('dotenv').config();
const path = require('path');


const WEB_APP_URL = process.env.WEB_APP_URL;
const TOKEN = process.env.TOKEN;
const EXCEL_FILE_PATH = process.env.EXCEL_FILE_PATH 
  ? path.resolve(process.env.EXCEL_FILE_PATH) 
  : undefined;


function validateConfig() {
  console.log("----- CONFIG DEBUG -----");
  console.log("WEB_APP_URL:", WEB_APP_URL ? "✅ SET" : "❌ NOT SET");
  console.log("TOKEN:", TOKEN ? "✅ SET" : "❌ NOT SET");
  console.log("EXCEL_FILE_PATH:", EXCEL_FILE_PATH ? "✅ SET" : "❌ NOT SET");
  
  if (WEB_APP_URL) {
    console.log("Web App URL:", WEB_APP_URL);
  }
  if (TOKEN) {
    console.log("Token length:", TOKEN.length);
  }
  console.log("-----------------------");
}


validateConfig();

module.exports = {
  WEB_APP_URL,
  TOKEN,
  EXCEL_FILE_PATH
};