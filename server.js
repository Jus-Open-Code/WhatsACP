require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initializeWhatsApp } = require('./services/whatsapp');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Initialize WhatsApp Client Engine and pass socket instance
initializeWhatsApp(io);

app.get('/', (req, res) => {
    res.send('WhatsACP CRM Backend is running! WebSockets enabled.');
});

server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
