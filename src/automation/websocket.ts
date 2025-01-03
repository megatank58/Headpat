import {WebSocket, WebSocketServer} from "ws";
import {jwtVerify} from "jose";
import {readDatabase} from "./database";
import Auth from "../structs/Auth";
import {getUser} from "./usermanager";
import {loadWebsocketEvents} from "./websocketEventLoader";
import {hasConnection, setConnection, initConnectionManager} from "./connectionmanager";
import {createHmac} from "crypto";
import {removeConnection} from "./voiceconnectionmanager";

let server;
//Remember to increment this when publishing an update to enforce a reload of clients.
const version = `1.8.8_118`;

const init = async (srv)=>{
    const events = await loadWebsocketEvents();
    server = new WebSocketServer({
        noServer: true,
        perMessageDeflate: false
    });
    initConnectionManager(server);


    srv.on("upgrade", (req, socket, head) => {
        server.handleUpgrade(req, socket, head, (ws) => {
           server.emit("connection", ws, req);
        });
    });

    server.on("connection", (ws, req)=>{
        ws.on("error", console.error);
        ws.on("message", (event)=>{
            if(!ws.tid) return;
            if(!hasConnection(ws.tid)) return ws.close();
            try { event = JSON.parse(event.toString()); } catch(e) { return; }
            const wsEvent = events.get(event.opCode);
            if(!wsEvent) return;
            wsEvent.exec(event, ws,{version, server});
        });

        let auth = "";
        req.rawHeaders.forEach(x => { if(x.split("auth=").length > 1){ auth = x.split("auth=")[1].split(";")[0]; }});
        if(auth.length < 1) return ws.close();

        jwtVerify(auth, new TextEncoder().encode(process.env.JWT_SECRET as string)).then(async jwtData => {
            const payload = jwtData.payload;
            if(payload.iss !== "urn:Headpat:axiom" || payload.aud !== "urn:Headpat:users") return ws.close();
            const inspect = await readDatabase("auth",payload.id) as Auth;
            if(payload.session !== inspect.sessionSecret) return ws.close();

            ws.tid = payload.id;
            ws.tses = payload.session;
            ws.currentServer = "0";
            ws.currentChannel = "0";
            removeConnection(ws.tid,server);
            let iceCreds = getIceCreds(ws.tid);
            setConnection(payload.id as string,{
                id: payload.id,
                session: payload.session,
                heartbeat: Date.now()
            });
            const user = await getUser(ws.tid);
            ws.send(JSON.stringify({
                opCode: "ACK",
                data: {
                    user,
                    version,
                    state: {
                        currentServer: ws.currentServer,
                        currentChannel: ws.currentChannel
                    },
                    iceCreds
                }
            }));
            const queue: Promise<boolean>[] = [];
            server.clients.forEach(x => {
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
        }).catch((e) => {
            console.log(e);
            ws.close();
        });
    });

    function getIceCreds(id){
        let username = `${Math.floor(Date.now()/1000) + (3*24*3600)}:${id}`;
        let hmac = createHmac("sha1",process.env.ICE_SECRET as string);
        hmac.setEncoding("base64");
        hmac.write(username);
        hmac.end();
        let password = hmac.read();
        return {
            urls: [process.env.ICE_URL as string],
            username,
            password
        };
    }
}

export {
    init
}
