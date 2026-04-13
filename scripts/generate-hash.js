// Run with: node scripts/generate-hash.js
const bcrypt = require('bcryptjs');

const password = 'Admin123!';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nSQL to update user:');
console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@stocka.app';`);
