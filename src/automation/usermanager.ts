import User from "../structs/User";
import {rawDatabase, readDatabase, writeDatabase} from "./database";
import Server from "../structs/Server";

const getUser = async (id): Promise<User> => {
    return new Promise((res)=>{
        readDatabase("users",id).then(async (user: User) => {
            res(user === null ? await createUser(id) : user as User);
        });
    });
};

const getUserCount = async (): Promise<number> =>{
    return new Promise(async res => {
        let count = -1; //Due to system account being listed as well
        for await (const [key, value] of rawDatabase("users")!.iterator()) {
            count++;
        }
        res(count);
    });
}

const createUser = async (id): Promise<User> => {
    return new Promise(async (res, rej)=>{
        const exists = await readDatabase("users", id).catch(e => console.log(e));
        if(exists !== null) rej("USER_EXISTS");
        const user: User = {
            ID: id,
            username: "Nya",
            discriminator: await findFreeDiscriminator("Nya"),
            role: "MEMBER",
            createdAt: Date.now().toString(),
            servers: ["0"]
        };
        await writeDatabase("users", id, user);
        await readDatabase("servers","0").then(async (srv: Server) => {
            srv.members.push(id);
            await writeDatabase("servers","0",srv);
        });
        res(user as User);
    });
};

const findFreeDiscriminator = (name) => {
    return new Promise(async res => {
        let newDisc = Math.floor(1000 + Math.random() * 9000);
        for await (const [key, value] of rawDatabase("users")!.iterator()) {
            if(value.name === name){
                if(value.discriminator === newDisc) return res(findFreeDiscriminator(name));
            }
        }
        return res(newDisc);
    });
}

export {
    getUser,
    getUserCount
}