import WebsocketEvent from "../../structs/WebsocketEvent";
import {readDatabase} from "../database";
import Message from "../../structs/Message";
import Server from "../../structs/Server";


export default class GetMessages extends WebsocketEvent {
    constructor() {
        super("GET_MSG");
    }

    async exec(event, ws, args) {
        if(event.data?.from) return; //TODO Implement scrolling get
        const server = await readDatabase("servers",ws.currentServer) as Server;
        const channel = server.channels[ws.currentChannel];
        if(!channel) return console.log("NO CHAN");
        const messagePromises: Promise<Message>[] = [];
        channel.messages.slice(-50).forEach(messageID => {
            messagePromises.push(readDatabase("messages", messageID) as Promise<Message>);
        });
        const messages: Message[] = await Promise.all(messagePromises);
        ws.send(JSON.stringify({
            opCode: "GET_MSG",
            data: {
                messages
            }
        }));
    }
}