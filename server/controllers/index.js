var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    vow = require('vow'),
    routes = require('../routes'),
    ReportGenerator = require('../../lib/report'),
    BufferedMessageChannel = require('../../lib/bufferedMessageChannel');

var serviceRoute = routes.serviceRoute;
var serviceBadgeRoute = routes.serviceBadgeRoute;

// Cache html files
var views = ['index', 'progress']
    .reduce(function (views, view) {
        views[view] = fs.readFileSync(__dirname + '/../views/' + view + '.html', 'utf8');
        return views;
    }, {});

// Cache default badges
var badgeImages = Object.keys(ReportGenerator.AVAILABLE_BADGES)
    .reduce(function (badgeImages, badgeName) {
        badgeImages[badgeName] = fs.readFileSync(__dirname + '/../badges/' +  badgeName + '.png');
        return badgeImages;
    }, {});

var messages = new BufferedMessageChannel();

exports.index = function (req, res, next) {
    var reportGenerator = new ReportGenerator(res.app.locals.reportSettings, req.params),
        channelId = reportGenerator.cacheKey(),
        isPending = reportGenerator.isPending(),
        requestQueue = res.app.locals.requestQueue;

    if (!isPending) {
        // create blank message channel
        messages.reset(channelId);
        messages.addTo(channelId, {type: 'log', text: 'Generating report for ' + channelId + ' on ' + new Date()});
    }

    var promise = reportGenerator.isFresh()
        .then(function (isFresh) {
            if (isFresh) {
                return isFresh;
            }
            // report is not fresh, user have to wait, and watch some logs
            res.send(views.progress);
            return requestQueue.add(function () {
                return reportGenerator.create();
            })
            .then(function () {
                return isFresh;
            });
        });

    if (!isPending) {
        promise = promise.progress(function (text) {
            messages.addTo(channelId, {type: 'log', text: text});
        })
        .fail(function (error) {
            var text = error && error.stack ? error.stack : error;
            messages.addTo(channelId, {type: 'log', text: text});
            messages.addTo(channelId, {type: 'error'});
            throw error;
        });
    }

    promise = promise.fail(function (error) {
        if (!res.headerSent) {
            next(error);
        }
        throw error;
    })
    .then(function (isFresh) {
        if (isFresh) {
            next();
        }
    });

    if (!isPending) {
        promise.then(function () {
            messages.addTo(channelId, {type: 'log', text: 'Ready'});
            messages.addTo(channelId, {type: 'ready'});
        });
    }
};

exports.badgeCreate = function (req, res, next) {
    var reportGenerator = new ReportGenerator(res.app.locals.reportSettings, req.params),
        badgeName = req.params.badge,
        requestQueue = res.app.locals.requestQueue;

    reportGenerator.isFreshBadge(badgeName)
        .then(function (isFresh) {
            if (isFresh) {
                return isFresh;
            }
            // badge is not fresh, user have to wait, return default badge
            res.type('png').send(badgeImages[badgeName]);
            return requestQueue.add(function () {
                return reportGenerator.createBadge(badgeName);
            })
            .then(function () {
                return isFresh;
            });
        })
        .then(function (isFresh) {
            if (isFresh) {
                next();
            }
        }, function (error) {
            if (!res.headerSent) {
                next(error);
            }
        });
};

exports.redirectToMaster = function (req, res) {
    var router = req.params.badge ? serviceBadgeRoute : serviceRoute;
    res.redirect(router.build(req.params));
};

exports.usage = function (req, res) {
    res.send(views.index);
};

exports.streamLog = function (socket) {
    function forwardMessages(messages) {
        if (!messages.length) {
            return;
        }
        socket.emit('progress', messages);
    }

    socket.on('join', function (channelId) {
        socket.on('disconnect', function () {
            messages.removeListener(channelId, forwardMessages);
        });
        messages.addListener(channelId, forwardMessages);
    });
};
