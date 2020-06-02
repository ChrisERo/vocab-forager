let vocabulario_data = {}; // objects representing hilighted sections of current page
const HILIGHT_CLASS = 'vocabulario_hilighted'; // class of hilighted sections in html page
let previous_on_mouse_up = document.onmouseup; // action onmouseup before extension 
                                               //took effect
let hilight_id_to_delete = null; // Data last hovered over to be deleted upon request

/**
 * Get ID (in localStorage) of given element (a HILIGHT_CLASS element)
 *
 * @param {Node} element - must be a HILIGHT_CLASS element
 */
function extract_id(element) {
    let element_id = element.id;
    element_id = parseInt(element_id.substr('word_'.length,
        element_id.lastIndexOf('_') - 'word_'.length));
    return element_id;
}

/**
 * Get index in nodePaths of given element (a HILIGHT_CLASS element)
 *
 * @param {Node} element - must be a HILIGHT_CLASS HTML element
 */
function extract_index(element) {
    let index = element.id;
    index = parseInt(index.substr(index.lastIndexOf('_')+1,
        index.length - (index.lastIndexOf('_') + 1)));
    return index;
}

/**
 * Helper method for remove_hilights(), takes an ordered list of of HILIGHT_CLaASS 
 * elements with the same parent node and belong to hilight with id as word_{id}_* and
 * uses these elements, in particular the last one, to determine the new nodes and offsets
 * for other hilights and proceedes to delete all these hilight elements, reverting page
 * back to as if hilight never made 
 *
 * Assumes hilight_elemetns ordered in decending order and that its elements have
 * id as word_{id}_* and that id === hilight_id_to_delete. Also assume that each
 * HILIGHT_CLASS element has exactly a single #text child element
 *
 * @param {Array<Element>} hilight_elements - HILIGHT_CLASS elements of id hilight
 *                                         with same parent node
 * @param {Array<Number>} hilight_element_indecies - indecies in localstorage of elements
 *                                                   in hilight_elements
 * @param {Number} id - id of hilight entity in localStorage
 */
function remove_from_html_and_other_data(hilight_elements, 
        hilight_element_indecies, hilight_id) {
    console.assert(hilight_id === hilight_id_to_delete, 
        'ERROR, Deleteing different id than expected');
    let el = hilight_elements[hilight_elements.length-1]; // last element in 
                                                          // hilight_elements
    let parent = el.parentNode;
    let parents_children = parent.childNodes;

    // Find index where last element to delete is at in DOM tree
    // Don't use data on vocabulario_data since this stores position of nodes before
    // addition
    let element_index;  // index of last element in hilight_elements_id
    for (element_index = 0; element_index < parents_children.length; element_index++) {
        if (parents_children[element_index] === el) {
            break;
        }
    }
    console.assert(element_index < parents_children.length, 'ERROR, end node not found');

    // Change range for nodes in same element to right of deleted item so that
    // future hilights work
    let nodes_to_make = -2 * hilight_elements.length; // removing nodes = making negatives

    // Modify if last element in hilight indecies is last element of vocabulario_data[id]
    let should_modify_future_offsets = hilight_element_indecies[
        hilight_element_indecies.length - 1] == 
        vocabulario_data[hilight_id]['nodePaths'].length - 1;

    let new_offset = 0;
    if (should_modify_future_offsets) {
        new_offset = el.textContent.length; //vocabulario_data[hilight_id]['endOffset'];
        console.log(`NEW OFF: ${new_offset}`);
        // Uses assumption that h1.id < h2.id && h1.parent == h2.parent <-->
        // h1 is before h2 in DOM traversal relative to parent
        console.assert(element_index != 0, 'Assumption on how hilights made broken');

        // Calcualte new offset based on #texts before and after el
        let counter = element_index - 1;
        while (counter >= 0 && parents_children[counter].nodeName === '#text') {
            console.log(`NEW: ${new_offset}`);
            new_offset += parents_children[element_index-1].textContent.length;
            counter--;
        }
    }
    console.log(`NEW OFFSET: ${new_offset}`);
    new_offset = -new_offset; // adding this offset requires negative offset

    let temp_set = new Set();  // simply used to get add_nodes_and_offsets to work
    add_nodes_and_offsets(parent, 0, nodes_to_make, new_offset, element_index + 1, 
        should_modify_future_offsets, temp_set);
    delete temp_set;

    // Remove hilights of hilight_elements from html while maintaining structure of text
    // before hilight
    for (let element of hilight_elements) {
        console.assert(element.childNodes.length === 1 &&
            element.childNodes[0].nodeName === '#text',
            `Error, hilight element has ${element.childNodes.length} 
            nodes and the first is of type 
            ${element.childNodes.length === 0 ? null : element.childNodes[0].nodeName}`);

        for (element_index = 0; element_index < parents_children.length;
            element_index++) {
                if (parents_children[element_index] === element) {
                    break;
                }
        }

        console.assert(element_index > 0 && 
            parents_children[element_index-1].nodeName === '#text', 
            'Node before not text');
        console.assert(element_index < parents_children.length - 1 &&
            parents_children[element_index+1].nodeName === '#text', 
            'Node after is not text');
        
        // Used for deleteing extra nodes on left and right, made by creation of div
        let node_after = parents_children[element_index+1];
        let is_node_after_empty = node_after.textContent === '';
        let index_before = element_index - 1;
        let node_before = parents_children[index_before];

        node_before.textContent += element.textContent;
        parent.removeChild(element);
        if (is_node_after_empty) {
            parent.removeChild(node_after);
        }

        // Combine iresulting #text element with #text elements to left and right of it
        while (index_before > 0 && is_text_node(parents_children[index_before - 1])) {
            parents_children[index_before - 1].textContent += node_before.textContent;
            parent.removeChild(node_before);
            index_before--;
            node_before = parents_children[index_before];
        }
        while (index_before < parents_children.length-1 && is_text_node(
                parents_children[index_before + 1])) {
            let node_after = parents_children[index_before + 1];
            node_before.textContent += node_after.textContent;
            parent.removeChild(node_after);
        }
    }
}

