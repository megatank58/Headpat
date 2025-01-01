import {WebSocket} from "ws";
import {readDatabase} from "./database";
import User from "../structs/User";

const channels = new Map();
const clients = new Map();

function checkIfConnected(id){
    return clients.has(id);
}

function removeConnection(id,server){
    if(clients.has(id)){
        let channel = clients.get(id);
        clients.delete(id);
        if(channels.has(channel)){
            let users = channels.get(channel);
            if(users.includes(id)){
                users.splice(users.indexOf(id),1);
                if(users.length < 1){
                    channels.delete(channel);
                } else {
                    channels.set(channel,users);
                    readDatabase("users",id).then((user: User) => {
                        const queue: Promise<boolean>[] = [];
                        server.clients.forEach(x => {
                            queue.push(new Promise(async res => {
                                if(x.readyState === WebSocket.OPEN){
                                    if(users.includes(x.tid)){
                                        x.send(JSON.stringify({
                                            opCode: "RTC",
                                            data: {
                                                type: "LEAVE",
                                                user: {
                                                    ID: user.ID,
                                                    username: user.username,
                                                    discriminator: user.discriminator,
                                                    role: user.role,
                                                    createdAt: user.createdAt
                                                }
                                            }
                                        }));
                                    }
                                    res(true);
                                }
                            }));
                        });
                        Promise.all(queue);
                    });
                }
            }
        }
    }
}

function newConnection(id, channelID){
    if(!channels.has(channelID)) channels.set(channelID,[]);
    clients.set(id,channelID);
    let cclients = channels.get(channelID);
    cclients.push(id);
    channels.set(channelID, cclients);
    return cclients;
}

function getConnections(id){
    if(channels.has(id)) return channels.get(id);
    channels.set(id,[]);
    return [];
}

export {checkIfConnected, removeConnection, newConnection, getConnections};