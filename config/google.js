
require('dotenv').config();
const path = require('path');


const WEB_APP_URL = process.env.WEB_APP_URL;
const TOKEN = process.env.TOKEN;
const EXCEL_FILE_PATH = process.env.EXCEL_FILE_PATH 
  ? path.resolve(process.env.EXCEL_FILE_PATH) 
  : undefined;


module.exports = {
  WEB_APP_URL,
  TOKEN,
  EXCEL_FILE_PATH
};