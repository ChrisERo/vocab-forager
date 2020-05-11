document.body.style.border = "5px solid red";

function log_selection() {
    let selected = window.getSelection();
    let range = selected.getRangeAt(0).getBoundingClientRect();
    console.log(`SELECTED: ${selected.toString()}, ${range}`);
}

document.onmouseup = log_selection