/**
 * Gets all HILIGHT_Class elements with hilight_id as id in (word_{hilight_id}_*), gorups
 * them by parent node (in depth-traversal order). Then, on per-parent basis, removes 
 * these nodes from the html page and from other hilights' offsets.
 *
 * Assumes hilight_id is a valid id (word_{id}) of a section hilighted by this addon.
 * Also assumes that querySelectorAll orders elements in depth-first traversal ascending
 * order (https://www.w3.org/TR/selectors-api/#queryselectorall)
 *
 * @param {Number} hilight_id
 */
function remove_hilights(hilight_id) {
    // Get hilights orgainized by their parent node
    let hilight_elements = document.querySelectorAll(
        `[id^=word_${hilight_id}_]`);
    let parents_to_hilights = new Map(); // TODO: make this common function
    let parents_to_hilight_paths_indecies = new Map();
    for (let i = 0; i <  hilight_elements.length; i++) {
        element = hilight_elements[i];
        let parent = element.parentNode;
        if (!parents_to_hilights.has(parent)) {
            parents_to_hilights.set(parent, []);
            parents_to_hilight_paths_indecies.set(parent, []);
        }
        parents_to_hilights.get(parent).push(element);
        parents_to_hilight_paths_indecies.get(parent).push(i);
    }

    // Depth-first assumption used here
    parents_to_hilights.forEach(function (value, key) {
        let selected_nodes = value;
        remove_from_html_and_other_data(selected_nodes, 
            parents_to_hilight_paths_indecies.get(key),
            hilight_id);
    });
}

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
        remove_hilights(hilight_id_to_delete);
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
 * Imports hilights.css, which contains styleing for elements of class HILIGHT_CLASS
 */
