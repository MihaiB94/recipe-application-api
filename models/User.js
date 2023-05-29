const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
   {
      username: {
         type: String,
         required: true,
         unique: true,
         trim: true
      },
      email: {
         type: String,
         required: true,
         unique: true,
         trim: true
      },
      password: {
         type: String,
         required: true,
         trim: true
      },
      permissions: {
         type: [String],
         enum: ['user', 'chef', 'admin'],
         default: ['user']
      },
      profilePic: {
         type: String,
         default:
            'https://e7.pngegg.com/pngimages/84/165/png-clipart-united-states-avatar-organization-information-user-avatar-service-computer-wallpaper-thumbnail.png'
      },
      verified: {
         type: Boolean,
         default: false
      },
      confirmationToken: String, // renamed from verificationToken
      confirmationExpires: Date, // renamed from verificationExpires
      resetPasswordToken: String,
      resetPasswordExpires: Date,
      favorites: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Recipe'
         }
      ]
   },
   { timestamps: true }
);

UserSchema.pre('remove', function (next) {
   // Remove all the assignment docs that reference the removed person.
   this.model('Token').remove({ person: this._id }, next);
});

module.exports = mongoose.model('User', UserSchema);
