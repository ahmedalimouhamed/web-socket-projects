const {io} = require("socket.io-client");

const socket = io("http://localhost:4000");


function simulateParking(){
    const place = Math.floor(Math.random() * 10);
    const status = Math.random() > 0.5;

    console.log(`Capteur : place ${place} => ${status ? "occupée" : "libre"}`);
    socket.emit("sensorUpdate", {place, status});
}

setInterval(simulateParking, 500);