const HILIGHT_ENCOUNTERED_ERROR = 4278; // error when try to hilight hilight element

/**
 * Returns true if node is a #text node and false otherwise
 *
 * @param {Node} node - Node in document.body
 */
function is_text_node(node) {
    return node.nodeName === '#text';
}

/**
 * Returns whether Node element is a hilight done by this addon
 *
 * @param {Node} element - Node in document.body
 */
function is_hilight_node(element) {
    return element.classList != null && element.classList.contains(HILIGHT_CLASS)
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
        for (child of nodes_children) {
            let t = get_first_text_node(child);
            if (t != null) {
                return child;
            }
        }
        return null;
    }
}

/**
 * 
 * @param {Node} startNode 
 * @param {Node} endNode 
 */
function get_nodes_to_hilight_buisness_logic(startNode, endNode) {
    let current_node = startNode;
    let nodes_to_hilight = [];
    let explored_nodes = new Set();
    explored_nodes.add(startNode.parentNode);
    while (current_node !== endNode) {
        if (!is_text_node(current_node)) {
            if (is_hilight_node(current_node)) {
                // Return null when encounter hilight element in selection
                return null;
            } else if (current_node.hasChildNodes()) { 
                // Just go down to child node
                explored_nodes.add(current_node);
                current_node = current_node.childNodes[0];
                continue;
            }
        } else { // Only add text nodes to list of nodes to hilight
            nodes_to_hilight.push(current_node);
        }

        explored_nodes.add(current_node);
        while (explored_nodes.has(current_node)) {
            // DO LAST PART
            let next_sibbling = current_node.nextSibling;
            current_node= next_sibbling == null ? current_node.parentNode : next_sibbling;
        }
    }

    console.log('Got past first loop')
    try {
        nodes_to_hilight.push(get_first_text_node(endNode, explored_nodes));
    } catch(err) {
        if (err === HILIGHT_ENCOUNTERED_ERROR) {
            return null;
        } else {
            throw err;
        }
      }
    
    return nodes_to_hilight;
}

/**
 * Given a Selection, determines all the #text nodes that will be hilighted
 * 
 * @param {Selection} selected 
 */
function get_nodes_to_hilight(selected) {
    console.log('made it in here');
    let range = selected.getRangeAt(0);
    let startNode = range.startContainer;
    let endNode = range.endContainer;

    let nodes_to_hilight = get_nodes_to_hilight_buisness_logic(startNode, endNode);
    // Check to make sure that some element was selected and a hilight wasn't chosen
    if (nodes_to_hilight == null) {
        alert('There was an error, make sure that you are not rehilighting things');
        return;
    }
    nodes_to_hilight = nodes_to_hilight.filter(n => n != null);
    if (nodes_to_hilight.length === 0) {
        alert('There was an error, nothing was selected'); // TODO: consider removing alerts
        return;
    }
    return nodes_to_hilight;
}
