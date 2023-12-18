import ProgressBar from './progressbar.js'
import Timer from './timer.js'
import Modal from './modal.js'

const {
    Body,
    Composite,
    Events,
    Engine,
    Render,
    World,
    Bodies,
    Mouse,
    MouseConstraint
} = Matter;

const modal = new Modal();

class Game {
    constructor() {
        this.gameContainer = document.querySelector('.game');
        this.engine = Engine.create();
        this.render = Render.create({
            canvas: document.getElementById('game-canvas'),
            engine: this.engine,
            options: {
                wireframes: false,
                background: 'transparent'
            },
        });
        this.riceGrainsSaved = 0; // units: grams

        this.currentLevel = 1;
        this.currentLevelTimer = 30; // unit: seconds
        this.timerInterval;
        this.updateHtmlElementTimer(this.currentLevelTimer);

        this.isPaused = false;
        // to keep 'this' under original Game instance when method is used 
        // within a Modal instance.
        this.startLevel.bind(this);
        this.isMouseCaught = false;

        this.leakingRicesacksDisplay = [];
        this.gameSound = new Audio('./audio/wwii-background-music.mp3');
        this.gameSound.play();

        this.createWorld();
        this.createMouseConstraint();
        this.createEventListeners();
        this.createUserInteractionHandlers();

        Render.run(this.render);
        this.progressBar = new ProgressBar();

        this.fallingRiceIntervalA;
        this.fallingRiceIntervalB;
        this.fallingRiceIntervalC;
        this.intervalTimeInMilliseconds = 2000;

        this.startLevel(1);
        this.gameLoop();
    }

    // utils
    getRandomXPosition(minX, maxX) {
        return Number((Math.random() * (maxX - minX) + minX).toFixed(0));
    }

    getRandomValueFromTwoRanges(min1, max1, min2, max2) {
        const range1 = max1 - min1 + 1;
        const range2 = max2 - min2 + 1;

        // Combine the two ranges into a single range
        const totalRange = range1 + range2;

        // Generate a random value from the combined range
        const randomValue = Math.floor(Math.random() * totalRange);

        // Determine which range the random value belongs to
        if (randomValue < range1) {
            // The random value belongs to the first range
            return Math.floor(Math.random() * (max1 - min1 + 1) + min1);
        } else {
            // The random value belongs to the second range
            return Math.floor(Math.random() * (max2 - min2 + 1) + min2);
        }
    }

    getRandomElement(arr) {
        if (arr.length === 0) {
            // Handle empty array case
            return undefined;
        }

        const randomIndex = Math.floor(Math.random() * arr.length);
        return arr[randomIndex];
    }

    waitOneSecond() {
        return new Promise(resolve => setTimeout(() => resolve(), 1000));
    }

    hideGameContainer() {
        this.gameContainer.classList.add('not-displayed');
    }

    pauseGame() {
        this.isPaused = true;
        clearInterval(this.timerInterval);
        this.stopAllFallingRicesacksItems();
    }

    stopAllFallingRicesacksItems() {
        clearInterval(this.fallingRiceIntervalA);
        clearInterval(this.fallingRiceIntervalB);
        clearInterval(this.fallingRiceIntervalC);
    }

    dropItemsAtRandomPositions(riceSack, intervalInSeconds) {
        this.fallingRiceIntervalA = setInterval(() => {
            this.repositionLeakingRicesack(riceSack);
            this.unhideRicesack(riceSack);

            let item;
            if (this.currentLevel === 1) {
                item = this.createLeakingRiceGrains(riceSack);
            }

            if (this.currentLevel === 2 || this.currentLevel === 3) {
                const probabilityOfMouseFalling = this.currentLevel === 2 ? 0.25 : 0.5;
                const random = Math.random(); // some number between 0, 1

                if (random <= probabilityOfMouseFalling) {
                    item = this.createFallingMouse(riceSack);
                } else {
                    item = this.createLeakingRiceGrains(riceSack);
                }
            }

            World.add(this.engine.world, item);
        }, intervalInSeconds * 1000);
    }

