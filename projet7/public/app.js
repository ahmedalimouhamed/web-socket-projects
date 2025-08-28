const socket = io({
    auth: {
        token: localStorage.getItem('token')
    }
});

let chart;

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('connect_erro', (err) => {
    console.error('Connection error : ', err);
    alert('Authentication failed. please login again.');
    localStorage.removeItem('token');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
});

socket.on('sensorData', (data) => {
    updateDashboard(data);
});

socket.on('alert', (alert) => {
    addAlert(alert);
});

socket.on('alertUpdated', (alert) => {
    const alertElement = document.getElementById(`alert-${alert._id}`);
    if(alertElement){
        if(alert.acknowledged){
            alertElement.style.backgroundColor = '#ccc';
        }
    }
});

socket.on('historyData', (data) => {
    updateHistoryChart(data);
});

function login(){
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    })
    .then(response => response.json())
    .then(data => {
        localStorage.setItem('token', data.token);
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        socket.auth.token = data.token;
        socket.connect();
    })
    .catch(error => {
        console.error('Login error : ', error);
        alert('Login failed. please try again.');
    })
}

function updateDashboard(data){
    if(data.sensorType === 'temperature'){
        document.getElementById('temperature').textContent = data.value + '°C';
    }else if(data.sensorType === 'motion'){
        document.getElementById('motion').textContent = data.value ? 'Détecté' : 'Aucun';
    }else if(data.sensorType === 'door'){
        document.getElementById('door').textContent = data.value ? 'Ouverte' : 'Fermée';
    }
}

function addAlert(alert){
    const alertDiv = document.getElementById('alerts');
    const alertElem = document.createElement('div');
    alertElem.id = `alert-${alert._id}`;
    alertElem.className = `alert ${alert.severity}`;
    alertElem.innerHTML = `
        <strong>${alert.message}</strong> (${new Date(alert.timestamp).toLocaleString()})
        <button onclick="ackAlert('${alert._id}')">Acquitter</button>
    `;
    alertDiv.appendChild(alertElem);
}

function ackAlert(alertId){
    socket.emit('ackAlert', alertId);
}

function getHistory(){
    const sensorType = document.getElementById('sensorType').value;
    const startTime = new Date(document.getElementById('startDate').value).toISOString();
    const endTime = new Date(document.getElementById('endDate').value).toISOString();
    socket.emit('getHistory', {sensorType, location: 'Salon', startTime, endTime});
}

function updateHistoryChart(data){
    const ctx = document.getElementById('historyChart').getContext('2d');
    if(chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => new Date(item.timestamp).toLocaleString()),
            datasets: [{
                label: 'Temperature',
                data: data.map(item => item.value),
                borderColor: 'red',
                fill: false
            }]
        },
        options: {
            scales: {
                x: {title: {display: true, text: 'Temps'}},
                y: {title: {display: true, text: 'Valeur'}}
            }
        }
    });
}

