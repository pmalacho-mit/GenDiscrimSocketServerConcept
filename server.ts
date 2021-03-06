import {Server} from "socket.io";
import RoomCodeGenerator from "./RoomCodeGenerator";
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "./types";


const roomCodeGenerator = new RoomCodeGenerator();
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>();

io.on("connect", (socket) => {

    // This socket event should be fired from the site's 'home page' when a client wants to start a new room to play within
    socket.on("startRoom", (callback) => {
        const code = roomCodeGenerator.getNext();
        dataByRoom[code] = {discriminator: undefined, generator: undefined, gameStarted: false}; // initialize room data

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
    socket.on("joinRoom", (roomCode, role, callback) => {
        const data = dataByRoom[roomCode];

        // The client should handle the below responses and display an appropriate alert/message to the user
        if (!data) return callback(roomJoiningStatus.RoomDoesNotExist); // no such room, send failing response and early return
        if (data[role] !== undefined) return callback(roomJoiningStatus.RoleIsOccupied); // room already has a player with that role, send failing response and early return
        
        data[role] = socket.id; // Have socket take on this role 
        socket.data = {roomCode, role};
        socket.join(roomCode);

        callback(roomJoiningStatus.Success);

        // If the game has not been started, but now has both players ready, then emit 'startGame' event to the sockets in the room
        if (!data.gameStarted && roomIsFull(roomCode)) {
            io.to(roomCode).emit("startGame"); // NOTE: We use 'io.emit' here so both sockets in the room are informed to start the game
            data.gameStarted = true;
        }
    });
    
    socket.on("discrimantorToGenerator", (data) => {
        const {roomCode} = socket.data;
        if (!roomCode) return;
        socket.to(roomCode).emit("discrimantorToGenerator", data);
    });

    socket.on("generatorToDiscriminator", (data) => {
        const {roomCode} = socket.data;
        if (!roomCode) return;
        socket.to(roomCode).emit("generatorToDiscriminator", data);
    });

    socket.on("disconnect", () => {
        const {roomCode, role} = socket.data;
        if (!roomCode || !role) return;

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

export const roomJoiningStatus = {
    RoomDoesNotExist: "roomDoesNotExist",
    RoleIsOccupied: "roleAlreadyFilled",
    Success: "success"
}

/**
 * @typedef {{generator: string | undefined, discriminator: string | undefined, gameStarted: boolean}} RoomData
 */

/**
 * Object that stores data about each room. Each key of the object represents a room code. 
 * @type {Object.<string, RoomData>}
 */
const dataByRoom = {}; 

/**
 * Check if the data associated with the passed-in room code indicates that no players are currently connected
 * @param {string} roomCode 
 * @returns {boolean}
 */
const roomIsEmpty = (roomCode) => {
    const {generator, discriminator} = dataByRoom[roomCode];
    return generator === undefined && discriminator === undefined;
}

/**
 * Check if the data associated with the passed-in room code indicates that both players are currently connected
 * @param {string} roomCode 
 * @returns 
 */
const roomIsFull = (roomCode) => {
    const {generator, discriminator} = dataByRoom[roomCode];
    return generator !== undefined && discriminator !== undefined;
}
