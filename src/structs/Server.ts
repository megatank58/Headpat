import TextChannel from "./TextChannel";
import AudioChannel from "./AudioChannel";

export default class Server {
    ID: string;
    name: string;
    userID: string;
    members: string[];
    channels: AudioChannel|TextChannel[];
}