class Modal {
    constructor() {
        this.notEnoughRice = document.querySelector('.results.encourage');
    }

    showNotEnoughRice() {
        this.notEnoughRice.classList.remove('not-displayed');
    }

    executeFuncAfterHidingNotEnoughRice(func) {
        this.notEnoughRice.addEventListener('click', () => {
            func();
        })
    }
}


export default Modal;
