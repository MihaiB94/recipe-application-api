const router = require('express').Router();
const User = require('../models/User');
const Token = require('../models/Token');
const jwt = require('jsonwebtoken');
// Library for encrypting passwords saved in the database
const bcrypt = require('bcrypt');
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY;

const nodemailer = require('nodemailer');
const crypto = require('crypto');
const generateEmailTemplate = require('../confirmationEmail/email-template.js');
const { AuthToken } = require('../middlewares/authToken');

// CREATE NODMAILER TRANSPORTER OBJECT
const transporter = nodemailer.createTransport({
   service: 'gmail',
   auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
   }
});

router.post('/register', async (req, res) => {
   try {
      const existingUser = await User.findOne({
         $or: [
            { username: req.body.username.toLowerCase() }, // Convert username to lowercase
            { email: req.body.email.toLowerCase() } // Convert email to lowercase
         ]
      });
      if (existingUser) {
         return res
            .status(400)
            .json({ message: 'Username or email already exists' });
      }

      if (req.body.password !== req.body.confirmPassword) {
         return res.status(400).json({ message: 'Passwords do not match' });
      }

      const passwordRegex =
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
      if (!passwordRegex.test(req.body.password)) {
         return res.status(400).json({
            message:
               'Password must contain at least 8 characters and maximum 20 characters,  one uppercase letter, one lowercase letter, one number and one special character(@$!%*?&)'
         });
      }

      const salt = await bcrypt.genSalt(15);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      const confirmationToken =
         crypto.randomBytes(20).toString('hex') + Date.now();

      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 1);

      const newUser = new User({
         username: req.body.username,
         email: req.body.email,
         password: hashedPassword,
         confirmationToken,
         confirmationExpires: expirationDate,
         permissions: ['user'] // Set default permissions to user
      });

      const [user, info] = await Promise.all([
         newUser.save(),
         transporter.sendMail({
            from: `Delicious Recipes <${process.env.GMAIL_USER}>`,
            to: newUser.email,
            subject: 'Confirm Your Account',
            html: generateEmailTemplate(
               newUser.username,
               `${process.env.CLIENT_URL}/verify/${confirmationToken}`
            )
         })
      ]);

      if (info && info.rejected.length > 0) {
         return res
            .status(400)
            .json({ message: 'Failed to send confirmation email' });
      }

      const payload = {
         id: user._id,
         username: user.username,
         email: user.email
      }; // Include email in payload for JWT token
      const token = jwt.sign(payload, JWT_SECRET_KEY, {
         expiresIn: '1h'
      }); // Generate and sign JWT token

      return res.status(200).json({
         message:
            'User registered successfully, please check your email to confirm your account',
         verifyAccountToken: token // Include token in response
      });
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
            .json({ message: 'Please provide both username and password' });
      }

      const user = await User.findOne({ username });

      if (!user) {
         return res.status(400).json({ message: 'Wrong credentials!' });
      }

      // Check if user is verified
      if (!user.verified) {
         return res.status(400).json({ message: 'Account not verified yet' });
      }
      const validated = await bcrypt.compare(password, user.password);
      if (!validated) {
         return res.status(400).json({ message: 'Wrong credentials!' });
      }

      // Generate access token
      const payload = {
         id: user._id,
         username: user.username,
         favorites: user.favorites
      };
      const accessToken = jwt.sign(payload, JWT_SECRET_KEY, {
         expiresIn: 1 * 120
      });

      // Generate refresh token
      const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET_KEY, {
         expiresIn: '12h'
      });

      // Store tokens in database
      const existingToken = await Token.findOne({ userId: user._id });

      if (existingToken) {
         existingToken.refreshToken = refreshToken;
         await existingToken.save();
      } else {
         const newToken = new Token({
            userId: user._id,
            refreshToken
         });
         await newToken.save();
      }

      res.status(200)
         .cookie('refreshToken', refreshToken, {
            httpOnly: false,
            sameSite: 'none',
            secure: true
         })
         .json({
            accessToken,
            expiresIn: 1 * 120,
            id: user._id,
            username: user.username,
            favorites: user.favorites,
            email: user.email,
            profilePic: user.profilePic,
            permissions: user.permissions
         });
   } catch (err) {
      res.status(500).json({ message: 'Request failed with status code 500' });
   }
});

// Route for checking if account is verified
router.get('/account/status', async (req, res) => {
   try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
         return res.status(401).json({ message: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, JWT_SECRET_KEY);
      const user = await User.findOne({ _id: decoded.id });

      if (!user) {
         return res.status(400).json({ message: 'User not found' });
      }

      if (user.verified) {
         return res
            .status(200)
            .json({ message: 'Account verified, you can now login' });
      } else {
         return res.status(400).json({ message: 'Account not verified' });
      }
   } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
   }
});

// VERIFY ACCOUNT

// Route for handling account confirmation
router.get('/verify/:confirmationToken', async (req, res) => {
   try {
      const { confirmationToken } = req.params;
      const user = await User.findOne({
         confirmationaccessToken: confirmationToken,
         confirmationExpires: { $gt: Date.now() },
         verified: false
      });

      if (!user) {
         // Check if the user is already verified
         const alreadyVerified = await User.findOne({
            confirmationaccessToken: confirmationToken,
            verified: true
         });

         if (alreadyVerified) {
            return res
               .status(400)
               .json({ message: 'Account is already verified' });
         } else {
            return res
               .status(400)
               .json({ message: 'Invalid or expired confirmation token' });
         }
      } else {
         // Update user document to set verified to true
         user.verified = true;

         await user.save();

         // Account confirmed successfully

         return res
            .status(200)
            .json({ message: 'Account confirmed successfully' });
      }
   } catch (err) {
      console.error(err); // Log the error
      res.status(500).json({ message: 'Internal Server Error' });
   }
});

