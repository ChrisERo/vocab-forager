// Using single listener because received errors when each background script had own listener

function handler(request, sender, sendResponse) {
    console.log('REQUEST');
    if (request.type == "get_dictionaries_from_langauge") {
        sendResponse(get_dictionaries_from_langauge(request.language));
    } else if (request.type == "get_current_dictionary_info") {
        sendResponse(get_current_dictionary_info());
    } else if (request.type == "get_languages") {
        console.log('ohcrap');
        sendResponse(get_languages());
    } else if (request.type == "set_current_dictionary") {
        set_current_dictionary(request.language, request.index);
        sendResponse();
    } else if (request.type == "search_word_url") {
        console.log('searching')
        sendResponse(search_word_url(request.word));
    } if (request.type == "store_data") {
        store_data(request.data, request.page);
        sendResponse({}); // Needed for "synchronus" behavior

    } else if (request.type == "get_page_vocab") {
        let vocab = get_page_vocab(request.page);
        console.log('Retreived Data ' + JSON.stringify(vocab));
        sendResponse({data: vocab});
    } else {
        console.log('ISSUE');
        console.log(JSON.stringify(request));
    }
}

browser.runtime.onMessage.addListener(handler);