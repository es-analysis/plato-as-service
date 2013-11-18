# plato-as-service

Web-Service for plato - JavaScript source code visualization, static analysis, and complexity tool

## Important

Node.js 0.10.x is required to run `plato-as-service` due to Streams2 issues.

## Installation

`plato-as-service` can be installed using `npm`:

```
npm install plato-as-service
```

## Run

```
var server = require('plato-as-service');

server({
    hostname: 'github.com',
    reports: __dirname + '/reports',
    ttl: 60 * 15 * 1000
}).listen(8080);
```
