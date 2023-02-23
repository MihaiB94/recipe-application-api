const { Router } = require('express');
const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');

// const multer = require("multer"); // Library for uploading files

//! ROUTES

router.get('/search', async (req, res) => {
   const query = req.query.q;
   try {
      const recipe = await Recipe.find({
         title: { $regex: query, $options: 'i' }
      }).limit(40);
      res.status(200).json(recipe);
   } catch (err) {
      console.error(err.response.data);
      res.status(500).json(err);
   }
});

//GET ALL RECIPES
router.get('/', async (req, res) => {
   const username = req.query.user;
   const catName = req.query.cat;
   try {
      let recipes;
      if (username) {
         recipes = await Recipe.find({ username });
      } else if (catName) {
         recipes = await Recipe.find({
            categories: {
               $in: [catName]
            }
         });
      } else {
         recipes = await Recipe.find();
      }
      res.status(200).json(recipes);
   } catch (err) {
      res.status(500).json(err);
   }
});

// CREATE RECIPE
router.post('/', async (req, res) => {
   const newRecipe = new Recipe(req.body);
   try {
      const savedRecipe = await newRecipe.save();
      res.status(200).json(savedRecipe);
   } catch (err) {
      res.status(500).json(err);
   }
});

//UPDATE A RECIPE
router.put('/:id', async (req, res) => {
   try {
      const recipe = await Recipe.findById(req.params.id);
      if (recipe.userId === req.body.userId) {
         try {
            const updatedRecipe = await Recipe.findByIdAndUpdate(
               req.params.id,
               {
                  $set: req.body
               },
               {
                  new: true
               }
            );
            res.status(200).json(updatedRecipe);
         } catch (err) {
            res.status(500).json(err);
         }
      } else {
         res.status(401).json('You cannot edit this recipe!');
      }
   } catch (err) {
      res.status(500).json(err);
   }
});

//GET // Find a specific recipe
router.get('/:id', async (req, res) => {
   try {
      const recipe = await Recipe.findById(req.params.id);
      res.status(200).json(recipe);
   } catch (err) {
      res.status(500).json(err);
   }
});

//DELETE A SPECIFIC RECIPE
router.delete('/:id', async (req, res) => {
   try {
      const recipe = await Recipe.findById(req.params.id);

      if (recipe.userId === req.body.userId) {
         try {
            await recipe.delete();
            res.status(200).json('Recipe deleted');
         } catch (err) {
            res.status(500).json(err);
         }
      } else {
         res.status(401).json('You cannot delete this recipe!');
      }
   } catch (err) {
      res.status(500).json(err);
   }
});

module.exports = router;
