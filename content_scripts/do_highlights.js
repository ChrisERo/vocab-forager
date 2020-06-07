/* Core functions for adding highlights for a webpage and modifying html to show hilights */

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
    return data;
}

/**
 * Returns the first #text node that is a decendent of node, including node itself
 *
 * @param {Node} node - Node in document.body
 */
function get_first_text_node(node) {
    if (is_text_node(node)) {
        return node;
    } else if (!node.hasChildNodes()) {
       return null;
   } else {
        let nodes_children = node.childNodes;
        for (let child of nodes_children) {
            let t = get_first_text_node(child);
            if (t != null) {
                return child;
            }
        }
        return null;
    }
}

/**
 * Given node, returns a Map whose keys are all ancestors of node (excluding node)
 * and whose values are the index of either node itself, or another one of its
 * ancestors in key's childNodes array
 *
 * Returns null if any ancestor of node is a HILIGHT_CLASS node
 *
 * @param {Node} node - Node that is a decendant of document.body element
 */
function initialize_explored_nodes(node) {
    let result = new Map();
    let node_path = storeNode(node);
    let current_node = node.parentNode;
    for (let i = 0; i < node_path.length; i++) {
        if (is_hilight_node(current_node)) {
            return null;
        }
        let index_in_parent = node_path[i];
        result.set(current_node, index_in_parent);
        current_node = current_node.parentNode;
    }
    return result;
}

/**
 * Returns an ordered array of all text nodes in between startNode and endNode inclusive.
 * Returns null if a hilight node is discovered to be inbetween these two nodes.
 *
 * Assumes that startNode is ordered before endNode in document.body and that both
 * startNode and endNode are text nodes
 *
 * @param {Node} startNode 
 * @param {Node} endNode 
 */
function get_nodes_to_hilight_buisness_logic(startNode, endNode) {
    let current_node = startNode;
    let nodes_to_hilight = [];
    let explored_nodes = initialize_explored_nodes(startNode);
    if (explored_nodes == null) {
        return null;
    }

    while (current_node !== endNode) {
        // If already "seen" current_node, go to next node or parent node if all seen
        // NOTE: assume that text nodes would never have children nodes
        if (explored_nodes.has(current_node)) {
            if (explored_nodes.get(current_node) >= current_node.childNodes.length) {
                let neighbor = current_node.nextSibling;
                current_node = neighbor == null ? current_node.parentNode : neighbor;
            } else {
                let my_new_index = explored_nodes.get(current_node) + 1;
                explored_nodes.set(current_node, my_new_index); // Update state
                // Change current_node if current_index has an unexplored child node
                if (my_new_index < current_node.childNodes.length) {
                    current_node = current_node.childNodes[my_new_index];
                }
            }
        } else {
            explored_nodes.set(current_node, 0);
            if (!is_text_node(current_node)) {
                if (is_hilight_node(current_node)) {
                    return null;
                } else if (current_node.hasChildNodes()) { // Go down first child node
                    current_node = current_node.childNodes[0];
                }
            } else { // Add text nodes to list of nodes to hilight
                nodes_to_hilight.push(current_node);
            }
        }
    }

    nodes_to_hilight.push(endNode);
    if (nodes_to_hilight[nodes_to_hilight.length-1] == null) {
        return null;
    }
    return nodes_to_hilight;
}

/**
 * Gets either the first or the last node under the root Node (including root itself) that
 * is a text node (or None if none exists). Whether to look for first first or last node
 * depends on look_for_last parameter. By first or last, we assume Depth-first traversal
 * order of page's DOM tree
 *
 * @param {Node} root - node under which to look for first or last text node
 * @param {boolean} look_for_last - if true, look for last text node, else look for first
 */
