const {io} = require("socket.io-client");
const socket = io("http://localhost:4000");

setInterval(() => {
    const data = {
        temperature: (20 + Math.random() * 10).toFixed(1),
        mouvement: Math.random() > 0.7,
        porte: Math.random() > 0.5 ? "ouverte" : "fermée",
        time: new Date().toLocaleTimeString()
    };

    console.log("Envoi des données : ", data);
    socket.emit("sensorData", data);
}, 2000);