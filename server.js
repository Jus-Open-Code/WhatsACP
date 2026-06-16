require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initializeWhatsApp } = require('./services/whatsapp');
const localtunnel = require('localtunnel');

// Prevent crashes due to async library errors (like EBUSY unlinking locked browser session files)
process.on('uncaughtException', (err) => {
    console.error('[Warning] Uncaught Exception:', err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Warning] Unhandled Rejection at:', promise, 'reason:', reason);
});


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

// Setup localtunnel connection with retries
async function setupTunnel() {
    try {
        console.log("Setting up secure tunnel for Vercel Dashboard...");
        const tunnel = await localtunnel({ port: PORT, subdomain: 'whatsacpakash' });
        console.log(`\n=======================================================`);
        console.log(`[SUCCESS] Secure Tunnel Created!`);
        console.log(`[URL] ${tunnel.url}`);
        console.log(`Your dashboard will automatically connect to this URL.`);
        console.log(`=======================================================\n`);
        
        tunnel.on('close', () => {
            console.log("Tunnel closed, retrying in 5 seconds...");
            setTimeout(setupTunnel, 5000);
        });
    } catch (err) {
        console.error("Tunnel creation failed (usually temporary network issue), retrying in 5s...", err.message);
        setTimeout(setupTunnel, 5000);
    }
}

server.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
    setupTunnel();
});
