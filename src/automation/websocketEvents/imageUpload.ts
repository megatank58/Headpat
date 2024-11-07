import WebsocketEvent from "../../structs/WebsocketEvent";
import ImgurAnonymousUploader from "imgur-anonymous-uploader";
import ImageMessage from "../../structs/ImageMessage";
import Message from "./message";

export default class ImageUpload extends WebsocketEvent {
    constructor() {
        super("IMG");
    }

    async exec(event, ws, args) {
        const file = Buffer.from(event.data.buffer, "base64");
        //console.log(event.data.buffer);
        const uploader = new ImgurAnonymousUploader(process.env.IMGUR_ID);
        const uploadResponse = await uploader.uploadBuffer(file);
        if(uploadResponse.success){
            const msg: ImageMessage = {
                ID: "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (parseInt(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> parseInt(c) / 4).toString(16)),
                createdAt: Date.now().toString(),
                content: uploadResponse.url,
                userID: ws.tid,
                channelID: ws.currentChannel,
                serverID: ws.currentServer,
                deleteHash: uploadResponse.deleteHash,
                url: uploadResponse.url
            };
            const messageSender = new Message();
            messageSender.exec(event, ws, args, msg);
            return ws.send(JSON.stringify({
                opCode: "IMG",
                data: uploadResponse
            }));
        } else {
            return ws.send(JSON.stringify({
                opCode: "IMG",
                error: uploadResponse
            }));
        }
    }
}