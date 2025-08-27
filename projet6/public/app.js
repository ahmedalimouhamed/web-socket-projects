const socket = io();
const alertsDiv = document.getElementById('alerts');
const tempElem = document.getElementById('temperature');
const humidityElem = document.getElementById('humidity');
const pressureElem = document.getElementById('pressure');
const windSpeedElem = document.getElementById('windSpeed');
const windDirectionElem = document.getElementById('windDirection');
const rainfallElem = document.getElementById('rainfall');

const ctx= document.getElementById('weatherChart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Température (°C)',
            data: [],
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

socket.on('weatherUpdate', (data) => {
    console.log(data);
    tempElem.textContent = data.temperature.toFixed(1) + '°C';
    humidityElem.textContent = data.humidity.toFixed(1) + '%';
    pressureElem.textContent = data.pressure.toFixed(1) + 'hPa';
    windSpeedElem.textContent = data.windSpeed.toFixed(1) + 'km/h';
    windDirectionElem.textContent = data.windDirection.toFixed(1) + 'degrés';
    rainfallElem.textContent = data.rainfall.toFixed(1) + 'mm';

    const now = new Date().toLocaleTimeString();
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(data.temperature);
    if(chart.data.labels.length > 10){
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update();
});

socket.on('alert', (data) => {
    alertsDiv.innerHTML = `<p class="alert">${data.message} ${data.value}°C à ${new Date(data.timestamp).toLocaleTimeString()}</p>`
})