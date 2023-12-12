class ProgressBar {
    constructor() {
        this.updateProgressBar(0);
    }

    updateProgressBar(level, score = 0) {
        var progressLevel = document.getElementById("progressLevel");
        // to offset the icon marker on the progress bar a little bit to the right
        // so that it sits within the PB at the beginning.
        progressLevel.style.width = level + 2 + "%";

        // doStarJump(score);
        if (level < 100) {
            progressLevel.classList.remove("fullbar");
        } else {
            progressLevel.classList.add("fullbar");
        }
    }

    doStarJump(score) {
        // we could set up a point system to display different stars indicating different points by using an argument and conditional statements to display different star elements.  

        // remove animations from all stars
        const stars = document.querySelectorAll('.star');
        stars.forEach(star => {
            star.classList.remove('star-jump');
        });

        // add the animation on the corresponding star for the given score
        setTimeout(() => {
            document.getElementById('star-' + score).classList.add('star-jump');
        }, 10);
    }
}

export default ProgressBar;







