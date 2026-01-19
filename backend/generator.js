const { recipeDb, historyDb } = require('./database');

class MealGenerator {
  constructor() {
    this.usedRecently = new Set();
  }

  loadRecentHistory(weeks = 4) {
    const recent = historyDb.getRecent(weeks);
    this.usedRecently = new Set(recent.map(r => r.recipe_id));
  }

  selectRecipe(excludeIds = []) {
    const allRecipes = recipeDb.getAll();
    let available = allRecipes.filter(r => !excludeIds.includes(r.id));
    
    if (available.length === 0) return null;

    const notRecent = available.filter(r => !this.usedRecently.has(r.id));
    let pool = notRecent.length > 0 ? notRecent : available;

    // NOVÉ: Preferuj lépe hodnocené recepty (rating 4-5)
    const highRated = pool.filter(r => r.rating >= 4);
    if (highRated.length > 0 && Math.random() > 0.3) {
      // 70% šance vybrat z top receptů
      pool = highRated;
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  generateWeekPlan(count = 4) {
    this.loadRecentHistory();
    
    const selected = [];
    const usedIds = [];

    for (let i = 0; i < count; i++) {
      const recipe = this.selectRecipe(usedIds);
      if (!recipe) break;
      
      selected.push({
        recipeId: recipe.id,
        day: i < 3 ? `Den ${i + 1}` : 'Alternativa',
        recipe: this.parseRecipe(recipe)
      });
      
      usedIds.push(recipe.id);
    }

    return selected;
  }

  regenerateSingleMeal(currentPlanIds = []) {
    this.loadRecentHistory();
    const recipe = this.selectRecipe(currentPlanIds);
    return recipe ? {
      recipeId: recipe.id,
      recipe: this.parseRecipe(recipe)
    } : null;
  }

  parseRecipe(dbRecipe) {
    return {
      id: dbRecipe.id,
      name: dbRecipe.name,
      ingredients: JSON.parse(dbRecipe.ingredients),
      instructions: dbRecipe.instructions,
      source: dbRecipe.source,
      tags: JSON.parse(dbRecipe.tags || '[]'),
      rating: dbRecipe.rating || 0,
      notes: dbRecipe.notes || ''
    };
  }
}

module.exports = new MealGenerator();
