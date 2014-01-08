
/*
 * GET users listing.
 */

exports.create = function(req, res) {
  res.send("TODO: implement");
};

exports.list = function(req, res) {
  res.send("TODO: implement");
};

exports.get = function(req, res) {
  res.send("TODO: implement");
};

exports.onConnect = function (socket) {
  socket.emit('ping', {data: 'ping'});
  socket.on('pong', function (data) {
    console.log(data);
  });
};

