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

    // Preferuj lépe hodnocené recepty (rating 4-5)
    const highRated = pool.filter(r => r.rating >= 4);
    if (highRated.length > 0 && Math.random() > 0.3) {
      pool = highRated;
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  // NOVÉ: Generuj plán s respektováním zamknutých jídel
  generateWeekPlan(count = 4, lockedMeals = []) {
    this.loadRecentHistory();
    
    const selected = [];
    const usedIds = [];
    
    // Nejdřív přidej zamknutá jídla na jejich pozice
    for (let i = 0; i < count; i++) {
      const locked = lockedMeals.find(m => m.index === i);
      
      if (locked && locked.locked) {
        // Zachovej zamknuté jídlo
        selected.push({
          recipeId: locked.recipeId,
          day: i < 3 ? `${i + 1}. jídlo` : 'Alternativa',
          recipe: this.parseRecipe(locked.recipe),
          locked: true
        });
        usedIds.push(locked.recipeId);
      } else {
        // Vygeneruj nové jídlo
        const recipe = this.selectRecipe(usedIds);
        if (!recipe) {
          selected.push(null);
          continue;
        }
        
        selected.push({
          recipeId: recipe.id,
          day: i < 3 ? `${i + 1}. jídlo` : 'Alternativa',
          recipe: this.parseRecipe(recipe),
          locked: false
        });
        
        usedIds.push(recipe.id);
      }
    }

    return selected.filter(m => m !== null);
  }

  regenerateSingleMeal(currentPlanIds = []) {
    this.loadRecentHistory();
    const recipe = this.selectRecipe(currentPlanIds);
    return recipe ? {
      recipeId: recipe.id,
      recipe: this.parseRecipe(recipe),
      locked: false
    } : null;
  }

  parseRecipe(dbRecipe) {
    // Pokud už je to rozparsované (z locked meal), vrať to
    if (dbRecipe.ingredients && Array.isArray(dbRecipe.ingredients)) {
      return dbRecipe;
    }
    
    // Jinak parsuj z databáze
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
