const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
   },

   refreshToken: { type: String, required: true },
   refreshTokenExpiresAt: {
      type: Date,
      required: true,
      default: Date.now,
      expires: '6h'
   }
});

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;
