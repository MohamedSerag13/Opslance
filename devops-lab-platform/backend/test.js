const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, 'super_secret_jwt_key', { expiresIn: '24h' });
console.log(token);
