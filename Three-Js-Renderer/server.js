const express = require('express')
const app = express()
const path = require('path')

const server = app.listen(3000)

app.use(express.static(__dirname + '/public'))
app.use('/build/', express.static(path.join(__dirname, 'node_modules/three/build')))
app.use('/jsm/', express.static(path.join(__dirname, 'node_modules/three/examples/jsm')))


const socket = require('socket.io')


const io = socket(server)

io.sockets.on('connection', handleNewConnection);
console.log('Server is running on port 3000')

class BackendActor{
    constructor(name, color, mass, pos, rot, size) {
        this.name = name;
        this.color = color;
        this.mass = mass;
        this.pos = pos;
        this.rot = rot;
        this.size = size;
        
    }
}

class BackendPlayer {
    constructor(id, color, mass, pos, rot, size){
        this.id = id;

        this.color = color;
        this.mass = mass;
        this.pos = pos;
        this.rot = rot;
        this.size = size;

    }
}

class BackendLevel {
    constructor({name, actors = {}, players ={}}) {
        this.name = name;
        this.actors = actors;
        this.players = players;
    }

    addActor(name, actor) {
       
    }

    

}



class GameBackend {
    constructor() {
        this.setupGame();
    }

    setupGame() {
        this.backendActors = {};
        io.sockets.emit('reloadGame', 'Game is being reloaded');
        this.players = {};
        this.host = null;
        this.spectators = {};
        this.gameState = {state: 'lobby', playerCount: 0};

        //this.createActor('actor1', '#ff0000', 1, {x: 0, y: 20, z: 0}, {x: 0, y: 0, z: 0, w:1}, {x: 10, y: 10, z: 10})
        

        this.maxRoomSize = 6;
        setInterval(() => this.update(), 1000/60);
    }

    onConnection(socket) {
        function becomeSpectator() {
            this.spectators[socket.id] = {id: socket.id};
            socket.emit('becomeSpectator', {gameState: this.gameState, players: this.players, host: this.host, spectators: this.spectators, actors: this.backendActors});
        }

        function handlePlayerActions(socketRef) {
            socketRef.on('playerAction', (data) => {
                if (this.gameState.state === "lobby") return;
                if (data.actionType === 'move') {
                    this.players[socketRef.id].physicsData = data.physicsData;
                }
            });
        }

        if (this.gameState.state === "lobby") {
            if (this.host === null) {
                this.host = {id: socket.id};
                socket.emit('becomeHost', {gameState: this.gameState, players: this.players, host: this.host, spectators: this.spectators, actors: this.backendActors});

                socket.on('startGame', () => {
                    if (this.gameState.playerCount === this.maxRoomSize) {
                        this.gameState.state = "playing";
                        io.sockets.emit('startGame', {gameState: this.gameState, players: this.players, host: this.host, spectators: this.spectators, actors: this.backendActors});
                    }   
                    else if (this.gameState.playerCount < this.maxRoomSize) {
                        console.log('Not enough players to start game');
                    }
                    else {
                        console.log('Error starting game');
                        io.sockets.emit('reloadGame', 'Error starting game');
                    }
                });
            }
            else if (Object.values(this.players).length < this.maxRoomSize) {
                this.createPlayer(socket.id, 'blue', 1, {x: 0, y: 10, z: 0}, {x: 0, y: 0, z: 0, w:1}, {x: 5, y: 5, z: 5});
                socket.emit('becomePlayer', {gameState: this.gameState, players: this.players, host: this.host, spectators: this.spectators, actors: this.backendActors});
                socket.on('playerReady', () => {
                    this.players[socket.id].ready = true;
                    this.gameState.playerCount += 1;
                });

                socket.on('playerNotReady', () => {
                    this.players[socket.id].ready = false;
                    this.gameState.playerCount -= 1;
                });

                handlePlayerActions(socket);
            }
            else {
                becomeSpectator();
            }
        }
        else {
            becomeSpectator();
        }



    }

    onDisconnection(socket) {
        if (this.players[socket.id]) {
            this.gameState.playerCount -= 1;
            delete this.players[socket.id];

            io.sockets.emit('destroyPlayer', socket.id)
        }
        if (this.host){
            if (this.host.id === socket.id) {
                this.host = null;
            }
        }
        if (this.spectators[socket.id]) {
            delete this.spectators[socket.id];
        }

    }

    createActor(name, color, mass, pos, rot, size) {
        this.backendActors[name] = new BackendActor(name, color, mass, pos, rot, size);
    }

    createPlayer(id, color, mass, pos, rot, size) {
        this.players[id] = new BackendPlayer(id, color, mass, pos, rot, size);    
    }

    update() {
        for (let playerId in this.players) {
            const socketRef = io.sockets.sockets.get(playerId)
            if (socketRef) {
                socketRef.timeout(180).emit("getPhysicsData", {}, (err, response) => {
                    //console.log(response);
                   if (response !== null && response !== undefined) {

                        this.players[playerId].pos = response.pos;
                        this.players[playerId].rot = response.rot;
                   }
                });
            }
        }


        io.sockets.emit('updateGame', {gameState:this.gameState, players:this.players, host:this.host, spectators:this.spectators, actors:this.backendActors});
        
    }
}



let gameBackend = new GameBackend();

function handleNewConnection(socket) {
    console.log('New connection: ' + socket.id);
    gameBackend.onConnection(socket);

    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id)
        gameBackend.onDisconnection(socket);
    });

}