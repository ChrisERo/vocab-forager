/**
 * Sets selection of dicitonaries for dictionaries combobox. Should all be associated
 * with the language selected in languages combobox.
 * 
 * @param {Array} dictionary_selection - dictionary objects to include in cobobox 
 * @param {Object} current_dict_info - data used to find dictionary initial selection, 
 * assumed to be compatible with given dictionary_selection
 */
function make_dictionary_selection(dictionary_selection, current_dict_info) {
    let select = document.getElementById('dictionaries');
    select.innerHTML = "";
    // Populate dictionaries combobox with dictionary_selection options
    for (i = 0; i < dictionary_selection.length; i++) {
        var z = document.createElement("option");
        z.setAttribute("value", `${i}`);
        var t = document.createTextNode(`${dictionary_selection[i].name}`);
        z.appendChild(t);
        
        select.appendChild(z);
    }

    // Use current_dict_info to get default selection
    if (current_dict_info != null) {
        let valueToSelect = `${current_dict_info.index}`;
        select.value = valueToSelect;
    } else {
        select.value = '0';
    }

}

/**
 * Sets selection of languages for languages combobox. Sets initial value to that indicated
 * by current_dict_info
 * 
 * Assume same current_dict_info data used for both this function and 
 * make_dictionary_selection at any point in time.
 * 
 * @param {Array} languages - all languages stored in extension, associated with 
 * dictionaries
 * @param {Object} current_dict_info - data used to find languates initial selection
 */
function make_language_selection(languages, current_dict_info) {
    let select = document.getElementById('languages');
    select.innerHTML = "";
    let valueToSelect = null; // default value per current_dict_info
    for (i = 0; i < languages.length; i++) {
        var z = document.createElement("option");
        z.setAttribute("value", `${i}`);
        var t = document.createTextNode(`${languages[i]}`);
        z.appendChild(t);
        
        select.appendChild(z);

        // Set default valuefor languages if matches current_dict_info data
        if (current_dict_info != null && languages[i] == current_dict_info.language) {
            valueToSelect = `${i}`;
        }
    }

    if (valueToSelect != null) {
        select.value = valueToSelect;
    }
    
}

// Navigate to page for making new dictionary
document.getElementById('new_dict').addEventListener("click", function () {
    browser.tabs.create({
        url:"new_dict.html"
    });
});

// Navigate to "home page" of add-on
document.getElementById('index').addEventListener("click", function () {
    browser.tabs.create({
        url:"index.html"
    });
});

let get_current_dict = browser.runtime.sendMessage({type: 'get_current_dictionary_info'});
let get_langs = browser.runtime.sendMessage({type: 'get_languages'});

get_current_dict.then(function (result) {
    let current_dict_info = result; // current_dict_info of script
    let dictionary_selection = [];  // selection of dictionaries for script

    if (current_dict_info != null) { 
        // Get dictionaries from current_dict_info info and initialize 
        // dictinoary comboboxes
        let gdfl = browser.runtime.sendMessage({type: 'get_dictionaries_from_langauge', language: current_dict_info.language});
        gdfl.then(function (result) {
            dictionary_selection = result;
            make_dictionary_selection(dictionary_selection, current_dict_info);
        });
    } 

   get_langs.then(function (result) {
    // Once all set, initialize languages array and add relevant event listeners

    let languages = result; // Represents all available languages
    if (languages == null) {
        languages = [];
    } 
    make_language_selection(languages, current_dict_info);
    
    // Get new dictionaries associated with selected langauge and populate dictionaries
    // combobox
    document.getElementById('languages').addEventListener("change", function () {
        let my_lang = document.getElementById('languages').value;
        my_lang = parseInt(my_lang);
        my_lang = languages[my_lang];
    
        let gdfl = browser.runtime.sendMessage({type: 'get_dictionaries_from_langauge', language: my_lang});
        gdfl.then(function (result) {
            dictionary_selection = result;
            make_dictionary_selection(dictionary_selection, current_dict_info);
        });
    });

    // Change current_dict_info (in both volatile and non-volatile memory)
    document.getElementById('dictionaries').addEventListener("click", function () {
        let my_lang = document.getElementById('languages').value;
        my_lang = parseInt(my_lang);
        my_lang = languages[my_lang];
        let index = document.getElementById('dictionaries').value;
        index = parseInt(index);

        browser.runtime.sendMessage({type: 'set_current_dictionary', 
            index: index, 
            language: my_lang}); // Can be done asynch completely
        current_dict_info = {language: my_lang, index: index};
    });
   });
});

// Setup toggle button
browser.runtime.sendMessage({type: 'get_activation'}).then(function (response) {
    let activation_toggle = document.getElementById('activate');
    activation_toggle.checked = response;
    activation_toggle.addEventListener('change', function () {
        let is_checked = activation_toggle.checked;
        browser.runtime.sendMessage({type: 'activation_changed', is_activated: is_checked}); 
        // Since have value already, no need to act after this change
        let get_tabs = browser.tabs.query({});
        get_tabs.then(function (tabs) {
            // Send message to currently all tabs to update based on
            for (let tab of tabs) {
               browser.tabs.sendMessage(tab.id,{type: 'activation_from_pop',
               checked: is_checked});
            }
        });
    });
});
