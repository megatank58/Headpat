import WebsocketEvent from "../../structs/WebsocketEvent";
import {getUser, getUserAssets} from "../usermanager";
import Auth from "../../structs/Auth";
import {readDatabase, writeDatabase} from "../database";
import {compare} from "bcrypt";
import {updatePass} from "../authmanager";
import {WebSocket} from "ws";
import Member from "../../structs/Member";
import UserAssets from "../../structs/UserAssets";

export default class UpdateProfile extends WebsocketEvent {
    constructor() {
        super("UPD_PRF");
    }

    async exec(event, ws, args) {
        const user: Member = await getUser(ws.tid);
        const userAssets: UserAssets = await getUserAssets(ws.tid);
        const auth: Auth | null = await readDatabase("auth",ws.tid) as Auth;
        if(auth.passHash && event.data.oldPass && event.data.newPass){
            const validPass = await compare(event.data.oldPass, auth.passHash);
            if(!validPass) return ws.send(JSON.stringify({error: "INVALID_PASSWORD"}));
            await updatePass(ws.tid, event.data.newPass);
        }
        await writeDatabase("auth", ws.tid, auth);

        if(event.data.username){
            user.username = event.data.username;
        }
        if(event.data.discriminator){
            user.discriminator = event.data.discriminator;
        }
        await writeDatabase("users", ws.tid, user);

        if(event.data.avatar){
            userAssets.avatar = event.data.avatar;
            user.avatar = event.data.avatar;
        }
        if(event.data.banner){
            userAssets.banner = event.data.banner;
            user.banner = event.data.banner;
        }
        await writeDatabase("images",ws.tid,userAssets);

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
