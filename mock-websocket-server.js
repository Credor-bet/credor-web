#!/usr/bin/env node

/**
 * Mock WebSocket Server for Testing Live Match Updates
 * 
 * Usage: node mock-websocket-server.js
 * 
 * This creates a simple WebSocket server that simulates the match server API
 * for testing the live match updates functionality.
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = 8000;

// Mock match data
const mockMatches = [
  {
    id: "match_001",
    fixture_id: "12345",
    home_team: "Manchester United",
    away_team: "Liverpool",
    home_score: 0,
    away_score: 0,
    status: "scheduled"
  },
  {
    id: "match_002", 
    fixture_id: "12346",
    home_team: "Barcelona",
    away_team: "Real Madrid",
    home_score: 1,
    away_score: 1,
    status: "in_progress"
  }
];

// Store active subscriptions
const subscriptions = new Map();

// Create HTTP server for fixtures endpoint
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/ws/fixtures') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    // Return fixtures in the expected format
    const fixtures = mockMatches.map(match => ({
      id: match.fixture_id,
      sport: "football",
      team_home: {
        name: match.home_team,
        id: `team_${match.home_team.replace(' ', '_').toLowerCase()}`
      },
      team_away: {
        name: match.away_team,
        id: `team_${match.away_team.replace(' ', '_').toLowerCase()}`
      },
      start_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      status: match.status,
      home_score: match.home_score,
      away_score: match.away_score
    }));
    
    res.end(JSON.stringify(fixtures));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.subscribe) {
        const fixtureId = data.subscribe;
        console.log(`Client subscribed to fixture: ${fixtureId}`);
        
        // Store subscription
        if (!subscriptions.has(fixtureId)) {
          subscriptions.set(fixtureId, new Set());
        }
        subscriptions.get(fixtureId).add(ws);
        
        // Send immediate score update
        const match = mockMatches.find(m => m.fixture_id === fixtureId);
        if (match) {
          const update = {
            type: "score_update",
            fixture_id: fixtureId,
            home_score: match.home_score,
            away_score: match.away_score,
            status: match.status,
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(update));
        } else {
          // Send error for unknown fixture
          ws.send(JSON.stringify({
            error: "Fixture not found"
          }));
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({
        error: "Invalid message format"
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Remove from all subscriptions
    subscriptions.forEach((clients, fixtureId) => {
      clients.delete(ws);
      if (clients.size === 0) {
        subscriptions.delete(fixtureId);
      }
    });
  });
});

// Simulate live match updates
setInterval(() => {
  mockMatches.forEach(match => {
    if (match.status === "in_progress" && Math.random() > 0.7) {
      // Randomly update scores
      if (Math.random() > 0.5) {
        match.home_score++;
      } else {
        match.away_score++;
      }
      
      // Broadcast update to subscribed clients
      const clients = subscriptions.get(match.fixture_id);
      if (clients && clients.size > 0) {
        const update = {
          type: "score_update",
          fixture_id: match.fixture_id,
          home_score: match.home_score,
          away_score: match.away_score,
          status: match.status,
          timestamp: new Date().toISOString()
        };
        
        const message = JSON.stringify(update);
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
        
        console.log(`Score update sent for ${match.fixture_id}: ${match.home_score}-${match.away_score}`);
      }
    }
  });
}, 5000); // Update every 5 seconds

// Simulate match status changes
setTimeout(() => {
  const match = mockMatches.find(m => m.fixture_id === "12345");
  if (match) {
    match.status = "in_progress";
    
    const clients = subscriptions.get(match.fixture_id);
    if (clients && clients.size > 0) {
      const update = {
        type: "match_start",
        fixture_id: match.fixture_id,
        timestamp: new Date().toISOString()
      };
      
      const message = JSON.stringify(update);
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
      
      console.log(`Match started: ${match.fixture_id}`);
    }
  }
}, 10000); // Start match after 10 seconds

server.listen(PORT, () => {
  console.log(`🚀 Mock WebSocket Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🏈 Fixtures endpoint: http://localhost:${PORT}/ws/fixtures`);
  console.log('');
  console.log('🎯 This server mocks the production match.credorr.com API');
  console.log('');
  console.log('Available test fixtures:');
  mockMatches.forEach(match => {
    console.log(`  - ${match.fixture_id}: ${match.home_team} vs ${match.away_team} (${match.status})`);
  });
  console.log('');
  console.log('📊 The server will simulate live score updates every 5 seconds for matches in progress.');
  console.log('🔄 Match 12345 will start automatically after 10 seconds.');
  console.log('');
  console.log('💡 To test with mock server:');
  console.log('   1. Update websocket-config.ts to use getLocalWebSocketUrl()');
  console.log('   2. Go to /dashboard/challenges');
  console.log('   3. The app will auto-connect to this mock server');
  console.log('   4. Watch for live score updates!');
  console.log('');
  console.log('📝 Note: By default, the app connects to match.credorr.com');
  console.log('   To use this mock server, temporarily modify the configuration.');
});
