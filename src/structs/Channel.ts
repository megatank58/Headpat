import Permission from "./Permission";

export default class Channel {
    ID: string;
    serverID: string;
    messages: string[];
    permissions: Permission[];
}