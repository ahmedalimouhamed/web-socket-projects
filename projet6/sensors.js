const io = require('socket.io-client');
const socket = io('http://localhost:3000');

setInterval(() => {
    const data = {
        temperature : Math.random() * 40,
        humidity: Math.random() * 100,
        pressure: 1000 + Math.random() * 100,
        windSpeed: Math.random() * 60,
        windDirection: Math.random() * 360,
        rainfall: Math.random() * 10
    }

    socket.emit('weatherData', data);
}, 1000);