function store_dictionary(dict_object, language) {
    let dictionaries = window.localStorage.getItem('dicts');
    dictionaries = JSON.parse(dictionaries);
    
    // Check if language exists
    if (language in dictionaries) {
        dictionaries[language].push(dict_object);
    } else {
        dictionaries[language] = [dict_object];
    }
    //console.log(JSON.stringify(dictionaries));
    window.localStorage.setItem('dicts', JSON.stringify(dictionaries));  
}

document.getElementById('submit').addEventListener("click", function () {
    let dict_object = {name: document.getElementById('name').value, url: document.getElementById('url').value};
    let language = document.getElementById('lang').value;
    store_dictionary(dict_object, language);
    alert(`Stored ${dict_object.name}`);
});