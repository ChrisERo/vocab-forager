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

function get_dictionary_from_info(dict_info) {
    if (dict_info == null) {
        return null;
    }
    console.log(dict_info);
    let dicts = window.localStorage.getItem('dicts');
    dicts = JSON.parse(dicts);
    return dicts[dict_info.language][dict_info.index];
}

let current_dictionary = get_dictionary_from_info(get_current_dictionary_info());

function set_current_dictionary(language, index){
    let chosen_dict_info = {language: language, index: index};
    window.localStorage.setItem('default_dict', JSON.stringify(chosen_dict_info));
    current_dictionary =  get_dictionary_from_info(chosen_dict_info);
}

function search_word_url(word) {
    let template = current_dictionary.url;
    return template.replace('{word}', word);
}