function find_first_or_last_text(root, look_for_last) {
    if (is_text_node(root)) {
        return root;
    } else if (root.hasChildNodes()) {
        if (look_for_last) {
            for (let i = root.childNodes.length - 1; i >= 0; i--) {
                let child = root.childNodes[i];
                let result = find_first_or_last_text(child, look_for_last);
                if (is_text_node(result)) {
                    return result;
                }
            }
        } else {
            for (let i = 0; i < root.childNodes.length; i++) {
                let child = root.childNodes[i];
                let result = find_first_or_last_text(child, look_for_last);
                if (is_text_node(result)) {
                    return result;
                }
            }
        }
        // Nothing found, return null
        return null;
    } else {
        return null;
    }
}

/**
 * Given a range, modifies parameter so that startContainer is the first text node under
 * startContainer and endContainer is the last text node under endContainer
 * (including container's themselves in both cases). Offsets are modified if corresponding
 * container is modified to include all contents of the container.
 *
 * Returns false if either startContainer or endContainer have no text nodes underneath
 * them in DOM tree and true otherwise
 *
 * @param {Range} range - range of selection
 */
function modify_range(range) {
    if (!is_text_node(range.startContainer)) {
        if (range.startContainer.hasChildNodes()) {
            range.setStart(range.startContainer.childNodes[range.startOffset], 0);
        }
        let new_start_node = find_first_or_last_text(range.startContainer, false);
        if (new_start_node == null) {
            return false;
        }
        range.setStart(new_start_node, 0);
    }
    if (!is_text_node(range.endContainer)) {
        if (range.endContainer.hasChildNodes()) {
            // Offset does not matter here
            range.setEnd(range.endContainer.childNodes[range.endOffset-1], 0);
        }
        let new_end = find_first_or_last_text(range.endContainer, true);
        if (new_end == null) {
            return false;
        }
        range.setEnd(new_end, new_end.textContent.length);
    }

    return true;
}

/**
 * Given a Selection, determines all the #text nodes that will be hilighted
 * 
 * @param {Selection} selected 
 */
function get_nodes_to_hilight(selected) {
    let range = selected.getRangeAt(0);
    let text_nodes_found = modify_range(range);
    if (!text_nodes_found) {
        throw 'Invalid initial range'
    }
    let startNode = range.startContainer;
    let endNode = range.endContainer;

    let nodes_to_hilight = get_nodes_to_hilight_buisness_logic(startNode, endNode);
    // Check to make sure that some element was selected and a hilight wasn't chosen
    if (nodes_to_hilight == null) {
        throw 'There was an error, make sure that you are not rehilighting things';
    } else if (nodes_to_hilight.length === 0) {
        throw 'There was an error, nothing was selected';
    }

    return nodes_to_hilight;
}

/**
 * Given a representation of user-selected text, wrap selection around
 * div tags with style for hilighting
 * 
 * @param {Object} json_data - object representing selection
 */
