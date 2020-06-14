/**
 * Returns true if key is not a metadata value (aka is a url) and false otherwise
 *
 * @param {String} key
 */
function is_not_metadata(key) {
    return key !== 'default_dict' && key !== 'dicts' && key !== 'is_activated';
}

/**
 * Adds checkbox and non-styled link to url as an option under lists_of_urls div.
 *
 * @param {String} url
 */
function add_url_option(url) {
    let form_element = document.createElement('div');
    form_element.setAttribute('class', 'alt_form_element');

    let my_checkbox = document.createElement('input');
    my_checkbox.setAttribute('type', 'checkbox');
    my_checkbox.setAttribute('id', url);
    my_checkbox.setAttribute('name', url);
    form_element.append(my_checkbox);

    let label = document.createElement('div');
    label.setAttribute('href', url);
    label.setAttribute('target', '_blank');
    label.textContent = url;
    label.addEventListener('click', function () { // Open url in new tab
        window.open(url, '_blank');
    });
    form_element.append(label);

    let list_of_urls = document.getElementById('list_of_urls');
    list_of_urls.appendChild(form_element);
}

/**
 * Querries non-volatile storage of add-on for all urls that have hilights and
 * presnets them in website with the option of either deleteing them, or opening the url
 */
function get_sites() {
    let non_volatile_memory = window.localStorage;
    for (let i = 0; i < non_volatile_memory.length; i++) {
        let key = non_volatile_memory.key(i);
        console.log(key)
        if (is_not_metadata(key)) {  // not_metadata <-> key is url
            add_url_option(key);
        }
    }
}

get_sites(); // Initialize content of list_of_urls

// Delete non-volatile memory for all urls that were checked by user
document.getElementById('delete_sites').addEventListener('click', function () {
    let check_boxes = document.querySelectorAll('input[type=checkbox]:checked');
    for (let i = 0; i < check_boxes.length; i++) {
        let url = check_boxes[i].id;
        window.localStorage.removeItem(url);
    }
    document.getElementById('list_of_urls').innerHTML = '';
    get_sites();
});