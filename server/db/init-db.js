const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');

function initDb() {
  const db = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  db.exec(schemaSql);
  console.log('Database schema initialized successfully.');
}

if (require.main === module) {
  initDb();
}

module.exports = { initDb };
