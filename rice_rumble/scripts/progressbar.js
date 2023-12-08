class ProgressBar {


    updatePercentage(level) {
        var percentage = document.getElementById("percentage");
        percentage.style.marginLeft = level + "%";
    }

    updateProgressBar(level, score) {
        var progressLevel = document.getElementById("progressLevel");
        progressLevel.style.width = level + 1 + "%";
        this.updatePercentage(level);

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

// function updatePercentage(level) {
//     var percentage = document.getElementById("percentage");
//     percentage.style.marginLeft = level + "%";
// }

// function updateProgressBar(level, score) {

//     var progressLevel = document.getElementById("progressLevel");
//     progressLevel.style.width = level + 1 + "%";
//     updatePercentage(level);

//     // doStarJump(score);

//     if (level < 100) {
//         progressLevel.classList.remove("fullbar");
//     } else {
//         progressLevel.classList.add("fullbar");
//     }
// }

// function doStarJump(score) {
//     // we could set up a point system to display different stars indicating different points by using an argument and conditional statements to display different star elements.  

//     // remove animations from all stars
//     const stars = document.querySelectorAll('.star');
//     stars.forEach(star => {
//         star.classList.remove('star-jump');
//     });

//     // add the animation on the corresponding star for the given score
//     setTimeout(() => {
//         document.getElementById('star-' + score).classList.add('star-jump');
//     }, 10);
// }