    dropItemsAtRandomPositionsNew(riceSack, intervalInSeconds) {
        this.fallingRiceIntervalA = setInterval(() => {

            if (this.currentLevel === 1) {
                this.repositionLeakingRicesack(riceSack);
                this.unhideRicesack(riceSack);

                let item;
                item = this.createLeakingRiceGrains(riceSack);
                World.add(this.engine.world, item);
                return;
            }

            if (this.currentLevel === 2 || this.currentLevel === 3) {
                let ricePosX;

                if (this.basket.position.x >= 400) {
                    ricePosX = this.getRandomXPosition(0, 400);
                } else {
                    ricePosX = this.getRandomXPosition(400, 750);
                }

                const NUM_MICE_PER_INTERVAL = 1;
                // Math.floor(Math.random() * (maxX - minX + 1) + minX)
                let riceIndex = Math.floor(Math.random() * (NUM_MICE_PER_INTERVAL - 0 + 1) + 0);
                let count = NUM_MICE_PER_INTERVAL;
                let item;

                while (count >= 0) {
                    if (count === riceIndex) {
                        // drop rice
                        this.repositionLeakingRicesackNew(riceSack, { x: ricePosX, y: 110 });
                        this.unhideRicesack(riceSack);
                        item = this.createLeakingRiceGrains(riceSack);

                    } else {
                        // this offset ensures that the falling mouse does not overlap with the rice
                        let offset = this.getRandomValueFromTwoRanges(riceIndex - 25, riceIndex - 5, riceIndex + 5, riceIndex + 25);
                        offset = ricePosX + offset <= 800 ? offset : -offset;
                        item = this.createFallingMouseNew({ x: ricePosX + offset, y: 110 });
                    }
                    World.add(this.engine.world, item);

                    count--;
                }
            }

        }, intervalInSeconds * 1000);
    }

    removeAllFallenItemsFromScreen() {
        const bodies = Composite.allBodies(this.engine.world);
        bodies.forEach((body) => {
            if (body.label === "rice grains" || body.label === "rat") {
                World.remove(this.engine.world, body);
            }
        })
        return;
    }

    levelReset() {
        this.resetTimer(30);
        this.riceGrainsSaved = 0;
        this.isPaused = false;
        this.isMouseCaught = false;
        this.stopAllFallingRicesacksItems();
        this.removeAllFallenItemsFromScreen();
        this.progressBar.reset();
    }

    startLevel(level) {
        this.levelReset();
        this.startTimer();

        // place the game logic required for each level if each if block
        if (level === 1) {
            this.engine.world.gravity.y = 1.5;
            this.dropItemsAtRandomPositions(this.leakingRicesackA, 1.25);
        }

        if (level === 2) {
            this.engine.world.gravity.y = 2;
            this.dropItemsAtRandomPositionsNew(this.leakingRicesackA, 2);
        }

        if (level === 3) {
            this.engine.world.gravity.y = 3;
            this.dropItemsAtRandomPositionsNew(this.leakingRicesackA, 1);
        }
    }

    showResults() {
        if (this.riceGrainsSaved <= 200) {
            document.querySelector('.ending > .results.encourage').classList.remove('not-displayed');
        } else {
            document.querySelector('.ending > .results.congratulate img').src = `./images/congratulatory-message.svg`;
            document.querySelector('.ending > .results.congratulate').classList.remove('not-displayed');
        }
    }

