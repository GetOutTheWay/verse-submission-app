const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');

// Initialize submissions file
if (!fs.existsSync(SUBMISSIONS_FILE)) {
  fs.writeFileSync(SUBMISSIONS_FILE, '[]', 'utf8');
}

const readSubmissions = () => {
  try {
    const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading submissions:', err);
    return [];
  }
};

const writeSubmissions = (submissions) => {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing submissions:', err);
  }
};

const getActiveVerses = () => {
  const now = Date.now();
  return readSubmissions().filter(sub => 
    (now - new Date(sub.timestamp).getTime()) < 24 * 60 * 60 * 1000
  );
};

io.on('connection', (socket) => {
  socket.emit('verses-update', getActiveVerses());
});

app.post('/api/submit', (req, res) => {
  try {
    const { name, verse, reference } = req.body;
    
    // Validate input
    if (!name?.trim() || !verse?.trim() || !reference?.trim()) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const submissions = readSubmissions();
    const newSubmission = {
      name: name.trim(),
      verse: verse.trim(),
      reference: reference.trim(),
      timestamp: new Date().toISOString()
    };
    
    submissions.push(newSubmission);
    writeSubmissions(submissions);
    
    io.emit('verses-update', getActiveVerses());
    res.json({ success: true });
    
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});