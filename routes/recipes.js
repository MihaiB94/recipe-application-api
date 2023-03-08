//UPDATE A RECIPE
router.put('/:id', upload.single('file'), async (req, res) => {
   try {
      const recipe = await Recipe.findById(req.params.id);

      // Make sure that the user is logged in and authorized to edit the recipe
      if (recipe.userId !== req.body.userId) {
         return res
            .status(401)
            .json({ message: 'You are not authorized to edit this recipe.' });
      }

      // Update the recipe data
      recipe.username = req.body.username;
      recipe.title = req.body.title;
      recipe.categories = req.body.categories;
      recipe.description = req.body.description;
      recipe.ingredients = JSON.parse(req.body.ingredients);
      recipe.preparation_steps = JSON.parse(req.body.preparation_steps);

      if (req.file) {
         recipe.image_url = req.file.location;
      }

      const updatedRecipe = await recipe.save();
      res.status(200).json(updatedRecipe);
   } catch (err) {
      console.log(err);
      res.status(500).json(err);
   }
});
