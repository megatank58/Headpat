import WebsocketEvent from "../../structs/WebsocketEvent";
import {getUser} from "../usermanager";
import Auth from "../../structs/Auth";
import {readDatabase, writeDatabase} from "../database";
import {compare} from "bcrypt";
import {updatePass} from "../authmanager";
import {WebSocket} from "ws";
import User from "../../structs/User";

export default class UpdateProfile extends WebsocketEvent {
    constructor() {
        super("UPD_PRF");
    }

    async exec(event, ws, args) {
        const user = await getUser(ws.tid);
        const auth: Auth | null = await readDatabase("auth",ws.tid) as Auth;
        if(auth.passHash && event.data.oldPass && event.data.newPass){
            const validPass = await compare(event.data.oldPass, auth.passHash);
            if(!validPass) return ws.send(JSON.stringify({error: "INVALID_PASSWORD"}));
            await updatePass(ws.tid, event.data.newPass);
        }
        if(event.data.username){
            user.username = event.data.username;
        }
        if(event.data.discriminator){
            user.discriminator = event.data.discriminator;
        }
        await writeDatabase("users", ws.tid, user);
        await writeDatabase("auth", ws.tid, auth);

        ws.send(JSON.stringify({
            opCode: "UPD_PRF",
            data: {
                user,
                online: "ONLINE"
            }
        }));

        const queue: Promise<boolean>[] = [];
        args.server.clients.forEach(x => {
            queue.push(new Promise(async res => {
                if(x.readyState === WebSocket.OPEN){
                    x.send(JSON.stringify({
                        opCode: "UPD_MEM",
                        data: {
                            user,
                            online: "ONLINE"
                        }
                    }));
                    res(true);
                }
            }));
        });
        Promise.all(queue);
    }
}