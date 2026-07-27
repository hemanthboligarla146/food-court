const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const errorHandler = require('./middlewares/errors');

const usersRoutes = require('./routes/usersRoutes');
const foodsRoutes = require('./routes/foodsRoutes');
const ordersRoutes = require('./routes/ordersRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Security and CORS middleware
app.use(helmet({
  crossOriginResourcePolicy: false // Allows serving media images to other origins
}));
app.use(cors({
  origin: '*', // Allows all origins to connect during development
  credentials: true
}));

app.use(express.json());

// Serve static media folder
app.use('/media', express.static(path.join(__dirname, '../media')));

// Welcome root path
app.get('/', (req, res) => {
  res.status(200).json({
    message: "Welcome to the Food Court API!",
    status: "Running"
  });
});

// API Routes
app.use('/api/users', usersRoutes);
app.use('/api/foods', foodsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
