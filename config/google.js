
require('dotenv').config();
const path = require('path');


const Latest_WEB_APP_URL = process.env.Latest_WEB_APP_URL;
const previous_WEB_APP_URL = process.env.previous_WEB_APP_URL;
const TOKEN = process.env.TOKEN;
const EXCEL_FILE_PATH = process.env.EXCEL_FILE_PATH 
  ? path.resolve(process.env.EXCEL_FILE_PATH) 
  : undefined;


module.exports = {
  Latest_WEB_APP_URL,
  previous_WEB_APP_URL,
  TOKEN,
  EXCEL_FILE_PATH
};