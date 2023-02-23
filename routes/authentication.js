const router = require('express').Router();
const User = require('../models/User');

// Library for encrypting passwords saved in the database
const bcrypt = require('bcrypt');

// REGISTER
router.post('/register', async (req, res) => {
   try {
      // Check if username or email already exists
      const existingUser = await User.findOne({
         $or: [{ username: req.body.username }, { email: req.body.email }]
      });
      if (existingUser) {
         return res.status(400).json('Username or email already exists');
      }

      // Check if password and confirm password match
      if (req.body.password !== req.body.confirmPassword) {
         return res.status(400).json('Passwords do not match');
      }
      // Validate password criteria
      const passwordRegex =
         /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(req.body.password)) {
         return res
            .status(400)
            .json(
               'Password must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special character'
            );
      }

      const salt = await bcrypt.genSalt(15);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      const newUser = new User({
         username: req.body.username,
         email: req.body.email,
         password: hashedPassword
      });

      const user = await newUser.save();
      res.status(200).json(user);
   } catch (err) {
      res.status(500).json(err);
   }
});

// LOGIN
router.post('/login', async (req, res) => {
   try {
      const { username, password } = req.body;

      if (!username || !password) {
         return res
            .status(400)
            .json('Please provide both username and password');
      }

      const user = await User.findOne({ username });

      if (!user) {
         return res.status(400).json('Wrong credentials!');
      }

      const validated = await bcrypt.compare(password, user.password);
      if (!validated) {
         return res.status(400).json('Wrong credentials!');
      }

      res.status(200).json(user);
   } catch (err) {
      res.res.status(500).json('Request failed with status code 500');
   }
});

module.exports = router;
