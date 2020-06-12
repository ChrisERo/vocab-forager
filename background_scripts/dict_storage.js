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
 * Deletes dictionary represented by dict_ref from non-volatile storage
 *
 * @param {Object} dict_ref - object with string representing language on dictionary and
 *                            Number representing index of dictionary to delete
 */
function delete_dict(dict_ref) {
    try {
        let language = dict_ref['language'];
        let dict_index = dict_ref['index'];
        let dictionaries = window.localStorage.getItem('dicts');
        dictionaries = JSON.parse(dictionaries);

        dictionaries[language].splice(dict_index, 1);
        if (window.localStorage.getItem('default_dict') === JSON.stringify(dict_ref)) {
            window.localStorage.removeItem('default_dict');
        }
        console.log(dictionaries[language].length);
        if (dictionaries[language].length === 0) {
            delete dictionaries[language];
        }
        window.localStorage.setItem('dicts', JSON.stringify(dictionaries));

        return true;
    } catch(err) {
        return false;
    }
}

/**
 * Given dict_info and dict_stats, updates the dicts and current dicitonary in
 * localStorage based on this info
 *
 * @param {Object} dict_info - reference to dict modified
 * @param {Object} dict_stats - contains new url and name info of dictionary
 */
function modify_existing_dictinoary(dict_info, dict_stats) {
    if (dict_info.language === dict_info.new_language) { // Just update dict's data
        let dicts = window.localStorage.getItem('dicts');
        dicts = JSON.parse(dicts);
        dicts[dict_info.language][dict_info.index] = dict_stats;
        window.localStorage.setItem('dicts', JSON.stringify(dicts));
    } else {
        // Move dictionary from old language to new language (with edits)
        console.log(dict_info)
        let successful_delete = delete_dict(dict_info); // must get dicts after doing this
        if (successful_delete) {
            let dicts = window.localStorage.getItem('dicts');
            dicts = JSON.parse(dicts);

            // Determine whether to move dictionary to new or existing language
            if (dicts.hasOwnProperty(dict_info.new_language)) {
                dicts[dict_info.new_language].push(dict_stats);
            } else {
                dicts[dict_info.new_language] = [dict_stats];
            }
            window.localStorage.setItem('dicts', JSON.stringify(dicts));

            // See if default dictionary needs updating based on edit
            let current_dict_info = get_current_dictionary_info();
            if (current_dict_info.language === dict_info.language &&
                dict_info.index === current_dict_info.index) {
                    let language = dict_info.new_language;
                    let index =  dicts[dict_info.new_language].length - 1;
                    set_current_dictionary(language, index);
            }
        }
    }
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
