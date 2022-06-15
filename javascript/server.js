"use strict";
exports.__esModule = true;
exports.roomJoiningStatus = void 0;
var socket_io_1 = require("socket.io");
var RoomCodeGenerator_1 = require("./RoomCodeGenerator");
var roomCodeGenerator = new RoomCodeGenerator_1["default"]();
var io = new socket_io_1.Server();
io.on("connect", function (socket) {
    // This socket event should be fired from the site's 'home page' when a client wants to start a new room to play within
    socket.on("startRoom", function (callback) {
        var code = roomCodeGenerator.getNext();
        dataByRoom[code] = { discriminator: undefined, generator: undefined, gameStarted: false }; // initialize room data
        // On the client side, when the below callback is fired (containing the room code):
        // - The student should be redirected to a url like: www.blahblahblah/{RoomCode}/generator.com
        // - NOTE: This way, both the role and the room code can be extracted from the URL. 
        // - When that page loads, it will execute the 'joinRoom' socket event to join the specific room as a generator.
        // - On this page, they should also see a link to invite their friend to play as the discriminator, like: www.blahblahblah/{RoomCode}/discriminator.com
        callback(code);
    });
    // This socket event should be fired whenever the Generator OR Discriminator page is loaded.
    // The benefit of setting it up this way is that the student can refresh their page and again join the same room. 
    // NOTE: Something to consider though is that the game state will be lost when the page refreshes.
    // To avoid that, it will be necessary to do either of the following:
    // - 1) (Preferred, I think) Keep track of each game's "state" in the 'dataByRoom' object, which can then be sent to the client through the 'joinRoom' event's callback
    // - 2) Store the game's "state" on the client-side in local storage (the name of this data should reference the roomCode to ensure each game's state is stored uniquely)
    socket.on("joinRoom", function (roomCode, role, callback) {
        var data = dataByRoom[roomCode];
        // The client should handle the below responses and display an appropriate alert/message to the user
        if (!data)
            return callback(exports.roomJoiningStatus.RoomDoesNotExist); // no such room, send failing response and early return
        if (data[role] !== undefined)
            return callback(exports.roomJoiningStatus.RoleIsOccupied); // room already has a player with that role, send failing response and early return
        data[role] = socket.id; // Have socket take on this role 
        socket.data = { roomCode: roomCode, role: role };
        socket.join(roomCode);
        callback(exports.roomJoiningStatus.Success);
        // If the game has not been started, but now has both players ready, then emit 'startGame' event to the sockets in the room
        if (!data.gameStarted && roomIsFull(roomCode)) {
            io.to(roomCode).emit("startGame"); // NOTE: We use 'io.emit' here so both sockets in the room are informed to start the game
            data.gameStarted = true;
        }
    });
    socket.on("discrimantorToGenerator", function (data) {
        var roomCode = socket.data.roomCode;
        if (!roomCode)
            return;
        socket.to(roomCode).emit("discrimantorToGenerator", data);
    });
    socket.on("generatorToDiscriminator", function (data) {
        var roomCode = socket.data.roomCode;
        if (!roomCode)
            return;
        socket.to(roomCode).emit("generatorToDiscriminator", data);
    });
    socket.on("disconnect", function () {
        var _a = socket.data, roomCode = _a.roomCode, role = _a.role;
        if (!roomCode || !role)
            return;
        // Socket no longer occupies it's specific role in this room 
        dataByRoom[roomCode][role] = undefined;
        // Finally, check to see if the room has neither particpant currently connected.
        // If that's case, we can treat this room as empty, and return the roomCode to the roomCodeGenerator for re-use 
        if (roomIsEmpty(roomCode)) {
            delete dataByRoom[roomCode];
            roomCodeGenerator.release(roomCode);
        }
    });
});
exports.roomJoiningStatus = {
    RoomDoesNotExist: "roomDoesNotExist",
    RoleIsOccupied: "roleAlreadyFilled",
    Success: "success"
};
/**
 * @typedef {{generator: string | undefined, discriminator: string | undefined, gameStarted: boolean}} RoomData
 */
/**
 * Object that stores data about each room. Each key of the object represents a room code.
 * @type {Object.<string, RoomData>}
 */
var dataByRoom = {};
/**
 * Check if the data associated with the passed-in room code indicates that no players are currently connected
 * @param {string} roomCode
 * @returns {boolean}
 */
var roomIsEmpty = function (roomCode) {
    var _a = dataByRoom[roomCode], generator = _a.generator, discriminator = _a.discriminator;
    return generator === undefined && discriminator === undefined;
};
/**
 * Check if the data associated with the passed-in room code indicates that both players are currently connected
 * @param {string} roomCode
 * @returns
 */
var roomIsFull = function (roomCode) {
    var _a = dataByRoom[roomCode], generator = _a.generator, discriminator = _a.discriminator;
    return generator !== undefined && discriminator !== undefined;
};
