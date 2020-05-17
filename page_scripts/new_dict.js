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

document.getElementById('submit').addEventListener("click", function () {
    let dict_object = {name: document.getElementById('name').value, url: document.getElementById('url').value};
    let language = document.getElementById('lang').value;
    store_dictionary(dict_object, language);
    alert(`Stored ${dict_object.name}`);
});