import WebsocketEvent from "../../structs/WebsocketEvent";
import {WebSocket} from "ws";
import {readDatabase} from "../database";
import {checkIfConnected, getConnections, newConnection, removeConnection} from "../voiceconnectionmanager";
import User from "../../structs/User";

export default class RTC extends WebsocketEvent {

    constructor() {
        super("RTC");
    }


    async exec(event, ws, args) {
        let data = event.data;
        switch (data.type) {
            case "JOIN":
                if(checkIfConnected(ws.tid)){
                    removeConnection(ws.tid,args.server);
                }
                ws.webrtcChannel = data.channelID;
                const joinclients = newConnection(ws.tid,data.channelID);
                if(joinclients.length > 1){
                    ws.send(JSON.stringify({
                        opCode: "RTC",
                        data: {
                            type: "SEND_OFFER",
                            members: joinclients.filter(x => x !== ws.tid)
                        }
                    }));
                    const user: User = await readDatabase("users",ws.tid) as User;
                    sendTo(joinclients.filter(x => x !== ws.tid),JSON.stringify({
                        opCode: "RTC",
                        data: {
                            type: "JOIN",
                            user: {
                                ID: user.ID,
                                username: user.username,
                                discriminator: user.discriminator,
                                role: user.role,
                                createdAt: user.createdAt
                            }
                        }
                    }));
                } else {
                    ws.send(JSON.stringify({
                        opCode: "RTC",
                        data: {
                            type: "ALONE"
                        }
                    }));
                }
                break;

            case "OFFER":
                if(!checkIfConnected(ws.tid)) return ws.send(JSON.stringify({
                    opCode: "RTC",
                    data: {
                        type: "ERR",
                        reason: `${ws.tid} not connected to channel, JOIN first.`
                    }
                }));
                let offerclients = getConnections(ws.webrtcChannel);
                if(!offerclients.includes(ws.tid)) return ws.send(JSON.stringify({
                    opCode: "RTC",
                    data: {
                        type: "ERR",
                        reason: `${ws.tid} not connected to channel, JOIN first.`
                    }
                }));
                sendTo([data.target],JSON.stringify({
                    opCode: "RTC",
                    data: {
                        type: "OFFER",
                        target: ws.tid,
                        offer: data.offer
                    }
                }));
                break;

            case "ANSWER":
                if(!checkIfConnected(ws.tid)) return ws.send(JSON.stringify({
                    opCode: "RTC",
                    data: {
                        type: "ERR",
                        reason: `${ws.tid} not connected to channel, JOIN first.`
                    }
                }));

                sendTo([data.target],JSON.stringify({
                    opCode: "RTC",
                    data: {
                        type: "ANSWER",
                        target: ws.tid,
                        answer: data.answer
                    }
                }))
                break;

            case "CANDIDATE":
                if(!checkIfConnected(ws.tid)) return ws.send(JSON.stringify({
                    opCode: "RTC",
                    data: {
                        type: "ERR",
                        reason: `${ws.tid} not connected to channel, JOIN first.`
                    }
                }));

                sendTo(getConnections(ws.webrtcChannel).filter(x => x !== ws.tid),JSON.stringify({
                    opCode: "RTC",
                    data: {
                        type: "CANDIDATE",
                        target: ws.tid,
                        candidate: data.candidate
                    }
                }));
                break;

            case "LEAVE":
                if(!checkIfConnected(ws.tid)) return ws.send(JSON.stringify({
                    opCode: "RTC",
                    data: {
                        type: "ERR",
                        reason: `${ws.tid} not connected to channel, JOIN first.`
                    }
                }));
                removeConnection(ws.tid,args.server);
                ws.webrtcChannel = null;
        }

        function sendTo(recipients,message){
            if(recipients.length < 1) return;
            const queue: Promise<boolean>[] = [];
            args.server.clients.forEach(x => {
                queue.push(new Promise(async res => {
                    if(x.readyState === WebSocket.OPEN){
                        if(recipients.includes(x.tid)){
                            x.send(message);
                        }
                        res(true);
                    }
                }));
            });
            Promise.all(queue);
        }

    }
}