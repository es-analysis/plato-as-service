var vow = require('vow');

/**
 * Acts as vow.all, but also forwards notifications
 * @param {Promise[]} promises
 * @return {Promise}
 */
module.exports = function (promises) {
    var masterPromise = vow.all(promises);

    // pipe all notifications to master promise
    promises.forEach(function (promise) {
        promise.progress(masterPromise.notify, masterPromise);
    });

    return masterPromise;
};
