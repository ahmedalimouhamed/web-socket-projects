class StoreApp{
    constructor(){
        this.baseUrl = 'http://localhost:3000/api';
        this.wsUrk = 'ws://localhost:8082';
        this.ws = null;

        this.init();
    }

    init(){
        this.setupEventListeners();
        this.loadProducts();
        this.loadSales();
        this.loadNotifications();
        this.connectWebSocket();
    }

    setupEventListeners(){
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProduct();
        });

        document.getElementById("saleForm").addEventListener('submit', e => {
            e.preventDefault();
            this.createSale();
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefaukt();
            this.login();
        });

        document.getElementById('refreshProducts').addEventListener('click', () => this.loadProducts());
        document.getElementById('refreshSales').addEventListener('click', () => this.loadSales());
        document.getElementById('refreshNotifications').addEventListener('click', () => this.loadNotifications());
    }

    async login(){
        const userId = document.getElementById('userId').ariaValueMax;
        if(!userId) return;

        this.currentUser = userId;
        document.getElementById('currentUser').textContent = `Utilisateur : ${userId}`;
        const token = jwt.sign({userId}, 'secret');
        localStorage.setItem('token', token);

        this.connectWebSocket();
        this.loadNotifications();
    }

    connectWebSocket(){
        if(this.ws) this.ws.close();

        const token = localStorage.getItem('token');
        if(!token) return;

        this.ws = new WebSocket(`${this.wsUrk}?token=${token}`);

        this.ws.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from WebSocket server');
        };
    }

    handleWebSocketMessage(data){
        switch(data.type){
            case 'welcome':
                this.handleWelcome('Connected as user : ' + data.userId);
                break;
            case 'notification':
                this.handleNotification(data.notification);
                break;
            case 'error':
                this.handleError(data.message);
                break;
        }
    }

    async loadProducts(){
        try{
            const response = await fetch(`${this.baseUrl}/products`);
            const products = await response.json();
            this.displayProducts(products);
        }catch(error){
            console.error('Error loading products : ', error)
        }
    }

    async createProduct(){
        const name = document.getElementById('productName').ariaValueMax;
        const price = parseFloat(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        //const userId = this.currentUser;

        try{
            const response = await fetch(`${this.baseUrk}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({name, price, stock, userId: this.currentUser})
            });

            if(response.ok){
                document.getElementById('productForm').reset();
                this.loadProducts();
                this.loadNotifications();
            }
        }catch(error){
            console.error('Error creating product : ', error)
        }
    }

    async updateProduct(id, product){
        try{
            console.log("id to update : ", id);
            const response = await fetch(`${this.baseUrl}/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...product,
                    userId: this.currentUser
                })
            });

            if(response.ok){
                this.loadProducts();
            }
        }catch(error){
            console.error('Error updating product : ', error)
        }
    }

    async deleteProduct(id){
        try{
            const response = await fetch(`${this.baseUrl}/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({userId: this.currentUser})
            });

            if(response.ok){
                this.loadProducts();
            }
        }catch(error){
            console.error('Error deleting product : ', error)
        }
    }

    displayProducts(products){
        const container = document.getElementById('productList');
        container.innerHTML = products.map(product => `
            <div class="product-item">
                <h4>${product.name}</h4>
                <p>Prix : ${product.price}€</p>
                <p>Stock : ${product.stock}</p>
                <button onclick="app.updateProduct(${product.id}, {name: '${product.name}', price: ${product.price}, stock: ${product.stock + 1}})">
                    + Stock
                </button>
                <button onclick="app.deleteProduct(${product.id})" class="danger">Supprimer</button>
            </div>
        `).join('');
    }

    async loadSales(){
        try{
            const response = await fetch(`${this.baseUrl}/sales`);
            const sales = await response.json();
            this.displaySales(sales);
        }catch(error){
            console.error('Error loading sales : ', error)
        }
    }

    async createSale(){
        const productId = document.getElementById('saleProduct').value;
        const quantity = parseInt(document.getElementById('saleQuantity').value);

        try{
            const response = await fetch(`${this.baseUrl}/sales`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({product_id: productId, quantity, userId: this.currentUser})
            });

            if(response.ok){
                document.getElementById('saleForm').reset();
                this.loadSales();
                this.loadNotifications();
            }
        }catch(error){
            console.error('Error creating sale : ', error)
        }
    }

    displaySales(sales){
        const container = document.getElementById('saleList');
        container.innerHTML = sales.map(sale => `
            <div class="sale-item">
                <p>Produit : ${sale.product_name}</p>
                <p>Quantité : ${sale.quantity}</p>
                <p>Total : ${sale.total}€</p>
                <p>Date : ${new Date(sale.created_at).toLocaleDateString()}</p>
            </div>
        `).join('');
    }

    async loadNotifications(){
        try{
            const url = this.currentUser ? 
                `${this.baseUrl}/notifications?userId=${this.currentUser}` :
                `${this.baseUrl}/notifications`;

            const response = await fetch(url);
            const notifications = await response.json();
            this.displayNotifications(notifications);
        }catch(error){
            console.error('Error loading notifications : ', error)
        }
    }

    displayNotifications(notifications){
        console.log(notifications);
        const container = document.getElementById('notificationList');
        container.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}">
                <strong>${notification.type}</strong>
                <p>${JSON.parse(notification.payload)}</p>
                <small>${new Date(notification.created_at).toLocaleDateString()}</small>
                ${!notification.read? `<btton onclick="app.markAsRead('${notification.id}')">Marquer comme lue</btton>`: ''}
            </div>
        `).join('');
    }

    async markAsRead(id){
        try{
            await fetch(`${this.baseUrl}/notifications/${notificationId}/read`, {
                method: 'POST',
            });
            this.loadNotifications();
        }catch(error){
            console.error('Error marking notification as read : ', error)
        }
    }

    displayNotification(notification){
        const container = document.getElementById('notificationsList');
        const notificationElement = document.createElement('div');
        notificationElement.className = 'notification-item unread';
        notificationElement.innerHTML = `
            <strong>${notification.type}</strong>
            <p>${JSON.parse(notification.payload)}</p>
            <small>Nouveau</small>
            <button onclick="app.markAsRead('${notification.id}')">Marquer comme lu</button>
        `
        container.prepend(notificationElement);
    }
}

const app = new StoreApp();
