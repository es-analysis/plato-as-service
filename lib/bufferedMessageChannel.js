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
}

util.inherits(BufferedMessageChannel, EventEmitter);

BufferedMessageChannel.prototype.addTo = function (channelId, message) {
    this.logChannels[channelId].push(message);
    if (this.listeners(channelId).length) {
        // send all incoming messages
        this.emit(channelId, this.messagesOf(channelId));
    }
};

BufferedMessageChannel.prototype.reset = function (channelId) {
    return this.logChannels[channelId] = [];
};

BufferedMessageChannel.prototype.messagesOf = function (channelId) {
    var list = this.logChannels[channelId] || [];
    this.reset(channelId); // clean
    return list;
};

module.exports = BufferedMessageChannel;
