const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, recipeDb, mealPlanDb, historyDb, tagDb, getMonday } = require('./database');
const generator = require('./generator');
const RecipeScraper = require('./scraper');

// Inicializace
const app = express();
const PORT = 3000;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const scraper = new RecipeScraper(CLAUDE_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Inicializace databáze
initDatabase();

// === API ENDPOINTS ===

// GET: Načti všechny recepty (s volitelným filtrováním podle tagů)
app.get('/api/recipes', (req, res) => {
  try {
    const { tagIds } = req.query;
    let recipes = recipeDb.getAll();

    // Přidej tagy ke každému receptu
    recipes = recipes.map(r => ({
      ...r,
      ingredients: JSON.parse(r.ingredients),
      tags: tagDb.getByRecipeId(r.id)
    }));

    // Filtrování podle tagů, pokud jsou zadány
    if (tagIds) {
      const filterTagIds = Array.isArray(tagIds) ? tagIds : [tagIds];
      const filterTagIdNumbers = filterTagIds.map(id => parseInt(id));

      recipes = recipes.filter(recipe => {
        const recipeTagIds = recipe.tags.map(t => t.id);
        // Recept musí mít všechny požadované tagy
        return filterTagIdNumbers.every(tagId => recipeTagIds.includes(tagId));
      });
    }

    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Přidej nový recept (manuálně nebo import)
app.post('/api/recipes', (req, res) => {
  try {
    const { name, ingredients, instructions, source, tags } = req.body;
    
    if (!name || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Chybí povinná pole' });
    }

    const recipeId = recipeDb.create({
      name,
      ingredients: Array.isArray(ingredients) ? ingredients : [ingredients],
      instructions,
      source,
      tags: tags || []
    });

    res.json({ id: recipeId, message: 'Recept uložen' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Parsuj recept z URL
app.post('/api/recipes/import', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL je povinná' });
    }

    const recipe = await scraper.scrapeRecipe(url);
    
    // Automaticky ulož
    const recipeId = recipeDb.create({
      ...recipe,
      tags: []
    });

    res.json({ id: recipeId, recipe, message: 'Recept importován' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Načti aktuální jídelníček
app.get('/api/meal-plan', (req, res) => {
  try {
    const monday = getMonday(new Date());
    let plan = mealPlanDb.getCurrent();

    // Pokud neexistuje, vygeneruj nový
    if (!plan) {
      const meals = generator.generateWeekPlan(4);
      mealPlanDb.create(monday, meals);
      
      // Ulož do historie
      meals.forEach(m => {
        historyDb.add(m.recipeId, monday);
      });

      plan = { week_start: monday, meals: JSON.stringify(meals) };
    }

    res.json({
      weekStart: plan.week_start,
      meals: JSON.parse(plan.meals)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// POST: Vygeneruj nový týdenní plán
app.post('/api/meal-plan/generate', (req, res) => {
  try {
    const monday = getMonday(new Date());
    const existing = mealPlanDb.getCurrent();
    
    // Získej zamknutá jídla z existujícího plánu
    let lockedMeals = [];
    if (existing) {
      const currentMeals = JSON.parse(existing.meals);
      lockedMeals = currentMeals.map((meal, index) => ({
        index,
        locked: meal.locked || false,
        recipeId: meal.recipeId,
        recipe: meal.recipe
      }));
    }
    
    const meals = generator.generateWeekPlan(4, lockedMeals);
    
    if (existing) {
      mealPlanDb.update(monday, meals);
    } else {
      mealPlanDb.create(monday, meals);
    }

    // Ulož do historie pouze NEzamknutá jídla
    meals.forEach(m => {
      if (!m.locked) {
        historyDb.add(m.recipeId, monday);
      }
    });

    res.json({ meals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Přegeneruj jedno jídlo
app.post('/api/meal-plan/regenerate', (req, res) => {
  try {
    const { mealIndex } = req.body;
    const monday = getMonday(new Date());
    const plan = mealPlanDb.getCurrent();
    
    if (!plan) {
      return res.status(404).json({ error: 'Jídelníček neexistuje' });
    }

    const meals = JSON.parse(plan.meals);
    const currentIds = meals.map(m => m.recipeId);
    
    // Vygeneruj nové jídlo
    const newMeal = generator.regenerateSingleMeal(currentIds);
    
    if (!newMeal) {
      return res.status(400).json({ error: 'Žádné další recepty k dispozici' });
    }

    // Aktualizuj plán
    meals[mealIndex] = {
      ...meals[mealIndex],
      recipeId: newMeal.recipeId,
      recipe: newMeal.recipe
    };

    mealPlanDb.update(monday, meals);
    historyDb.add(newMeal.recipeId, monday);

    res.json({ meal: meals[mealIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// PATCH: Aktualizuj hodnocení receptu
app.patch('/api/recipes/:id/rating', (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    
    if (rating < 0 || rating > 5) {
      return res.status(400).json({ error: 'Hodnocení musí být 0-5' });
    }

    recipeDb.updateRating(id, rating);
    res.json({ message: 'Hodnocení uloženo' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Aktualizuj poznámky receptu
app.patch('/api/recipes/:id/notes', (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    recipeDb.updateNotes(id, notes);
    res.json({ message: 'Poznámky uloženy' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Aktualizuj celý recept
app.put('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, ingredients, instructions, source, tags } = req.body;
    
    if (!name || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Chybí povinná pole' });
    }

    recipeDb.update(id, {
      name,
      ingredients: Array.isArray(ingredients) ? ingredients : [ingredients],
      instructions,
      source,
      tags: tags || []
    });

    res.json({ message: 'Recept aktualizován' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Smaž recept
app.delete('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    recipeDb.delete(id);
    res.json({ message: 'Recept smazán' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Zamkni/odemkni jídlo v jídelníčku
app.patch('/api/meal-plan/lock', (req, res) => {
  try {
    const { mealIndex, locked } = req.body;
    const monday = getMonday(new Date());
    const plan = mealPlanDb.getCurrent();
    
    if (!plan) {
      return res.status(404).json({ error: 'Jídelníček neexistuje' });
    }

    const meals = JSON.parse(plan.meals);
    
    if (mealIndex < 0 || mealIndex >= meals.length) {
      return res.status(400).json({ error: 'Neplatný index jídla' });
    }
    
    meals[mealIndex].locked = locked;
    
    mealPlanDb.update(monday, meals);
    
    res.json({ message: 'Zámek aktualizován', meal: meals[mealIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === TAGY ===

// GET: Načti všechny tagy
app.get('/api/tags', (req, res) => {
  try {
    const tags = tagDb.getAll();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Vytvoř nový tag
app.post('/api/tags', (req, res) => {
  try {
    const { name, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Název a kategorie jsou povinné' });
    }

    if (!['type', 'time'].includes(category)) {
      return res.status(400).json({ error: 'Kategorie musí být "type" nebo "time"' });
    }

    const tagId = tagDb.create(name, category);
    res.json({ id: tagId, message: 'Tag vytvořen' });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Tag s tímto názvem již existuje' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT: Aktualizuj tag
app.put('/api/tags/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Název a kategorie jsou povinné' });
    }

    if (!['type', 'time'].includes(category)) {
      return res.status(400).json({ error: 'Kategorie musí být "type" nebo "time"' });
    }

    tagDb.update(id, name, category);
    res.json({ message: 'Tag aktualizován' });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Tag s tímto názvem již existuje' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Smaž tag
app.delete('/api/tags/:id', (req, res) => {
  try {
    const { id } = req.params;
    tagDb.delete(id);
    res.json({ message: 'Tag smazán' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Načti tagy pro konkrétní recept
app.get('/api/recipes/:id/tags', (req, res) => {
  try {
    const { id } = req.params;
    const tags = tagDb.getByRecipeId(id);
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Přiřaď tagy k receptu
app.post('/api/recipes/:id/tags', (req, res) => {
  try {
    const { id } = req.params;
    const { tagIds } = req.body;

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'tagIds musí být pole' });
    }

    tagDb.setRecipeTags(id, tagIds);
    res.json({ message: 'Tagy přiřazeny' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`🍽️  Jídelníček běží na http://localhost:${PORT}`);
  console.log(`📊 Databáze: ${path.join(__dirname, 'db.sqlite')}`);
  if (!CLAUDE_API_KEY) {
    console.log('⚠️  Claude API klíč není nastaven - import z URL nebude fungovat');
    console.log('   Nastav: export CLAUDE_API_KEY="tvůj-klíč"');
  }
});