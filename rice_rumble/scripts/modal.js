class Modal {
    constructor() {
        this.notEnoughRice = document.querySelector('.results.encourage');
        this.overlay = null; // to be added
    }

    showNotEnoughRice() {
        this.notEnoughRice.classList.remove('not-displayed');
    }

    executeFuncAfterHidingNotEnoughRice(func) {
        this.notEnoughRice.addEventListener('click', () => {
            func();
            this.notEnoughRice.classList.add('not-displayed');
        });
    }
}


export default Modal;
