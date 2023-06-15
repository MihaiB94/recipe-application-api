const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
   },
   refreshToken: {
      type: String,
      required: true
   },
   refreshTokenExpiresAt: {
      type: Date,
      required: true,
      default: () => {
         const now = new Date();
         return now.setHours(now.getHours() + 12);
      },
      expires: '12h'
   }
});

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
