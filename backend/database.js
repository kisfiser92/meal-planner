const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.sqlite');
let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      instructions TEXT NOT NULL,
      source TEXT,
      tags TEXT,
      rating INTEGER DEFAULT 0,
      notes TEXT DEFAULT "",
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start DATE NOT NULL,
      meals TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipe_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER,
      used_at DATE,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    );
  `);
  
  saveDatabase();
  console.log('Databáze inicializována');
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function runSQL(sql, params = []) {
  if (!db) throw new Error('Databáze není inicializována');
  const result = db.run(sql, params);
  saveDatabase();
  return result;
}

function querySQL(sql, params = []) {
  if (!db) throw new Error('Databáze není inicializována');
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOneSQL(sql, params = []) {
  const results = querySQL(sql, params);
  return results.length > 0 ? results[0] : null;
}

const recipeDb = {
  getAll: () => {
    return querySQL('SELECT * FROM recipes ORDER BY created_at DESC');
  },

  getById: (id) => {
    return queryOneSQL('SELECT * FROM recipes WHERE id = ?', [id]);
  },

  create: (recipe) => {
    runSQL(
      `INSERT INTO recipes (name, ingredients, instructions, source, tags, rating, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        recipe.name,
        JSON.stringify(recipe.ingredients),
        recipe.instructions,
        recipe.source || null,
        JSON.stringify(recipe.tags || []),
        recipe.rating || 0,
        recipe.notes || ''
      ]
    );
    const result = queryOneSQL('SELECT last_insert_rowid() as id');
    return result.id;
  },

  update: (id, recipe) => {
    runSQL(
      `UPDATE recipes 
       SET name = ?, ingredients = ?, instructions = ?, source = ?, tags = ?, rating = ?, notes = ?
       WHERE id = ?`,
      [
        recipe.name,
        JSON.stringify(recipe.ingredients),
        recipe.instructions,
        recipe.source || null,
        JSON.stringify(recipe.tags || []),
        recipe.rating || 0,
        recipe.notes || '',
        id
      ]
    );
  },

  updateRating: (id, rating) => {
    runSQL('UPDATE recipes SET rating = ? WHERE id = ?', [rating, id]);
  },

  updateNotes: (id, notes) => {
    runSQL('UPDATE recipes SET notes = ? WHERE id = ?', [notes, id]);
  },

  delete: (id) => {
    runSQL('DELETE FROM recipes WHERE id = ?', [id]);
  }
};

const mealPlanDb = {
  getCurrent: () => {
    const monday = getMonday(new Date());
    return queryOneSQL('SELECT * FROM meal_plans WHERE week_start = ?', [monday]);
  },

  create: (weekStart, meals) => {
    runSQL(
      'INSERT INTO meal_plans (week_start, meals) VALUES (?, ?)',
      [weekStart, JSON.stringify(meals)]
    );
  },

  update: (weekStart, meals) => {
    runSQL(
      'UPDATE meal_plans SET meals = ? WHERE week_start = ?',
      [JSON.stringify(meals), weekStart]
    );
  }
};

const historyDb = {
  add: (recipeId, date) => {
    runSQL(
      'INSERT INTO recipe_history (recipe_id, used_at) VALUES (?, ?)',
      [recipeId, date]
    );
  },

  getRecent: (weeks = 4) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));
    return querySQL(
      `SELECT recipe_id, COUNT(*) as count
       FROM recipe_history
       WHERE used_at >= ?
       GROUP BY recipe_id
       ORDER BY count DESC`,
      [cutoffDate.toISOString().split('T')[0]]
    );
  }
};

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

module.exports = {
  initDatabase,
  recipeDb,
  mealPlanDb,
  historyDb,
  getMonday
};

if (require.main === module) {
  initDatabase().then(() => {
    console.log('Databáze připravena!');
    process.exit(0);
  });
}
