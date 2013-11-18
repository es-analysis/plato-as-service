var express = require('express'),
    indexController = require('./controllers/index');

module.exports = function (app) {
    app.get('/', indexController.usage);
    app.get('/:user/:repo/', indexController.redirectToMaster);
    app.get('/:user/:repo/:branch/', indexController.index);
    app.get('*', express.static(app.locals.reportSettings.reports || __dirname + '/../reports'));
    app.get('*', function (req, res) {
        res.send(404);
    });
};
