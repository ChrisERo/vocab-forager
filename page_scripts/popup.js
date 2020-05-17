function make_dictionary_selection(dictionary_selection, current_dict_info) {
    let select = document.getElementById('dictionaries');
    select.innerHTML = "";
    for (i = 0; i < dictionary_selection.length; i++) {
        var z = document.createElement("option");
        z.setAttribute("value", `${i}`);
        var t = document.createTextNode(`${dictionary_selection[i].name}`);
        z.appendChild(t);
        
        select.appendChild(z);
    }

    if (current_dict_info != null) {
        let valueToSelect = `${current_dict_info.index}`;
        select.value = valueToSelect;
    } else {
        select.value = '0';
    }

}

function make_language_selection(languages, current_dict_info) {
    console.log(JSON.stringify(languages))
    let select = document.getElementById('languages');
    select.innerHTML = "";
    let valueToSelect = null;
    for (i = 0; i < languages.length; i++) {
        var z = document.createElement("option");
        z.setAttribute("value", `${i}`);
        var t = document.createTextNode(`${languages[i]}`);
        z.appendChild(t);
        
        select.appendChild(z);

        if (current_dict_info != null && languages[i] == current_dict_info.language) {
            valueToSelect = `${i}`;
        }
    }

    if (valueToSelect != null) {
        select.value = valueToSelect;
    }
    
}

document.getElementById('new_dict').addEventListener("click", function () {
    browser.tabs.create({
        url:"new_dict.html"
    });
});

let get_current_dict = browser.runtime.sendMessage({type: 'get_current_dictionary_info'});
let get_langs = browser.runtime.sendMessage({type: 'get_languages'});
get_current_dict.then(function (result) {
    let current_dict_info = result;
    let dictionary_selection = [];

    if (current_dict_info != null) {
        console.log(current_dict_info.language);
        let gdfl = browser.runtime.sendMessage({type: 'get_dictionaries_from_langauge', language: current_dict_info.language});
        gdfl.then(function (result) {
            dictionary_selection = result;
            make_dictionary_selection(dictionary_selection, current_dict_info);
        });
    } 

   get_langs.then(function (result) {
    let languages = result;
    if (languages == null) {
        languages = [];
    } 
    make_language_selection(languages, current_dict_info);
    
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

    document.getElementById('dictionaries').addEventListener("click", function () {
        let my_lang = document.getElementById('languages').value;
        my_lang = parseInt(my_lang);
        my_lang = languages[my_lang];
        let index = document.getElementById('dictionaries').value;
        index = parseInt(index);
        browser.runtime.sendMessage({type: 'set_current_dictionary', index: index, language: my_lang}); // Can be done asynch completely
        current_dict_info = {language: my_lang, index: index};
    });
   });
}); 
