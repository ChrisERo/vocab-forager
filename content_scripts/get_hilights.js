let vocabulario_data = {}; // objects representing hilighted sections of current page
const HILIGHT_CLASS = 'vocabulario_hilighted'; // class of hilighted sections in html page
let previous_on_mouse_up = document.onmouseup; // action onmouseup before extension 
                                               //took effect
let hilight_id_to_delete = null; // Data last hovered over to be deleted upon request


/**
 * Changes the node paths for each hilight element when element at
 * parents_children[target_element_index] is set to be removed
 *
 * @param {Array} parents_children - list of nodes under terget_element's parent node
 * @param {Number} target_element_index - index of element scheduled to be deleted
 * @param {Number} new_nodes_to_make - number of new nodes made by this deletion,
 *                                     usualy negative
 */
function update_hilight_node_paths(parents_children, target_element_index, new_nodes_to_make) {
    let el = parents_children[target_element_index];
    let target_id = extract_id(el);
    let continue_combining = true;
    for (element_index = target_element_index + 1;
        element_index < parents_children.length; element_index++) {
        let element = parents_children[element_index];
        if (element.classList != null && element.classList.contains(HILIGHT_CLASS)) {
            // No more combinations possible since hit non-text node
            continue_combining = false;

            let element_id = extract_id(element);
            console.assert(element_id > target_id,  // assure hilights reorderred on add
                {element_id: element_id,
                target_id: target_id,
                errMssg: 'target_id >= element_id'
            });
            let element_data = vocabulario_data[element_id];
            // Use start == end Node assumption {see selection_to_store_data()}
            element_data['startNodePath'][0] += new_nodes_to_make - 1;
            element_data['endNodePath'][0] += new_nodes_to_make - 1;
        } else if (continue_combining) {
            if (element.nodeName === '#text' &&
                el.childNodes[el.childNodes.length-1].nodeName === element.nodeName) {
                    new_nodes_to_make -= 1; // Combine text nodes previously seperated
            } else {
                continue_combining = false;
            }
        }
    }

}

/**
 * Get ID (in localStorage) of given element (a HILIGHT_CLASS element)
 *
 * @param {Node} element - must be a HILIGHT_CLASS element
 */
function extract_id(element) {
    let element_id = element.id;
    element_id = parseInt(element_id.substr('word_'.length,
        element_id.length - 'word_'.length));
    return element_id;
}

/**
 * Helper for udpate_hilight_offsets. Finds the index of the very next hilight element,
 * after the one in text_element_index, in parents_child and returns it unless there is a
 * non-text element between these two nodes
 *
 * @param {Array} parents_children - list of nodes under terget_element's parent node
 * @param {Number} target_element_index - index of element scheduled to be deleted
 */
function get_next_index(parents_children, target_element_index) {
    let el = parents_children[target_element_index]; // target element
    let el_id = extract_id(el);
    for (element_index = target_element_index + 1;
        element_index < parents_children.length; element_index++) {
            let element = parents_children[element_index];
            if (element.classList != null && element.classList.contains(HILIGHT_CLASS)) {
                let element_id = extract_id(element);
                console.assert(element_id > el_id,  // assure hilights reorderred on add
                    {element_id: element_id,
                    el_id: el_id,
                    errMssg: 'element_id >= el_id'
                });
                return  element_index;
            } else if (element.nodeName != '#text') {
                return null;
            }
    }
    return null;
}

/**
 * Updates offsets for HILIGHT_CLASS nodes/elements to the right of target_element_index
 * by adding new_offset
 *
 * Assumption: same as in delete_hilight()
 *
 * @param {Array} parents_children - list of nodes under terget_element's parent node
 * @param {Number} target_element_index - index of element scheduled to be deleted
 * @param {Number} new_offset - number to add to offsets of future hilights
 */
function udpate_hilight_offsets(parents_children, target_element_index, new_offset) {
    let next_index = get_next_index(parents_children, target_element_index);
    if (next_index == null) {return null;} // No hilights need offset updates

    // Only next hilight element needs offset modified per assumptions
    let next_hilight_element = parents_children[next_index];
    let next_hilight_element_id = extract_id(next_hilight_element);
    let json_data = vocabulario_data[next_hilight_element_id];
    json_data['startOffset'] += new_offset - 1;
    json_data['endOffset'] += new_offset - 1;

}

/**
 * Takes element referenced by hilight_id_to_delete and removes from localStorage, memory,
 * and the html page. Also Updates metadata of other HILIGHT_CLASS elements so that they
 * remained hilighted if page refreshed.
 *
 * Assumes h1.id > h2.id <--> h1 appears after h2 in a given element's branches,
 * where h1 and h2 are HILIGHT_CLASS nodes/elements
 */
