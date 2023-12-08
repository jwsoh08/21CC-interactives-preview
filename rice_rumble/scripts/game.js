import ProgressBar from './progressbar.js'

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
        this.riceGrainsCaught = 0;
        this.timerSeconds = 40;
        this.timerInterval;
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
        this.intervalTimeInMilliseconds = 2000;

        this.startFallingRice();
        this.startTimer();
        this.gameLoop();
    }

    // utils
    getRandomXPosition(minX, maxX) {
        return Number((Math.random() * (maxX - minX) + minX).toFixed(0));
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
        // this.gameSound.pause();
        this.hideGameContainer();
        this.showResults();
    }

    showResults() {
        if (this.riceGrainsCaught <= 10) {
            document.querySelector('.ending > .results.encourage').classList.remove('not-displayed');
        } else {
            document.querySelector('.ending > .results.congratulate img').src = `./images/collected-${this.riceGrainsCaught}-grains.svg`;
            document.querySelector('.ending > .results.congratulate').classList.remove('not-displayed');
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timerSeconds--;
            if (this.riceGrainsCaught === 30 || this.timerSeconds <= 0) {
                this.stopGame();
            }
        }, 1000);
    }

    startFallingRice() {
        const dropRiceGrainsAtRandomPosition = (riceSack) => {
            this.repositionLeakingRicesack(riceSack);
            this.unhideRicesack(riceSack);

            const riceGrains = this.createLeakingRiceGrains(riceSack);
            World.add(this.engine.world, riceGrains);
        }

        const temp = () => {
            dropRiceGrainsAtRandomPosition(this.leakingRicesackA);

            // updates to the spawn rate and number of leaking rice sacks when timer is less than 20s
            if (this.timerSeconds <= 20 && this.leakingRicesackB.render.opacity === 0) {
                this.engine.world.gravity.y = 2.5;

                // change spawn timer for sack A from 2s to 1s 
                clearInterval(this.fallingRiceIntervalA);
                this.fallingRiceIntervalA = setInterval(temp, 1000);

                // start spawn timer for sack B from 2s
                this.unhideRicesack(this.leakingRicesackB);
                this.fallingRiceIntervalB = setInterval(() => dropRiceGrainsAtRandomPosition(this.leakingRicesackB), 2000);
            }

            if (this.timerSeconds <= 5) {
                this.engine.world.gravity.y = 5;
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
                group: 1,
                category: 0x0002
            },
            sleepThreshold: 15,    // Customize the sleep threshold
            sleepTimeLimit: 1000,  // Customize the sleep time limit (in milliseconds)
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

        this.leakingRicesackA = Bodies.rectangle(this.getRandomXPosition(50, 750), 110, 75, 75, {
            isStatic: true,
            render: {
                sprite: {
                    texture: './images/leaking-rice-sack-A.svg'
                },
                opacity: 0
            }
        });

        this.leakingRicesackB = Bodies.rectangle(this.getRandomXPosition(50, 750), 110, 75, 75, {
            isStatic: true,
            render: {
                sprite: {
                    texture: './images/leaking-rice-sack-B.svg'
                },
                opacity: 0
            }
        });

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
            this.shelf,
            this.leakingRicesackA,
            this.leakingRicesackB,
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
        World.add(this.engine.world, this.mouseConstraint);
    }

    createEventListeners() {
        Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;

            pairs.forEach(async (collision) => {
                // If falling rice grain hit the basket on first collision, add points
                if (collision.bodyA.label === 'rice grains' && collision.bodyB.label === 'basket') {
                    const riceGrains = collision.bodyA;
                    World.remove(this.engine.world, riceGrains);
                    this.progressBar.updateProgressBar(++this.riceGrainsCaught * (100 / 30));
                    return;
                }
                if (collision.bodyB.label === 'rice grains' && collision.bodyA.label === 'basket') {
                    const riceGrains = collision.bodyB;
                    World.remove(this.engine.world, riceGrains);
                    this.progressBar.updateProgressBar(++this.riceGrainsCaught * (100 / 30));
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
        const leftButton = document.getElementById('leftButton');
        const rightButton = document.getElementById('rightButton');

        leftButton.addEventListener('click', () => {
            if (this.basket.position.x >= 750) return;
            Body.setPosition(this.basket, { x: this.basket.position.x - 50, y: this.basket.position.y });
        });
        rightButton.addEventListener('click', () => {
            if (this.basket.position.x <= 50) return;
            Body.setPosition(this.basket, { x: this.basket.position.x + 50, y: this.basket.position.y });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') {
                Body.setPosition(this.basket, { x: this.basket.position.x - 15, y: this.basket.position.y });
            }
            else if (event.key === 'ArrowRight') {
                Body.setPosition(this.basket, { x: this.basket.position.x + 15, y: this.basket.position.y });
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

        return Bodies.rectangle(xPos, yPos, 15, 15, {
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
                // group: 2, 
                mask: 0x0002
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