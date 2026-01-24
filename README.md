# Rodinný jídelníček

Lokální aplikace pro plánování rodinných jídel s receptami, jídelníčkem a nákupním seznamem.

## Funkce

- 📖 Správa receptů s hodnocením a poznámkami
- 📅 Týdenní jídelníček s možností zamykání jídel
- 🛒 Automatický nákupní seznam
- 🔍 Vyhledávání a třídění receptů
- 🌐 Import receptů z webových stránek
- 💾 Lokální úložiště dat (žádné cloudové služby)

## Jak spustit projekt

### Požadavky

- [Node.js](https://nodejs.org/) verze 14 nebo novější
- npm (instaluje se automaticky s Node.js)

### Instalace

1. **Naklonujte repozitář** (nebo stáhněte ZIP):
```bash
git clone <url-repozitare>
cd meal-planner
```

2. **Nainstalujte závislosti**:
```bash
npm install
```

3. **Inicializujte databázi** (volitelné - databáze se vytvoří automaticky při prvním spuštění):
```bash
npm run init-db
```

### Spuštění aplikace

```bash
npm start
```

Server se spustí na adrese **http://localhost:3000**

Otevřete webový prohlížeč a přejděte na:
```
http://localhost:3000
```

### Volitelné: API klíč pro import receptů

Pro pokročilý import receptů z webových stránek můžete nastavit Claude API klíč:

```bash
export CLAUDE_API_KEY=váš-api-klíč
npm start
```

**Poznámka:** Aplikace funguje i bez API klíče, základní import receptů zůstává funkční.

## Struktura projektu

```
meal-planner/
├── backend/           # Backend API server
│   ├── server.js      # Express server
│   ├── database.js    # Správa databází (SQL.js)
│   ├── generator.js   # Generátor jídelníčků
│   └── scraper.js     # Import receptů z webu
├── frontend/          # Frontend aplikace
│   ├── index.html     # Hlavní HTML
│   ├── app.js         # JavaScriptová logika
│   └── style.css      # Styly
└── package.json       # Závislosti projektu
```

## Použité technologie

- **Backend:** Node.js, Express, SQL.js
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Databáze:** SQLite (přes SQL.js)
