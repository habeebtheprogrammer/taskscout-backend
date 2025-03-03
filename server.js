require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require("mongoose");
var logger = require("morgan");
const bodyParser = require("body-parser");
const routes = require('./routes'); 
const moment = require('moment-timezone'); 
moment.tz.setDefault('America/New_York');

// Connect to MongoDB
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB connection error:', err));


const app = express();
const PORT = process.env.PORT || 4005;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(path.resolve(), 'build')));
app.use(express.urlencoded({ extended: false }));

// Routes
app.use(logger('dev'));
app.use('/api', routes);

// Serve React app
app.use("*", (req, res) => res.sendFile(path.resolve("build/index.html")));
 
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
