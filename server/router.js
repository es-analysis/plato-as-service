var express = require('express'),
    indexController = require('./controllers/index');

module.exports = function (app, io) {
    // Usage
    app.get('/', indexController.usage);

    // Redirects
    app.get('/:user/:repo/', indexController.redirectToMaster);
    app.get('/:user/:repo/:badge.png', indexController.redirectToMaster);

    // Generators
    app.get('/:user/:repo/:branch/', indexController.index);
    app.get('/:user/:repo/:branch/:badge.png', indexController.badgeCreate);

    // Bower Components and static documents
    app.get('/*', express.static(__dirname + '/../www/'));

    // Static
    app.get('*', express.static(app.locals.reportSettings.reports || __dirname + '/../reports'));

    // Default action - 404
    app.get('*', function (req, res) {
        res.send(404);
    });

    // socket.io
    io.sockets.on('connection', indexController.streamLog);
};
