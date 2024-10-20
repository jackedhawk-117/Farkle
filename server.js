const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

// Serve static files
app.use(express.static('public'));

// Farkle game state
let gameState = {
    players: {},
    currentTurn: null,
    dice: [1, 1, 1, 1, 1, 1],  // Default dice state
};

// Helper function to roll dice
const rollDice = () => {
    return Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1);
};

// Game logic and socket handling
io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);

    // Add new player
    gameState.players[socket.id] = {
        score: 0,
        name: `Player ${Object.keys(gameState.players).length + 1}`
    };

    // If this is the first player, set the current turn
    if (!gameState.currentTurn) {
        gameState.currentTurn = socket.id;
        console.log('First player turn set to:', gameState.currentTurn);
    }

    // Send the initial game state to the new player
    socket.emit('gameState', gameState);

    // Handle dice roll
    socket.on('rollDice', () => {
        if (gameState.currentTurn === socket.id) {
            console.log(`${socket.id} is rolling the dice`);
            // Roll new dice and update the game state
            gameState.dice = rollDice();
            io.emit('gameState', gameState);  // Broadcast updated state to all players
        } else {
            console.log(`${socket.id} tried to roll dice, but it is not their turn`);
        }
    });

    // Handle ending turn
    socket.on('endTurn', () => {
        if (gameState.currentTurn === socket.id) {
            console.log(`${socket.id} is ending their turn`);
            // Pass the turn to the next player
            const playerIds = Object.keys(gameState.players);
            const currentPlayerIndex = playerIds.indexOf(socket.id);
            const nextPlayerIndex = (currentPlayerIndex + 1) % playerIds.length;
            gameState.currentTurn = playerIds[nextPlayerIndex];

            console.log('Next turn goes to:', gameState.currentTurn);
            io.emit('gameState', gameState);  // Broadcast updated state to all players
        } else {
            console.log(`${socket.id} tried to end the turn, but it is not their turn`);
        }
    });

    // Remove player when they disconnect
    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`);
        delete gameState.players[socket.id];

        if (gameState.currentTurn === socket.id) {
            // If the disconnected player was the current turn, pass the turn
            const playerIds = Object.keys(gameState.players);
            if (playerIds.length > 0) {
                gameState.currentTurn = playerIds[0];
            } else {
                gameState.currentTurn = null;
            }
        }
        io.emit('gameState', gameState);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
