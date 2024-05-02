import {readDatabase} from "./database";
import Auth from "../structs/Auth";
import {WebSocket} from "ws";
import User from "../structs/User";

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
            //console.log(`${x.id} lost connection.`);
            const user = await readDatabase("users",x.id) as User;
            const queue: Promise<boolean>[] = [];
            server.clients.forEach(y => {
                queue.push(new Promise(async res => {
                    if(y.readyState === WebSocket.OPEN){
                        x.send(JSON.stringify({
                            opCode: "UPD_MEM",
                            data: {
                                user,
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