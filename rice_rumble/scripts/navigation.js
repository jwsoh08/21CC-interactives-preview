import Game from './game.js';

(function () {
    const startButton = document.querySelector('.start-button');
    const introductionStory = document.querySelector('.introduction-story');

    startButton.addEventListener('click', () => {
        // navigate from 1st to 2nd page
        const firstIntroduction = document.querySelector('.introduction.start');
        firstIntroduction.classList.add('not-displayed');
        introductionStory.classList.remove('not-displayed');
    });

    // navigate from 2nd to 3rd page
    const gameplayInstructions = document.querySelector('.gameplay-instructions');
    introductionStory.addEventListener('click', () => {
        introductionStory.classList.add('not-displayed');
        gameplayInstructions.classList.remove('not-displayed');
    });

    const gameContainer = document.querySelector('.game');
    gameplayInstructions.addEventListener('click', () => {
        // navigate from 3rd to game page 
        gameplayInstructions.classList.add('not-displayed');
        const root = document.getElementById('root');

        // Change the background image URL
        root.style.backgroundImage = "url('./images/game-bg.svg')";
        gameContainer.classList.remove('not-displayed');

        // start the game and show the progress bar
        const game = new Game();
        var progressBar = document.querySelector(".progress-wrapper");
        progressBar.classList.remove('not-displayed');
    })

    const encourageMessageContainer = document.querySelector('.ending > .results.encourage');
    const congratulateMessageContainer = document.querySelector('.ending > .results.congratulate');
    const endingMessageContainer = document.querySelector('.ending > .ending-message');

    const openEndingMessage = () => {
        encourageMessageContainer.classList.add('not-displayed');
        congratulateMessageContainer.classList.add('not-displayed');
        endingMessageContainer.classList.remove('not-displayed');
    }

    encourageMessageContainer.addEventListener('click', openEndingMessage);
    congratulateMessageContainer.addEventListener('click', openEndingMessage);

    endingMessageContainer.addEventListener('click', () => {
        location.reload();
    })

})();


