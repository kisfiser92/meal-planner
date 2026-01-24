const { initDatabase, tagDb } = require('./database');

const defaultTags = [
  // Typ jídla
  { name: 'Vegetariánské', category: 'type' },
  { name: 'Kuřecí', category: 'type' },
  { name: 'Vepřové', category: 'type' },
  { name: 'Hovězí', category: 'type' },
  { name: 'Ryby', category: 'type' },
  { name: 'Těstoviny', category: 'type' },
  { name: 'Polévka', category: 'type' },
  { name: 'Saláty', category: 'type' },
  { name: 'Veganské', category: 'type' },

  // Časová náročnost
  { name: 'Rychlé (do 30 min)', category: 'time' },
  { name: 'Střední (30-60 min)', category: 'time' },
  { name: 'Náročné (nad 60 min)', category: 'time' }
];

async function addDefaultTags() {
  await initDatabase();

  console.log('Přidávám základní tagy...');

  for (const tag of defaultTags) {
    try {
      const id = tagDb.create(tag.name, tag.category);
      console.log(`✓ Přidán tag: ${tag.name} (${tag.category}) - ID: ${id}`);
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        console.log(`⚠ Tag "${tag.name}" již existuje, přeskakuji...`);
      } else {
        console.error(`✗ Chyba při přidávání tagu "${tag.name}":`, error.message);
      }
    }
  }

  console.log('\n✓ Hotovo! Základní tagy byly přidány.');

  // Zobraz všechny tagy
  const allTags = tagDb.getAll();
  console.log('\nVšechny tagy v databázi:');
  console.log('========================');

  const groupedTags = {
    type: allTags.filter(t => t.category === 'type'),
    time: allTags.filter(t => t.category === 'time')
  };

  console.log('\nTyp jídla:');
  groupedTags.type.forEach(t => console.log(`  - ${t.name}`));

  console.log('\nČasová náročnost:');
  groupedTags.time.forEach(t => console.log(`  - ${t.name}`));

  process.exit(0);
}

addDefaultTags();
