import {readDatabase} from "./database";
import Auth from "../structs/Auth";
import {WebSocket} from "ws";
import User from "../structs/User";
import {removeConnection} from "./voiceconnectionmanager";

const connections = new Map();
let server;

function initConnectionManager(ser){
    server = ser;
}

function hasConnection(id: string): boolean{
    return connections.has(id);
}

function setConnection(id: string, connection){
    connections.set(id, connection);
}

function getConnection(id: string){
    return connections.get(id);
}

function getConnectionIDs(): string[] {
    return Array.from(connections.keys());
}

function connectionHeartbeat(id: string){
    let a = connections.get(id);
    a.heartbeat = Date.now();
    connections.set(id,a);
}

setInterval(()=>{
    connections.forEach(async x => {
        const inspect = await readDatabase("auth",x.id) as Auth;
        if(x.session !== inspect.sessionSecret || Date.now() - x.heartbeat > 1000*15){
            connections.delete(x.id);
            removeConnection(x.id,server);
            //console.log(`${x.id} lost connection.`);
            const user = await readDatabase("users",x.id) as User;
            const queue: Promise<boolean>[] = [];
            server.clients.forEach(y => {
                queue.push(new Promise(async res => {
                    if(y.readyState === WebSocket.OPEN){
                        y.send(JSON.stringify({
                            opCode: "UPD_MEM",
                            data: {
                                user: {
                                    ID: user.ID,
                                    username: user.username,
                                    discriminator: user.discriminator,
                                    role: user.role,
                                    createdAt: user.createdAt
                                },
                                online: "OFFLINE"
                            }
                        }));
                        res(true);
                    }
                }));
            });
            Promise.all(queue);
        }
    });
}, 30*1000);

export {
    hasConnection,
    setConnection,
    getConnection,
    connectionHeartbeat,
    getConnectionIDs,
    initConnectionManager
}