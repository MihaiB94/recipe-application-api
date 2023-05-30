const router = require('express').Router();
const User = require('../models/User');
const Token = require('../models/Token');
const jwt = require('jsonwebtoken');
// Library for encrypting passwords saved in the database

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY;

router.post('/refresh-token', async (req, res) => {
   try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
         return res.status(401).json({ message: 'Refresh token not provided' });
      }

      let decodedRefreshToken;

      try {
         decodedRefreshToken = jwt.verify(refreshToken, JWT_REFRESH_SECRET_KEY);
      } catch (err) {
         // Delete the expired refresh token from the database
         await Token.findOneAndDelete({ refreshToken });

         // Delete the expired refresh token from the cookies
         res.clearCookie('refreshToken');

         return res
            .status(401)
            .json({ message: 'Invalid or expired refresh token' });
      }

      const user = await User.findOne({ _id: decodedRefreshToken.id });

      if (!user) {
         return res.status(401).json({ message: 'User not found' });
      }

      const existingToken = await Token.findOne({ userId: user._id });

      if (existingToken.refreshToken !== refreshToken) {
         return res.status(401).json({ message: 'Invalid refresh token' });
      }

      const accessToken = req.headers.authorization?.split(' ')[1];

      if (!accessToken) {
         return res.status(401).json({ message: 'Access token not provided' });
      }

      const payload = {
         id: user._id,
         username: user.username,
         favorites: user.favorites
      };

      try {
         const decodedAccessToken = jwt.decode(accessToken); // Decoding the token without verification
         const now = Math.floor(Date.now() / 1000);

         if (decodedAccessToken.exp - now > 1 * 10) {
            // Access token is still valid for more than 20 seconds
            const verifiedAccessToken = jwt.verify(accessToken, JWT_SECRET_KEY); // Verify the token after checking expiration

            return res.status(200).json({
               accessToken,
               expiresIn: decodedAccessToken.exp - now,
               id: user._id,
               username: user.username,
               favorites: user.favorites,
               email: user.email,
               profilePic: user.profilePic,
               permissions: user.permissions
            });
         } else {
            const newAccessToken = jwt.sign(payload, JWT_SECRET_KEY, {
               expiresIn: 1 * 20
            });

            return res.status(200).json({
               accessToken: newAccessToken,
               expiresIn: 1 * 20,
               id: user._id,
               username: user.username,
               favorites: user.favorites,
               email: user.email,
               profilePic: user.profilePic,
               permissions: user.permissions
            });
         }
      } catch (err) {
         return res.status(403).json({ message: 'Invalid Token' });
      }
   } catch (err) {
      console.error(err);
      return res
         .status(500)
         .json({ message: 'Request failed with status code 500' });
   }
});

module.exports = router;