// Route for resending confirmation email for unverified accounts
router.post('/resend-confirmation-email', async (req, res) => {
   try {
      const { confirmationToken } = req.body; // Get the confirmationToken from the request body
      const user = await User.findOne({ confirmationToken });

      if (!user) {
         return res.status(404).json({ message: 'User not found' });
      }

      if (user.verified) {
         return res
            .status(400)
            .json({ message: 'Account is already verified' });
      }

      if (user.confirmationExpires && user.confirmationExpires < Date.now()) {
         // Confirmation token has expired, generate a new one and update the user
         const newConfirmationToken = crypto.randomBytes(20).toString('hex');
         const expirationDate = new Date();
         expirationDate.setDate(expirationDate.getDate() + 1);

         await User.findOneAndUpdate(
            { _id: user._id }, // Update the query parameter to _id
            {
               confirmationaccessToken: newConfirmationToken, // Update the new token
               confirmationExpires: expirationDate
            }
         );

         // Send confirmation email with new token
         const confirmationLink = `${process.env.CLIENT_URL}/verify/${newConfirmationToken}`; // Use the new token
         const mailOptions = {
            from: process.env.GMAIL_USER,
            to: user.email,
            subject: 'Confirm Your Account',
            html: `Please click this link to confirm your account: <a href="${confirmationLink}">${confirmationLink}</a>`
         };

         transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
               res.status(400).json(error);
            } else {
               res.status(400).json({
                  message: `Email sent: ${info.response}`
               });
            }
         });

         return res
            .status(200)
            .json({ message: 'Confirmation email resent successfully' });
      } else {
         return res.status(400).json({
            message:
               'Confirmation email can only be resent after the previous one expires'
         });
      }
   } catch (err) {
      res.status(500).json(err);
   }
});

//RESET PASSWORD
router.post('/resetpassword', async (req, res) => {
   const { email } = req.body;
   try {
      const user = await User.findOne({ email });
      if (!user) {
         return res.status(404).json({ errors: [] });
      }

      // Generate a random token
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

      // Save the token and expiration date to the user's document in the database
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
      await user.save();

      // Send an email to the user with a link to reset their password
      const confirmationLink = `${process.env.CLIENT_URL}/resetpassword/${resetToken}\n\n`; // Use the new token
      const mailOptions = {
         from: process.env.GMAIL_USER,
         to: user.email,
         subject: 'Reset your password',
         html: `You are receiving this email because you (or someone else) has requested to reset your password. If you did not make this request, you can safely ignore this email. To reset your password, please click on the following link or paste it into your web browser:\n\n' <a href="${confirmationLink}">${confirmationLink}</a>`
      };

      transporter.sendMail(mailOptions, function (error, info) {
         if (error) {
            res.status(400).json(error);
         } else {
            res.status(200).json({
               message: `Email sent: ${info.response}`
            });
         }
      });

      return res.status(200).json({ message: 'Password reset email sent' });
   } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
   }
});

router.post('/resetpassword/:resetToken', async (req, res) => {
   const { resetToken } = req.params;
   const { password } = req.body;
   try {
      const user = await User.findOne({
         resetPasswordaccessToken: resetToken,
         resetPasswordExpires: { $gt: Date.now() }
      });
      if (!user) {
         return res.status(400).json({ message: 'Invalid or expired token' });
      }

      // Update the user's password and clear the reset token and expiration date
      const passwordRegex =
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
      if (!passwordRegex.test(req.body.password)) {
         return res.status(400).json({
            message:
               'Password must contain at least 8 characters and maximum 20 characters,  one uppercase letter, one lowercase letter, one number and one special character(@$!%*?&)'
         });
      }

      const salt = await bcrypt.genSalt(15);
      const hashedPassword = await bcrypt.hash(password, salt);

      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Create a new JWT token for the user to replace the old token
      const payload = { userId: user._id };
      const newToken = jwt.sign(payload, JWT_SECRET_KEY, {
         expiresIn: '6h'
      }); // Generate and sign new JWT token

      // Update the token for the user in the Token collection
      await Token.updateOne({ userId: user._id }, { accessToken: newToken });

      return res.json({
         message: 'Password reset successfully',
         accessToken: newToken
      });
   } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
   }
});

// router.post('/logout', async (req, res) => {
//    const token = req.headers.authorization.split(' ')[1]; // assuming JWT is used
//    try {
//       localStorage.clear(token);
//       // invalidate the user's token on the server
//       await User.updateOne(
//          { token },
//          {
//             $unset: {
//                accessToken: 1
//             }
//          }
//       );

//       return res.status(200).json({ message: 'Logged out successfully' });
//    } catch (error) {
//       console.error(error);
//       return res.status(500).json({ message: 'Server error' });
//    }
// });

// Logout user
// router.post('/logout', (req, res) => {
//    res.clearCookie('connect.sid');
//    res.sendStatus(200);
// });

module.exports = router;
