/*
 * Code shared between client and server.
 */
(function(exports){

  GameStates = {
    INIT: 0,
    STARTED: 1,
    ROUND_START: 2,
    ROUND_END: 3,
    END: 4,
    COUNT: 5
  }

  GuessActions = {
    ZERO: 0,
    ONE: 1,
    TWO: 2,
    THREE: 3,
    DOUBLE: 4,
    TRIPLE: 5,
    COUNT: 6
  }

  GameConstants = {
    RANKS: "234567891JQKA", // 1 = 10
    SUITS: "dhcs",
    NUM_PLAYERS: 4
  }

  function Deck(ranksCount, suitsCount) {
    this.deck = [];
    ranksCount = ranksCount || GameConstants.RANKS.length;
    suitsCount = suitsCount || GameConstants.SUITS.length;

    for (var i = 0; i < ranksCount; i++) {
      for (var j = 0; j < suitsCount; j++) {
        this.deck.push(GameConstants.SUITS[j] + GameConstants.RANKS[i]);
      }
    }
  }

  Deck.prototype.shuffle = function() {
    for (var i = this.deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * i);
      var tmp = this.deck[i];
      this.deck[i] = this.deck[j];
      this.deck[j] = tmp;
    }
  }

  // deals the cards to players.
  // if count is not set, deal the cards to all the players equally.
  // returns the number of cards dealt to each player
  Deck.prototype.deal = function(players, count) {
    var self = this;
    count = count || (this.deck.length / players.length >> 0);

    for (var i = 0; i < count; i++) {
      for (var j = 0; j < players.length; j ++) {
        players[j].hand.push(self.deck.pop());
      }
    }

    return count;
  }

  function Player(id, socket) {
    if (typeof id === 'undefined') {
      console.error("Bad player id: " + id);
      return;
    }

    this.id = id;
    this.socket = socket;
    this.score = 0;
    this.hand = [];
  }

  Player.prototype.toDict = function(includeHand) {
    var self = this;
    var player = {
      id: self.id,
      score: self.score,
    };

    if (includeHand) {
      player['hand'] = self.hand;
    }

    return player;
  }

  function Game(id) {
    if (typeof id === 'undefined') {
      console.error("Bad game id: " + id);
      return;
    }

    this.id = id;
    this.state = GameStates.INIT;
    this.maxRoundsCount = 0;
    this.roundsCount = 0;
    this.players = [];
    this.actions = [];
  }

  Game.prototype.toDict = function(fromPlayerId, revealActions) {
    var self = this;
    var game = {
      id: self.id,
      state: self.state,
      roundsCount: self.roundsCount,
    };

    game['actions'] = self.actions.map(function(action) {
      return action.toDict(revealActions);
    });

    var players = [];
    for (var i = 0; i < self.players.length; i++) {
      var player = self.players[i];
      if (player.id == fromPlayerId) {
        players.push(player.toDict(true));
      } else {
        players.push(player.toDict(false));
      }
    }

    game['players'] = players;

    return game;
  }

  Game.prototype.syncAllClients = function(revealActions) {
    for (var i = 0; i < this.players.length; i++) {
      var player = this.players[i];
      player.socket.emit('onSync', this.toDict(player.id, revealActions));
    }
  }

  Game.prototype.addNewPlayer = function(socket) {
    this.players.push(new Player(socket.id, socket));
  }

  Game.prototype.findPlayer = function(id) {
    for (var i = 0; i < this.players.length; i++) {
      if (this.players[i].id == id) {
        return this.players[i];
      }
    }

    return null;
  }

  Game.prototype.start = function() {
    deck = new Deck();
    deck.shuffle();
    this.maxRoundsCount = deck.deal(this.players);
    this.actions = [];
    this.state = GameStates.ROUND_START;
  }

  Game.prototype.startRound = function() {
    this.roundsCount++;
    this.actions = [];
    this.state = GameStates.ROUND_START;
  }

  // if called by the client, then card == undefine
  Game.prototype.playCard = function(player, guess, card) {
    var expectedCardsCount = this.maxRoundsCount - this.roundsCount;

    if (player.hand.indexOf(card) != -1
        && player.hand.length == expectedCardsCount
        && guess >= 0
        && guess < GuessActions.COUNT) {
      player.hand.splice(player.hand.indexOf(card), 1);
      this.actions.push(new Action(player, guess, card));

      if (this.actions.length == GameConstants.NUM_PLAYERS) {
        this.endRound();
      }
    }
  }

  Game.prototype.endRound = function() {
    this.computeRoundResult();
    this.state = GameStates.ROUND_END;
    this.syncAllClients(true);
  }

  Game.prototype.computeRoundResult = function() {
    for (var i = 0; i < this.actions.length; i++) {
      var action = this.actions[i];
      if (typeof action.card === 'undefined') {
        return;
      }

      if (action.guess <= GuessActions.THREE) {
        // if it's a normal guess action (from 0 to 3)
        // then count all the cards that are less than or equal
        // if the count == the guess, then add one to the score
        // make the score pending, since some one with a double/triple
        // can steal from us
        count = 0;
        for (var j = 0; j < this.actions.length; j++) {
          if (i != j && action.card >= this.actions[j].card) {
            count++;
          }
        }

        if (action.guess == count) {
          action.pendingScore = action.player.score + 1;
        } else {
          action.pendingScore = action.player.score;
        }
      } else {
        // if it's a double/triple action
        // then count all the cards that are equal
        // if the guess is correct, then add the corresponsding points to the score
        // make the score pending, since some one with a double/triple
        // can steal from us
        // then we scan all our victims, and mark their scores as stolen.
        count = 0;
        for (var j = 0; j < this.actions.length; j++) {
          if (i != j && action.card == this.actions[j].card) {
            count++;
          }
        }

        if (action.guess == count + GuessActions.THREE) {
          for (var j = 0; j < this.actions.length; j++) {
            if (i != j && action.card == this.actions[j].card) {
              this.actions[j].scoreStolen = true
            }
          }

          action.pendingScore = action.player.score + action.guess - GuessActions.THREE + 1;
        } else {
          action.pendingScore = action.player.score;
        }
      }
    }

    // after that, we only apply the pending score to the non-stolen action.
    for (var i = 0; i < this.actions.length; i++) {
      var action = this.actions[i];
      if (!action.scoreStolen) {
        this.findPlayer(action.player.id).score = action.pendingScore;
      }
    }

  }

  function Action(player, guess, card) {
    if (typeof player === 'undefined') {
      console.error("Bad action player: " + player);
      return;
    }

    if (typeof guess === 'undefined') {
      console.error("Bad action guess: " + guess);
      return;
    }

    this.player = player;
    this.guess = guess;
    this.card = card;
    this.scoreStolen = false;
  }

  Action.prototype.toDict = function (revealActions) {
     var self = this;
     var action = {
       player: self.player.toDict(),
       guess: self.guess,
     };

     if (revealActions) {
       action['card'] = self.card;
     }

     return action;
  }

  exports.GameStates = GameStates;
  exports.GuessActions = GuessActions;
  exports.GameConstants = GameConstants;
  exports.Game = Game;
  exports.Player = Player;
  exports.Deck = Deck;
  exports.Action = Action;

})(typeof exports === 'undefined' ? this['anchorage'] = this['anchorage'] || {} : exports);