function hilight_json_data(json_data, id_num) {
    let nodes_to_hilight = store_data_to_range(json_data); 
    for (let index = 0; index < nodes_to_hilight.length; index++) {
        let node = nodes_to_hilight[index];
        // Initialize hilight div node with speicfied pertinent listeners
        let surrounding_node = document.createElement('div');
        surrounding_node.setAttribute("id", `word_${id_num}_${index}`);
        surrounding_node.setAttribute('class', HILIGHT_CLASS);
        // Lookup hilighted word if hilight clicked on
        surrounding_node.addEventListener('click', function () {
            let word = json_data['word']; // TODO: should be fine since this must remain constant
            lookup_word(word);
        });

        // Store (numeric) id of element to delete
        surrounding_node.addEventListener('contextmenu', function () {
            let id_num =  extract_id(surrounding_node); // may change because of deletes
            hilight_id_to_delete = id_num;
        });

        // Add context menu for deleteing hilight and add css for onhover
        surrounding_node.addEventListener('mouseover', function () {
            browser.runtime.sendMessage({type: 'expose_delete_hilight'});
            // Add onhover css style to all parts of hilight
            let id_num =  extract_id(surrounding_node);
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
        range.setStart(node, startOffset);
        range.setEnd(node, endOffset);
        range.surroundContents(surrounding_node);
    }
}

/**
 * Given list of encountered_ids, modify ids in html and disk and memory so that future 
 * hilights work and invariants maintained
 *
 * @param {Array} encountered_ids - ordered list of ids of hilights
 * @param {Number} new_element_id - current id of new hilight that will be added
 */
function modify_ids_for_hilight(encountered_ids, new_element_id, vocabulario_data) {
    let insertion_id = new_element_id;
    // Swap ids in both HTML to enforce new ordering
    for (j = 0; j < encountered_ids.length; j++ ) {
        let right_neighbor_id = encountered_ids[j];
        let right_elements = document.querySelectorAll(
            `[id^=word_${right_neighbor_id}_]`);
        if (j === 0) { // insertion_id not in any div, so just substitute
            for (n of right_elements) {
                let index = extract_index(n);
                n.setAttribute('id', `word_${insertion_id}_${index}`);
            }
            new_element_id = right_neighbor_id; // return id as id of new element
            none_seen_to_right = false; // Do action below for future
        } else {
            console.assert(right_neighbor_id > encountered_ids[j-1], 
                'encountered_ids not ordered propperly');
            let new_node_elements = document.querySelectorAll(
                `[id^=word_${insertion_id}_]`);
            for (n of new_node_elements) {
                let index = extract_index(n); 
                n.setAttribute('id', `TEMP_HILIGHT_${index}`); 
                // structure of TEMP id used in other parts of this function
            }
            for (n of right_elements) {
                let index = extract_index(n); 
                n.setAttribute('id', `word_${insertion_id}_${index}`);
            }
            for (n of new_node_elements) { // Use TEMP structure to get index here
                let index = n.id.substr(n.id.lastIndexOf('_')+1, 
                    n.id.length - (n.id.lastIndexOf('_')+1));
                n.setAttribute('id', `word_${right_neighbor_id}_${index}`);
            }
        }

        // Swap in vocabulario_data
        let temp = vocabulario_data[insertion_id];
        vocabulario_data[insertion_id] = vocabulario_data[right_neighbor_id];
        vocabulario_data[right_neighbor_id] = temp;
    }
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
 * @param {Object} vocabulario_data - current state of highlights in volatile memory
 */
function reorder_hilights_for_one_parent(selected, new_element_id, 
    node_path_indecies, encountered_ids, vocabulario_data) {
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
        vocabulario_data[new_element_id]['endOffset'] : 0;
    // Add onto offset_to_remove if endNode has #text nodes directly to its left
    for (let j = selection_index - 1; j >= 0; j--) {
        let node = parents_children[j];
        if (is_text_node(node)) {
            offset_to_remove += node.textContent.length;
        } else {
            break;
        }
    }
    add_nodes_and_offsets(parent_node, 0, nodes_to_add, offset_to_remove, 
    selection_index + 1, true, encountered_ids, vocabulario_data);
}

/**
* Modifies ids of hilights after selected so that assumptoins hold
*
* @param {Array<Node>} selected - Nodes hilighted as part of selection
* @param {Number} new_element_id - current id of new hilight
* @param {Object} vocabulario_data - current state of highlights in volatile memory
*/
function reorder_hilights_main(selected, new_element_id, vocabulario_data) {
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

    let encountered_ids = new Set();
    parents_to_hilight_nodes.forEach(function (value, key, map) {
    let node_path_indecies = parents_to_hilight_paths_indecies.get(key);
    reorder_hilights_for_one_parent(value, new_element_id, node_path_indecies, 
        encountered_ids, vocabulario_data);
    }); 
    encountered_ids =  Array.from(encountered_ids);
    encountered_ids.sort(numeric_compare_function);
    return modify_ids_for_hilight(encountered_ids, new_element_id, vocabulario_data);
}
