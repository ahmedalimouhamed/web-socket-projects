const socket = io();

socket.on('updateDashboard', (data) => {
    document.getElementById('temp').textContent = data.temperature;
    document.getElementById('door').textContent = data.porte;
    document.getElementById('motion').textContent = data.mouvement;
    document.getElementById('time').textContent = data.time;

    if(data.mouvement){
        alert("Mouvement detecté !")
    }
})