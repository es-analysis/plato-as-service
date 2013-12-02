// Ugly hack...
if (typeof setImmediate !== 'undefined') {
    var nt = process.nextTick;
    delete process.nextTick;
    process.nextTick = setImmediate;
}

var express = require('express'),
    router = require('./router'),
    Limiter = require('../lib/limiter'),
    http = require('http');

/**
 * @param {Object} [reportSettings]
 * @param {String} [reportSettings.badgeService]
 * @param {String} [reportSettings.hostname]
 * @param {String} [reportSettings.reports]
 * @param {String} [reportSettings.maxConcurrent]
 * @param {String} [reportSettings.maxConcurrentQueue]
 * @param {Number} [reportSettings.ttl]
 * @returns {express}
 */
module.exports = function (reportSettings) {
    var app = express();

    var server = require('http').createServer(app);

    var io = require('socket.io').listen(server, {
        log: app.get('env') === 'development'
    });

    app.locals({
        reportSettings: reportSettings,
        requestQueue: new Limiter(reportSettings.maxConcurrent, reportSettings.maxConcurrentQueue)
    });

    app.configure('development', function(){
        app.use(express.errorHandler());
        app.use(express.logger('dev'));
    });

    router(app, io);

    return server;
};
