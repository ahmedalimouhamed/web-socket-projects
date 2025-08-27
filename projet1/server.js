const WebSocket = require("ws");

const wss = new WebSocket.Server({port: 7080});

console.log("Serveur WebSocket démarré sur ws://localhost:7080");

wss.on("connection", (ws) => {
    console.log("Un nouveau client est connecté");

    ws.on('message', (message) => {
        console.log('message reçu : ', message.toString());

        wss.clients.forEach((client) => {
            if(client.readyState === WebSocket.OPEN){
                client.send(message.toString());
            }
        })
    })

    ws.on("close", () => {
        console.log("client s'est deconnecté")
    })
})