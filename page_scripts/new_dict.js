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
        window.localStorage.setItem('default_dict', JSON.stringify({language: language, index: 0}));
    }
}

// Listener for invoking store_dictionary with propper data
document.getElementById('submit').addEventListener("click", function () {
    let dict_object = {name: document.getElementById('name').value, url: document.getElementById('url').value};
    let language = document.getElementById('lang').value;
    store_dictionary(dict_object, language);
    alert(`Stored ${dict_object.name}`);
});