function delete_hilight() {
    let id = hilight_id_to_delete;
    let el = document.getElementById(`word_${id}`);
    let parent = el.parentNode;
    parents_children = parent.childNodes;
    // Find index where element to delete is at in DOM tree
    let element_index;
    for (element_index = 0; element_index < parents_children.length; element_index++) {
        if (parents_children[element_index] == el) {
            break;
        }
    }
    // Change range for nodes in same element to right of deleted item so that
    // future hilight works
    let new_nodes_to_make = el.childNodes.length;
    let new_offset = el.textContent.length + 1; // Determine new offset
                                                // for first other hilight to right
                                                // regardless of id
    // Look behind to see if node is removed by combining, also modifies offset
    if (element_index != 0 &&
        el.childNodes[0].nodeName === parents_children[element_index-1].nodeName &&
        el.childNodes[0].nodeName === '#text') {
            new_nodes_to_make -= 1;
            new_offset += parents_children[element_index-1].textContent.length;
            parents_children[element_index-1].textContent += el.textContent;
    }

    update_hilight_node_paths(parents_children, element_index, new_nodes_to_make);
    udpate_hilight_offsets(parents_children, element_index, new_offset);

    // Save changes and remove hilight from current page
    delete vocabulario_data[id];
    browser.runtime.sendMessage({
        type: 'store_data', data: vocabulario_data,
        page:  window.location.href
    });

    // Make sure elements hilighted remain there after removal
    if (element_index === 0) {
        while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
        }
        element_index += 1;
    }
    parent.removeChild(el);
    // Combine DOM elements formed by hilight el back into what's at left of el
    while (parents_children[element_index].nodeName === '#text') {
       parents_children[element_index - 1].textContent += parents_children[element_index].textContent
        parent.removeChild(parents_children[element_index]);
    }
}

/**
 * Imports hilights.css, which contains styleing for elements of class HILIGHT_CLASS
 */
async function add_hilight_style_sheet() {
    // links don't work since href uses browser's current domain
    let hilight_style_sheet = document.createElement('style')
    hilight_style_sheet.innerHTML = "\
    .vocabulario_hilighted { \
        background-color: #ffff01; \
        display: inline;\
    } \
    .vocabulario_hilighted:hover {\
        border: 1.5px solid #6afff3;\
        cursor: pointer;\
    }";
    document.head.appendChild(hilight_style_sheet);
}

add_hilight_style_sheet(); // import style sheet

let storage_counter = -1; // used fore local storage purposes

/**
 * Gets node alluded to by node_path in html document
 * 
 * Assumes node_path represents a valid node in the document's DOM
 * 
 * @param {Array} node_path  - Array of integers where each element [i] represents the 
 * index of a node in the parent node [i+1], with the last element being a child node of
 * the body element.
 */
function node_path_to_node(node_path) {
    let node = document.body;
    for (i=node_path.length-1; i >= 0; i--) {
        node = node.childNodes[node_path[i]];
    }
    return node;
}

/**
 * Takes object representing hilighted section and returns Range of that selection.
 * 
 * Assumes store_data represents valid selection (has correct range data) in html page
 * 
 * @param {Object} store_data - object representing selection, seeselection_to_store_data
 * for object specifications
 */
function store_data_to_range(store_data) {
    let range = document.createRange();
    range.setStart(node_path_to_node(store_data.startNodePath), store_data.startOffset);
    range.setEnd(node_path_to_node(store_data.endNodePath), store_data.endOffset);
    return range;
}

/**
 * Uses currently-selected (default) dictionary to lookup word(s) in selected
 * 
 * @param {String} word - user-selected text in document
 * (assumed to be valid given current DOM)
 */
function lookup_word(word) { // TODO: move this to other content script after tab made
    if (word != '') {
        console.log(`lookingup: ${word}`);
        let get_url = browser.runtime.sendMessage({type: 'search_word_url', word: word});
        get_url.then(function (response) {
            let url = response;
            console.log(url);
            window.open(url, '_blank');
        });
    }
}

/**
 * Given a representation of user-selected text, wrap selection around
 * div tags with style for hilighting
 * 
 * @param {Object} json_data - object representing selection
 */
