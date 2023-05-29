const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Token = require('../models/Token');
const { roles } = require('../middlewares/userPermissions');
const JWT_REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY;
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const AuthToken = async (req, res, next) => {
   const { refreshToken } = req.cookies;

   if (!refreshToken) {
      return res
         .status(401)
         .json({ message: 'Refresh token expired or not provided' });
   }
   try {
      const decodedToken = jwt.verify(refreshToken, JWT_REFRESH_SECRET_KEY);

      const user = await User.findById(decodedToken.id);
      if (!user) {
         return res.status(404).json('User not found');
      }

      req.user = {
         id: user._id,
         username: user.username,
         favorites: user.favorites,
         confirmationToken: user.confirmationToken,
         permissions: user.permissions
         // add any other properties you want to include in the req.user object
      };

      // Check if access token exists in the request headers
      const accessToken =
         req.headers.authorization && req.headers.authorization.split(' ')[1];

      if (!accessToken) {
         return res.status(401).json('Access denied');
      }

      try {
         const decodedAccessToken = jwt.verify(accessToken, JWT_SECRET_KEY);

         // Check if user ID in access token matches the authenticated user ID
         if (decodedAccessToken.id !== user._id.toString()) {
            return res.status(401).json('Invalid token');
         }

         // User is authenticated and token is valid
         next();
      } catch (err) {
         return res.status(401).json('Invalid token. Error2');
      }
   } catch (err) {
      return res.status(401).json('Invalid token');
   }
};

const CheckPermissions = (requiredRole) => {
   return async (req, res, next) => {
      try {
         const user = await User.findById(req.user.id);
         if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
         }

         const userRole = user.permissions[0];
         const rolePermissions = roles[userRole].permissions;

         if (!requiredRole || rolePermissions.includes(requiredRole)) {
            next();
         } else {
            return res.status(401).json({ message: 'Unauthorized' });
         }
      } catch (err) {
         return res.status(500).json({ message: 'Internal server error' });
      }
   };
};

module.exports = {
   AuthToken,
   CheckPermissions
};
