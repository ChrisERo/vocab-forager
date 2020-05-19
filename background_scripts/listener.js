/**
 * Listens for calls to functions from any of the 
 * background scripts and executes them.
 * 
 * Using a listener per background script caused errors, in particular
 * when loading popup menu for the first time.
 */

function handler(request, sender, sendResponse) {
    console.log('REQUEST MADE');
    if (request.type == "get_dictionaries_from_langauge") {
        sendResponse(get_dictionaries_from_langauge(request.language));
    } else if (request.type == "get_current_dictionary_info") {
        sendResponse(get_current_dictionary_info());
    } else if (request.type == "get_languages") {
        sendResponse(get_languages());
    } else if (request.type == "set_current_dictionary") {
        set_current_dictionary(request.language, request.index);
        sendResponse();
    } else if (request.type == "search_word_url") {
        sendResponse(search_word_url(request.word));
    } else if (request.type == "store_data") {
        store_data(request.data, request.page);
        sendResponse({}); // Needed for "synchronus" behavior

    } else if (request.type == "get_page_vocab") {
        let vocab = get_page_vocab(request.page);
        sendResponse({data: vocab});
    } else if (request.type == 'get_activation') {
        let result = get_current_activation();
        sendResponse(result);
    } else if (request.type == 'activation_changed') {
        set_current_activation(request.is_activated);
        sendResponse();
    } else {
        console.log('REQUEST NOT SATISIFED');
        console.log(JSON.stringify(request));
    }
}

browser.runtime.onMessage.addListener(handler);
