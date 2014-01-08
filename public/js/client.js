/*
 * Code on client only
 */
(function(exports){

  function renderReadyButton() {
  }

  // socket.on('ping', function(data) {
  //   console.log(JSON.stringify(data, null, 2));
  //   console.log(data);
  //   socket.emit('pong', {data: "pong"});
  // });

  // socket.on('gameUpdate', function(game) {
  //   if (game.state == GameStates.INIT) {
  //     Display.renderRequestReady();
  //   } else {

  //   }
  // });

  /*
   * Events:
   * user clicks create game -> new Game
   * user joins a game -> connect, ask for ready if game state is INIT
   * user disconnect -> disconnect, END
   */

  /*
   * Game states
   * INIT -> wait for ready
   * all ready -> START
   * START -> START ROUND, wait for play card
   * all played -> END ROUND, compute new score, sync, START ROUND
   * repeat, until no more card -> END
   */

  function Room(socket) {
    this.socket = socket;
    this.name = window.location.href.split("/").pop();
    this.game = new anchorage.Game();
    this.socket.on('connect', this.onConnect);
    this.socket.on('sync', this.onSync);
  }

  Room.prototype.update = function() {
    if (this.game.state == anchorage.GameStates.INIT) {
      renderReadyButton();
    }
  }

  Room.prototype.onConnect = function() {
    this.requestSync();
  }

  Room.prototype.onSync = function(data) {
    this.game.players = data.players.map(function(player) {
      var p = new anchorage.Player(player.id);
      p.hand = player.hand;
      return p;
    });

    this.game.actions = data.game.actions.map(function(action) {
      return new anchorage.Action(action.player, action.guess);
    }

    this.game.discardCardsCount = data.game.discardCardsCount;
    this.game.roundsCount = data.game.roundsCount;
    this.game.state = data.game.state;
  }

  // loads the current hand from server.
  Room.prototype.requestSync = function() {
    socket.emit('requestSync', this.name);
  }

  Room.prototype.requestReady = function() {
  }

  Room.prototype.requestUnready = function() {
  }

  Room.prototype.start = function() {
  }

  Room.prototype.startRound = function() {
  }

  Room.prototype.playCard = function(card) {
  }

  Room.prototype.endRound = function() {
  }

  Room.prototype.end = function() {
  }

  exports.socket = io.connect('http://localhost:3000');
  exports.Display = Display;
  exports.Room = Room;

})(this['anchorage'] = this['anchorage'] || {});
