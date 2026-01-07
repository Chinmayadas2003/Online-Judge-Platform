const express = require("express"); // Import express
const { createServer } = require("http"); // Import http
const { Server } = require("socket.io"); // Import socket.io
const Redis = require('ioredis');
const bodyParser = require('body-parser');

const app = express(); // Create express app
app.use(bodyParser.json());
const httpServer = createServer(app); // Create http server using express app

const redisCache = new Redis(); // Create Redis client

const io = new Server(httpServer, { 
    cors: {
        origin: "http://localhost:5500",
        methods: ["GET", "POST"]
    }
 }); // Create socket.io server

io.on("connection", (socket) => {
    console.log("A user connected " + socket.id);
    socket.on("setUserId", (userId) => {
        console.log("Setting user id to connection id", userId, socket.id);
        redisCache.set(userId, socket.id);
    });

    socket.on('getConnectionId', async (userId) => {
        const connId = await redisCache.get(userId);
        console.log("Getting connection id for user id", userId, connId);
        socket.emit('connectionId', connId);
        const everything = await redisCache.keys('*');
        
        console.log(everything)
    })

});

app.post('/sendPayload', async (req, res) => {
    try {
        const body = req.body || {};
        console.log('sendPayload received body:', body);

        // Accept multiple common key variants from clients
        const userId = body.userId || body.userID || body.user || body.user_id;
        // The payload may be sent as a nested object or the whole body
        const payload = body.payload || (body.code ? body : undefined);

        if (!userId || !payload) {
            return res.status(400).json({ success: false, error: 'Invalid request, expected { userId, payload }' });
        }

        const socketId = await redisCache.get(userId);

        if (socketId) {
            io.to(socketId).emit('submissionPayloadResponse', payload);
            return res.json({ success: true, message: 'Payload sent successfully' });
        } else {
            return res.status(404).json({ success: false, error: 'User not connected' });
        }
    } catch (err) {
        console.error('Error in /sendPayload:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }

})

httpServer.listen(3001, () => {
    console.log("Server is running on port 3001");
});

