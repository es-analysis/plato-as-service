/**
 * Notifies promise in next tick
 *
 * @param {Promise} promise
 * @param {String}  message
 */
module.exports = function (promise, message) {
    process.nextTick(function () {
        promise.notify(message);
    });
};
