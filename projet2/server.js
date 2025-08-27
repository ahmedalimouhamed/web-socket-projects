const WebSocket = require("ws");

const wss = new WebSocket.Server({port: 8081});

console.log("Serveur WrbSocket demarré sur ws://localhost:8081");

function broadcastNotification(message){
    wss.clients.forEach((client) => {
        if(client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify({type: 'notification', message}));
        }
    })
}

wss.on('connection', (ws) => {
    console.log("Nouveau client connecté");

    ws.send(JSON.stringify({type: "welcome", message: "Bienvenue sur le serveur WebSocket"}));
    ws.on('close', () => {
        console.log("un client s'est déconnecté")
    })
})

let count = 1;

setInterval(() => {
    const message = `Notification #${count} générée à ${new Date().toLocaleTimeString()}`;
    console.log("Envoi : ", message);
    broadcastNotification(message);
    count++;
}, 5000);