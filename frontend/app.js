const API_URL = 'http://localhost:3000/api';

const mealPlanDiv = document.getElementById('mealPlan');
const btnGenerateWeek = document.getElementById('btnGenerateWeek');
const btnAddRecipe = document.getElementById('btnAddRecipe');
const btnViewRecipes = document.getElementById('btnViewRecipes');
const modalAddRecipe = document.getElementById('modalAddRecipe');
const modalMealDetail = document.getElementById('modalMealDetail');
const modalRecipesList = document.getElementById('modalRecipesList');
const modalEditRecipe = document.getElementById('modalEditRecipe');
const closeBtns = document.querySelectorAll('.close');
const tabBtns = document.querySelectorAll('.tab-btn');

const btnImportUrl = document.getElementById('btnImportUrl');
const recipeUrlInput = document.getElementById('recipeUrl');
const importStatus = document.getElementById('importStatus');

const btnSaveManual = document.getElementById('btnSaveManual');
const recipeNameInput = document.getElementById('recipeName');
const recipeIngredientsInput = document.getElementById('recipeIngredients');
const recipeInstructionsInput = document.getElementById('recipeInstructions');

const searchRecipesInput = document.getElementById('searchRecipes');
const sortRecipesSelect = document.getElementById('sortRecipes');
const recipesListDiv = document.getElementById('recipesList');

const btnSaveEdit = document.getElementById('btnSaveEdit');
const editRecipeNameInput = document.getElementById('editRecipeName');
const editRecipeIngredientsInput = document.getElementById('editRecipeIngredients');
const editRecipeInstructionsInput = document.getElementById('editRecipeInstructions');

let currentEditRecipeId = null;
let allRecipes = [];

loadMealPlan();

btnGenerateWeek.addEventListener('click', generateNewWeek);
btnAddRecipe.addEventListener('click', () => openModal(modalAddRecipe));
btnViewRecipes.addEventListener('click', showRecipesList);

closeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal(modalAddRecipe);
    closeModal(modalMealDetail);
    closeModal(modalRecipesList);
    closeModal(modalEditRecipe);
  });
});

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    switchTab(tabName);
  });
});

btnImportUrl.addEventListener('click', importFromUrl);
btnSaveManual.addEventListener('click', saveManualRecipe);
btnSaveEdit.addEventListener('click', saveEditedRecipe);

searchRecipesInput.addEventListener('input', filterAndSortRecipes);
sortRecipesSelect.addEventListener('change', filterAndSortRecipes);

window.addEventListener('click', (e) => {
  if (e.target === modalAddRecipe) closeModal(modalAddRecipe);
  if (e.target === modalMealDetail) closeModal(modalMealDetail);
  if (e.target === modalRecipesList) closeModal(modalRecipesList);
  if (e.target === modalEditRecipe) closeModal(modalEditRecipe);
});

async function loadMealPlan() {
  try {
    const response = await fetch(`${API_URL}/meal-plan`);
    const data = await response.json();
    
    if (!data.meals || data.meals.length === 0) {
      mealPlanDiv.innerHTML = '<p class="loading">Žádný jídelníček. Vygeneruj nový!</p>';
      return;
    }
    
    renderMealPlan(data.meals);
  } catch (error) {
    mealPlanDiv.innerHTML = `<p class="loading error">Chyba načítání: ${error.message}</p>`;
  }
}

async function generateNewWeek() {
  btnGenerateWeek.disabled = true;
  btnGenerateWeek.textContent = 'Generuji...';
  
  try {
    const response = await fetch(`${API_URL}/meal-plan/generate`, {
      method: 'POST'
    });
    const data = await response.json();
    renderMealPlan(data.meals);
  } catch (error) {
    alert('Chyba při generování: ' + error.message);
  } finally {
    btnGenerateWeek.disabled = false;
    btnGenerateWeek.textContent = 'Vygenerovat nový týden';
  }
}

