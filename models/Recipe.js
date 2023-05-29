const mongoose = require('mongoose');

const RecipeSchema = mongoose.Schema(
   {
      image_url: {
         type: String
      },
      title: {
         type: String,
         required: 'Please enter a title for your Recipe',
      },

      description: {
         type: String,
         required: 'Please enter a description for your Recipe'
      },
      publisher: {
         type: String
      },

      categories: {
         // type: Array,
         type: String,
         required: 'Please choose the category for your Recipe'
      },
      ingredients: {
         type: Array,
         required: 'Please add at least one ingredient for your Recipe'
      },
      preparation_steps: {
         type: Array,
         required: 'Please add at least one preparation step for your Recipe'
      },

      source_url: {
         type: String
      },

      username: {
         type: String,
         required: true
      },
      userId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User'
      }
   },
   { timestamps: true }
);

module.exports = mongoose.model('Recipe', RecipeSchema);
