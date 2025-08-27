const express = require('express');
const http = require('http');
const {Server} = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let parkingStatus = Array(10).fill(false);

io.on('connection', (socket) => {
    console.log("un Clisnt connecté : ", socket.id);

    socket.emit("parkingUpdate", parkingStatus);

    socket.on("sensorUpdate", ({place, status}) => {
        parkingStatus[place] = status;
        console.log(`Place ${place} est maintenant ${status ? "coccupée" : "libre"}`);

        io.emit("parkingUpdate", parkingStatus);

        if(parkingStatus.every((p) => p === true)){
            io.emit("parkingFull", "Parking est plein");
            setTimeout(() => {
                parkingStatus = Array(10).fill(false);
                io.emit("parkingUpdate", parkingStatus);
            }, 5000);
        }
    })
});

server.listen(4000, () => {
    console.log("Serveur sur http://localhost:4000")
});