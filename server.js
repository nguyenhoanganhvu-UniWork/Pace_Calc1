require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const PORT = process.env.PORT || 3000;

let meterCollection;
let yardCollection;
const distances = [60, 100, 200, 400, 800, 1000];

app.get('/api/counts', async (req, res) => {
  try {
    const meterCounts = {};
    const yardCounts = {};

    for (const d of distances) {
      meterCounts[d] = await meterCollection.countDocuments({ distance: String(d) });
      yardCounts[d] = await yardCollection.countDocuments({ distance: String(d) });
    }

    res.json({ meter: meterCounts, yard: yardCounts });
  } catch (err) {
    console.error("couldn't get counts:", err);
    res.status(500).json({ error: "Failed to get counts" });
  }
});

app.get('/api/records', async (req, res) => {
  const { unit, distance } = req.query;
  if (!unit || !distance) {
    return res.status(400).json({ error: "unit and distance query params required" });
  }
  try {
    const collection = unit === 'yard' ? yardCollection : meterCollection;
    const records = await collection
      .find({ distance: String(distance) })
      .sort({ date_time: -1 })
      .toArray();
    res.json(records);
  } catch (err) {
    console.error("couldn't get records:", err);
    res.status(500).json({ error: "Failed to get records" });
  }
});

app.post('/api/save', async (req, res) => {
  let { meter, yard } = req.body;

  if (meter && meter.length > 0) {
    try {
      await meterCollection.insertMany(meter);
      console.log("sent meter successfully");
    } catch (err) {
      console.error("couldn't send meter:", err);
    }
  }

  if (yard && yard.length > 0) {
    try {
      await yardCollection.insertMany(yard);
      console.log("sent yard successfully");
    } catch (err) {
      console.error("couldn't send yard:", err);
    }
  }

  res.send('Save complete!');
});

async function startServer() {
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB Atlas!");

    const db = client.db("Pace_Calc");
    meterCollection = db.collection("meter");
    yardCollection = db.collection("yard");

    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

startServer();
