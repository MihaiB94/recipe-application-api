const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
   {
      username: {
         type: String,
         required: true
      },
      email: {
         type: String,
         required: true
      },
      password: {
         type: String,
         required: true
      },

      profilePic: {
         type: String,
         default:
            'https://e7.pngegg.com/pngimages/84/165/png-clipart-united-states-avatar-organization-information-user-avatar-service-computer-wallpaper-thumbnail.png'
      },
      verified: Boolean,
      favorites: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Recipe'
         }
      ]
   },

   { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