function hilight_json_data(json_data, id_num) {
    let range = store_data_to_range(json_data); 
    let surrounding_node = document.createElement('div');
    surrounding_node.setAttribute("id", `word_${id_num}`);
    surrounding_node.setAttribute('class', HILIGHT_CLASS);

    // Add Events for when div clicked, hovered over, moved away from
    surrounding_node.addEventListener('click', function () { // lookup word
        let word = this.textContent;
        lookup_word(word);

    });
    // add context menu for delete
    surrounding_node.addEventListener('mouseover', function () {
        browser.runtime.sendMessage({type: 'expose_delete_hilight'});
        // Store (numeric) id of element to delete
        hilight_id_to_delete = surrounding_node.id;
        hilight_id_to_delete = parseInt(hilight_id_to_delete.substr('word_'.length,
            hilight_id_to_delete.length - 'word_'.length));
    });
    // remove delete context menu
    surrounding_node.addEventListener('mouseout', function () {
        browser.runtime.sendMessage({type: 'remove_delete_hilight'});
    })
    range.surroundContents(surrounding_node);
}


/**
 * Given a Node, returns a list of integers representing the path from the Body node
 * to node, see node_path_to_node() for more details
 * 
 * @param {Node} node Node in document's DOM
 */
function storeNode(node) {
    let node_child_indecies = []; // indecies of elements in parents' child array, 
                                  // with last element being child of root
    let current_node = node;
    let root_node = document.body;
    while (current_node != root_node) {
        let parent_node = current_node.parentNode;

        // Get index of current_node in list of parent
        let current_node_index = null;
        for (i = 0; i < parent_node.childNodes.length; i++) {
            if (parent_node.childNodes[i] === current_node) {
                current_node_index = i;
                break;
            }
        }

        node_child_indecies.push(current_node_index);
        current_node = parent_node;
    }

   return node_child_indecies;
}

/**
 * Takes selection and converts to a Javascript Object that can be
 * Easily stored.
 * 
 * @param {Selection} selection - user-selected text in document
 */
function selection_to_store_data(selection) {
    let word = selection.toString();
    let range = selection.getRangeAt(0);
     // For now, assume all of seleciton is in same node
     // TODO: allow multi-node selections
    let data = {
        'word': word, // Useless for now, but will be good for quiz implementation
        'startOffset': range.startOffset,
        'endOffset': Math.max(range.endOffset, range.startOffset),
        'startNodePath': storeNode(range.startContainer),
        'endNodePath': storeNode(range.startContainer) //storeNode(range.endContainer)
    };
    console.log(`ATTEMPT: ${JSON.stringify(data)}`);
    return data;
}

/**
 * Changes IDs (and in effect ordering) of hilight elements so that all hilights inside
 * a given parent node have a smaller ID than all elements to their right. Also updates
 * these hilights' metadata (like offsets) to make sure hilights still work upon refresh
 *
 * Assumes new_element_id is key in vocabulario_data pointing to data referenced by
 * selected, that it equals selection_to_store_data(selected)
 *
 * @param {Selection} selected - Selection referencing hilight to be made
 * @param {Number} new_element_id - corresponding id of new hilight
 */
function reorder_hilights(selected, new_element_id) {
    let selected_node = selected.getRangeAt(0).startContainer;
    let parent_node = selected_node.parentNode;
    let parents_children = parent_node.childNodes;
    // Get hilight to right of selected hilight
    let selection_index = vocabulario_data[new_element_id]['startNodePath'][0];
    let insertion_id = new_element_id;

    let nodes_to_add =  Number(vocabulario_data[new_element_id]['startOffset'] != 0) +
        Number(vocabulario_data[new_element_id]['endOffset'] != 0);
    let offset_to_remove = vocabulario_data[new_element_id]['endOffset'];
    // Because of deleteings
    for (j = selection_index - 1; j >= 0; j--) {
        let node = parents_children[j];
        if (node.nodeName == '#text') {
            offset_to_remove += node.textContent.length;
            console.log(offset_to_remove)
        } else {
            break;
        }
    }

    let should_modify_future_offsets = true;
    let none_seen_to_right = true;
    for (i = selection_index + 1; i < parents_children.length; i++) {
        let element = parents_children[i];
        if (element.classList != null && element.classList.contains(HILIGHT_CLASS)) {
            // update right's data based on new addition
            let right_neighbor_id = extract_id(element);
            right_data = vocabulario_data[right_neighbor_id];
            right_data['startNodePath'][0] += nodes_to_add;
            right_data['endNodePath'][0] += nodes_to_add;
            if (should_modify_future_offsets) {
                right_data['startOffset'] -= offset_to_remove;
                right_data['endOffset'] -= offset_to_remove;

                should_modify_future_offsets = false;
            }

            // Swap ids in both html and vocabulario_data to enforce new ordering
            let right_element= document.getElementById(`word_${right_neighbor_id}`);
            console.log('Looking')
            if (none_seen_to_right) {
                console.log('Here')
                right_element.setAttribute('id', `word_${insertion_id}`);
                new_element_id = right_neighbor_id; // return id as id of new element
                none_seen_to_right = false; // Do action below for future
            } else {
                console.log('IN HERE')
                let new_node_element = document.getElementById(`word_${insertion_id}`);
                new_node_element.setAttribute('id', 'TEMP_HILIGHT');
                right_element.setAttribute('id', `word_${insertion_id}`);
                new_node_element.setAttribute('id', `word_${right_neighbor_id}`);
            }
            console.log('out')

            let temp = vocabulario_data[insertion_id];
            vocabulario_data[insertion_id] = vocabulario_data[right_neighbor_id];
            vocabulario_data[right_neighbor_id] = temp;

        } else if (element.nodeName != '#text') {
            // no need to update future offsets since encoutered non-text node
            should_modify_future_offsets = false;
        }
    }
    return new_element_id;
}

