const picker = document.getElementById('emojiPicker');
const search = document.getElementById('pickerSearch');
const emojiContainer = document.getElementById('emojiContainer');
const categories = {
    search: document.querySelector('[data-category="search"]'),
    people: document.querySelector('[data-category="people"]'),
    nature: document.querySelector('[data-category="nature"]'),
    food: document.querySelector('[data-category="food"]'),
    activity: document.querySelector('[data-category="activity"]'),
    travel: document.querySelector('[data-category="travel"]'),
    objects: document.querySelector('[data-category="objects"]'),
    symbols: document.querySelector('[data-category="symbols"]'),
    flags: document.querySelector('[data-category="flags"]')
}

const footerEmoji = document.getElementById('footerEmoji');
const footerText = document.getElementById('footerText');

fetch('/resource/discordEmojiMap.json', { cache: "force-cache" }).then((res) => {
    res.json().then((responseJSON) => {
        document.headpat['emojis'] = responseJSON;
        const firstEmojiData = responseJSON.emojiDefinitions[0];
        footerEmoji.innerText = firstEmojiData.emoji;
        footerText.innerText = firstEmojiData.names.filter(x => x.endsWith(':')).join(' ');
        twemoji.parse(footerEmoji);
    })
});

function emojiPickerHover(element) {
    footerEmoji.innerText = element.children[0].getAttribute('alt');
    footerText.innerText = element.getAttribute('data-names');
    twemoji.className = 'emoji';
    twemoji.parse(footerEmoji);
}

function addEmoji(emojiName) {
    const messageField = document.getElementById("messageField");
    if (messageField.innerText.length < 0) return messageField.innerText += emojiName;
    //&#x20 is the html space entity, it is here to ensure that there is a space between emojis with a normal space the space is omitted
    messageField.innerHTML += `${emojiName}&#x20`;
}

function togglePicker(element) {
    if (picker.getAttribute('loaded') !== 'true') {
        picker.setAttribute('loaded', 'true');
        for (const emojiData of document.headpat['emojis'].emojiDefinitions) {
            if (emojiData.names.join(' ').includes('tone')) continue;
            const emojiElement = document.createElement('div');
            emojiElement.innerText = emojiData.emoji;
            emojiElement.setAttribute('onclick', `addEmoji("${emojiData.names[0]}")`);
            emojiElement.setAttribute('data-names', emojiData.names.filter(x => x.endsWith(':')).join(' '));
            twemoji.className = 'emoji';
            twemoji.parse(emojiElement);
            emojiElement.children[0].setAttribute('loading', 'lazy');
            emojiElement.setAttribute('onmouseover', 'emojiPickerHover(this)');
            categories[emojiData.category].append(emojiElement);
            const clone = emojiElement.cloneNode(true);
            categories['search'].append(clone);
        }
    }
    if (picker.children[0].contains(element) || !element) return;
    if (picker.style.display !== 'block' && element?.id === 'emojiPickerToggle') picker.style.display = 'block';
    else picker.style.display = 'none';
}

const tabButtons = document.querySelectorAll('[data-tab]');
for (const button of tabButtons) {
    button.onclick = () => {
        search.value = '';
        toggleTabs();
        document.querySelector(`[data-header="${[button.getAttribute('data-tab')]}"]`).scrollIntoView({ block: 'start' });
    }
}

search.oninput = search.onchange = function(e){
    const searchEmojis = document.querySelectorAll('[data-names]');
    toggleTabs();
    for (const element of searchEmojis) {
        element.style.display = 'block';
        if (!element.getAttribute('data-names').includes(search.value.toLowerCase())) element.style.display = 'none';
    }
}

function toggleTabs() {
    for (const element of document.querySelectorAll('[data-names]')) {
        element.style.display = 'block';
    }
    if (search && search.value.length > 0) {
        for (const category of Object.keys(categories)) {
            categories[category].parentElement.style.display = 'none';
        }
        categories.search.parentElement.removeAttribute('style');
        categories.search.removeAttribute('style');
        emojiContainer.scrollTop = 0;
    } else {
        for (const category of Object.keys(categories)) {
            categories[category].parentElement.removeAttribute('style');
        }
        categories.search.style.display = 'none';
        emojiContainer.scrollTop = 0;
    }
}
