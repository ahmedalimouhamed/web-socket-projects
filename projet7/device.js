const io = require('socket.io-client');
const socket = io('http://localhost:4000', {
    auth: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGFmNmUzYjUxNTZjNDk1ODg0MTQ1NmUiLCJpYXQiOjE3NTYzMjc1MDR9.xeSEbc1kDXplDITwLnybjN7rkEsPD0CrrT41OtA2VRI'
    }
});

socket.emit('registerDevice', {id: 'motion_sensor_001', type: 'motion'});

setInterval(() => {
    const data = {
        deviceId : 'motion_sensor_001',
        type : 'motion',
        value : Math.random() > 0.5,
        location : 'Salon'
    }
    socket.emit('sensorData', data);
    console.log('Sensor data sent : ', data);
}, 10000)
