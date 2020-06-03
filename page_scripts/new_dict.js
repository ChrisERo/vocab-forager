/**
 * Handles making new dictionaries in new_dict.html page
 * Each dictionary is an object with the following attributes:
 *     {String} name - name of dictionary
 *     {String} url - regex representing http request to make to lookup a word
 *                    using the dictionary ({word} is a filler for the word we are 
 *                    looking up)
 */

/**
 * Stores dict_object in non-volatile memory, associating it with language
 * 
 * @param {Object} dict_object - Object representation of a dictionary. 
 * @param {String} language - language for which dict_object is for
 */
function store_dictionary(dict_object, language) {
    let dictionaries = window.localStorage.getItem('dicts');
    dictionaries = JSON.parse(dictionaries);
    let is_first_dict = Object.getOwnPropertyNames(dictionaries).length == 0;
    
    // Check if language exists
    if (language in dictionaries) {
        dictionaries[language].push(dict_object);
    } else {
        dictionaries[language] = [dict_object];
    }
    //console.log(JSON.stringify(dictionaries));
    window.localStorage.setItem('dicts', JSON.stringify(dictionaries));

    // set default dict info
    if (is_first_dict) {
        browser.runtime.sendMessage(
            {type: 'set_current_dictionary', language: language, index: 0});
    }
}

/**
 * Modifies show_status element of new_dict.html page so that it communicates that
 * dictionary dict_name has been saved successfully
 *
 * @param {String} dict_name - name of dictionary that has just been created
 */
function display_done(dict_name) {
    let content = `Saved Dictionary ${dict_name}`;
    let show_status_div = document.getElementById('show_status');
    show_status_div.textContent = content;
    show_status_div.style.display = 'inherit';
}

// Listener for invoking store_dictionary with propper data
document.getElementById('submit').addEventListener("click", function () {
    let uri_plain_text = document.getElementById('url').value;
    uri_plain_text = decodeURI(uri_plain_text);

    let dict_object = {name: document.getElementById('name').value, url: uri_plain_text};
    let language = document.getElementById('lang').value;
    store_dictionary(dict_object, language);
    display_done(dict_object.name);
});