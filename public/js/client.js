var socket = io.connect('http://localhost:3000');
socket.on('ping', function(data) {
  console.log(data);
  socket.emit('pong', {data: "pong"});
});
