var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function BufferedMessageChannel() {
    var self = this;

    EventEmitter.call(this);
    this.logChannels = {};
    this.on('newListener', function (channelId) {
        // send all buffered
        process.nextTick(function () {
            self.emit(channelId, self.messagesOf(channelId));
        });
    });
    this.on('removeListener', function (channelId) {
        if (!self.listeners(channelId).length) {
            self.close(channelId);
        }
    });
}

util.inherits(BufferedMessageChannel, EventEmitter);

BufferedMessageChannel.prototype.addTo = function (channelId, message) {
    this.logChannels[channelId].push(message);
    if (this.listeners(channelId).length) {
        // send all incoming messages
        this.emit(channelId, [message]);
    }
};

BufferedMessageChannel.prototype.reset = function (channelId) {
    return this.logChannels[channelId] = [];
};

BufferedMessageChannel.prototype.close = function (channelId) {
    delete this.logChannels[channelId];
};

BufferedMessageChannel.prototype.messagesOf = function (channelId) {
    return this.logChannels[channelId] || [];
};

module.exports = BufferedMessageChannel;
