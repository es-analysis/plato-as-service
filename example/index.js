var server = require('../server'),
    path = require('path');

server({
    hostname: 'github.com',
    reports: path.join(__dirname, '..', 'reports'),
    ttl: 60 * 15 * 1000
}).listen(8080);

console.log('localhost:8080');