async function regenerateMeal(mealIndex) {
  try {
    const response = await fetch(`${API_URL}/meal-plan/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealIndex })
    });
    const data = await response.json();
    
    if (data.error) {
      alert(data.error);
      return;
    }
    
    loadMealPlan();
  } catch (error) {
    alert('Chyba při přegenerování: ' + error.message);
  }
}

async function importFromUrl() {
  const url = recipeUrlInput.value.trim();
  
  if (!url) {
    showImportStatus('Vyplň URL', 'error');
    return;
  }
  
  btnImportUrl.disabled = true;
  btnImportUrl.textContent = 'Importuji...';
  showImportStatus('Stahuji a parsuji recept...', 'success');
  
  try {
    const response = await fetch(`${API_URL}/recipes/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    
    if (data.error) {
      showImportStatus(`Chyba: ${data.error}`, 'error');
      return;
    }
    
    showImportStatus(`✓ Recept "${data.recipe.name}" úspěšně importován!`, 'success');
    recipeUrlInput.value = '';
    
    setTimeout(() => {
      closeModal(modalAddRecipe);
    }, 2000);
  } catch (error) {
    showImportStatus(`Chyba: ${error.message}`, 'error');
  } finally {
    btnImportUrl.disabled = false;
    btnImportUrl.textContent = 'Importovat';
  }
}

async function saveManualRecipe() {
  const name = recipeNameInput.value.trim();
  const ingredientsText = recipeIngredientsInput.value.trim();
  const instructions = recipeInstructionsInput.value.trim();
  
  if (!name || !ingredientsText || !instructions) {
    alert('Vyplň všechna pole');
    return;
  }
  
  const ingredients = ingredientsText.split('\n').filter(i => i.trim());
  
  try {
    const response = await fetch(`${API_URL}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ingredients, instructions })
    });
    
    const data = await response.json();
    
    if (data.error) {
      alert(data.error);
      return;
    }
    
    alert('✓ Recept uložen!');
    
    recipeNameInput.value = '';
    recipeIngredientsInput.value = '';
    recipeInstructionsInput.value = '';
    
    closeModal(modalAddRecipe);
  } catch (error) {
    alert('Chyba: ' + error.message);
  }
}

async function showRecipesList() {
  recipesListDiv.innerHTML = '<p class="loading">Načítám recepty...</p>';
  openModal(modalRecipesList);
  
  try {
    const response = await fetch(`${API_URL}/recipes`);
    allRecipes = await response.json();
    
    if (allRecipes.length === 0) {
      recipesListDiv.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">Zatím nemáš žádné recepty</div>
          <div class="empty-state-hint">Přidej první recept pomocí tlačítka "➕ Přidat recept"</div>
        </div>
      `;
      return;
    }
    
    filterAndSortRecipes();
  } catch (error) {
    recipesListDiv.innerHTML = `<p class="loading error">Chyba: ${error.message}</p>`;
  }
}

function filterAndSortRecipes() {
  const searchTerm = searchRecipesInput.value.toLowerCase();
  const sortBy = sortRecipesSelect.value;
  
  let filtered = allRecipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm)
  );
  
  filtered.sort((a, b) => {
    if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    } else if (sortBy === 'name') {
      return a.name.localeCompare(b.name, 'cs');
    } else if (sortBy === 'date') {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    return 0;
  });
  
  renderRecipesList(filtered);
}

