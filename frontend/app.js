const API_URL = 'http://localhost:3000/api';

const mealPlanDiv = document.getElementById('mealPlan');
const btnGenerateWeek = document.getElementById('btnGenerateWeek');
const btnViewRecipes = document.getElementById('btnViewRecipes');
const btnShoppingList = document.getElementById('btnShoppingList');
const modalAddRecipe = document.getElementById('modalAddRecipe');
const modalMealDetail = document.getElementById('modalMealDetail');
const modalRecipesList = document.getElementById('modalRecipesList');
const modalEditRecipe = document.getElementById('modalEditRecipe');
const modalShoppingList = document.getElementById('modalShoppingList');
const closeBtns = document.querySelectorAll('.close');
const tabBtns = document.querySelectorAll('.tab-btn');
const btnAddRecipeModal = document.getElementById('btnAddRecipeModal');

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

const btnCopyList = document.getElementById('btnCopyList');
const shoppingListContent = document.getElementById('shoppingListContent');

const btnManageTags = document.getElementById('btnManageTags');
const modalManageTags = document.getElementById('modalManageTags');
const tagNameInput = document.getElementById('tagName');
const tagCategorySelect = document.getElementById('tagCategory');
const btnSaveTag = document.getElementById('btnSaveTag');
const tagsListDiv = document.getElementById('tagsList');
const recipeTagsSelectDiv = document.getElementById('recipeTagsSelect');
const editRecipeTagsSelectDiv = document.getElementById('editRecipeTagsSelect');
const filterTagsSelectDiv = document.getElementById('filterTagsSelect');

let currentEditRecipeId = null;
let allRecipes = [];
let currentShoppingList = [];
let currentMealPlan = [];
let allTags = [];
let selectedRecipeTags = [];
let selectedEditRecipeTags = [];
let selectedFilterTags = [];

loadMealPlan();

btnGenerateWeek.addEventListener('click', generateNewWeek);
btnViewRecipes.addEventListener('click', showRecipesList);
btnShoppingList.addEventListener('click', showShoppingList);
btnManageTags.addEventListener('click', showManageTags);
btnAddRecipeModal.addEventListener('click', () => {
  closeModal(modalRecipesList);
  loadTagsForRecipeForm();
  openModal(modalAddRecipe);
});

closeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal(modalAddRecipe);
    closeModal(modalMealDetail);
    closeModal(modalRecipesList);
    closeModal(modalEditRecipe);
    closeModal(modalShoppingList);
    closeModal(modalManageTags);
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
btnCopyList.addEventListener('click', copyShoppingList);
btnSaveTag.addEventListener('click', saveTag);

searchRecipesInput.addEventListener('input', filterAndSortRecipes);
sortRecipesSelect.addEventListener('change', filterAndSortRecipes);

window.addEventListener('click', (e) => {
  if (e.target === modalAddRecipe) closeModal(modalAddRecipe);
  if (e.target === modalMealDetail) closeModal(modalMealDetail);
  if (e.target === modalRecipesList) closeModal(modalRecipesList);
  if (e.target === modalEditRecipe) closeModal(modalEditRecipe);
  if (e.target === modalShoppingList) closeModal(modalShoppingList);
  if (e.target === modalManageTags) closeModal(modalManageTags);
});

async function loadMealPlan() {
  try {
    const response = await fetch(`${API_URL}/meal-plan`);
    const data = await response.json();
    
    if (!data.meals || data.meals.length === 0) {
      mealPlanDiv.innerHTML = '<p class="loading">Žádný jídelníček. Vygeneruj nový!</p>';
      return;
    }
    
    currentMealPlan = data.meals;
    renderMealPlan(data.meals);
  } catch (error) {
    mealPlanDiv.innerHTML = `<p class="loading error">Chyba načítání: ${error.message}</p>`;
  }
}

async function generateNewWeek() {
  const hasLocked = currentMealPlan.some(m => m.locked);
  
  if (hasLocked) {
    if (!confirm('Opravdu chceš vygenerovat nový týden? Zamknutá jídla zůstanou.')) {
      return;
    }
  }
  
  btnGenerateWeek.disabled = true;
  btnGenerateWeek.textContent = 'Generuji...';
  
  try {
    const response = await fetch(`${API_URL}/meal-plan/generate`, {
      method: 'POST'
    });
    const data = await response.json();
    currentMealPlan = data.meals;
    renderMealPlan(data.meals);
  } catch (error) {
    alert('Chyba při generování: ' + error.message);
  } finally {
    btnGenerateWeek.disabled = false;
    btnGenerateWeek.textContent = 'Vygenerovat nový týden';
  }
}

