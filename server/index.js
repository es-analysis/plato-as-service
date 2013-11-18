// Ugly hack...
if (typeof setImmediate !== 'undefined') {
    var nt = process.nextTick;
    delete process.nextTick;
    process.nextTick = setImmediate;
}

var express = require('express'),
    router = require('./router'),
    http = require('http');

/**
 * @param {Object} [reportSettings]
 * @param {String} [reportSettings.hostname]
 * @param {String} [reportSettings.reports]
 * @param {Number} [reportSettings.ttl]
 * @returns {express}
 */
module.exports = function (reportSettings) {
    var app = express();

    app.locals({
        reportSettings: reportSettings
    });

    app.configure(function () {
        app.use(express.logger('dev'));
    });

    app.configure('development', function(){
        app.use(express.errorHandler());
    });

    router(app);
    return app;
};