function renderRecipesList(recipes) {
  if (recipes.length === 0) {
    recipesListDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">Žádné recepty nenalezeny</div>
        <div class="empty-state-hint">Zkus jiné hledání</div>
      </div>
    `;
    return;
  }
  
  const html = recipes.map(recipe => `
    <div class="recipe-item">
      <div class="recipe-item-header">
        <h3 class="recipe-item-title">${recipe.name}</h3>
        <div class="recipe-item-rating">
          ${renderStarsStatic(recipe.rating || 0)}
        </div>
      </div>
      <div class="recipe-item-actions">
        <button class="btn btn-small btn-secondary" onclick="showRecipeDetail(${recipe.id})">
          👁️ Detail
        </button>
        <button class="btn btn-small btn-secondary" onclick="editRecipe(${recipe.id})">
          ✏️ Upravit
        </button>
        <button class="btn btn-small btn-danger" onclick="deleteRecipe(${recipe.id}, '${recipe.name.replace(/'/g, "\\'")}')">
          🗑️ Smazat
        </button>
      </div>
      <div class="recipe-item-meta">
        ${recipe.ingredients.length} ingrediencí
        ${recipe.notes ? '• Má poznámky' : ''}
      </div>
    </div>
  `).join('');
  
  recipesListDiv.innerHTML = html;
}

function renderStarsStatic(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? '⭐' : '☆';
  }
  return stars;
}

async function showRecipeDetail(recipeId) {
  try {
    const response = await fetch(`${API_URL}/recipes`);
    const recipes = await response.json();
    const recipe = recipes.find(r => r.id === recipeId);
    
    if (!recipe) {
      alert('Recept nenalezen');
      return;
    }
    
    const html = `
      <div class="meal-detail">
        <h2>${recipe.name}</h2>
        
        ${renderStars(recipe.rating || 0, recipe.id)}
        
        <h3>Ingredience</h3>
        <ul>
          ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
        </ul>
        
        <h3>Postup přípravy</h3>
        <p>${recipe.instructions}</p>
        
        <div class="notes-section">
          <h3>📝 Poznámky</h3>
          ${recipe.notes 
            ? `<div class="notes-display" id="notesDisplay">${recipe.notes}</div>` 
            : `<div class="notes-display empty" id="notesDisplay">Zatím žádné poznámky</div>`
          }
          <textarea id="notesInput" placeholder="Přidej poznámku...">${recipe.notes || ''}</textarea>
          <button class="btn btn-primary btn-small save-notes-btn" onclick="saveNotes(${recipe.id})">
            Uložit poznámky
          </button>
        </div>
        
        ${recipe.source ? `<p style="margin-top: 20px; font-size: 13px; color: #999;">Zdroj: ${recipe.source}</p>` : ''}
      </div>
    `;
    
    document.getElementById('mealDetailContent').innerHTML = html;
    closeModal(modalRecipesList);
    openModal(modalMealDetail);
  } catch (error) {
    alert('Chyba: ' + error.message);
  }
}

async function editRecipe(recipeId) {
  try {
    const response = await fetch(`${API_URL}/recipes`);
    const recipes = await response.json();
    const recipe = recipes.find(r => r.id === recipeId);
    
    if (!recipe) {
      alert('Recept nenalezen');
      return;
    }
    
    currentEditRecipeId = recipeId;
    editRecipeNameInput.value = recipe.name;
    editRecipeIngredientsInput.value = recipe.ingredients.join('\n');
    editRecipeInstructionsInput.value = recipe.instructions;
    
    closeModal(modalRecipesList);
    openModal(modalEditRecipe);
  } catch (error) {
    alert('Chyba: ' + error.message);
  }
}

async function saveEditedRecipe() {
  const name = editRecipeNameInput.value.trim();
  const ingredientsText = editRecipeIngredientsInput.value.trim();
  const instructions = editRecipeInstructionsInput.value.trim();
  
  if (!name || !ingredientsText || !instructions) {
    alert('Vyplň všechna pole');
    return;
  }
  
  const ingredients = ingredientsText.split('\n').filter(i => i.trim());
  
  try {
    const response = await fetch(`${API_URL}/recipes/${currentEditRecipeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ingredients, instructions })
    });
    
    if (response.ok) {
      alert('✓ Recept upraven!');
      closeModal(modalEditRecipe);
      showRecipesList();
      loadMealPlan();
    } else {
      const data = await response.json();
      alert('Chyba: ' + (data.error || 'Nepodařilo se uložit'));
    }
  } catch (error) {
    alert('Chyba: ' + error.message);
  }
}

