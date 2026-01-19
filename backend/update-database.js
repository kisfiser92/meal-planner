const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.sqlite');

async function updateDatabase() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  try {
    db.run('ALTER TABLE recipes ADD COLUMN rating INTEGER DEFAULT 0');
    console.log('✅ Přidáno pole: rating');
  } catch (e) {
    console.log('⚠️  Pole rating už existuje');
  }

  try {
    db.run('ALTER TABLE recipes ADD COLUMN notes TEXT DEFAULT ""');
    console.log('✅ Přidáno pole: notes');
  } catch (e) {
    console.log('⚠️  Pole notes už existuje');
  }

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('✅ Databáze aktualizována!');
}

updateDatabase();
