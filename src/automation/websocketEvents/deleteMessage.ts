import WebsocketEvent from "../../structs/WebsocketEvent";
import {readDatabase, removeDatabase, writeDatabase} from "../database";
import Message from "../../structs/Message";
import {WebSocket} from "ws";
import Server from "../../structs/Server";
import ImageMessage from "../../structs/ImageMessage";
import ImgurAnonymousUploader from "imgur-anonymous-uploader";

export default class DeleteMessage extends WebsocketEvent {
    constructor() {
        super("DEL_MSG");
    }

    async exec(event, ws, args) {
        readDatabase("messages", event.data.messageID).then((message: Message|ImageMessage) => {
            if(
                message.serverID === ws.currentServer &&
                message.channelID === ws.currentChannel &&
                message.userID === ws.tid
            ){
                removeDatabase("messages",event.data.messageID).then(async ()=>{
                    readDatabase("servers", ws.currentServer).then(async (server: Server)=>{
                        const channel = server.channels[message.channelID];
                        const idx = channel.messages.indexOf(event.data.messageID);
                        if(idx > -1) channel.messages.splice(idx,1);
                        await writeDatabase("servers",message.serverID,server);
                        if("deleteHash" in message){
                            const uploader = new ImgurAnonymousUploader(process.env.IMGUR_ID);
                            await uploader.delete(message.deleteHash).catch(e => console.log(e));
                        }
                        args.server.clients.forEach(x => {
                            if(x.readyState === WebSocket.OPEN && x.currentChannel === ws.currentChannel){
                                x.send(JSON.stringify({
                                    opCode: "DEL_MSG",
                                    data: {
                                        messageID: event.data.messageID
                                    }
                                }));
                            }
                        });
                    }).catch(()=>{
                        ws.send(JSON.stringify({
                            opCode: "DEL_MSG",
                            error: "Server not found."
                        }));
                    });
                }).catch(()=>{
                    ws.send(JSON.stringify({
                        opCode: "DEL_MSG",
                        error: "Database error at deletion."
                    }));
                });
            } else {
                ws.send(JSON.stringify({
                    opCode: "DEL_MSG",
                    error: "Message data not a match."
                }));
            }
        }).catch(()=>{
            ws.send(JSON.stringify({
                opCode: "DEL_MSG",
                error: "Message data not a match."
            }));
        });
    }
}