import WebsocketEvent from "../../structs/WebsocketEvent";
import {WebSocket} from "ws";
import {readDatabase} from "../database";

export default class RTC extends WebsocketEvent {
    channels = new Map();

    constructor() {
        super("RTC");
    }


    async exec(event, ws, args) {
        if(!event.bypass || event.bypass !== process.env.BYPASS_SECRET){
            ws.send(JSON.stringify({
                opCode: "RTC",
                data: {
                    type: "ERR",
                    reason: "RTC server disabled for now..."
                }
            }));
            return;
        }
        let data = event.data;
        switch (data.type) {
            case "JOIN":
                if(!this.channels.has(data.channelID)) this.channels.set(data.channelID,[]);
                let joinclients = this.channels.get(data.channelID);
                /*if(joinclients.includes(ws.tid)){
                    return ws.send(JSON.stringify({
                        opCode: "RTC",
                        data: {
                            type: "ERR",
                            reason: `${ws.tid} already connected to WebRTC, please disconnect first.`
                        }
                    }));
                }*/
                ws.webrtcChannel = data.channelID;
                joinclients.push(ws.tid);
                this.channels.set(data.channelID, joinclients);
                if(joinclients.length > 1){
                    ws.send(JSON.stringify({
                        opCode: "RTC",
                        data: {
                            type: "SEND_OFFER",
                            members: joinclients.filter(x => x !== ws.tid)
                        }
                    }));
                    const user = await readDatabase("users",ws.tid);
                    sendTo(joinclients.filter(x => x !== ws.tid),JSON.stringify({
                        opCode: "RTC",
                        data: {
                            type: "JOIN",
                            user
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
                if(!this.channels.has(ws.webrtcChannel)) this.channels.set(ws.webrtcChannel,[]);
                let offerclients = this.channels.get(ws.webrtcChannel);
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
                if(!this.channels.has(ws.webrtcChannel)) this.channels.set(ws.webrtcChannel,[]);
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
                if(!this.channels.has(ws.webrtcChannel)) this.channels.set(ws.webrtcChannel,[]);
                sendTo(this.channels.get(ws.webrtcChannel).filter(x => x !== ws.tid),JSON.stringify({
                    opCode: "RTC",
                    data: {
                        type: "CANDIDATE",
                        target: ws.tid,
                        candidate: data.candidate
                    }
                }));
                break;

            case "LEAVE":
                if(!this.channels.has(ws.webrtcChannel)) this.channels.set(ws.webrtcChannel,[]);
                let leaveclients = this.channels.get(ws.webrtcChannel);
                if(leaveclients.includes(ws.tid)){
                    leaveclients.splice(leaveclients.indexOf(ws.tid),1);
                    if(leaveclients.length < 1){
                        this.channels.delete(ws.webrtcChannel);
                    }
                    this.channels.set(ws.webrtcChannel,leaveclients);
                }
                ws.webrtcChannel = null;
                const user = await readDatabase("users",ws.tid);
                sendTo(leaveclients,JSON.stringify({
                    opCode: "RTC",
                    data: {
                        type: "LEAVE",
                        user
                    }
                }));
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