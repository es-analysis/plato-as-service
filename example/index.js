var server = require('../server'),
    path = require('path');

server({
    hostname: 'github.com',
    badgeService: 'img.shields.io',
    maxConcurrent: 50,
    maxConcurrentQueue: Infinity,
    reports: path.join(__dirname, '..', 'reports'),
    ttl: 60 * 15 * 1000
}).listen(8080);

console.log('localhost:8080');
