/**
 * Querries whether extension should be activated or not from from extension's 
 * localStorage. If value is not set, initializes to false and returns this value
 */
function get_current_activation() {
    let my_activation = window.localStorage.getItem('is_activated');
    if (my_activation === null || my_activation === undefined) {
        my_activation = false;
        window.localStorage.setItem('is_activated', '0');
    } else {
        my_activation = Boolean(parseInt(my_activation));
    }

    return my_activation;
}

get_current_activation(); // Perform initial setup

/**
 * Sets in localStorage whether the extension should be activated
 * 
 * @param {boolean} is_activated - whether extension should be activated on pages or not
 */
function set_current_activation(is_activated) {
    console.log(is_activated);
    let my_activation = Number(is_activated);
    window.localStorage.setItem('is_activated', my_activation.toString());
}