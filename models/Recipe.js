const mongoose = require('mongoose');

const RecipeSchema = mongoose.Schema(
   {
      title: {
         type: String,
         required: 'This field field is required',
         unique: true
      },

      description: {
         type: String,
         required: 'This field field is required'
      },
      publisher: {
         type: String
      },
      ingredients: {
         type: Array,
         required: 'This field field is required'
      },
      categories: {
         // type: Array,
         type: String,
         required: 'This field field is required'
      },
      preparation_steps: {
         type: Array,
         required: 'This field field is required'
      },
      source_url: {
         type: String
      },
      image_url: {
         type: String,
         required: 'This field field is required'
      },
      username: {
         type: String,
         required: 'This field field is required'
      },
      userId: {
         type: String
      }
   },
   { timestamps: true }
);

module.exports = mongoose.model('Recipe', RecipeSchema);