/**
 * Given selection, stores hilight in non-volatile storage and hilights text, wrapping
 * it in a div with css class HILIGHT_CLASS
 * 
 * @param {Selection} selected - user-selected text in document 
 * (assumed to be valid given current DOM)
 */
function log_selection(selected) {
    if (selected.toString() != '') {
        let json_data = selection_to_store_data(selected);
        let id_num = storage_counter;
        storage_counter += 1;
        vocabulario_data[id_num] = json_data;
        id_num = reorder_hilights(selected, id_num);
        let save_data = browser.runtime.sendMessage({type: 'store_data', data: vocabulario_data, page:  window.location.href});
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
 * Querries data regarding vocabulary stored for current page and hilights specified
 * vocabulary
 */
function set_up_content() {
    let load_data_for_page = browser.runtime.sendMessage(
        {type: 'get_page_vocab', page: window.location.href });
    load_data_for_page.then(function (result) {
        vocabulario_data = result.data;
        for (let key in vocabulario_data) {
            let data = vocabulario_data[key];
            let id_num = key;
            storage_counter = Math.max(storage_counter, id_num);
            hilight_json_data(data, id_num);
            // TODO: make this a try-catch and test with Diccionario in italix dle.rae.es
        }
        storage_counter += 1;


        // On Selection made, either hilight selected or lookup its text
        // Add this after promise completion to avoid "race condition" with new hilights
        previous_on_mouse_up = document.onmouseup;
        document.onmouseup = function () {
            let selected = window.getSelection();
            log_selection(selected);
        };
    },
    function (failReason) {
        alert('Data Failed to Load: ' + failReason); // Show failiure, for debugging
    });
}

/**
 * Removes hilights and their functinoality from page
 * NOTE that the css originally introduced is kept, but it should not do anything
 * ALSO: This does not revert the page back to its original DOM structure.
 * TODO: Consider removing css here also
 */
function tear_down_content() {
        let hilights = document.getElementsByClassName(HILIGHT_CLASS);
        // Move children (original) nodes to element's position
        while (hilights.length > 0) { // for loos don't work since elements removed
            // inspired heavily by
            // https://plainjs.com/javascript/manipulation/unwrap-a-dom-element-35/
            let element = hilights[0];
            let parent = element.parentNode;
            while (element.firstChild) {
                parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
        }

        // Undo onmouseup setup
        let temp = previous_on_mouse_up
        document.onmouseup = previous_on_mouse_up;
        previous_on_mouse_up = temp;
}

// Load data from memory and use to hilight things previously selected
let get_init_setup = browser.runtime.sendMessage({type: 'get_activation', page: window.location.href });
get_init_setup.then( function (result) {
    is_activated = result;
    if (is_activated) {
        set_up_content();
    }
});

// Listen for whether to activate or deactivate extension hilighting
browser.runtime.onMessage.addListener(request => {
    console.log('REQUEST MADE TO CONTENT');
    if (request.type == 'activation_form_pop') {
        let mssg = request.checked;
        if (!is_activated && mssg) {
            is_activated = mssg;
            location.reload(); // Can't call set_up_content: tear_down_content notes
        } else if (is_activated && !mssg) {
            is_activated = mssg;
            tear_down_content();
        }
    } else if (request.type === 'delete_chosen') {
        delete_hilight();

    } else {
        console.log('CONTENT_REQUEST UNKNOWN');
        console.log(`CONTENT_REQUEST ${request.type}`);
    }
  });
