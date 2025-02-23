export default class ButtonManager {
    constructor() {
        this.setupButtons();
    }

    setupButtons() {
        const fontlist = document.querySelector('#fontlist-content-wrapper');
        if (!document.getElementById('add-textbox')) {
            const addButton = document.createElement('button');
            addButton.id = 'add-textbox';
            addButton.className = 'button button--primary';
            addButton.textContent = 'Add Text Box';
            fontlist.appendChild(addButton);
        }
    }
}