async function toggleLock(mealIndex) {
  const meal = currentMealPlan[mealIndex];
  const newLockState = !meal.locked;
  
  try {
    const response = await fetch(`${API_URL}/meal-plan/lock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        mealIndex, 
        locked: newLockState 
      })
    });
    
    if (response.ok) {
      meal.locked = newLockState;
      renderMealPlan(currentMealPlan);
    }
  } catch (error) {
    alert('Chyba při zamykání: ' + error.message);
  }
}

async function unlockAll() {
  if (!confirm('Odemknout všechna jídla?')) {
    return;
  }
  
  try {
    for (let i = 0; i < currentMealPlan.length; i++) {
      if (currentMealPlan[i].locked) {
        await fetch(`${API_URL}/meal-plan/lock`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            mealIndex: i, 
            locked: false 
          })
        });
      }
    }
    
    await loadMealPlan();
  } catch (error) {
    alert('Chyba při odemykání: ' + error.message);
  }
}

async function regenerateMeal(mealIndex) {
  const meal = currentMealPlan[mealIndex];
  
  if (meal.locked) {
    alert('Toto jídlo je zamknuté. Nejdřív ho odemkni.');
    return;
  }
  
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

function renderMealPlan(meals) {
  const hasLocked = meals.some(m => m.locked);
  
  const unlockBtn = hasLocked 
    ? '<button class="btn btn-secondary btn-small unlock-all-btn" onclick="unlockAll()">🔓 Odemknout vše</button>'
    : '';
  
  const html = `
    <div style="margin-bottom: 20px; display: flex; align-items: center;">
      <div style="flex: 1;"></div>
      ${unlockBtn}
    </div>
    <div class="meal-grid">
      ${meals.map((meal, index) => {
        const dayLabel = index < 3 ? `${index + 1}. jídlo` : 'Alternativa';
        const lockedClass = meal.locked ? 'locked' : '';
        const lockIcon = meal.locked ? '🔒' : '🔓';
        const lockClass = meal.locked ? 'locked' : 'unlocked';
        
        return `
          <div class="meal-card ${lockedClass}">
            <h3>
              ${dayLabel}
              ${meal.locked ? '<span class="locked-badge">Zamknuto</span>' : ''}
            </h3>
            <h2>${meal.recipe.name}</h2>
            <div class="ingredients-preview">
              ${meal.recipe.ingredients.slice(0, 3).join(', ')}${meal.recipe.ingredients.length > 3 ? '...' : ''}
            </div>
            <div class="actions">
              <button class="btn btn-small btn-secondary" onclick="showMealDetail(${index})">
                Zobrazit detail
              </button>
              <span class="lock-icon ${lockClass}" onclick="toggleLock(${index})" title="${meal.locked ? 'Odemknout' : 'Zamknout'}">
                ${lockIcon}
              </span>
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
            <button class="btn btn-primary btn-small save-notes-btn" onclick="saveNotes(${meal.recipe.id}, event)">
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

async function saveNotes(recipeId, event) {
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
window.toggleLock = toggleLock;
window.unlockAll = unlockAll;

async function showShoppingList() {
  shoppingListContent.innerHTML = '<p class="loading">Načítám ingredience...</p>';
  openModal(modalShoppingList);
  
  try {
    const response = await fetch(`${API_URL}/meal-plan`);
    const data = await response.json();
    
    if (!data.meals || data.meals.length === 0) {
      shoppingListContent.innerHTML = `
        <div class="shopping-empty">
          <div class="shopping-empty-icon">📭</div>
          <div class="shopping-empty-text">Žádný jídelníček</div>
          <div class="empty-state-hint">Nejdřív vygeneruj týdenní plán</div>
        </div>
      `;
      return;
    }
    
    currentShoppingList = data.meals;
    renderShoppingList(data.meals);
  } catch (error) {
    shoppingListContent.innerHTML = `<p class="loading error">Chyba: ${error.message}</p>`;
  }
}

function renderShoppingList(meals) {
  const html = meals.map((meal, index) => {
    const dayLabel = index < 3 ? `${index + 1}. jídlo` : 'Alternativa';
    
    return `
      <div class="shopping-meal-section">
        <h3 class="shopping-meal-title">
          <span>${dayLabel}</span>
          <span style="color: #333; font-weight: normal;">— ${meal.recipe.name}</span>
          ${meal.locked ? '<span class="locked-badge">🔒 Zamknuto</span>' : ''}
        </h3>
        <ul class="shopping-ingredients">
          ${meal.recipe.ingredients.map((ingredient, ingIndex) => `
            <li class="shopping-item" id="item-${index}-${ingIndex}">
              <input 
                type="checkbox" 
                class="shopping-checkbox"
                onchange="toggleShoppingItem(${index}, ${ingIndex})"
              >
              <span class="shopping-item-text">${ingredient}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }).join('');
  
  shoppingListContent.innerHTML = html;
}

function toggleShoppingItem(mealIndex, ingredientIndex) {
  const item = document.getElementById(`item-${mealIndex}-${ingredientIndex}`);
  item.classList.toggle('checked');
}

async function copyShoppingList() {
  try {
    const response = await fetch(`${API_URL}/meal-plan`);
    const data = await response.json();
    
    if (!data.meals || data.meals.length === 0) {
      alert('Žádný jídelníček k zkopírování');
      return;
    }
    
    let text = '🛒 NÁKUPNÍ SEZNAM\n\n';
    
    data.meals.forEach((meal, index) => {
      const dayLabel = index < 3 ? `${index + 1}. jídlo` : 'Alternativa';
      text += `${dayLabel} — ${meal.recipe.name}\n`;
      meal.recipe.ingredients.forEach(ing => {
        text += `  • ${ing}\n`;
      });
      text += '\n';
    });
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        showCopySuccess();
        return;
      } catch (e) {}
    }
    
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      success = false;
    }
    
    document.body.removeChild(textarea);
    
    if (success) {
      showCopySuccess();
    } else {
      prompt('Zkopíruj tento text (Cmd+C):', text);
    }
  } catch (error) {
    alert('Chyba: ' + error.message);
  }
}

function showCopySuccess() {
  const notification = document.createElement('div');
  notification.className = 'copy-success';
  notification.textContent = '✓ Zkopírováno do schránky!';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
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

    // Ulož tagy, pokud byly vybrány
    if (selectedRecipeTags.length > 0) {
      await fetch(`${API_URL}/recipes/${data.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: selectedRecipeTags })
      });
    }

    alert('✓ Recept uložen!');

    recipeNameInput.value = '';
    recipeIngredientsInput.value = '';
    recipeInstructionsInput.value = '';
    selectedRecipeTags = [];

    closeModal(modalAddRecipe);
  } catch (error) {
    alert('Chyba: ' + error.message);
  }
}

async function showRecipesList() {
  recipesListDiv.innerHTML = '<p class="loading">Načítám recepty...</p>';
  openModal(modalRecipesList);

  // Načti tagy pro filtrování
  await loadTagsForFilter();

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

  let filtered = allRecipes.filter(recipe => {
    // Filtr podle textu
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm);

    // Filtr podle tagů
    let matchesTags = true;
    if (selectedFilterTags.length > 0) {
      const recipeTagIds = (recipe.tags || []).map(t => t.id);
      matchesTags = selectedFilterTags.every(tagId => recipeTagIds.includes(tagId));
    }

    return matchesSearch && matchesTags;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'name') {
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
      </div>
      ${recipe.tags && recipe.tags.length > 0 ? `
        <div class="recipe-tags">
          ${recipe.tags.map(tag => `
            <span class="tag tag-${tag.category}">${tag.name}</span>
          `).join('')}
        </div>
      ` : ''}
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
          <button class="btn btn-primary btn-small save-notes-btn" onclick="saveNotes(${recipe.id}, event)">
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

    // Načti tagy pro tento recept
    selectedEditRecipeTags = recipe.tags ? recipe.tags.map(t => t.id) : [];
    await loadTagsForEditForm();

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
      // Aktualizuj tagy
      await fetch(`${API_URL}/recipes/${currentEditRecipeId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: selectedEditRecipeTags })
      });

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

// === SPRÁVA TAGŮ ===

async function showManageTags() {
  tagsListDiv.innerHTML = '<p class="loading">Načítám štítky...</p>';
  openModal(modalManageTags);

  await loadTags();
  renderTagsList();
}

async function loadTags() {
  try {
    const response = await fetch(`${API_URL}/tags`);
    allTags = await response.json();
  } catch (error) {
    console.error('Chyba načítání tagů:', error);
    allTags = [];
  }
}

function renderTagsList() {
  if (allTags.length === 0) {
    tagsListDiv.innerHTML = '<p class="empty-state">Zatím žádné štítky</p>';
    return;
  }

  const groupedTags = {
    type: allTags.filter(t => t.category === 'type'),
    time: allTags.filter(t => t.category === 'time')
  };

  const html = `
    <div class="tags-groups">
      <div class="tag-group">
        <h4>Typ jídla</h4>
        <div class="tags-container">
          ${groupedTags.type.map(tag => `
            <div class="tag-item">
              <span class="tag tag-type">${tag.name}</span>
              <button class="btn-icon-small" onclick="deleteTag(${tag.id}, '${tag.name}')" title="Smazat">❌</button>
            </div>
          `).join('')}
          ${groupedTags.type.length === 0 ? '<p class="empty-state-small">Žádné štítky</p>' : ''}
        </div>
      </div>

      <div class="tag-group">
        <h4>Časová náročnost</h4>
        <div class="tags-container">
          ${groupedTags.time.map(tag => `
            <div class="tag-item">
              <span class="tag tag-time">${tag.name}</span>
              <button class="btn-icon-small" onclick="deleteTag(${tag.id}, '${tag.name}')" title="Smazat">❌</button>
            </div>
          `).join('')}
          ${groupedTags.time.length === 0 ? '<p class="empty-state-small">Žádné štítky</p>' : ''}
        </div>
      </div>
    </div>
  `;

  tagsListDiv.innerHTML = html;
}

async function saveTag() {
  const name = tagNameInput.value.trim();
  const category = tagCategorySelect.value;

  if (!name || !category) {
    alert('Vyplň název i kategorii');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category })
    });

    const data = await response.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    alert('✓ Štítek přidán!');
    tagNameInput.value = '';
    tagCategorySelect.value = '';

    await loadTags();
    renderTagsList();
  } catch (error) {
    alert('Chyba: ' + error.message);
  }
}

async function deleteTag(tagId, tagName) {
  if (!confirm(`Opravdu chceš smazat štítek "${tagName}"?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/tags/${tagId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('✓ Štítek smazán!');
      await loadTags();
      renderTagsList();
    } else {
      alert('Chyba při mazání štítku');
    }
  } catch (error) {
    alert('Chyba: ' + error.message);
  }
}

// === TAGY PRO RECEPTY ===

async function loadTagsForRecipeForm() {
  await loadTags();
  selectedRecipeTags = [];
  renderTagsCheckboxes(recipeTagsSelectDiv, selectedRecipeTags, 'toggleRecipeTag');
}

async function loadTagsForEditForm() {
  await loadTags();
  renderTagsCheckboxes(editRecipeTagsSelectDiv, selectedEditRecipeTags, 'toggleEditRecipeTag');
}

async function loadTagsForFilter() {
  await loadTags();
  renderTagsCheckboxes(filterTagsSelectDiv, selectedFilterTags, 'toggleFilterTag');
}

function renderTagsCheckboxes(container, selectedTags, toggleFunction) {
  if (allTags.length === 0) {
    container.innerHTML = '<p class="empty-state-small">Zatím žádné štítky. Vytvoř je v Správě štítků.</p>';
    return;
  }

  const groupedTags = {
    type: allTags.filter(t => t.category === 'type'),
    time: allTags.filter(t => t.category === 'time')
  };

  const html = `
    <div class="tags-select-groups">
      ${groupedTags.type.length > 0 ? `
        <div class="tag-select-group">
          <h5>Typ jídla</h5>
          <div class="tags-checkboxes">
            ${groupedTags.type.map(tag => `
              <label class="tag-checkbox">
                <input type="checkbox"
                  value="${tag.id}"
                  ${selectedTags.includes(tag.id) ? 'checked' : ''}
                  onchange="${toggleFunction}(${tag.id})">
                <span class="tag tag-type">${tag.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${groupedTags.time.length > 0 ? `
        <div class="tag-select-group">
          <h5>Časová náročnost</h5>
          <div class="tags-checkboxes">
            ${groupedTags.time.map(tag => `
              <label class="tag-checkbox">
                <input type="checkbox"
                  value="${tag.id}"
                  ${selectedTags.includes(tag.id) ? 'checked' : ''}
                  onchange="${toggleFunction}(${tag.id})">
                <span class="tag tag-time">${tag.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;
}

function toggleRecipeTag(tagId) {
  const index = selectedRecipeTags.indexOf(tagId);
  if (index > -1) {
    selectedRecipeTags.splice(index, 1);
  } else {
    selectedRecipeTags.push(tagId);
  }
}

function toggleEditRecipeTag(tagId) {
  const index = selectedEditRecipeTags.indexOf(tagId);
  if (index > -1) {
    selectedEditRecipeTags.splice(index, 1);
  } else {
    selectedEditRecipeTags.push(tagId);
  }
}

function toggleFilterTag(tagId) {
  const index = selectedFilterTags.indexOf(tagId);
  if (index > -1) {
    selectedFilterTags.splice(index, 1);
  } else {
    selectedFilterTags.push(tagId);
  }
  filterAndSortRecipes();
}

window.showRecipeDetail = showRecipeDetail;
window.editRecipe = editRecipe;
window.deleteRecipe = deleteRecipe;
window.toggleShoppingItem = toggleShoppingItem;
window.deleteTag = deleteTag;
window.toggleRecipeTag = toggleRecipeTag;
window.toggleEditRecipeTag = toggleEditRecipeTag;
window.toggleFilterTag = toggleFilterTag;
