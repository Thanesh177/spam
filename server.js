const express = require('express');
const http = require('http');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Let Socket.IO negotiate transports automatically

const port = process.env.PORT || 3000;
const videoDir = path.join(__dirname, 'videos');
const videoFilePath = path.join(videoDir, 'stream.webm');

let activeConnections = 0;

io.on('connection', (socket) => {
  activeConnections++;
  console.log(`[${new Date().toISOString()}] Connected: ${socket.id}. Active: ${activeConnections}`);

  socket.on('disconnect', () => {
    activeConnections--;
    console.log(`[${new Date().toISOString()}] Disconnected: ${socket.id}. Active: ${activeConnections}`);
  });
});

// Ensure the videos directory exists
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir);
}

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Routes for pages
app.get('/', (req, res) => {
  res.redirect('/broadcast.html');
});
app.get('/broadcast', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'broadcast.html'));
});
app.get('/live', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'live.html'));
});
app.get('/playback', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'playback.html'));
});

// Configure multer to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'new1.webm');
  }
});
const upload = multer({ storage });

// POST endpoint to receive the final video upload
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No video uploaded.');
  }
  console.log('Video uploaded and saved as stream.webm');
  res.send('Video saved successfully.');
});

// GET endpoint to serve the saved video file
app.get('/video', (req, res) => {
  if (!fs.existsSync(videoFilePath)) {
    return res.status(404).send('No video recorded yet.');
  }
  res.sendFile(videoFilePath);
});

// Socket.IO: Forward live stream chunks from broadcaster to viewers
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('liveStream', (chunk) => {
    // Forward the chunk to all other connected clients
    socket.broadcast.emit('liveStream', chunk);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
