const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

mongoose.connect('mongodb://127.0.0.1:27017/socket-projects-projet7').then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error);
});

const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: {type: String, default: 'user'}
});

const User = mongoose.model('User', UserSchema);

const SensotSchema = new mongoose.Schema({
    deviceId: String,
    sensorType: String,
    value: mongoose.Schema.Types.Mixed,
    location: String,
    timestamp: {type: Date, default: Date.now}
});

const Sensor = mongoose.model('Sensor', SensotSchema);

const AlertSchema = new mongoose.Schema({
    deviceId: String,
    sensorType: String,
    value: mongoose.Schema.Types.Mixed,
    location: String,
    message: String,
    severity: {type: String, default: 'medium'},
    timestamp: {type: Date, default: Date.now},
    acknowledged: {type: Boolean, default: false}
});

const Alert = mongoose.model('Alert', AlertSchema);

(async () => {
    try {
        const hashedPassword = await bcrypt.hash('123456', 10);
        await User.create({
            username: 'ahmed',
            password: hashedPassword,
            role: 'user'
        });
        console.log('User created');
    } catch (error) {
        console.error('Error creating user:', error);
    }
})();

io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if(!token){
        return next(new Error('Authentication error'));
    }

    jwt.verify(token, 'secret', (err, decoded) => {
        if(err) return next(new Error('Authentication error'));
        socket.userId = decoded.userId;
        next();
    })
});

io.on('connection', (socket) => {
    console.log('Device or user connected : ', socket.id);

    socket.on('registerDevice', (deviceData) => {
        socket.deviceId = deviceData.id;
        console.log('Device registered : ', deviceData.id);
    });

    socket.on('sensorData', (data) => {
        handleSensorData(data);
    });

    socket.on('ackAlert', async(alertId) => {
        try{
            const alert = await Alert.findById(alertId);
            if(alert){
                alert.acknowledged = true;
                await alert.save();
                io.emit('alertUpdated', alert);
            }
        }catch(error){
            console.error('Error acknowledging alert:', error);
        }
    })

    socket.on('getHistory', async(params) => {
        try{
            const history = await Sensor.find({
                sensorType: params.sensorType,
                location: params.location,
                timestamps: {
                    $gte: params.startDate,
                    $lte: params.endDate
                }
            }).sort({timestamps: -1});
            
            socket.emit('historyData', history);
        }catch(error){
            console.error('Error getting history:', error);
        }
    })

    socket.on('disconnect', () => {
        console.log('Device or user disconnected : ', socket.id);
    })
})

function handleSensorData(data){
    console.log('Sensor data received : ', data);
    const sensorData = new Sensor(data);
    sensorData.save();

    checkAlerts(data);

    io.emit('sensorUpdate', data);
}

function checkAlerts(data){
    let alertMessage = null;
    let severity = 'medium';

    if(data.sensorType === 'motion' && data.value === true){
        alertMessage = `Mouvement détecté dans ${data.location}`;
        severity = 'high';
    }else if(data.sensorType === 'temperature' && data.value > 35){
        alertMessage = `Temperature élevée de ${data.value}°C dans ${data.location}`;
        severity = 'high';
    }else if(data.sensorType === 'door' && data.value === true){
        alertMessage = `Porte ouverte dans ${data.location}`;
        severity = 'medium';
    }

    if(alertMessage){
        const alert = new Alert({
            deviceId: data.deviceId,
            sensorType: data.sensorType,
            value: data.value,
            location: data.location,
            message: alertMessage,
            severity: severity
        });
        alert.save();
        io.emit('alert', alert);
    }
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/login', async(req, res) => {
    const {username, password} = req.body;
    const user = await User.findOne({username});
    if(!user) return res.status(400).send('User not found');
    const validPass = await bcrypt.compare(password, user.password);
    if(!validPass) return res.status(400).send('Invalid password');
    const token = jwt.sign({userId: user._id}, 'secret');
    res.send({token});
});

app.get('/alerts', async(req, res) => {
    const alerts = await Alert.find({acknowledged: false}).sort({timestamps: -1});
    res.send(alerts);
});

server.listen(4000, () => {
    console.log("server running on port 4000")
})