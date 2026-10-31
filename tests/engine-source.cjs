// Izvor motora za testove: pitanja (data/questions.js) + engine.js, kao da su učitani jedno za drugim.
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
module.exports = fs.readFileSync(path.join(root, 'data', 'questions.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
