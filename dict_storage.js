// Initialize dictionaries data if need be
if (window.localStorage.getItem('dicts') == null) {
    window.localStorage.setItem('dicts', '{}');
}

function get_languages() {
    let dicts = window.localStorage.getItem('dicts');
    if (dicts == null) {
        return [];
    }
    return Object.getOwnPropertyNames(JSON.parse(dicts));
}

function get_dictionaries_from_langauge(language){
    let dicts = window.localStorage.getItem('dicts');
    if (dicts == null) {
        return [];
    }
    dicts = JSON.parse(dicts);
    if (dicts[language] == null) {
        return [];
    }
    
    return dicts[language];
}

function get_current_dictionary_info(){
    return JSON.parse(window.localStorage.getItem('default_dict'));
    //return JSON.parse(window.localStorage.getItem('dicts')[current_info.language][current_info.index]);
}

function set_current_dictionary(language, index){
    let chosen_dict = JSON.stringify({language: language, index: index});
    window.localStorage.setItem('default_dict', chosen_dict);
}


function handler2(request, sender, sendResponse) {
    console.log('REQUEST2');
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
    } else {
        console.log('My ISSUE');
        console.log(JSON.stringify(request));
    }
}

browser.runtime.onMessage.addListener(handler2);
