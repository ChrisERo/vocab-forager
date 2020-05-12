document.body.style.border = "5px solid red";

function log_selection() {
    let selected = window.getSelection();
    if (selected.toString() != '') {
        let rangee = selected.getRangeAt(0);
        console.log(`SELECTED: ${selected.toString()}, ${rangee}`);
        
	// after simulated retreival from non-volatile storage
	let surrounding_node = document.createElement('div');
        surrounding_node.setAttribute("id", "my_id");
	surrounding_node.setAttribute('style', 'background-color: #ffff01; display: inline;')
	rangee.surroundContents(surrounding_node);
    }
}

document.onmouseup = log_selection;  // set action up

