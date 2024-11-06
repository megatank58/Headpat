import Permission from "./Permission";

export default class Channel {
    ID: string;
    name: string;
    type: string;
    permissions: Permission[];
}