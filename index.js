const express = require('express');
const http = require('http');
const morgan = require('morgan');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');
const socketIO = require('socket.io');
const AWS = require('aws-sdk');

const app = express();

const port = 8080;

app.use(morgan('dev'));
app.use(cors());
app.use(compression());
app.use(helmet());
app.use(express.static(path.join(__dirname, 'public')));

dotenv.config();

// Create a new SSM client
const ssm = new AWS.SSM({ region: process.env.AWS_REGION });
let IPINFO_ACCESS_TOKEN = null;

// Function to retrieve the token
const getAccessToken = async () => {
  const params = {
    Name: process.env.SSM_PARAM_NAME, // The name of your parameter
    WithDecryption: true, // Decrypt the SecureString parameter
  };
  console.log(params.Name);
  try {
    // Fetch the parameter from Parameter Store
    const res = await ssm.getParameter(params).promise();
    return res.Parameter.Value;
  } catch (err) {
    console.error('Error fetching access token:', err);
    throw err;
  }
};

const initializeToken = async() => {
    try{
        IPINFO_ACCESS_TOKEN = await getAccessToken();
    }catch (error){
        console.error('Failed to fetch access token:', error);
    }
}

const server = http.createServer(app);
const io = socketIO(server);
const userCountMap = new Map();
initializeToken();


app.set('trust proxy', true);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', async (socket) =>{

    console.log(`socket connected ${socket.id}`);
    const userIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

    console.log(`ip address of the current user: ${userIP}`);

    const user = await fetch(`https://ipinfo.io/${userIP}?token=${IPINFO_ACCESS_TOKEN}`)
    .then(res => res.json());

    let country = user.country;

    console.log(user);

    userCountMap.set(country, (userCountMap.get(country) ?? 0) + 1);

    console.log(`User from ${country} with IP: ${userIP} connected`);

    io.emit("updateUserCount", Object.fromEntries(userCountMap));

    socket.on("disconnect", ()=>{

        console.log(`socket disconnected ${socket.id}`);
        console.log(userCountMap.has(country)); 
        if (userCountMap.has(country)){
            userCountMap.set(country, userCountMap.get(country) - 1);
            console.log(userCountMap.get(country));
            if (userCountMap.get(country) === 0) userCountMap.delete(country);
        }

        io.emit("updateUserCount", Object.fromEntries(userCountMap));
    })

})


// Start the server
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
