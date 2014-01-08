
/*
 * GET users listing.
 */

exports.create = function(req, res) {
  res.send("TODO: implement");
};

exports.list = function(req, res) {
  res.render('room');
};

exports.get = function(req, res) {
  game = { name: req.params.name };
  res.render('game', { game: game });
};

exports.onConnect = function (socket) {
  socket.emit('ping', {data: 'ping'});
  socket.on('pong', function (data) {
    console.log(data);
  });
};

