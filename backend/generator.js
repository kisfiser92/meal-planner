const { recipeDb, historyDb } = require('./database');

// Generátor jídelníčku s preferencemi
class MealGenerator {
  constructor() {
    this.usedRecently = new Set();
  }

  // Načte recepty použité v posledních N týdnech
  loadRecentHistory(weeks = 4) {
    const recent = historyDb.getRecent(weeks);
    this.usedRecently = new Set(recent.map(r => r.recipe_id));
  }

  // Vybere náhodný recept s preferencí pro nepoužité
  selectRecipe(excludeIds = []) {
    const allRecipes = recipeDb.getAll();
    
    // Filtruj vyloučené
    let available = allRecipes.filter(r => !excludeIds.includes(r.id));
    
    if (available.length === 0) return null;

    // Preferuj recepty, které nebyly nedávno použity
    const notRecent = available.filter(r => !this.usedRecently.has(r.id));
    const pool = notRecent.length > 0 ? notRecent : available;

    // Náhodný výběr
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Vygeneruje jídelníček na týden
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

  // Vygeneruje jedno nové jídlo (při přegenerování)
  regenerateSingleMeal(currentPlanIds = []) {
    this.loadRecentHistory();
    const recipe = this.selectRecipe(currentPlanIds);
    return recipe ? {
      recipeId: recipe.id,
      recipe: this.parseRecipe(recipe)
    } : null;
  }

  // Parsuje JSON data z databáze
  parseRecipe(dbRecipe) {
    return {
      id: dbRecipe.id,
      name: dbRecipe.name,
      ingredients: JSON.parse(dbRecipe.ingredients),
      instructions: dbRecipe.instructions,
      source: dbRecipe.source,
      tags: JSON.parse(dbRecipe.tags || '[]')
    };
  }
}

module.exports = new MealGenerator();
