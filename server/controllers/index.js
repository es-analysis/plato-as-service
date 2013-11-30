var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    vow = require('vow'),
    routes = require('../routes'),
    ReportGenerator = require('../../lib/report'),
    BufferedMessageChannel = require('../../lib/bufferedMessageChannel');

var serviceRoute = routes.serviceRoute;
var serviceBadgeRoute = routes.serviceBadgeRoute;

var indexView = fs.readFileSync(__dirname + '/../views/index.html', 'utf8');

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
        isPending = reportGenerator.isPending();

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
            res.send(indexView);
            return reportGenerator.create().then(function () {
                return isFresh;
            });
        });

    if (!isPending) {
        promise = promise.progress(function (text) {
            messages.addTo(channelId, {type: 'log', text: text});
        })
        .fail(function (error) {
            messages.addTo(channelId, {type: 'log', text: error && error.stack ? error.stack : error + ''});
            messages.addTo(channelId, {type: 'error'});
            throw error;
        });
    }

    promise = promise.fail(function (error) {
        next();
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
        badgeName = req.params.badge;

    reportGenerator.isFreshBadge(badgeName)
        .then(function (isFresh) {
            if (isFresh) {
                return isFresh;
            }
            // badge is not fresh, user have to wait, return default badge
            res.type('png').send(badgeImages[badgeName]);
            return reportGenerator.createBadge(badgeName).then(function () {
                return isFresh;
            });
        })
        .then(function (isFresh) {
            if (isFresh) {
                next();
            }
        }, next);
};

exports.redirectToMaster = function (req, res) {
    var router = req.params.badge? serviceBadgeRoute : serviceRoute;
    res.redirect(router.build(req.params));
};

exports.usage = function (req, res) {
    var html = '', example, usage;

    html += '<div style="height: 100%;text-align: center;">';
    html += '<ul style="display: inline-block;vertical-align: middle;text-align: left;">';

    example = serviceRoute.build({
        user: 'azproduction',
        repo: 'plato-as-service'
    });

    usage = serviceRoute.build({
        user: '%github-user%',
        repo: '%repo%',
        branch: '%branch%'
    });

    html += util.format('<li><pre>Plato report %s<br>Example <a href="%s">%s</a></pre></li>', usage, example, example);

    example = serviceBadgeRoute.build({
        user: 'azproduction',
        repo: 'plato-as-service',
        badge: 'maintainability'
    });

    usage = serviceBadgeRoute.build({
        user: '%github-user%',
        repo: '%repo%',
        branch: '%branch%',
        badge: 'maintainability'
    });

    html += util.format('<li><pre>Maintainability badge %s<br>Example <a href="%s">%s</a><br><img src="%s"/></pre></li>', usage, example, example, example);

    example = serviceBadgeRoute.build({
        user: 'azproduction',
        repo: 'plato-as-service',
        badge: 'sloc'
    });

    usage = serviceBadgeRoute.build({
        user: '%github-user%',
        repo: '%repo%',
        branch: '%branch%',
        badge: 'sloc'
    });

    html += util.format('<li><pre>Sloc badge %s<br>Example <a href="%s">%s</a><br><img src="%s"/></pre></li>', usage, example, example, example);

    html += '</ul>';
    html += '<div style="display: inline-block;width: 0;height: 100%;vertical-align: middle;"></div>';
    html += '</div>';

    res.send(html);
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

