// TODO: Have class use IndexedDB
function store_data(json_data, page) {
    let save_data = JSON.stringify(json_data);
    window.localStorage.setItem(page, save_data);
    console.log(`Data Stored: ${save_data}`);
}

function get_page_vocab(site) {
    console.log('Made it in ehre');
    let page_vocab =  localStorage.getItem(site);
    if (page_vocab == null) {
        return [];
    } else {
        return JSON.parse(page_vocab);
    }
}

function handler(request, sender, sendResponse) {
    console.log('REQUEST');
    if (request.type == "store_data") {
        store_data(request.data, request.page);
        sendResponse({}); // Needed for "synchronus" behavior

    } else if (request.type == "get_page_vocab") {
        let vocab = get_page_vocab(request.page);
        console.log('Retreived Data ' + JSON.stringify(vocab));
        sendResponse({data: vocab});
    } else {
        alert('ISSUE');
    }
}

browser.runtime.onMessage.addListener(handler);
