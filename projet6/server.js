const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let weatherData = [];

io.on('connection', (socket) => {
    console.log('Client connecté : ', socket.id);

    socket.on('weatherData', (data) => {
        console.log('Données météo reçues : ', data);
        weatherData.push(data);

        io.emit('weatherUpdate', data);

        if(data.temperature > 35){
            io.emit('alert', {
                message: 'Alerte : temperature élevée!',
                value: data.temperature,
                timestamp: new Date()
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client déconnecté : ', socket.id);
    })
});



server.listen(3000, () => {
    console.log('Server started on port 3000');
})