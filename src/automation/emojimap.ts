import { writeFileSync, existsSync } from "fs";

function init() {
    console.log('Running emojiMap fetch.');
    if (!existsSync('./html/styles/discordEmojiMap.json')) {
        fetchData();
    }
}

function fetchData() {
    fetch('https://emzi0767.gl-pages.emzi0767.dev/discord-emoji/discordEmojiMap-canary.min.json').then(res => {
        res.json().then(data => {
            data = {
                generated: Date.now(),
                emojiDefinitions: data.emojiDefinitions.map((x) => {
                    return {
                        emoji: x.surrogates,
                        names: x.namesWithColons,
                        category: x.category
                    }
                })
            };
            writeFileSync('./html/styles/discordEmojiMap.json', JSON.stringify(data));
            console.log('emojiMap saved sucessfully.');
        }).catch((error) => {
            console.log(error);
            console.log('Write emojiMap failed, retrying in 5 minutes...');
            setTimeout(() => init(), 5*1000*60);
        });
    }).catch(() => {
        console.log('Fetch emojiMap failed, retrying in 5 minutes...');
        setTimeout(() => init(), 5*1000*60);
    });
}

export {init as initEmojiMap, fetchData as fetchEmojiMap}