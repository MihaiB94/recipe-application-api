const { Router } = require('express');
const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const {
   AuthToken,
   CheckPermissions,
   refreshTokenMiddleware
} = require('../middlewares/authToken');

const s3 = new AWS.S3({
   accessKeyId: process.env.S3_ACCESS_KEY,
   secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
   region: process.env.S3_BUCKET_REGION
});

const upload = multer({
   storage: multerS3({
      s3: s3,
      bucket: process.env.AWS_BUCKET_NAME,
      contentType: multerS3.AUTO_CONTENT_TYPE,

      metadata: function (req, file, cb) {
         cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
         cb(null, Date.now().toString() + '-' + file.originalname);
      }
   })
});

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

router.post(
   '/',

   AuthToken,
   CheckPermissions('chef'),

   upload.single('file'),
   async (req, res) => {
      try {
         if (!req.file) {
            return res.status(400).json({ message: 'No image was uploaded' });
         }
         const imageUrl = req.file.location; // Get the URL of the uploaded file

         const preparationSteps = req.body.preparation_steps
            ? JSON.parse(req.body.preparation_steps)
            : [];
         const ingredients = req.body.ingredients
            ? JSON.parse(req.body.ingredients)
            : [];

         const requiredFields = Recipe.schema.requiredPaths();

         const missingFields = requiredFields.filter((field) => {
            const fieldName = field.split('.')[0];
            if (!req.body[fieldName]) {
               return true;
            }
            if (
               (fieldName === 'ingredients' ||
                  fieldName === 'preparation_steps') &&
               JSON.parse(req.body[fieldName]).length === 0
            ) {
               return true;
            }
            return false;
         });

         if (missingFields.length > 0) {
            const missingFieldMessages = missingFields.map((field) => {
               const fieldName = field.split('.')[0];
               return Recipe.schema.paths[fieldName].options.required;
            });
            return res.status(400).json({
               message: missingFieldMessages.join(', ')
            });
         }

         const newRecipe = new Recipe({
            username: req.body.username,
            image_url: imageUrl,
            title: req.body.title,
            categories: req.body.categories,
            description: req.body.description,
            preparation_steps: preparationSteps,
            ingredients: ingredients,
            userId: req.body.userId
         });

         const savedRecipe = await newRecipe.save();
         res.status(200).json(savedRecipe);
      } catch (err) {
         res.status(500).json(err);
      }
   }
);

//UPDATE A RECIPE
router.put(
   '/:id',
   AuthToken,
   CheckPermissions('chef'),
   upload.single('file'),
   async (req, res) => {

      // Check if user has required permission
      if (!req.user.permissions.includes('chef')) {
         return res.status(403).json({ message: 'Forbidden' });
      }
      try {
         const recipe = await Recipe.findById(req.params.id);

         // Make sure that the user is logged in and authorized to edit the recipe
         if (recipe.userId._id.toString() !== req.body.userId) {
            return res.status(401).json({
               message: 'You are not authorized to edit this recipe.'
            });
         }

         // Delete the old image from S3 if a new image is uploaded
         let isNewImageUploaded = false;
         let oldImageKey;
         if (req.file) {
            if (recipe.image_url) {
               oldImageKey = recipe.image_url.split('/').pop();
            }
            recipe.image_url = req.file.location;
            isNewImageUploaded = true;
         }

         if (isNewImageUploaded && oldImageKey) {
            const deleteParams = {
               Bucket: process.env.AWS_BUCKET_NAME,
               Key: oldImageKey
            };
            s3.deleteObject(deleteParams, (err, data) => {
               if (err) {
                  res.status(400).json(err);
               } else {
                  res.status(200).json({
                     message: `Deleted old image ${oldImageKey} from S3`
                  });
               }
            });
         }

         // Update the recipe data
         recipe.username = req.body.username;
         recipe.title = req.body.title;
         recipe.categories = req.body.categories;
         recipe.description = req.body.description;
         recipe.ingredients = req.body.ingredients
            ? JSON.parse(req.body.ingredients)
            : [];
         recipe.preparation_steps = req.body.preparation_steps
            ? JSON.parse(req.body.preparation_steps)
            : [];

         const updatedRecipe = await recipe.save();

         res.status(200).json(updatedRecipe);
      } catch (err) {
         res.status(400).json({ message: 'Invalid request body' });
      }
   }
);

//GET // Find a specific recipe
router.get('/:id', async (req, res) => {
   try {
      const recipe = await Recipe.findById(req.params.id);
      res.status(200).json(recipe);
   } catch (err) {
      res.status(400).json({ message: 'Invalid request body' });
   }
});

//DELETE A SPECIFIC RECIPE
router.delete(
   '/:id',
   AuthToken,
   CheckPermissions('admin'),
   async (req, res) => {
      try {
         const recipe = await Recipe.findById(req.params.id).populate('userId');

         if (recipe.userId._id.toString() === req.body.userId) {
            try {
               // Delete the old image from S3 if it exists
               if (recipe.image_url) {
                  const oldImageKey = recipe.image_url.split('/').pop();
                  const deleteParams = {
                     Bucket: process.env.AWS_BUCKET_NAME,
                     Key: oldImageKey
                  };
                  s3.deleteObject(deleteParams, (err, data) => {
                     if (err) {
                        res.status(400).json(err);
                     } else {
                        console.log('Old image deleted from S3');
                     }
                  });
               }
               await recipe.delete();

               res.status(200).json('Recipe deleted');
            } catch (err) {
               res.status(500).json(err);
            }
         } else {
            res.status(401).json({ message: 'You cannot delete this recipe!' });
         }
      } catch (err) {
         res.status(400).json({ message: 'Invalid request body' });
      }
   }
);

module.exports = router;
