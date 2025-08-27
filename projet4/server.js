const express = require('express');
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("Un client est connecté : ", socket.id);

    socket.on("sensorData", (data) => {
        console.log("Données reçues : ", data);

        io.emit("updateDashboard", data);
    })
});

server.listen(4000, () => {
    console.log("Serveur sur http://localhost:4000")
})