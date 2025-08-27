const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const {Subject} = require('rxjs');
const {v4: uuidv4} = require('uuid');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const DB_FILE = path.join(__dirname, 'db.sqlite');
const INIT_SQL = path.join(__dirname, 'sql', 'init.sql');
const PORT = 3000;
const WS_PORT = 8082;

const SECRET = 'secret';

if(!fs.existsSync(DB_FILE)){
    const dbInit = fs.readFileSync(INIT_SQL, 'utf8');
    const tmpDb = new Database(DB_FILE);
    tmpDb.exec(dbInit);
    tmpDb.close();
    console.log('DB created and initialized');
}

const db = new Database(DB_FILE);

const insertProduct = db.prepare('INSERT INTO products(name, price, stock) values(?,?,?)');
const getProduct = db.prepare('SELECT * FROM products where id = ?');
const updateProduct = db.prepare("UPDATE products SET name=?, price=?, stock=? where id=?");
const deleteProduct = db.prepare("DELETE FROM products where id=?");
const listProducts = db.prepare('SELECT * FROM products ORDER BY id DESC');

const insertSale = db.prepare("INSERT INTO sales(product_id, quantity, total) values(?,?,?)");
const listSales = db.prepare("SELECT s.*, p.name as product_name FROM sales s JOIN products p ON s.product_id = p.id ORDER BY s.id DESC");

const insertNotification = db.prepare('INSERT INTO notifications(id, user_id, type, payload, read) VALUES(?,?,?,?,?)');
const listNotifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC');
const listNotificationsForUser = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC');

const events$ = new Subject();

const wss = new WebSocket.Server({port: WS_PORT});

const wsClients = new Map();

function verifyToken(token){
    console.log('Verifying token: ', token);
    try{
        return jwt.verify(token, SECRET);
    }catch(err){
        return null;
    }
}

wss.on('connection', (ws, req) => {
    const url = req.url || '';
    const params = new URLSearchParams(url.replace('/?', ''));
    const token = params.get('token');
    const payload = verifyToken(token);

    if(!payload){
        ws.send(JSON.stringify({type: 'error', message: 'Token invalide'}));
        ws.close();
        return
    }

    const userId = String(payload.userId);
    ws.userId = userId;
    wsClients.set(userId, ws);
    console.log('[WS] user connected ', userId);

    ws.send(JSON.stringify({type: 'welcome', message: 'connected', userId}));

    ws.on('close', () => {
        wsClients.delete(userId);
        console.log('[WS] user disconnected ', userId);
    })
})

events$.subscribe(async (evt) => {
    try{
        const notif = {
            id: uuidv4(),
            user_id: evt.meta && evt.meta.targetUserId ? String(evt.meta.targetUserId) : null,
            type: evt.type,
            payload: JSON.stringify(evt.payload),
            read: 0
        }

        insertNotification.run(notif.id, notif.user_id, notif.type, notif.payload, notif.read);

        const message = JSON.stringify({type: 'notification', notification: notif});

        if(notif.user_id){
            const ws = wsClients.get(notif.user_id);
            if(ws && ws.readyState == WebSocket.OPEN){
                console.log('[NOTIF] sent to user ', notif.user_id);
                ws.send(message);
            }
        }else{
            console.log('[NOTIF] sent to broadcast');
            for(const [, clientWs] of wsClients){
                if(clientWs.readyState === WebSocket.OPEN) clientWs.send(message);
            }
        }

        console.log('[NOTIF] saved + sent ', notif.type, ' -> ', notif.user_id || 'broadcast');
        
    }catch(err){
        console.error('Error processing event: ', err);
    }
});

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/products', (req, res) => {
    const rows = listProducts.all();
    res.json(rows);
});

app.post('/api/products', (req, res) => {
    const {name, price=0, stock=0, userId=null} = req.body;
    const info = insertProduct.run(name, price, stock);
    const product = getProduct.get(info.lastInsertRowid);

    events$.next({
        type: 'product.created',
        payload: product,
        meta: {
            targetUserId: userId
        }
    });
    res.status(201).json(product);
});

app.get('/api/products/:id', (req, res) => {
    const id = Number(req.params.id);
    const product = getProduct.get(id);
    if(!product) return res.status(404).json({error: 'Product not found'});
    res.json(product);
});

app.put('/api/products/:id', (req, res) => {
    const id = Number(req.params.id);
    const {name, price=0, stock=0, userId=null} = req.body;
    const prev = getProduct.get(id);

    if(!prev) return res.status(404).json({error: 'Product not found'});

    updateProduct.run(name, price, stock, id);
    const product = getProduct.get(id);

    events$.next({
        type: 'product.updated',
        payload: {
            before: prev,
            after: product
        },
        meta: {
            targetUserId: userId
        }
    });
    res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
    const id = Number(req.params.id);
    const {userId = null} = req.body;
    const prev = getProduct.get(id);

    if(!prev) return res.status(404).json({error: 'Product not found'});

    deleteProduct.run(id);

    events$.next({
        type: 'product.deleted',
        payload: prev,
        meta: {
            targetUserId: userId
        }
    });
    res.json({success: true});
});

app.get('/api/sales', (req, res) => {
    res.json(listSales.all());
});

app.post('/api/sales', (req, res) => {
    const {product_id, quantity=1, userId=null} = req.body;
    const product = getProduct.get(product_id);

    if(!product) return res.status(404).json({error: 'Invalid Product'});

    const total = product.price * quantity;
    const info = insertSale.run(product_id, quantity, total);
    const sale = {
        id: info.lastInsertRowid,
        product_id,
        quantity,
        total,
        created_at: new Date().toISOString()
    }

    const newStock = product.stock - quantity;
    updateProduct.run(product.name, product.price, newStock, product.id);

    events$.next({
        type: 'sale.created',
        payload: sale,
        meta: {
            targetUserId: userId
        }
    });
    res.status(201).json(sale);
});

app.get('/api/notifications', (req, res) => {
    const userId = req.query.userId || null;
    if(userId) return res.json(listNotificationsForUser.all(String(userId)));
    res.json(listNotifications.all());
});

app.post('/api/notifications/:id/read', (req, res) => {
    const id = req.params.id;
    db.prepare("Update notifications SET read = 1 WHERE id = ?").run(id);
    res.json({success: true});
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
console.log(`Websocket server listening on ws://localhost:${WS_PORT}`);

module.exports = {app, db, events$, wss};