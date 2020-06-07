/* Core functions for removing hightlights */

/**
 * Takes an ordered list of of HILIGHT_CLASS elements with the same parent node and
 * belonging to element with id as word_{hilight_id}_* and uses these elements,
 * in particular the last one, to determine the new nodes and offsets for other hilights
 * and proceedes to delete all the hilight elements in hilight_elements, making HTML
 * page as if hilight never mande.
 *
 * Offsts and nodes of other hilights in volatile memory are modified if and only if
 * update_local_storage is true.
 *
 * Assumes hilight_elemetns ordered in decending order and that its elements have
 * id as word_{id}_* and that hilight_id === hilight_id_to_delete. Also assumes that all
 * HILIGHT_CLASS elements have exactly one #text child element, and that's it.
 *
 * @param {Array<Element>} hilight_elements - HILIGHT_CLASS elements of id hilight
 *                                         with same parent node
 * @param {Array<Number>} hilight_element_indecies - indecies in localstorage of elements
 *                                                   in hilight_elements
 * @param {Number} hilight_id - id of hilight entity in localStorage
 * @param {boolean} update_local_storage - if true, updates offsets of affected hilights
 * @param {Object} vocabulario_data - current state of highlights in volatile memory
 */
function remove_from_html_and_other_data(hilight_elements, hilight_element_indecies,
    hilight_id, update_local_storage, vocabulario_data) {
    console.assert(hilight_id === hilight_id_to_delete,
        'ERROR, Deleting different id than expected');

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
        // Uses assumption that h1.id < h2.id && h1.parent == h2.parent <-->
        // h1 is before h2 in DOM traversal relative to parent
        console.assert(element_index != 0, 'Assumption on how hilights made broken');

        // Calcualte new offset based on #texts before and after el
        let counter = element_index - 1;
        while (counter >= 0 && is_text_node(parents_children[counter])) {
            new_offset += parents_children[element_index-1].textContent.length;
            counter--;
        }
    }
    new_offset = -new_offset; // adding this offset requires negative offset

    if (update_local_storage) {
        let temp_set = new Set();  // simply used to get add_nodes_and_offsets to work
        add_nodes_and_offsets(parent, 0, nodes_to_make, new_offset, element_index + 1,
            should_modify_future_offsets, temp_set, vocabulario_data);
        delete temp_set;
    }

    // Remove hilights of hilight_elements from html while maintaining structure of text
    // before hilight
    for (let element of hilight_elements) {
        console.assert(element.childNodes.length === 1 &&
            is_text_node(element.childNodes[0]),
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
            is_text_node(parents_children[element_index-1]),
            'Node before not text');
        console.assert(element_index < parents_children.length - 1 &&
            is_text_node(parents_children[element_index+1]),
            'Node after is not text');
        
        // Used for deleting extra nodes on left and right, made by creation of div
        let node_after = parents_children[element_index+1];
        let is_node_after_empty = node_after.textContent === '';
        let index_before = element_index - 1;
        let node_before = parents_children[index_before];

        node_before.textContent += element.textContent;
        parent.removeChild(element);
        if (is_node_after_empty) {
            parent.removeChild(node_after);
        }
        // Combine resulting #text element with #text elements to left and right of it
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
 * Gets all HILIGHT_CLASS elements with hilight_id as id in (word_{hilight_id}_*), groups
 * them by parent node (in depth-traversal order). Then, on per-parent basis, removes 
 * these nodes from the html page and from other hilights' offsets (in volatile-memory)
 * if and only if update_local_storage is true.
 *
 * Assumes hilight_id is a valid id (word_{id}) of a section hilighted by this addon.
 * Also assumes that querySelectorAll orders elements in depth-first traversal ascending
 * order (https://www.w3.org/TR/selectors-api/#queryselectorall)
 *
 * @param {Number} hilight_id
 * @param {boolean} update_local_storage
 * @param {Object} vocabulario_data - current state of highlights in volatile memory
 */
function remove_hilights(hilight_id, update_local_storage, vocabulario_data) {
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

    // Depth-first assumption used in performing removal on per-parent node basis
    parents_to_hilights.forEach(function (value, key) {
        let selected_nodes = value;
        remove_from_html_and_other_data(selected_nodes, 
            parents_to_hilight_paths_indecies.get(key),
            hilight_id, update_local_storage, vocabulario_data);
    });
}
