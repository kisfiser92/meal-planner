const API_URL = 'http://localhost:3000/api';

// === DOM Elements ===
const mealPlanDiv = document.getElementById('mealPlan');
const btnGenerateWeek = document.getElementById('btnGenerateWeek');
const btnAddRecipe = document.getElementById('btnAddRecipe');
const modalAddRecipe = document.getElementById('modalAddRecipe');
const modalMealDetail = document.getElementById('modalMealDetail');
const closeBtns = document.querySelectorAll('.close');
const tabBtns = document.querySelectorAll('.tab-btn');

// Import elementy
const btnImportUrl = document.getElementById('btnImportUrl');
const recipeUrlInput = document.getElementById('recipeUrl');
const importStatus = document.getElementById('importStatus');

// Manuální elementy
const btnSaveManual = document.getElementById('btnSaveManual');
const recipeNameInput = document.getElementById('recipeName');
const recipeIngredientsInput = document.getElementById('recipeIngredients');
const recipeInstructionsInput = document.getElementById('recipeInstructions');

// === Inicializace ===
loadMealPlan();

// === Event Listeners ===
btnGenerateWeek.addEventListener('click', generateNewWeek);
btnAddRecipe.addEventListener('click', () => openModal(modalAddRecipe));

closeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    closeModal(modalAddRecipe);
    closeModal(modalMealDetail);
  });
});

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    switchTab(tabName);
  });
});

// Import z URL
btnImportUrl.addEventListener('click', importFromUrl);

// Manuální uložení
btnSaveManual.addEventListener('click', saveManualRecipe);

// Zavření modalu kliknutím mimo
window.addEventListener('click', (e) => {
  if (e.target === modalAddRecipe) closeModal(modalAddRecipe);
  if (e.target === modalMealDetail) closeModal(modalMealDetail);
});

// === API Funkce ===
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
    
    // Refresh celý plán
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
    
    // Reset formuláře
    recipeNameInput.value = '';
    recipeIngredientsInput.value = '';
    recipeInstructionsInput.value = '';
    
    closeModal(modalAddRecipe);
  } catch (error) {
    alert('Chyba: ' + error.message);
  }
}

// === UI Funkce ===
function renderMealPlan(meals) {
  const html = `
    <div class="meal-grid">
      ${meals.map((meal, index) => `
        <div class="meal-card">
          <h3>${meal.day}</h3>
          <h2>${meal.recipe.name}</h2>
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
      `).join('')}
    </div>
  `;
  
  mealPlanDiv.innerHTML = html;
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
          
          ${meal.recipe.source ? `<p style="margin-top: 20px; font-size: 13px; color: #999;">Zdroj: ${meal.recipe.source}</p>` : ''}
        </div>
      `;
      
      document.getElementById('mealDetailContent').innerHTML = html;
      openModal(modalMealDetail);
    });
}

function switchTab(tabName) {
  // Deaktivuj všechny
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // Aktivuj vybranou
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

// Zpřístupni funkce globálně pro inline handlers
window.showMealDetail = showMealDetail;
window.regenerateMeal = regenerateMeal;