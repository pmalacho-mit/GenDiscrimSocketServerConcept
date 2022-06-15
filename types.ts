import { roomJoiningStatus } from "./server";

type ValueOf<T> = T[keyof T];

export type ServerToClientEvents = {
    startGame: () => void,
    generatorToDiscriminator: (data: any) => void;
    discrimantorToGenerator: (data: any) => void;
}
 
export const enum Role {
    Generator = "generator",
    Discriminator = "discriminator"
}

export type ClientToServerEvents = {
    startRoom: (callback: (roomID: string)=> void) => void;
    joinRoom: (roomID: string, role: Role, callback: (result: ValueOf<typeof roomJoiningStatus>) => void) => void;
    generatorToDiscriminator: (data: any) => void;
    discrimantorToGenerator: (data: any) => void;
}
  
export type InterServerEvents = {}

export type SocketData = {
    roomCode: string,
    role: Role,
}

export type RoomData = {
    [Role.Generator]: string | undefined,
    [Role.Discriminator]: string | undefined,
    gameStarted: boolean
}