async function add_hilight_style_sheet() {
    // links don't work since href uses browser's current domain
    let hilight_style_sheet = document.createElement('style')
    hilight_style_sheet.innerHTML = "\
    .vocabulario_hilighted { \
        background-color: #ffff01 !important; \
        display: inline !important;\
    } \
    .vocabulario_hilighted_hover {\
        border-top: 2px solid #6afff3 !important;\
        border-bottom: 2px solid #6afff3 !important;\
        cursor: pointer !important;\
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
 * Takes object representing hilighted section and returns all nodes of that selection.
 * 
 * Assumes store_data represents valid selection (has correct range data) in html page
 * 
 * @param {Object} store_data - object representing selection, seeselection_to_store_data
 * for object specifications
 */
function store_data_to_range(store_data) {
    console.log(JSON.stringify(store_data['nodePaths']));
    return store_data['nodePaths'].map(node_path_to_node);
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
    console.log('Hilight_started');
    let nodes_to_hilight = store_data_to_range(json_data); 
    console.log('Got Nodes from paths');
    for (let index = 0; index < nodes_to_hilight.length; index++) {
        let node = nodes_to_hilight[index];
        // Initialize hilight div node with speicfied pertinent listeners
        let surrounding_node = document.createElement('div');
        surrounding_node.setAttribute("id", `word_${id_num}_${index}`);
        surrounding_node.setAttribute('class', HILIGHT_CLASS);
        console.log('Got Basics');
        // Lookup hilighted word if hilight clicked on
        surrounding_node.addEventListener('click', function () {
            let word = json_data['word']; // TODO: should be fine since this must remain constant
            lookup_word(word);
        });
        // Add context menu for deleteing hilight and add css for onhover
        surrounding_node.addEventListener('mouseover', function () {
            let id_num =  extract_id(surrounding_node); // may change because of deletes
            browser.runtime.sendMessage({type: 'expose_delete_hilight'});
            // Store (numeric) id of element to delete
            hilight_id_to_delete = id_num;
            // Add onhover css style to all parts of hilight
            let elements = document.querySelectorAll(
                    `[id^=word_${id_num}_]`);
            for (let el of elements) {
                el.classList.add("vocabulario_hilighted_hover");
            }
        });
        // Remove delete context menu and onhover, hilighted class
        surrounding_node.addEventListener('mouseout', function () {
            browser.runtime.sendMessage({type: 'remove_delete_hilight'});
            let id_num =  extract_id(surrounding_node);
            let elements = document.querySelectorAll(
                `[id^=word_${id_num}_]`);
            for (let el of elements) {
                el.classList.remove("vocabulario_hilighted_hover");
            }
        });
        console.log('Got Listeners');

        // Surround node of jsondata with surrounding_node
        let range = new Range();
        let startOffset = 0;
        let endOffset = node.textContent.length;
        if (node === nodes_to_hilight[0]) {
            startOffset = json_data['startOffset']
        } 
        if (node === nodes_to_hilight[nodes_to_hilight.length-1]) {
            endOffset = json_data['endOffset'];
        } 
        console.log(`${node.textContent}, ${startOffset}`);
        range.setStart(node, startOffset);
        range.setEnd(node, endOffset);
        range.surroundContents(surrounding_node);
    }
    console.log('Hilight Done');;
}

/**
 * Takes selection and converts to a Javascript Object that can be
 * Easily stored.
 * 
 * @param {Selection} selection - user-selected text in document
 * @param {Array<Node>} nodes - nodes that are all part of selection
 */
function selection_to_store_data(selection, nodes) {
    let word = selection.toString();
    let range = selection.getRangeAt(0);
    let data = {
        'word': word, // Useless for now, but will be good for quiz implementation
        'startOffset': range.startOffset,
        // Handle potentiall trimming of last node
        'endOffset': range.endOffset,
        'nodePaths': nodes.map(storeNode)
    };
    console.log(`ATTEMPT: ${JSON.stringify(data)}`);
    return data;
}

/**
 * Given a parent node and starting point, updates the metadata for all nodes to right of
 * start_index (inclusiove) that have root_node as ancestor.
 *
 * @param {Node} root_node - parent of all nodes to consider
 * @param {Number} depth - how deep we are down tree 
 *                         starting with first call being depth 0
 * @param {Number} nodes_to_add - number of nodes to add to all future hilights
 * @param {Number} offset_to_remove - number of offsets to remove by a hilights addtion
 * @param {Number} start_index - index of child of root_node from which to start algorithm
 * @param {boolean} should_modify_future_offsets - true whether the startOffset 
 *                                                 (and maybe endOffset of an encountered
 *                                                 hilight should be modified)
 * @param {Set} encountered_ids - Set of ids that have been encountered during traversal
 */
function add_nodes_and_offsets(root_node, depth, nodes_to_add, 
    offset_to_remove, start_index, should_modify_future_offsets, encountered_ids) {
        if (!root_node.hasChildNodes()) {
            return;
        }
        let parents_children = root_node.childNodes;
        for (let n_index = start_index; n_index < parents_children.length; n_index++) {
            let child = parents_children[n_index];
            console.log(`${child.nodeName}, ${should_modify_future_offsets}`)
            if (is_hilight_node(child)) {
                let right_neighbor_id = extract_id(child);
                right_data = vocabulario_data[right_neighbor_id];
                encountered_ids.add(right_neighbor_id);

                // Update right's data based on new addition
                let right_node_index = extract_index(child);
                // Node offset changed because of additional nodes
                right_data['nodePaths'][right_node_index][depth] += nodes_to_add; 
                if (should_modify_future_offsets) {
                    // TODO: assert depth is 0
                    right_data['startOffset'] -= offset_to_remove;
                    // modify last offset iff start and end nodes for right_node 
                    // are the same
                    if (right_data['nodePaths'].length === 1) {
                        right_data['endOffset'] -= offset_to_remove;
                    }
                    should_modify_future_offsets = false;
                }
            } else {
                // don't do check once should_modify is false or current node is not text
                should_modify_future_offsets =  should_modify_future_offsets && 
                    child.nodeName === '#text';
                add_nodes_and_offsets(child, depth+1, nodes_to_add, 
                    0, 0, false, encountered_ids);
            }
        }
    }

/**
 * Given list of encountered_ids, modify ids in html and disk and memory so that future 
 * hilights work and invariants maintained
 *
 * @param {Array} encountered_ids - ordered list of ids of hilights
 * @param {Number} new_element_id - current id of new hilight that will be added
 */
function modify_ids_for_hilight(encountered_ids, new_element_id) {
    let insertion_id = new_element_id;
    // Swap ids in both HTML to enforce new ordering
    console.log(`ENCOUNTERED_IDS: ${encountered_ids}`)
    for (j = 0; j < encountered_ids.length; j++ ) {
        let right_neighbor_id = encountered_ids[j];
        let right_elements = document.querySelectorAll(
            `[id^=word_${right_neighbor_id}_]`);
        console.log('Looking');
        if (j === 0) { // insertion_id not in any div, so just substitute
            console.log('Here');
            for (n of right_elements) {
                console.log(n.id);
                let index = extract_index(n);
                n.setAttribute('id', `word_${insertion_id}_${index}`);
            }
            new_element_id = right_neighbor_id; // return id as id of new element
            none_seen_to_right = false; // Do action below for future
        } else {
            console.assert(right_neighbor_id > encountered_ids[j-1], 
                'encountered_ids not ordered propperly');
            console.log('IN HERE');
            let new_node_elements = document.querySelectorAll(
                `[id^=word_${insertion_id}_]`);
            for (n of new_node_elements) {
                console.log(n.id);
                let index = extract_index(n); 
                n.setAttribute('id', `TEMP_HILIGHT_${index}`); 
                // structure of TEMP id used in other parts of this function
            }
            for (n of right_elements) {
                console.log(n.id);
                let index = extract_index(n); 
                n.setAttribute('id', `word_${insertion_id}_${index}`);
            }
            for (n of new_node_elements) { // Use TEMP structure to get index here
                let index = n.id.substr(n.id.lastIndexOf('_')+1, 
                    n.id.length - (n.id.lastIndexOf('_')+1));
                n.setAttribute('id', `word_${right_neighbor_id}_${index}`);
            }
        }
        console.log('out');

        // Swap in vocabulario_data
        let temp = vocabulario_data[insertion_id];
        vocabulario_data[insertion_id] = vocabulario_data[right_neighbor_id];
        vocabulario_data[right_neighbor_id] = temp;
    }
    console.log('done modifying hilights in html and localStorage');
    return new_element_id;
}

/**
 * Changes IDs (and in effect ordering) of hilight elements so that all hilights inside
 * a given parent node have a smaller ID than all elements to their right. Also updates
 * these hilights' metadata (like offsets) to make sure hilights still work upon refresh
 *
 * Assumes new_element_id is key in vocabulario_data pointing to data referenced by
 * selected, that it equals selection_to_store_data(selected)
 *
 * @param {Array<Node>} selected - Nodes hilighted as part of selection that have same direct parent
 * @param {Number} new_element_id - corresponding id of new hilight
 * @param {Array<Number>} node_path_indecies
 * @param {Set} encountered_ids
 */
function reorder_hilights_for_one_parent(selected, new_element_id, 
            node_path_indecies, encountered_ids) {
    let selected_node = selected[selected.length - 1]; // very last node of selection
    let parent_node = selected_node.parentNode;
    let parents_children = parent_node.childNodes;
    // Get hilight at right most of selected hilight
    let index_of_last_node = node_path_indecies[node_path_indecies.length - 1];
    let selection_index = vocabulario_data[new_element_id]['nodePaths'][index_of_last_node][0];
    // Number of nodes to add to proceedeing hilights with same (direct) parent_node
    // Using assumption that hilights only done on top of a single #text element
    let nodes_to_add =  selected.length*2 // empty #texts added when hilight goes to boundary, so 2 nodes always added 

    let offset_to_remove = 
    vocabulario_data[new_element_id]['nodePaths'].length-1 === index_of_last_node ? 
        vocabulario_data[new_element_id]['endOffset'] :
        0;
    // Add onto offset_to_remove if endNode has #text nodes directly to its left
    for (let j = selection_index - 1; j >= 0; j--) {
        let node = parents_children[j];
        if (node.nodeName == '#text') {
            offset_to_remove += node.textContent.length;
            console.log(offset_to_remove);
        } else {
            break;
        }
    }
    add_nodes_and_offsets(parent_node, 0, nodes_to_add, offset_to_remove, 
        selection_index + 1, true, encountered_ids);
    console.log('Finished For One Parent');
}

/**
 * Modifies ids of hilights after selected so that assumptoins hold
 *
 * @param {Array<Node>} selected - Nodes hilighted as part of selection
 * @param {Number} new_element_id - current id of new hilight
 */
function reorder_hilights_main(selected, new_element_id) {
    let parents_to_hilight_nodes = new Map();
    let parents_to_hilight_paths_indecies = new Map();
    for (let i = 0; i < selected.length; i++) {
        let element = selected[i];
        let parent = element.parentNode;
        if (!parents_to_hilight_nodes.has(parent)) {
            parents_to_hilight_nodes.set(parent, []);
            parents_to_hilight_paths_indecies.set(parent, []);
        }
        parents_to_hilight_nodes.get(parent).push(element);
        parents_to_hilight_paths_indecies.get(parent).push(i);
    }

    console.log('About to change offsets')
    let encountered_ids = new Set();
    parents_to_hilight_nodes.forEach(function (value, key, map) {
        let node_path_indecies = parents_to_hilight_paths_indecies.get(key);
        console.log('stuff');
        reorder_hilights_for_one_parent(value, new_element_id, node_path_indecies, 
            encountered_ids);
    }); 
    encountered_ids =  Array.from(encountered_ids);
    encountered_ids.sort(numeric_compare_function);
    return modify_ids_for_hilight(encountered_ids, new_element_id);
  
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
        let nodes_to_hilight = get_nodes_to_hilight(selected);
        if (nodes_to_hilight == null || nodes_to_hilight.length === 0) {
            return;
        }
        let json_data = selection_to_store_data(selected, nodes_to_hilight);
        let id_num = storage_counter;
        storage_counter += 1;
        vocabulario_data[id_num] = json_data;
        id_num = reorder_hilights_main(nodes_to_hilight, id_num);
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
        }
        storage_counter += 1;


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
let get_init_setup = browser.runtime.sendMessage({
    type: 'get_activation', page: window.location.href });
get_init_setup.then( function (result) {
    is_activated = result;
    if (is_activated) {
        set_up_content();
    }
});

// Listen for whether to activate or deactivate extension hilighting
browser.runtime.onMessage.addListener(request => {
    console.log('REQUEST MADE TO CONTENT');
    if (request.type == 'activation_from_pop') {
        let mssg = request.checked;
        if (!is_activated && mssg) {
            is_activated = mssg;
            location.reload(); // Can't call set_up_content: tear_down_content notes
        } else if (is_activated && !mssg) {
            is_activated = mssg;
            tear_down_content();
        }
    } else if (request.type === 'delete_chosen') {
        delete_hilights();
    } else {
        console.log('CONTENT_REQUEST UNKNOWN');
        console.log(`CONTENT_REQUEST ${request.type}`);
    }
  });
