import Permission from "./Permission";

export default class Channel {
    ID: string;
    name: string;
    messages: string[];
    permissions: Permission[];
}