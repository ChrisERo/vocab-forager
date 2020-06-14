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
    let get_current_dict = browser.runtime.sendMessage({type: 'get_current_dictionary_info'});
    let get_langs = browser.runtime.sendMessage({type: 'get_languages'});
    get_current_dict.then(function (result) {
        let current_dict_info = result; // current_dict_info of script
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

            // Change current_dict_info (in both volatile and non-volatile memory)
            // TODO: Remove this if no need
            document.getElementById('dictionaries').addEventListener("change", function () {
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
