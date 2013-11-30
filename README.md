# plato-as-service

Web-Service for plato - JavaScript source code visualization, static analysis, and complexity tool. 

## Important

Node.js 0.10.x is required to run `plato-as-service` due to Streams2 issues.

## Installation

`plato-as-service` can be installed using `npm`:

```
npm install plato-as-service
```

## Run

```js
var server = require('plato-as-service');

server({
    hostname: 'github.com',
    badgeService: 'img.shields.io',
    reports: __dirname + '/reports',
    ttl: 60 * 15 * 1000
}).listen(8080);
```

![](http://habrastorage.org/storage3/19c/0f8/a91/19c0f8a911a6dceb63ed0e83077ad3c7.png)

## Url format

```
/you/your-repo/master/
/you/your-repo/master/sloc.png
/you/your-repo/master/maintainability.png
```

This [video](https://vimeo.com/79814043) shows the work of plato-as-service.
