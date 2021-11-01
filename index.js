const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
// firebase admin 

var admin = require("firebase-admin");

var serviceAccount = require("./ema-jhon-shop-d4476-firebase-adminsdk-svwqh-3f84eab23e.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// meldelware
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r1nyd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//identify user token
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('emajhonShop');
        const productsCollection = database.collection('products');
        const ordersCollection = database.collection('orders');
        // get api 
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            } else {
                products = await cursor.toArray();
            }
            res.send({ count, products });
        });
        // post api using keys 
        app.post('/products/bykeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } };
            const products = await productsCollection.find(query).toArray();
            res.json(products);
        });
        // add orders api 
        app.get('/orders', verifyToken, async (req, res) => {
            let query = {};
            const email = req.query.email;
            if (req.decodedUserEmail === email) {
                const query = { email: email }
                const cursor = ordersCollection.find(query);
                const allorder = await cursor.toArray();
                res.json(allorder);
            }
            else {
                res.status(401).json({ message: 'user not authorized' })
            }
        })
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await ordersCollection.insertOne(order);
            res.json(result)
        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);

// server related 
app.get('/', (req, res) => {
    res.send("ema jhon node server running");
})
app.listen(port, () => {
    console.log('Running server', port);
})