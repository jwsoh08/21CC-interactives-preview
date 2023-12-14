class Modal {
    constructor() {
        this.notEnoughRice = document.querySelector('.results.encourage');
        this.overlay = document.querySelector('.overlay');
        this.praise = document.querySelector('.info-box.praise');
    }

    hideOverlay() {
        this.overlay.classList.add('not-displayed');
    }

    showOverlay() {
        this.overlay.classList.remove('not-displayed');
    }

    showNotEnoughRice() {
        this.notEnoughRice.classList.remove('not-displayed');
        this.showOverlay();
    }

    executeFuncAfterHidingNotEnoughRice(func) {
        this.notEnoughRice.addEventListener('click', () => {
            func();
            this.notEnoughRice.classList.add('not-displayed');
            this.hideOverlay();
        });
    }

    showPraise() {
        this.praise.classList.remove('not-displayed');
        this.overlay.classList.remove('not-displayed');
    }
}


export default Modal;
