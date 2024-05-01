import Channel from "./Channel";

export default class Server {
    ID: string;
    name: string;
    userID: string;
    members: string[];
    channels: Channel[];
}