async function deleteRecipe(recipeId, recipeName) {
  if (!confirm(`Opravdu chceš smazat recept "${recipeName}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('✓ Recept smazán!');
      showRecipesList();
      loadMealPlan();
    } else {
      alert('Chyba při mazání receptu');
    }
  } catch (error) {
    alert('Chyba: ' + error.message);
  }
}

function renderMealPlan(meals) {
  const html = `
    <div class="meal-grid">
      ${meals.map((meal, index) => {
        const dayLabel = index < 3 ? `${index + 1}. jídlo` : 'Alternativa';
        return `
          <div class="meal-card">
            <h3>${dayLabel}</h3>
            <h2>${meal.recipe.name}</h2>
            ${renderStars(meal.recipe.rating || 0, meal.recipe.id, true)}
            <div class="ingredients-preview">
              ${meal.recipe.ingredients.slice(0, 3).join(', ')}${meal.recipe.ingredients.length > 3 ? '...' : ''}
            </div>
            <div class="actions">
              <button class="btn btn-small btn-secondary" onclick="showMealDetail(${index})">
                Zobrazit detail
              </button>
              <button class="btn btn-small btn-icon" onclick="regenerateMeal(${index})" title="Vygenerovat jiné jídlo">
                🔄
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  mealPlanDiv.innerHTML = html;
}

function renderStars(rating, recipeId, isCard = false) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const filled = i <= rating ? 'filled' : '';
    stars.push(`<span class="star ${filled}" data-rating="${i}" data-recipe="${recipeId}" onclick="setRating(${recipeId}, ${i})">★</span>`);
  }
  
  return `
    <div class="rating ${isCard ? 'rating-card' : ''}">
      <div class="stars">
        ${stars.join('')}
      </div>
    </div>
  `;
}

async function setRating(recipeId, rating) {
  try {
    const response = await fetch(`${API_URL}/recipes/${recipeId}/rating`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });
    
    if (response.ok) {
      const stars = document.querySelectorAll(`.star[data-recipe="${recipeId}"]`);
      stars.forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        if (starRating <= rating) {
          star.classList.add('filled');
        } else {
          star.classList.remove('filled');
        }
      });
    }
  } catch (error) {
    console.error('Chyba při ukládání hodnocení:', error);
    alert('Chyba při ukládání hodnocení');
  }
}

function showMealDetail(index) {
  fetch(`${API_URL}/meal-plan`)
    .then(res => res.json())
    .then(data => {
      const meal = data.meals[index];
      const html = `
        <div class="meal-detail">
          <h2>${meal.recipe.name}</h2>
          
          ${renderStars(meal.recipe.rating || 0, meal.recipe.id)}
          
          <h3>Ingredience</h3>
          <ul>
            ${meal.recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
          </ul>
          
          <h3>Postup přípravy</h3>
          <p>${meal.recipe.instructions}</p>
          
          <div class="notes-section">
            <h3>📝 Poznámky</h3>
            ${meal.recipe.notes 
              ? `<div class="notes-display" id="notesDisplay">${meal.recipe.notes}</div>` 
              : `<div class="notes-display empty" id="notesDisplay">Zatím žádné poznámky</div>`
            }
            <textarea id="notesInput" placeholder="Přidej poznámku...">${meal.recipe.notes || ''}</textarea>
            <button class="btn btn-primary btn-small save-notes-btn" onclick="saveNotes(${meal.recipe.id})">
              Uložit poznámky
            </button>
          </div>
          
          ${meal.recipe.source ? `<p style="margin-top: 20px; font-size: 13px; color: #999;">Zdroj: ${meal.recipe.source}</p>` : ''}
        </div>
      `;
      
      document.getElementById('mealDetailContent').innerHTML = html;
      openModal(modalMealDetail);
    });
}

async function saveNotes(recipeId) {
  const notesInput = document.getElementById('notesInput');
  const notes = notesInput.value.trim();
  
  try {
    const response = await fetch(`${API_URL}/recipes/${recipeId}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    
    if (response.ok) {
      const notesDisplay = document.getElementById('notesDisplay');
      if (notes) {
        notesDisplay.textContent = notes;
        notesDisplay.classList.remove('empty');
      } else {
        notesDisplay.textContent = 'Zatím žádné poznámky';
        notesDisplay.classList.add('empty');
      }
      
      notesInput.value = '';
      
      const btn = event.target;
      const originalText = btn.textContent;
      btn.textContent = '✓ Uloženo';
      btn.style.background = '#28a745';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 1500);
    }
  } catch (error) {
    alert('Chyba při ukládání poznámek: ' + error.message);
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
}

function showImportStatus(message, type) {
  importStatus.textContent = message;
  importStatus.className = type;
  importStatus.style.display = 'block';
}

function openModal(modal) {
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
}

window.showMealDetail = showMealDetail;
window.regenerateMeal = regenerateMeal;
window.setRating = setRating;
window.saveNotes = saveNotes;
window.showRecipeDetail = showRecipeDetail;
window.editRecipe = editRecipe;
window.deleteRecipe = deleteRecipe;
