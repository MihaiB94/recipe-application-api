const express = require('express');
const app = express();
const path = require('path');
const port = process.env.PORT || 5000;
const cookieParser = require('cookie-parser');
require('dotenv/config');
const mongoose = require('mongoose');
//! Import Routes
const authenticationRoute = require('./routes/authentication');
const userRoute = require('./routes/users');
const recipesRoute = require('./routes/recipes');
const categoryRoute = require('./routes/categories');
const { search } = require('./routes/recipes');
const cors = require('cors');

app.use(express.json());
app.use(cookieParser());

const corsOptions = {
   origin: [
      'https://delicious-recipes.onrender.com',
      'http://localhost:3001',
      'http://localhost:3000'
   ] // List of allowed origins
   // other options
};

app.use(cors(corsOptions));

// Connect to Mongo Database
mongoose
   .connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
      dbName: 'recipes'
   })
   .then(console.log('Connected to Mongo Database Successfully!'))
   .catch((err) => {
      console.log(err);
      console.log('Could not Connect');
   });

app.use('/server/authentication', authenticationRoute);
app.use('/server/users', userRoute);
app.use('/server/recipes', recipesRoute);
app.use('/server/recipes/search', search);
app.use('/server/categories', categoryRoute);

// Start listening to the server
app.listen(port, () => {
   console.log('Server is running');
});
