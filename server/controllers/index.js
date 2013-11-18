var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    vow = require('vow'),
    Route = require('susanin').Route,
    isReportFresh = require('../../lib/report').isFresh,
    cachedReport = require('../../lib/cachedReport');

var REPORT_TTL = 60 * 15 * 1000;

var serviceRoute = new Route({
    pattern: '/<user>/<repo>/<branch>/',
    defaults: {
        branch: 'master'
    }
});

exports.index = function (req, res, next) {
    isReportFresh(req.params, REPORT_TTL)
        .then(function (isFresh) {
            if (isFresh) {
                return;
            }
            return cachedReport(req.params);
        })
        .progress(console.log)
        .fail(next)
        .then(function () {
            next();
        });
};

exports.redirectToMaster = function (req, res) {
    res.redirect(serviceRoute.build(req.params));
};

exports.usage = function (req, res) {
    var example = serviceRoute.build({
        user: 'azproduction',
        repo: 'plato-as-service'
    });

    var usage = serviceRoute.build({
        user: 'user',
        repo: 'repo',
        branch: 'branch'
    });

    var html = util.format('<pre>Usage %s Example <a href="%s">%s</a>', usage, example, example);

    res.send(html);
};
