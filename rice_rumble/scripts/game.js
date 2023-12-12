import ProgressBar from './progressbar.js'
import Timer from './timer.js'

const {
    Body,
    Events,
    Engine,
    Render,
    Runner,
    World,
    Bodies,
    Mouse,
    MouseConstraint
} = Matter;

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
        this.timerSeconds = 40;
        this.timerInterval;
        this.updateHtmlElementTimer(this.timerSeconds);
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

        this.startFallingRice();
        this.startTimer();
        this.gameLoop();
    }

    // utils
    getRandomXPosition(minX, maxX) {
        return Number((Math.random() * (maxX - minX) + minX).toFixed(0));
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

    stopGame() {
        clearInterval(this.timerInterval);
        clearInterval(this.fallingRiceIntervalA);
        clearInterval(this.fallingRiceIntervalB);
        clearInterval(this.fallingRiceIntervalC);
        // this.gameSound.pause();
        this.hideGameContainer();
        this.showResults();
    }

    showResults() {
        if (this.riceGrainsSaved <= 200) {
            document.querySelector('.ending > .results.encourage').classList.remove('not-displayed');
        } else {
            document.querySelector('.ending > .results.congratulate img').src = `./images/congratulatory-message.svg`;
            document.querySelector('.ending > .results.congratulate').classList.remove('not-displayed');
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timerSeconds--;
            this.updateHtmlElementTimer(this.timerSeconds);
            if (this.riceGrainsSaved === 400 || this.timerSeconds <= 0) {
                this.stopGame();
            }
        }, 1000);
    }

    updateHtmlElementTimer(timerSeconds) {
        const seconds = timerSeconds < 10 ? timerSeconds.toString().padStart(2, '0') : timerSeconds;
        Timer.updateTimer(`00:${seconds}`);
    }

    startFallingRice() {
        const dropRiceGrainsAtRandomPosition = (riceSack) => {
            this.repositionLeakingRicesack(riceSack);
            this.unhideRicesack(riceSack);

            const riceGrains = this.createLeakingRiceGrains(riceSack);
            World.add(this.engine.world, riceGrains);
        }

        const temp = async () => {
            dropRiceGrainsAtRandomPosition(this.leakingRicesackA);

            if (this.timerSeconds <= 25 && this.leakingRicesackB.render.opacity === 0) {
                /*
                 * In case we wish to increase the speed of the falling rice grains, we can use this setting here
                 * Example:
                 * this.engine.world.gravity.y = 2.5;
                 */

                /* 
                 * In case we want to change the interval time of the leaking rice sack's initial position
                 * and it's next position over the span of this.timerSeconds. (see definition above to find out how long it has been set)
                 * clearInterval(this.fallingRiceIntervalA);
                 * Example:
                 * this.fallingRiceIntervalA = setInterval(temp, 1000);
                 */

                // start spawn timer for sack B from 2s
                await this.waitOneSecond();
                this.unhideRicesack(this.leakingRicesackB);
                this.fallingRiceIntervalB = setInterval(() => dropRiceGrainsAtRandomPosition(this.leakingRicesackB), 2000);
            }

            if (this.timerSeconds <= 15 && this.leakingRicesackC.render.opacity === 0) {
                this.engine.world.gravity.y = 2.5;
                this.unhideRicesack(this.leakingRicesackC);
                this.fallingRiceIntervalC = setInterval(() => dropRiceGrainsAtRandomPosition(this.leakingRicesackC), 2000);
            }
        };

        this.fallingRiceIntervalA = setInterval(temp, 2000);
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
                // If falling rice grain hit the basket on first collision, add points
                if (collision.bodyA.label === 'rice grains' && collision.bodyB.label === 'basket') {
                    const riceGrains = collision.bodyA;
                    World.remove(this.engine.world, riceGrains);
                    this.riceGrainsSaved += 10;
                    this.progressBar.updateProgressBar((this.riceGrainsSaved / 400) * 100);
                    return;
                }
                if (collision.bodyB.label === 'rice grains' && collision.bodyA.label === 'basket') {
                    const riceGrains = collision.bodyB;
                    World.remove(this.engine.world, riceGrains);
                    this.riceGrainsSaved += 10;
                    this.progressBar.updateProgressBar((this.riceGrainsSaved / 400) * 100);
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

    createLeakingRiceGrains(sack) {
        const xPos = sack.position.x;
        const yPos = sack.position.y + 20;
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

    gameLoop() {
        // Update the Matter.js engine
        Engine.update(this.engine);

        // Repeat the game loop
        requestAnimationFrame(() => this.gameLoop());
    }
}

export default Game;
