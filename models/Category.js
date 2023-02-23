const mongoose = require('mongoose');

const CategorySchema = mongoose.Schema({
   category_name: {
      type: String,
      required: 'This field field is required'
   },
   category_image: {
      type: String,
      required: 'This field field is required'
   }
});

module.exports = mongoose.model('Category', CategorySchema);
