/**
 * Returns {language, index} object representing the dictionary selected
 */
function get_selected_dict() {
    let lang_sel = document.getElementById('languages');
    let language = lang_sel.options[lang_sel.selectedIndex];
    language = language.text;
    let dictionary_index = document.getElementById('dictionaries').selectedIndex;

    if (dictionary_index == null || language == null) {
        return null;
    }
    return {language: language, index: dictionary_index};
}

/**
 * Outputs name of dictionary selected in dictionaries select element
 * Assumes textContent of option in dictionaries select element represents name of
 * dictinoary with correspoding index
 */
function get_selected_dict_name() {
    let index = document.getElementById('dictionaries').selectedIndex;
    return document.getElementById('dictionaries').options[index].text;
}

// Set up selection items
/**
 * Sets up content of select items under chose_dictionary div
 */
function set_up_items() {
    let get_current_dict = browser.runtime.sendMessage({type: 'get_current_dictionary_info'});
    let get_langs = browser.runtime.sendMessage({type: 'get_languages'});
    get_current_dict.then(function (result) {
        current_dict_info = result; // current_dict_info of script
        let dictionary_selection = [];  // selection of dictionaries for script

        get_langs.then(function (result) {
            // Once all set, initialize languages array and add relevant event listeners

            let languages = result; // Represents all available languages
            if (languages == null) {
                languages = [];
            }
            make_language_selection(languages, current_dict_info);

            // Get dictionaries from current_dict_info info and initialize
            // dictinoary comboboxes if current_dict exists
            if (languages.length > 0) {
                let lang_to_search = current_dict_info == null ? languages[0] : current_dict_info.language;
                let gdfl = browser.runtime.sendMessage({type: 'get_dictionaries_from_langauge', language: lang_to_search});
                gdfl.then(function (result) {
                    dictionary_selection = result;
                    make_dictionary_selection(dictionary_selection, current_dict_info);
                });
            }

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
        });
    });
}

set_up_items(); // Set up select items for first time



// Setup link buttons
document.getElementById('delete_dict').addEventListener("click", function () {
    let dict = get_selected_dict();
    let dict_name = get_selected_dict_name();
    if (dict != null) {
        browser.runtime.sendMessage({type: 'delete_dict',
            dict_ref: dict}).then(function (deleted) {
            if (deleted) {
                set_up_items(); // Reset select items
                // Confirm Deletion
                let status = document.getElementById('show_status');
                status.textContent = `${dict_name} Deleted`;
                status.style.display = 'inherit';
            }
        });
    }
});

document.getElementById('edit_dict').addEventListener("click", function () {
    let dict_info = get_selected_dict();
    if (dict_info != null) {
        browser.runtime.sendMessage({type: 'get_dictionary_from_info',
            dict_info: dict_info}).then(function (response) {

            let dict = response;
            document.getElementById('lang').value = dict_info['language'];
            document.getElementById('name').value = dict['name'];
            document.getElementById('url').value = dict['url'];

            document.getElementById('choose_dictionary').style.display = 'none';
            document.getElementById('show_status').style.display = 'none';
            document.getElementById('mod_dict_items').style.display = 'inline';
        });
    }
});

document.getElementById('save_dict').addEventListener("click", function () {
    let dict_info = get_selected_dict(); // Used to locate dictionary
    dict_info['new_language'] = document.getElementById('lang').value;

    // New dictionary data
    let dict_stats = {};
    dict_stats['name'] = document.getElementById('name').value
    dict_stats['url'] = document.getElementById('url').value

    browser.runtime.sendMessage({type: 'edit_dict',
        dict_info: dict_info, dict: dict_stats},
        function (result) {
            set_up_items()
            document.getElementById('mod_dict_items').style.display = 'none';
            document.getElementById('choose_dictionary').style.display = 'inline';
            document.getElementById('show_status').style.display = 'inherit';

            // Confirm result
            let status = document.getElementById('show_status');
            status.textContent = `${dict_stats['name']} Modified`;
            status.style.display = 'inherit';
    });
});