    resetTimer(seconds) {
        clearInterval(this.timerInterval);
        this.currentLevelTimer = seconds;
        this.updateHtmlElementTimer(this.currentLevelTimer);
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.currentLevelTimer--;
            this.updateHtmlElementTimer(this.currentLevelTimer);
        }, 1000);
    }

    updateHtmlElementTimer(timerSeconds) {
        const seconds = timerSeconds < 10 ? timerSeconds.toString().padStart(2, '0') : timerSeconds;
        Timer.updateTimer(`00:${seconds}`);
    }

    unhideRicesack(sack) {
        sack.render.opacity = 1;
    }

    createWorld() {
        this.basket = Bodies.rectangle(400, 420, 80, 80, {
            friction: 1,
            // I could use frictionAir to adjust the speed of the falling objects
            // frictionAir: 0.4,
            label: "basket",
            render: {
                fillStyle: '#FFFFFF',
                // opacity: .4,
                sprite: {
                    texture: './images/basket.png',
                    xScale: 0.75,
                    yScale: 0.9
                },
            },
            restitution: 0,
            friction: 0.1,
            density: 0.01,
            collisionFilter: {
                // group attribute set to -1 as we do not want collisions between the invisible
                // dragger and the basket (i.e. we want them to be able to overlap)
                group: 1,
                category: 0x0002
            },
            sleepThreshold: 15,    // Customize the sleep threshold
            sleepTimeLimit: 1000,  // Customize the sleep time limit (in milliseconds)
        });

        // this dragger is created for moving the basket horizontally only
        this.dragger = Bodies.rectangle(400, 420, 80, 80, {
            label: "dragger",
            render: {
                opacity: 0,
            },
            collisionFilter: {
                group: 3,
                mask: 0x0004
            }
        });

        this.shelf = Bodies.rectangle(400, 100, 810, 15, {
            isStatic: true,
            render: {
                fillStyle: '#000000',
                sprite: {
                    texture: './images/shelf-with-rice-sacks.svg',
                },
            }
        });

        this.leakingRicesackA = this.createLeakingRicesack('type-1');
        this.leakingRicesackB = this.createLeakingRicesack('type-2');
        this.leakingRicesackC = this.createLeakingRicesack('type-1');

        const staticBodyOptions = {
            isStatic: true,
            render: {
                fillStyle: 'transparent',
            }
        };

        this.basketLowerConstraint = Bodies.rectangle(400, 500, 810, 10, {
            collisionFilter: { group: 1, category: 0x0004 },
            restitution: 0.2,
            friction: 1,
            ...staticBodyOptions
        });

        this.lowerGround = Bodies.rectangle(400, 630, 840, 60, {
            label: "lower ground", collisionFilter: {
                category: 0x0002
            }, ...staticBodyOptions
        });
        this.leftWall = Bodies.rectangle(-5, 300, 10, 600, staticBodyOptions);
        this.rightWall = Bodies.rectangle(800, 300, 10, 600, staticBodyOptions);

        World.add(this.engine.world, [
            this.basket,
            this.dragger,
            this.shelf,
            this.leakingRicesackA,
            this.leakingRicesackB,
            this.leakingRicesackC,
            this.basketLowerConstraint,
            this.lowerGround,
            this.leftWall,
            this.rightWall,
        ]);
    }

    createMouseConstraint() {
        const mouse = Mouse.create(this.render.canvas);
        this.mouseConstraint = MouseConstraint.create(this.engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false,
                },
            },
            collisionFilter: {

                /* 
                 * set to the same value as the collisionFilter.category of basket Body.
                 * this allows the user to interact / drag with the basket.
                 */
                mask: 0x0002
            }
        });
        // World.add(this.engine.world, this.mouseConstraint);
    }

    createEventListeners() {
        Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;

            pairs.forEach(async (collision) => {
                // if falling rat hit the basket on first collision, restart round
                // logic for restarting round found in updateGame() method.
                if (collision.bodyA.label === 'rat' && collision.bodyB.label === 'basket') {
                    this.isMouseCaught = true;
                }
                if (collision.bodyB.label === 'rat' && collision.bodyA.label === 'basket') {
                    this.isMouseCaught = true;
                }

                // If falling rice grain hit the basket on first collision, add points
                if (collision.bodyA.label === 'rice grains' && collision.bodyB.label === 'basket') {
                    const riceGrains = collision.bodyA;
                    World.remove(this.engine.world, riceGrains);
                    if (this.currentLevel === 1) {
                        this.riceGrainsSaved += 15;
                    }
                    if (this.currentLevel === 2 || this.currentLevel === 3) {
                        this.riceGrainsSaved += 25;
                    }
                    this.progressBar.updateProgressBar((this.riceGrainsSaved / 200) * 100);
                    return;
                }
                if (collision.bodyB.label === 'rice grains' && collision.bodyA.label === 'basket') {
                    const riceGrains = collision.bodyB;
                    World.remove(this.engine.world, riceGrains);
                    if (this.currentLevel === 1) {
                        this.riceGrainsSaved += 15;
                    }
                    if (this.currentLevel === 2 || this.currentLevel === 3) {
                        this.riceGrainsSaved += 25;
                    }
                    this.progressBar.updateProgressBar((this.riceGrainsSaved / 200) * 100);
                    return;
                }

                if (collision.bodyA.label === 'rice grains' && collision.bodyB.label === 'lower ground') {
                    const riceGrains = collision.bodyA;
                    this.disposeRiceGrains(riceGrains);
                }
                if (collision.bodyB.label === 'rice grains' && collision.bodyA.label === 'lower ground') {
                    const riceGrains = collision.bodyB;
                    this.disposeRiceGrains(riceGrains);
                }
            });
        });
    }

    createUserInteractionHandlers() {
        const gameElement = document.querySelector('.game');

        let isPointerPressed = false;
        let pointerX = 0;
        let pointerY = 0;

        const basket = this.basket;

        function updateState(event) {
            const currentViewportSize = window.innerWidth;
            // the width of the canvas and the viewport width is different
            // hence, we need a scaling factor to convert from viewport x-position
            // to the exact x-position on the canvas.
            const scalingFactor = 800 / currentViewportSize;

            // Check if it's a touch event
            if (event.touches && event.touches.length > 0) {
                pointerX = event.touches[0].clientX;
                pointerY = event.touches[0].clientY;
            } else {
                // It's a mouse event
                pointerX = event.clientX;
                pointerY = event.clientY;
            }

            const boundaryPadding = 0.05 * currentViewportSize;
            if (pointerX <= boundaryPadding || pointerX >= currentViewportSize - boundaryPadding) return;

            const convertedXPos = pointerX * scalingFactor;
            Body.setPosition(basket, { x: convertedXPos, y: basket.position.y });
        }

        gameElement.addEventListener('mousedown', function (event) {
            isPointerPressed = true;
            updateState(event);
            document.addEventListener('mousemove', updateState);
        });
        document.addEventListener('mouseup', function (event) {
            if (isPointerPressed) {
                isPointerPressed = false;
                document.removeEventListener('mousemove', updateState);
            }
        });
        gameElement.addEventListener('touchstart', function (event) {
            isPointerPressed = true;
            document.addEventListener('touchmove', updateState);
        });
        document.addEventListener('touchend', function (event) {
            if (isPointerPressed) {
                isPointerPressed = false;
                document.removeEventListener('touchmove', updateState);
            }
        });

    }

    async disposeRiceGrains(grains) {
        this.fadeOutRiceGrains(grains);
        await this.waitOneSecond();
        World.remove(this.engine.world, grains);
        // no longer needed, to free up memory
        // grains = null;
    }

    fadeOutRiceGrains(grains) {
        const duration = 1000; // Duration of the fade out effect in milliseconds
        const startTime = Date.now();

        // Update opacity every frame
        const updateOpacity = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;

            // Calculate opacity based on elapsed time
            const opacity = 1 - Math.min(elapsed / duration, 1);

            // Update the box's opacity
            grains.render.opacity = opacity;

            // Continue updating until the duration is reached
            if (elapsed < duration) {
                requestAnimationFrame(updateOpacity);
            }
        };

        // Start the fade out effect
        updateOpacity();
    }

    repositionLeakingRicesack(sack) {
        const newRandomX = this.getRandomXPosition(50, 750);
        Body.setPosition(sack, { x: newRandomX, y: 110 });
    }

    repositionLeakingRicesackNew(sack, positionVector) {
        Body.setPosition(sack, { x: positionVector.x, y: positionVector.y });
    }

    createLeakingRiceGrains(sack) {
        const xPos = sack.position.x;
        const yPos = sack.position.y + 25;
        // the rice grains should be rotated by one of the 3 possible angles upon "spawning"
        const possibleAnglesInRadians = [45 * Math.PI / 180, 190 * Math.PI / 180, 300 * Math.PI / 180];

        return Bodies.rectangle(xPos, yPos, 15, 15, {
            angle: this.getRandomElement(possibleAnglesInRadians),
            render: {
                sprite: {
                    texture: './images/rice-grains.svg'
                }
            },
            label: "rice grains",
            frictionAir: 0.4,
            friction: 0.1,
            collisionFilter: {
                // removing this attribute allows the rice grains to fall through one another
                // group attribute set to -1 as we do not want collisions between the invisible
                // dragger and the rice grains
                group: 2,
                mask: 0x0002
            }
        });
    }

    createFallingMouse(sack) {
        const xPos = sack.position.x;
        const yPos = sack.position.y + 25;
        // try to see if i can make the mouse look like it's struggling while falling using rotation
        const possibleAnglesInRadians = [45 * Math.PI / 180, 190 * Math.PI / 180, 300 * Math.PI / 180];

        return Bodies.rectangle(xPos, yPos, 15, 15, {
            angle: this.getRandomElement(possibleAnglesInRadians),
            render: {
                sprite: {
                    texture: './images/rat.svg'
                }
            },
            label: "rat",
            frictionAir: 0.4,
            friction: 0.1,
            collisionFilter: {
                group: 2,
                mask: 0x0002
            }
        });
    }

    createFallingMouseNew(positionVector) {

        const xPos = positionVector.x;
        const yPos = positionVector.y;
        // try to see if i can make the mouse look like it's struggling while falling using rotation
        const possibleAnglesInRadians = [45 * Math.PI / 180, 190 * Math.PI / 180, 300 * Math.PI / 180];

        return Bodies.rectangle(xPos, yPos, 15, 15, {
            angle: this.getRandomElement(possibleAnglesInRadians),
            render: {
                sprite: {
                    texture: './images/rat.svg'
                }
            },
            label: "rat",
            frictionAir: 0.4,
            friction: 0.1,
            collisionFilter: {
                group: 2,
                mask: 0x0002
            }
        });
    }

    createLeakingRicesack(type) {
        return Bodies.rectangle(this.getRandomXPosition(50, 750), 110, 75, 75, {
            isStatic: true,
            render: {
                sprite: {
                    texture: `./images/leaking-rice-sack-${type}.svg`
                },
                opacity: 0
            }
        });
    }

    updateGame() {
        if (this.isPaused) return;

        if ((this.currentLevelTimer === 0) &&
            (this.riceGrainsSaved < 200)) {
            this.pauseGame();
            modal.showNotEnoughRice();
            modal.executeFuncAfterHidingNotEnoughRice(() => this.startLevel(this.currentLevel));
        }

        if (this.isMouseCaught) {
            this.pauseGame();
            modal.showOppsRatCaught();
            modal.executeFuncAfterHidingOppsRatCaught(() => this.startLevel(this.currentLevel));
        }

        if ((this.currentLevelTimer !== 30) &&
            (this.riceGrainsSaved >= 200)) {
            this.pauseGame();
            modal.showPraise();
            modal.executeFuncAfterHidingPraise(() => this.startLevel(++this.currentLevel));
        }


    }

    gameLoop() {
        // Update the Matter.js engine
        Engine.update(this.engine);

        this.updateGame();
        // Repeat the game loop
        requestAnimationFrame(() => this.gameLoop());
    }
}

export default Game;
