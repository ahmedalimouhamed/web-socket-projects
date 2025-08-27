const socket = io();
const parkingDiv = document.getElementById('parking');
const alertDiv = document.getElementById('alerts');

function renderParking(status){
    parkingDiv.innerHTML = "";
    status.forEach((place, i) => {
        const slot = document.createElement('div');
        slot.className = 'slot '+(place ? 'occupied' : 'free');
        slot.textContent = `Place ${i}`;
        parkingDiv.appendChild(slot);
    })
}

socket.on('parkingUpdate', (status) => {
    renderParking(status)
});

socket.on("parkingFull", (msg) => {
    console.log(msg);
    alertDiv.textContent = msg;
    alertDiv.style.color='red'
})