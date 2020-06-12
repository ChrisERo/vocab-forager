/* Functions for Dictionary selection items, currently used in edit_dicts.html
   and popup.html*/

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
    let i = 0;
    for (; i < dictionary_selection.length; i++) {
        let z = document.createElement("option");
        z.setAttribute("value", `${i}`);
        let t = document.createTextNode(`${dictionary_selection[i].name}`);
        z.appendChild(t);

        select.appendChild(z);
    }

    // Use current_dict_info to get default selection
    if (current_dict_info != null) {
        let valueToSelect = `${current_dict_info.index}`;
        select.value = valueToSelect;
    } else if (i > 0) { // if there is anything to select
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
    let i = 0
    for (; i < languages.length; i++) {
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