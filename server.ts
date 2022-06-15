import {Server} from "socket.io";
import RoomCodeGenerator from "./RoomCodeGenerator";

type ServerToClientEvents = {
    ready: () => void,
    generatorToDiscriminator: (data: any) => void;
    discrimantorToGenerator: (data: any) => void;
}
  
type ClientToServerEvents = {
    startRoom: (callback: (roomID: string)=> void) => void;
    joinRoom: (roomID: string, callback: (success: boolean)=> void) => void;
    generatorToDiscriminator: (data: any) => void;
    discrimantorToGenerator: (data: any) => void;
}
  
type InterServerEvents = {}

const enum Role {
    Generator,
    Discriminator
}

type SocketData = {
    roomCode: string,
    role: Role
}

type RoomData = {
    [Role.Generator]: string | undefined,
    [Role.Discriminator]: string | undefined,
}

const dataByRoom: Record<string, RoomData> = {}; 

const roomIsEmpty = (roomCode: string) => {
    const data = dataByRoom[roomCode];
    return data[Role.Generator] === undefined && data[Role.Discriminator] === undefined;
}

const roomCodeGenerator = new RoomCodeGenerator();
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>();
    io.on("connect", (socket) => {

    socket.on("startRoom", (callback) => {
        const code = roomCodeGenerator.getNext();
        socket.data.roomCode = code;
        socket.data.role = Role.Generator;
        dataByRoom[code] = {
            [Role.Generator]: socket.id,
            [Role.Discriminator]: undefined
        };
        socket.join(code);
        callback(code);
    });

    socket.on("joinRoom", (roomCode, callback) => {
        const data = dataByRoom[roomCode];
        if (!data) callback(false); // no such room
        if (data[Role.Discriminator] !== undefined) callback(false); // room already has a discriminator

        // NOTE: could send an error 'code' back instead of just true / false

        socket.data.roomCode = roomCode;
        socket.data.role = Role.Discriminator;
        socket.join(roomCode);
        socket.to(roomCode).emit("ready");
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

        dataByRoom[roomCode][role] = undefined;

        if (roomIsEmpty(roomCode)) {
            delete dataByRoom[roomCode];
            roomCodeGenerator.release(roomCode);
        }
    });
});