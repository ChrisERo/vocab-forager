/**
 * Handles storage and retreival of dictionary data. Look at new_dict.js to see structure
 * of dictinaory objects
 */

// Initialize dictionaries data if need be
if (window.localStorage.getItem('dicts') == null) {
    window.localStorage.setItem('dicts', '{}');
}

/**
 * Returns array of all languages for which a dictionary exists. Each
 * language is a string
 */
function get_languages() {
    let dicts = window.localStorage.getItem('dicts');
    if (dicts == null) {
        return [];
    }
    return Object.getOwnPropertyNames(JSON.parse(dicts));
}

/**
 * Returns array of all dictionaries for language. Each dictionary
 * object has two parameters: 
 *  name: the name (string) associated with the dictionary
 *  url: regex represneting url to get definition for word ({word} in regex)
 * 
 * @param {String} language - language in our system
 */
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

/**
 * Gets data regarding the default dictionary (the one initially set) as a
 * Javascript Object. Should have two attributes:
 *  language: language of dictionary
 *  index: index of array for language where dictionary is in.
 */
function get_current_dictionary_info(){
    return JSON.parse(window.localStorage.getItem('default_dict'));
}

/**
 * Return actual dictinoary (as JSON object) associated 
 * with data from dict_info. See get_dictionaries_from_langauge for
 * description of dictionary object.
 * 
 * @param {Object} dict_info - See description in get_current_dictionary_info
 */
function get_dictionary_from_info(dict_info) {
    if (dict_info == null) {
        return null;
    }
    console.log(dict_info);
    let dicts = window.localStorage.getItem('dicts');
    dicts = JSON.parse(dicts);
    return dicts[dict_info.language][dict_info.index];
}

// Have current dictionary in memory for speed
let current_dictionary = get_dictionary_from_info(get_current_dictionary_info());

/**
 * Set current_dictionary to a new dictionary represented by language and index (assume
 * such a dictionary exists) and save this change in non-volatile storage
 * 
 * @param {String} language - language of new dictionary
 * @param {Number} index  - index in Array associated with language of dictionary
 */
function set_current_dictionary(language, index){
    let chosen_dict_info = {language: language, index: index};
    window.localStorage.setItem('default_dict', JSON.stringify(chosen_dict_info));
    current_dictionary =  get_dictionary_from_info(chosen_dict_info);
}

/**
 * Returns url for current dictionary for looking up word.
 * 
 * @param {String} word - word we wish to look up 
 */
function search_word_url(word) {
    let template = current_dictionary.url;
    return template.replace('{word}', word);
}
