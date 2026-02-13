require('dotenv').config()
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const fastify = require('fastify')
const multipart = require("@fastify/multipart");
const { google } = require("googleapis");
const XLSX = require("xlsx");
const path = require('path')
const axios = require("axios");
const formbody = require('@fastify/formbody');
const fastify_static = require('@fastify/static')
const cookiee = require('@fastify/cookie');
const fastifyJwt = require('@fastify/jwt')
const userRouts = require('./routs/User.routs')
const googleSheet = require('./routs/Sheet.routs')



const app = fastify()

app.register(formbody);

app.register(fastify_static, {
    root: path.join(__dirname, 'public'),
    prefix: '/'
  });


app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
});

app.register(cookiee);
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "supersecretkey",
  cookie: { cookieName: "accessToken", signed: false },
  sign: { expiresIn: "1h" },
});

// ---------- AUTH DECORATOR ----------
app.decorate("authenticate", async (req, reply) => {
  try {
    await req.jwtVerify(); 
  } catch (err) {
    return reply.redirect("/login"); 
  }
});



app.register(userRouts)
app.register(googleSheet)






const port = process.env.PORT || 3000
const start = async(req,reply)=>{
    try {
       await app.listen({ port, host: '0.0.0.0' });
        if (process.stdout.writable) {
            console.log(`Server running on http://localhost:${port}`);
        }

        
    } catch (error) {

        console.log('this port is failed',error)
        
    }
}

start()