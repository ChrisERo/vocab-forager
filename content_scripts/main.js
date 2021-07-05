/* Datastructures and functions enabling and identifying key actions */

let vocabulario_data = {}; // objects representing hilighted sections of current page
let previous_on_mouse_up = document.onmouseup; // action onmouseup before extension 
                                               //took effect
let hilight_id_to_delete = null; // Data last hovered over to be deleted upon request
let storage_counter = -1; // used fore local storage purposes


/**
 * Takes element referenced by hilight_id_to_delete and removes from localStorage, memory,
 * and the html page. Also Updates metadata of other HILIGHT_CLASS elements so that they
 * remained hilighted if page refreshed.
 *
 * Assumes h1.id > h2.id && h1.parent == h2.parent <--> h1 appears after h2 in a given 
 * element's branches, where h1 and h2 are HILIGHT_CLASS nodes/elements
 */
function delete_hilights() {
    try {
        console.log(`Deleting hilight: ${hilight_id_to_delete}`);
        remove_hilights(hilight_id_to_delete, true, vocabulario_data);
        // Save changes in volatile and non-volatile state
        delete vocabulario_data[hilight_id_to_delete];
        browser.runtime.sendMessage({
            type: 'store_data', data: vocabulario_data,
            page:  window.location.href
        });
        hilight_id_to_delete = null;
    } catch(err) {
        alert(`${err}\n ${err.stack}`);
    }
}

/**
 * Given selection, stores hilight in non-volatile storage and hilights text, wrapping
 * it in a div with css class HILIGHT_CLASS.
 *
 * Also modifies start and end offsets for selected if need be
 * 
 * @param {Selection} selected - user-selected text in document 
 * (assumed to be valid given current DOM)
 */
function log_selection(selected) {
    if (selected.toString() != '') {
        console.log(`Highlighting ${selected.toString()}`);
        let nodes_to_hilight = get_nodes_to_hilight(selected);
        if (nodes_to_hilight == null || nodes_to_hilight.length === 0) {
            return;
        }
        let json_data = selection_to_store_data(selected, nodes_to_hilight);
        let id_num = storage_counter;
        storage_counter += 1;
        vocabulario_data[id_num] = json_data;
        id_num = reorder_hilights_main(nodes_to_hilight, id_num, vocabulario_data);
        let save_data = browser.runtime.sendMessage(
            {type: 'store_data', data: vocabulario_data, page:  window.location.href});
        save_data.then(function (result) {
            hilight_json_data(json_data, id_num);
        },
        function (failReason) {
            alert('Data Failed to Save: ' + failReason);
        });
    }
}


let is_activated = false; // Stores last value of is_activated read by this script

/**
 * Removes hilights and their functinoality from page
 * NOTE that the css styling introduced by add_hilight_style_sheet is kept, though inert
 * TODO: Consider removing css here also
 */
 function tear_down_content() {
    let ids = Object.getOwnPropertyNames(vocabulario_data);
    for (let i = ids.length-1; i >= 0; i--) { // Backwards to avoid id changes
        let id = ids[i];
        remove_hilights(id, false, vocabulario_data);
    }
    // Undo onmouseup setup
    let temp = previous_on_mouse_up
    document.onmouseup = previous_on_mouse_up;
    previous_on_mouse_up = temp;

    // Reset metadata
    vocabulario_data = {};
}

/**
 * Querries data regarding vocabulary stored for current page and hilights specified
 * vocabulary
 */
function set_up_content() {
    let load_data_for_page = browser.runtime.sendMessage(
        {type: 'get_page_vocab', page: window.location.href });
    load_data_for_page.then(function (result) {
        vocabulario_data = result.data;
        try {
            for (let key in vocabulario_data) {
                let data = vocabulario_data[key];
                let id_num = key;
                storage_counter = Math.max(storage_counter, id_num);
                hilight_json_data(data, id_num);
            }
        } catch (err) {
            alert(`${err}\n${err.stack}`);
            let og_vocab_data = { ...vocabulario_data}
            tear_down_content();
            vocabulario_data = recover_highlights(og_vocab_data);
        }
        storage_counter += 1; // Needed for creating new hilights


        // On Selection made, either hilight selected or lookup its text
        // Add this after promise completion to avoid "race condition" with new hilights
        previous_on_mouse_up = document.onmouseup;
        document.onmouseup = function (e) {
            let selected = window.getSelection();
            try {
                // Check if primary button (left) used
                if (e.button === 0)  {
                    log_selection(selected);
                }
            } catch (err) {
                alert(`${err}\n${err.stack}`);
            }
        };
    },
    function (failReason) {
        alert('Data Failed to Load: ' + failReason); // Show failiure, for debugging
    });
}

// Load data from memory and use to hilight things previously selected
setTimeout(function () {
    let get_init_setup = browser.runtime.sendMessage({
        type: 'get_activation', page: window.location.href });
    get_init_setup.then( function (result) {
        is_activated = result;
        if (is_activated) {
            set_up_content();
        }
    });
}, 800);

// Listen for whether to activate or deactivate extension hilighting
browser.runtime.onMessage.addListener(request => {
    console.log(`REQUEST MADE TO CONTENT SCRIPT: ${request.type}`);
    if (request.type == 'activation_from_pop') {
        try {
            let mssg = request.checked;
            if (!is_activated && mssg) {
                set_up_content();
            } else if (is_activated && !mssg) {
                tear_down_content();
            }
            is_activated = mssg; // May need to move above if logic changes
        }
        catch (err) {
            alert(`${err}\n${err.stack}`);
        }
    } else if (request.type === 'delete_chosen') {
        delete_hilights();
    } else if (request.type === 'quiz_context_menu') {
        if (!quiz_set && vocabulario_data != null && !is_vocab_empty(vocabulario_data)) {
            quiz_set = true;
            load_quiz_html(vocabulario_data);
        }
    } else {
        console.log(`CONTENT_REQUEST UNKNOWN: ${request.type}`);
    }
  });
