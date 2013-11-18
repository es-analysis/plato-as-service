var createReport = require('./report').createReportFor;

var pendingRequests = {};

module.exports = function (options) {
    var key = [options.user, options.repo, options.branch].join('/'),
        pendingRequest = pendingRequests[key];

    if (pendingRequest) {
        return pendingRequest;
    }

    pendingRequest = createReport(options);

    pendingRequest.always(function () {
        delete pendingRequests[key];
    });

    return pendingRequests[key] = pendingRequest;
};
