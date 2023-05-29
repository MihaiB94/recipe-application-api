const io = require('../middlewares/io'); // Import io object from io.js
const router = require('express').Router();
const User = require('../models/User');
const { AuthToken, CheckPermissions } = require('../middlewares/authToken');

// Library for encrypting passwords saved in the database
const bcrypt = require('bcrypt');

// UPDATE user information
router.put('/:id', AuthToken, CheckPermissions('user'), async (req, res) => {
   try {
      const userId = req.params.id;
      const { password, ...updatedFields } = req.body;

      // Check if the password is provided
      if (password) {
         // Find the user by ID
         const user = await User.findById(userId);
         if (!user) {
            return res.status(404).json({ message: 'User not found' });
         }

         // Verify the password
         const isPasswordValid = await bcrypt.compare(password, user.password);
         if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
         }
      }
      // Remove password field from updatedFields
      delete updatedFields.password;

      // Update the user fields except for the password
      const updatedUser = await User.findByIdAndUpdate(
         userId,
         { $set: updatedFields },
         { new: true }
      );

      io.emit('user-updated', { userId: updatedUser._id });

      res.status(200).json(updatedUser);
   } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
   }
});

// UPDATE user password
router.put(
   '/:id/password',
   AuthToken,
   CheckPermissions('user'),
   async (req, res) => {
      if (req.body.userId === req.params.id) {
         try {
            const user = await User.findById(req.params.id);
            const isPasswordValid = await bcrypt.compare(
               req.body.oldPassword,
               user.password
            );
            if (!isPasswordValid) {
               return res.status(401).json('Invalid old password!');
            }
            const salt = await bcrypt.genSalt(15);
            const newPassword = await bcrypt.hash(req.body.newPassword, salt);
            const updatedUser = await User.findByIdAndUpdate(
               req.params.id,
               {
                  $set: { password: newPassword }
               },
               { new: true }
            );
            res.status(200).json(updatedUser);
         } catch (err) {
            res.status(500).json(err);
         }
      } else {
         res.status(401).json('You do not have access to this account!');
      }
   }
);

// DELETE user information
router.delete(
   '/:id',
   AuthToken,
   CheckPermissions('admin'),
   async (req, res) => {
      try {
         const user = await User.findById(req.params.id);
         if (user) {
            try {
               await User.findByIdAndDelete(req.params.id);
               // Emit a socket event to all connected clients
               io.emit('user-deleted', { userId: req.params.id });
               res.status(200).json('User deleted');
            } catch (error) {
               res.status(500).json(error);
            }
         } else {
            res.status(404).json('User not found');
         }
      } catch (error) {
         res.status(500).json(error);
      }
   }
);

//GET User
router.get('/:id', AuthToken, CheckPermissions('user'), async (req, res) => {
   try {
      const user = await User.findById(req.params.id);
      const { password, ...others } = user._doc;
      res.status(200).json(others);
   } catch (err) {
      res.status(500).json(err);
   }
});

// GET all users
router.get('/', AuthToken, CheckPermissions('admin'), async (req, res) => {
   try {
      const users = await User.find();
      const usersGroup = users.map((user) => {
         const { ...others } = user._doc;
         return others;
      });
      res.status(200).json(usersGroup);
   } catch (err) {
      res.status(500).json(err);
   }
});

// Block user
router.patch(
   '/:id/block',
   AuthToken,
   CheckPermissions('admin'),
   async (req, res) => {
      try {
         const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { isBlocked: true } },
            { new: true }
         );
         res.status(200).json(updatedUser);
      } catch (err) {
         res.status(500).json(err);
      }
   }
);

//ADD TO FAVORITES
// Add recipes to favorites
router.put(
   '/:userId/favorites/:recipeId',
   AuthToken,
   CheckPermissions('user'),
   (req, res) => {
      User.findById(req.params.userId)
         .then((user) => {
            if (user) {
               if (!user.favorites.includes(req.params.recipeId)) {
                  user.favorites.push(req.params.recipeId);
                  return user
                     .save()
                     .then((savedUser) => {
                        res.json({
                           message: 'Recipe added to favorites',
                           favorites: savedUser.favorites
                        });
                     })
                     .catch((err) => {
                        res.status(500).json({ message: err.message });
                     });
               } else {
                  return res.status(400).json({
                     message: 'Recipe already in favorites'
                  });
               }
            } else {
               res.status(404).json({ message: 'User not found' });
            }
         })
         .catch((err) => {
            res.status(500).json({ message: err.message });
         });
   }
);

// Remove recipes from favorites
router.delete(
   '/:userId/favorites/:recipeId',
   AuthToken,
   CheckPermissions('user'),
   (req, res) => {
      User.findById(req.params.userId)
         .then((user) => {
            if (user) {
               user.favorites = user.favorites.filter(
                  (favoriteId) => favoriteId.toString() !== req.params.recipeId
               );
               return user
                  .save()
                  .then((savedUser) => {
                     res.json({
                        message: 'Recipe removed from favorites',
                        favorites: savedUser.favorites
                     });
                  })
                  .catch((err) => {
                     res.status(500).json({ message: err.message });
                  });
            } else {
               res.status(404).json({ message: 'User not found' });
            }
         })
         .catch((err) => {
            res.status(500).json({ message: err.message });
         });
   }
);

// Get all favorites recipes
router.get(
   '/:userId/favorites',
   AuthToken,
   CheckPermissions('user'),
   async (req, res) => {
      try {
         const user = await User.findById(req.params.userId).populate(
            'favorites'
         );

         if (!user) {
            return res.status(404).json({ message: 'User not found' });
         }
         res.json(user.favorites);
      } catch (err) {
         res.status(500).json({ message: err.message });
      }
   }
);

router.get('/permissions', (req, res) => {
   res.status(200).json(permissions);
});

module.exports = router;
