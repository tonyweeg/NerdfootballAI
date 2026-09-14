/**
 * Tricked Out Ricky's space battle (NERD-39): Red vs Blue, first to 10 kills.
 * Loaded on demand when the rocket button opens the battle overlay.
 *
 *   RickySpaceBattle.start();   // runs the animation (one loop, never two)
 *   RickySpaceBattle.stop();    // stops it; start() resumes the same battle
 *   RickySpaceBattle.selectTeam('red' | 'blue');
 *
 * Needs #rsb-canvas, #rsb-red, #rsb-blue, #rsb-status and #rsb-glow in the page.
 */
(function() {
    'use strict';

    const canvas = document.getElementById('rsb-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // Star class
    class Star {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2.5 + 0.5;
            this.brightness = Math.random() * 0.7 + 0.3;
            this.twinkleSpeed = Math.random() * 0.02 + 0.01;
            this.twinklePhase = Math.random() * Math.PI * 2;
        }

        draw() {
            this.twinklePhase += this.twinkleSpeed;
            const brightness = this.brightness + Math.sin(this.twinklePhase) * 0.3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            ctx.fill();
        }
    }

    // Meteor class
    class Meteor {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = -50;
            this.length = Math.random() * 80 + 40;
            this.speed = Math.random() * 6 + 4;
            this.angle = Math.random() * 0.5 + 0.3;
            this.life = 1;
        }

        update() {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.life -= 0.01;
            return this.life > 0 && this.y < canvas.height + 50;
        }

        draw() {
            ctx.beginPath();
            const gradient = ctx.createLinearGradient(
                this.x, this.y,
                this.x - Math.cos(this.angle) * this.length,
                this.y - Math.sin(this.angle) * this.length
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${this.life * 0.9})`);
            gradient.addColorStop(0.5, `rgba(138, 124, 255, ${this.life * 0.5})`);
            gradient.addColorStop(1, 'rgba(138, 124, 255, 0)');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x - Math.cos(this.angle) * this.length,
                this.y - Math.sin(this.angle) * this.length
            );
            ctx.stroke();
        }
    }

    // Laser class
    class Laser {
        constructor(x, y, targetX, targetY, color, shooter = null) {
            this.x = x;
            this.y = y;
            this.targetX = targetX;
            this.targetY = targetY;
            this.color = color;
            this.shooter = shooter; // Reference to ship that fired this laser
            this.speed = 8;

            // Calculate direction
            const dx = targetX - x;
            const dy = targetY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            this.vx = (dx / distance) * this.speed;
            this.vy = (dy / distance) * this.speed;

            this.life = 100; // Laser duration
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life--;
            return this.life > 0 &&
                   this.x > -50 && this.x < canvas.width + 50 &&
                   this.y > -50 && this.y < canvas.height + 50;
        }

        draw() {
            ctx.save();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;

            // Draw laser bolt
            ctx.beginPath();
            ctx.moveTo(this.x - this.vx * 3, this.y - this.vy * 3);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();

            ctx.restore();
        }
    }

    // Base locations for teams
    let redBaseX = 100;
    let redBaseY = 50;
    let blueBaseX = canvas.width - 100;
    let blueBaseY = 50;

    // Team kill counters
    let redTeamKills = 0;
    let blueTeamKills = 0;

    // User prediction tracking
    let userPrediction = null; // 'red' or 'blue'
    let gameWinner = null;
    const WIN_THRESHOLD = 10; // First to 10 kills wins

    // Team selection
    function selectTeam(team) {
        if (gameWinner) return; // Game already over

        userPrediction = team;

        // Update UI
        document.getElementById('rsb-red').classList.remove('selected');
        document.getElementById('rsb-blue').classList.remove('selected');

        if (team === 'red') {
            document.getElementById('rsb-red').classList.add('selected');
            document.getElementById('rsb-status').textContent = 'You picked Red to win. First to 10 kills.';
        } else {
            document.getElementById('rsb-blue').classList.add('selected');
            document.getElementById('rsb-status').textContent = 'You picked Blue to win. First to 10 kills.';
        }
    }

    // Check for game winner
    function checkGameWinner() {
        if (gameWinner) return; // Already determined

        if (redTeamKills >= WIN_THRESHOLD) {
            gameWinner = 'red';
            announceWinner('red');
        } else if (blueTeamKills >= WIN_THRESHOLD) {
            gameWinner = 'blue';
            announceWinner('blue');
        }
    }

    // Announce winner and check user prediction
    function announceWinner(winner) {
        // Disable buttons
        document.getElementById('rsb-red').disabled = true;
        document.getElementById('rsb-blue').disabled = true;

        const winnerTeamName = winner === 'red' ? 'Red' : 'Blue';

        if (userPrediction === winner) {
            // USER WAS CORRECT! HIGH FIVE!
            document.getElementById('rsb-status').textContent =
                `${winnerTeamName} won. You called it. High five!`;
            triggerVictoryGlow();
        } else if (userPrediction) {
            // User predicted but was wrong
            document.getElementById('rsb-status').textContent =
                `${winnerTeamName} won. Better luck next time.`;
        } else {
            // User didn't predict
            document.getElementById('rsb-status').textContent =
                `${winnerTeamName} won. You didn't pick a side.`;
        }
    }

    // Trigger yellow glow effect
    function triggerVictoryGlow() {
        const glowOverlay = document.getElementById('rsb-glow');
        glowOverlay.classList.add('active');

        // Fade out after 3 seconds
        setTimeout(() => {
            glowOverlay.classList.remove('active');
        }, 3000);
    }

    // Update base positions from button locations
    function updateBasePositions() {
        const prevWeekBtn = document.getElementById('rsb-red');
        const nextWeekBtn = document.getElementById('rsb-blue');

        if (prevWeekBtn) {
            const rect = prevWeekBtn.getBoundingClientRect();
            redBaseX = rect.left + rect.width / 2;
            redBaseY = rect.top - 50; // Above the button
        }

        if (nextWeekBtn) {
            const rect = nextWeekBtn.getBoundingClientRect();
            blueBaseX = rect.left + rect.width / 2;
            blueBaseY = rect.top - 50;
        }
    }

    // Spaceship class with landing and recharge
    class Spaceship {
        constructor(team) {
            this.team = team; // 'red' or 'blue'
            this.baseX = team === 'red' ? redBaseX : blueBaseX;
            this.baseY = team === 'red' ? redBaseY : blueBaseY;

            // Start at base - VERTICAL
            this.x = this.baseX;
            this.y = this.baseY;
            this.startY = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2;
            this.size = Math.random() * 15 + 20;
            this.speed = team === 'red' ? 2 : -2;
            this.baseSpeed = this.speed;
            this.blink = 0;
            this.shootCooldown = 0;
            this.kills = 0;
            this.upgradeLevel = 0;

            // State machine - START STANDING VERTICAL
            this.state = 'standing'; // standing, boarding, ignition, taking_off, flying, landing, landed, recharging
            this.stateTimer = 0;

            // Rotation for takeoff/landing
            this.rotation = Math.PI / 2; // Start vertical (90 degrees)
            this.targetRotation = 0; // Horizontal for flight

            // Boost mechanic
            this.boosted = false;
            this.boostTimer = 0;
            this.boostDuration = 3600; // 60 seconds at 60fps

            // Movement
            this.movementPattern = Math.random();
            this.patternPhase = 0;
            this.pursuing = null;

            // Spacemen
            this.spacemen = [];

            // Engine particles
            this.engineParticles = [];
        }

        update(aliens, lasers, spacemen) {
            this.blink += 0.1;
            this.patternPhase += 0.02;
            this.shootCooldown--;
            this.stateTimer++;

            // Handle boost timer
            if (this.boosted) {
                this.boostTimer--;
                if (this.boostTimer <= 0) {
                    this.boosted = false;
                }
            }

            // Update engine particles
            for (let i = this.engineParticles.length - 1; i >= 0; i--) {
                this.engineParticles[i].life--;
                this.engineParticles[i].y += this.engineParticles[i].vy;
                this.engineParticles[i].x += this.engineParticles[i].vx;
                if (this.engineParticles[i].life <= 0) {
                    this.engineParticles.splice(i, 1);
                }
            }

            // State machine
            if (this.state === 'standing') {
                // Ship stands vertical at base, waiting for spacemen
                if (this.stateTimer > 60) { // 1 second
                    this.state = 'boarding';
                    this.stateTimer = 0;
                    // Spawn spacemen walking to ship
                    for (let i = 0; i < 2; i++) {
                        spacemen.push(new Spaceman(this.baseX + (i - 0.5) * 50, this.baseY + 40, this.team, this));
                    }
                }
                return true;
            }

            if (this.state === 'boarding') {
                // Spacemen walk to ship and board
                if (this.stateTimer > 120) { // 2 seconds
                    this.state = 'ignition';
                    this.stateTimer = 0;
                    // Remove spacemen (they're inside now)
                    for (let i = spacemen.length - 1; i >= 0; i--) {
                        if (spacemen[i].ship === this) {
                            spacemen.splice(i, 1);
                        }
                    }
                }
                return true;
            }

            if (this.state === 'ignition') {
                // Fire up engines - create particles
                if (this.stateTimer % 3 === 0) {
                    this.engineParticles.push({
                        x: this.x,
                        y: this.y + this.size * 0.8,
                        vx: (Math.random() - 0.5) * 1,
                        vy: Math.random() * 2 + 1,
                        life: 30,
                        color: this.team === 'red' ? '#ff6600' : '#0066ff'
                    });
                }
                if (this.stateTimer > 60) { // 1 second
                    this.state = 'taking_off';
                    this.stateTimer = 0;
                }
                return true;
            }

            if (this.state === 'taking_off') {
                // Rotate to horizontal and rise
                this.rotation -= 0.05;
                if (this.rotation < 0) this.rotation = 0;

                this.y -= 2;

                // Create engine thrust
                if (this.stateTimer % 2 === 0) {
                    this.engineParticles.push({
                        x: this.x,
                        y: this.y + this.size * 0.4,
                        vx: (Math.random() - 0.5) * 2,
                        vy: Math.random() * 3 + 2,
                        life: 20,
                        color: this.team === 'red' ? '#ff6600' : '#0066ff'
                    });
                }

                if (this.y < this.startY && this.rotation === 0) {
                    this.state = 'flying';
                    this.stateTimer = 0;
                }
                return true;
            }

            if (this.state === 'flying') {
                // Normal combat flying
                this.x += this.speed;

                // Movement patterns
                if (this.movementPattern < 0.33) {
                    this.y = this.startY + Math.sin(this.patternPhase) * 40;
                } else if (this.movementPattern < 0.66) {
                    if (this.pursuing && this.pursuing.health > 0) {
                        const dy = this.pursuing.y - this.y;
                        this.y += dy * 0.015;
                    }
                } else {
                    this.y = this.startY + Math.cos(this.patternPhase) * 35;
                }

                // Shooting with boost
                if (this.shootCooldown <= 0 && aliens.length > 0) {
                    let nearestAlien = null;
                    let nearestDistance = Infinity;

                    aliens.forEach(alien => {
                        const dx = alien.x - this.x;
                        const dy = alien.y - this.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < nearestDistance && distance < 600) {
                            nearestDistance = distance;
                            nearestAlien = alien;
                        }
                    });

                    if (nearestAlien) {
                        if (Math.random() < 0.3) {
                            this.pursuing = nearestAlien;
                        }

                        const color = this.team === 'red' ? '#ff4444' : '#4444ff';
                        lasers.push(new Laser(this.x, this.y, nearestAlien.x, nearestAlien.y, color, this));

                        // Boosted ships shoot 10% faster
                        const cooldownReduction = this.upgradeLevel * 5;
                        const boostReduction = this.boosted ? 5 : 0;
                        this.shootCooldown = (20 + Math.random() * 15) - cooldownReduction - boostReduction;
                    }
                }

                // Decide to land after some kills
                if (this.kills > 0 && this.kills % 3 === 0 && this.stateTimer > 600 && Math.random() < 0.01) {
                    this.state = 'landing';
                    this.stateTimer = 0;
                }

                // Wrap around screen edges
                if (this.x > canvas.width + 50) {
                    this.x = -50;
                } else if (this.x < -50) {
                    this.x = canvas.width + 50;
                }

                return true;
            }

            if (this.state === 'landing') {
                // Navigate back to base and rotate to vertical
                const dx = this.baseX - this.x;
                const dy = this.baseY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Rotate back to vertical
                if (this.rotation < Math.PI / 2) {
                    this.rotation += 0.05;
                }

                if (distance < 5) {
                    this.state = 'landed';
                    this.stateTimer = 0;
                    this.x = this.baseX;
                    this.y = this.baseY;
                    this.rotation = Math.PI / 2; // Fully vertical

                    // Deploy spacemen
                    for (let i = 0; i < 2; i++) {
                        spacemen.push(new Spaceman(this.baseX + (i - 0.5) * 30, this.baseY + 40, this.team, this));
                    }
                } else {
                    this.x += (dx / distance) * 2;
                    this.y += (dy / distance) * 2;
                }
                return true;
            }

            if (this.state === 'landed') {
                // Wait for recharge to complete - ship stands vertical
                if (this.stateTimer > 120) { // 2 seconds
                    this.state = 'ignition';
                    this.stateTimer = 0;
                    // Apply boost
                    this.boosted = true;
                    this.boostTimer = this.boostDuration;
                    // Despawn spacemen (they board the ship)
                    for (let i = spacemen.length - 1; i >= 0; i--) {
                        if (spacemen[i].ship === this) {
                            spacemen.splice(i, 1);
                        }
                    }
                }
                return true;
            }

            return true;
        }

        registerKill() {
            this.kills++;
            // Upgrade every 2 kills, max level 3
            if (this.kills % 2 === 0 && this.upgradeLevel < 3) {
                this.upgradeLevel++;
                this.size = Math.min(this.size * 1.15, 50); // Grow slightly, cap at 50
                // Increase speed by 10% each upgrade
                const speedMultiplier = 1 + (this.upgradeLevel * 0.1);
                this.speed = this.baseSpeed * speedMultiplier;
                // Shooting power already enhanced via upgradeLevel in shootCooldown reduction
            }
        }

        draw() {
            // Draw engine particles first (behind ship)
            this.engineParticles.forEach(p => {
                ctx.save();
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 30;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation); // Apply rotation for vertical/horizontal
            if (this.speed < 0 && this.rotation === 0) ctx.scale(-1, 1); // Mirror for left-facing

            // Boost glow
            if (this.boosted) {
                ctx.shadowBlur = 25;
                ctx.shadowColor = this.team === 'red' ? '#ff0000' : '#0000ff';
            }

            // Body - team colored
            const baseColor = this.team === 'red' ? [150, 50, 50] : [50, 50, 150];
            const brightness = 1 + (this.upgradeLevel * 0.2);
            ctx.fillStyle = `rgb(${baseColor[0] * brightness}, ${baseColor[1] * brightness}, ${baseColor[2] * brightness})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-this.size * 0.8, -this.size * 0.3);
            ctx.lineTo(-this.size * 0.8, this.size * 0.3);
            ctx.closePath();
            ctx.fill();

            // Cockpit - team accent color
            ctx.fillStyle = this.team === 'red' ? '#ff6666' : '#6666ff';
            ctx.beginPath();
            ctx.arc(-this.size * 0.3, 0, this.size * 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Lights
            const lightBrightness = Math.abs(Math.sin(this.blink));
            ctx.fillStyle = `rgba(255, 255, 100, ${lightBrightness})`;
            ctx.beginPath();
            ctx.arc(-this.size * 0.7, 0, this.size * 0.1, 0, Math.PI * 2);
            ctx.fill();

            // Additional lights for upgraded ships
            if (this.upgradeLevel >= 1) {
                ctx.fillStyle = `rgba(100, 255, 255, ${lightBrightness})`;
                ctx.beginPath();
                ctx.arc(-this.size * 0.7, -this.size * 0.15, this.size * 0.08, 0, Math.PI * 2);
                ctx.fill();
            }
            if (this.upgradeLevel >= 2) {
                ctx.fillStyle = `rgba(255, 100, 255, ${lightBrightness})`;
                ctx.beginPath();
                ctx.arc(-this.size * 0.7, this.size * 0.15, this.size * 0.08, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();

            // Boost indicator (outside rotation)
            if (this.boosted) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.fillStyle = '#ffffff';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`BOOST ${Math.ceil(this.boostTimer / 60)}s`, 0, -this.size - 15);
                ctx.restore();
            }
        }
    }

    // Spaceman class
    class Spaceman {
        constructor(x, y, team, ship) {
            this.x = x;
            this.y = y;
            this.team = team;
            this.ship = ship;
            this.size = 8;
            this.walkPhase = Math.random() * Math.PI * 2;
            this.targetX = x + (Math.random() - 0.5) * 50;
            this.celebrating = false;
            this.celebrateTimer = 0;
            this.partner = null; // For hi-fiving
        }

        update(spacemen) {
            // Check if ship got a kill - trigger celebration
            if (this.ship && this.ship.kills > 0 && !this.celebrating && Math.random() < 0.05) {
                // Find partner for hi-five
                const teammates = spacemen.filter(s => s.team === this.team && s !== this && !s.celebrating);
                if (teammates.length > 0) {
                    this.partner = teammates[0];
                    this.celebrating = true;
                    this.celebrateTimer = 60; // 1 second
                    if (this.partner) {
                        this.partner.celebrating = true;
                        this.partner.celebrateTimer = 60;
                        this.partner.partner = this;
                    }
                }
            }

            // Celebration behavior
            if (this.celebrating) {
                this.celebrateTimer--;
                if (this.celebrateTimer <= 0) {
                    this.celebrating = false;
                    this.partner = null;
                } else if (this.partner) {
                    // Move toward partner for hi-five
                    const dx = this.partner.x - this.x;
                    if (Math.abs(dx) > 5) {
                        this.x += dx * 0.1;
                    }
                }
                return true;
            }

            // Normal walking behavior
            this.walkPhase += 0.1;
            const dx = this.targetX - this.x;
            if (Math.abs(dx) < 2) {
                // Pick new target
                this.targetX = this.ship.baseX + (Math.random() - 0.5) * 50;
            } else {
                this.x += dx * 0.05;
            }

            return true;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);

            // Team colored spacesuit
            ctx.fillStyle = this.team === 'red' ? '#ff4444' : '#4444ff';

            // Body
            ctx.fillRect(-this.size * 0.3, -this.size * 0.5, this.size * 0.6, this.size * 0.8);

            // Helmet
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.7, this.size * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Visor
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.7, this.size * 0.25, 0, Math.PI * 2);
            ctx.fill();

            // Legs (walking animation)
            ctx.fillStyle = this.team === 'red' ? '#ff4444' : '#4444ff';
            const legOffset = Math.sin(this.walkPhase) * 3;
            ctx.fillRect(-this.size * 0.25, this.size * 0.3, this.size * 0.2, this.size * 0.4 + legOffset);
            ctx.fillRect(this.size * 0.05, this.size * 0.3, this.size * 0.2, this.size * 0.4 - legOffset);

            // Hi-five animation
            if (this.celebrating && this.celebrateTimer > 30) {
                ctx.fillStyle = '#ffff00';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('✋', 0, -this.size * 1.5);
            }

            ctx.restore();
        }
    }

    // Alien class (UFO)
    class Alien {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * (canvas.height * 0.4);
            this.size = Math.random() * 20 + 15;
            this.wobbleSpeed = Math.random() * 0.03 + 0.02;
            this.wobblePhase = Math.random() * Math.PI * 2;
            this.moveX = (Math.random() - 0.5) * 0.5;
            this.moveY = (Math.random() - 0.5) * 0.3;
            this.life = Math.random() * 300 + 200;
            this.health = 50;
            this.maxHealth = 50;
            this.timewarpCooldown = 100 + Math.random() * 100; // Random cooldown for teleport
            this.teleporting = false;
            this.teleportPhase = 0;

            // Classic saucer type only
            this.shipType = 'saucer';

            // Random alien pilot color
            const alienColors = ['#9933ff', '#33ff99', '#ff9933', '#3399ff', '#ff3399'];
            this.pilotColor = alienColors[Math.floor(Math.random() * alienColors.length)];
        }

        update() {
            this.wobblePhase += this.wobbleSpeed;
            this.timewarpCooldown--;

            // Teleport effect
            if (this.teleporting) {
                this.teleportPhase++;
                if (this.teleportPhase > 30) {
                    // Finish teleport
                    this.teleporting = false;
                    this.teleportPhase = 0;
                    this.timewarpCooldown = 150 + Math.random() * 150; // Reset cooldown
                }
                return true; // Stay alive during teleport
            }

            // Random timewarp (2% chance when cooldown ready)
            if (this.timewarpCooldown <= 0 && Math.random() < 0.02) {
                this.initiateTeleport();
            }

            this.x += this.moveX + Math.sin(this.wobblePhase) * 0.5;
            this.y += this.moveY + Math.cos(this.wobblePhase * 0.7) * 0.3;
            this.life--;
            return this.health > 0 && this.life > 0 && this.x > -100 && this.x < canvas.width + 100;
        }

        initiateTeleport() {
            this.teleporting = true;
            this.teleportPhase = 0;

            // After half the teleport animation, move to new location
            setTimeout(() => {
                if (this.teleporting) {
                    this.x = Math.random() * canvas.width;
                    this.y = Math.random() * (canvas.height * 0.4);
                    // Sometimes change direction after teleport
                    if (Math.random() < 0.5) {
                        this.moveX = (Math.random() - 0.5) * 0.6;
                        this.moveY = (Math.random() - 0.5) * 0.4;
                    }
                }
            }, 15 * 16.67); // 15 frames at 60fps
        }

        checkHit(laser) {
            const dx = laser.x - this.x;
            const dy = laser.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < this.size;
        }

        onHit() {
            // Decrement health by 1
            this.health--;

            if (this.health <= 0) {
                return true; // Was destroyed after 50 hits
            } else {
                return false; // Still alive
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y + Math.sin(this.wobblePhase) * 3);

            // Teleport effect - phasing in/out
            if (this.teleporting) {
                const phase = this.teleportPhase / 30;
                const opacity = phase < 0.5 ? (1 - phase * 2) : ((phase - 0.5) * 2);
                ctx.globalAlpha = opacity;
                ctx.shadowBlur = 20 * (1 - Math.abs(phase - 0.5) * 2);
                ctx.shadowColor = '#00ffff';
                if (phase > 0.4 && phase < 0.6) {
                    ctx.scale(1 + Math.sin(phase * Math.PI * 10) * 0.2, 1 + Math.cos(phase * Math.PI * 10) * 0.2);
                }
            }

            // Health bar above alien
            const barWidth = this.size * 2;
            const barHeight = 4;
            const barY = -this.size - 15;
            const healthPercent = this.health / this.maxHealth;

            ctx.fillStyle = 'rgba(50, 50, 50, 0.7)';
            ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

            let healthColor = healthPercent > 0.6 ? '#5edf89' : healthPercent > 0.3 ? '#ffaa00' : '#ff4444';
            ctx.fillStyle = healthColor;
            ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);

            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.health}/${this.maxHealth}`, 0, barY - 2);

            // Draw ship based on type
            switch (this.shipType) {
                case 'saucer':
                    this.drawSaucer();
                    break;
                case 'triangular':
                    this.drawTriangular();
                    break;
                case 'organic':
                    this.drawOrganic();
                    break;
                case 'cylindrical':
                    this.drawCylindrical();
                    break;
            }

            ctx.restore();
        }

        drawSaucer() {
            // Main saucer body
            ctx.fillStyle = '#8a8a9f';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size, this.size * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Glass dome cockpit (transparent)
            ctx.fillStyle = 'rgba(150, 200, 255, 0.3)';
            ctx.strokeStyle = 'rgba(150, 200, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.2, this.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Alien pilot visible through glass
            ctx.fillStyle = this.pilotColor;
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.15, this.size * 0.15, 0, Math.PI * 2); // Head
            ctx.fill();

            // Alien eyes
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-this.size * 0.08, -this.size * 0.15, this.size * 0.05, 0, Math.PI * 2);
            ctx.arc(this.size * 0.08, -this.size * 0.15, this.size * 0.05, 0, Math.PI * 2);
            ctx.fill();

            // Light beam (sometimes, not when teleporting)
            if (!this.teleporting && Math.random() > 0.95) {
                const gradient = ctx.createLinearGradient(0, 0, 0, this.size * 3);
                gradient.addColorStop(0, 'rgba(94, 223, 137, 0.3)');
                gradient.addColorStop(1, 'rgba(94, 223, 137, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(-this.size * 0.3, this.size * 0.3);
                ctx.lineTo(-this.size * 0.8, this.size * 3);
                ctx.lineTo(this.size * 0.8, this.size * 3);
                ctx.lineTo(this.size * 0.3, this.size * 0.3);
                ctx.closePath();
                ctx.fill();
            }
        }

        drawTriangular() {
            // Delta-wing ship body
            ctx.fillStyle = '#6b7a8f';
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.8, this.size * 0.5);
            ctx.lineTo(this.size, 0);
            ctx.lineTo(-this.size * 0.8, -this.size * 0.5);
            ctx.closePath();
            ctx.fill();

            // Front cockpit glass (transparent)
            ctx.fillStyle = 'rgba(100, 255, 200, 0.3)';
            ctx.strokeStyle = 'rgba(100, 255, 200, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.size * 0.5, 0, this.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Alien pilot visible through glass
            ctx.fillStyle = this.pilotColor;
            ctx.beginPath();
            ctx.arc(this.size * 0.5, 0, this.size * 0.12, 0, Math.PI * 2); // Head
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(this.size * 0.45, -this.size * 0.03, this.size * 0.04, 0, Math.PI * 2);
            ctx.arc(this.size * 0.55, -this.size * 0.03, this.size * 0.04, 0, Math.PI * 2);
            ctx.fill();

            // Engine glow
            ctx.fillStyle = 'rgba(255, 100, 50, 0.5)';
            ctx.beginPath();
            ctx.arc(-this.size * 0.8, 0, this.size * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        drawOrganic() {
            // Organic curved body
            ctx.fillStyle = '#9b6b9e';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 0.8, this.size * 0.5, Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();

            // Translucent membrane cockpit
            ctx.fillStyle = 'rgba(200, 150, 255, 0.3)';
            ctx.strokeStyle = 'rgba(200, 150, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.size * 0.2, 0, this.size * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Alien pilot inside
            ctx.fillStyle = this.pilotColor;
            ctx.beginPath();
            ctx.arc(this.size * 0.2, 0, this.size * 0.15, 0, Math.PI * 2); // Head
            ctx.fill();

            // Large alien eyes
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(this.size * 0.12, -this.size * 0.05, this.size * 0.06, 0, Math.PI * 2);
            ctx.arc(this.size * 0.28, -this.size * 0.05, this.size * 0.06, 0, Math.PI * 2);
            ctx.fill();

            // Bioluminescent spots
            ctx.fillStyle = 'rgba(150, 255, 200, 0.6)';
            ctx.beginPath();
            ctx.arc(-this.size * 0.3, this.size * 0.2, this.size * 0.08, 0, Math.PI * 2);
            ctx.arc(-this.size * 0.3, -this.size * 0.2, this.size * 0.08, 0, Math.PI * 2);
            ctx.fill();
        }

        drawCylindrical() {
            // Tube-shaped ship
            ctx.fillStyle = '#7a8a99';
            ctx.fillRect(-this.size, -this.size * 0.3, this.size * 2, this.size * 0.6);

            // Side cockpit window (transparent)
            ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
            ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.size * 0.3, 0, this.size * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Alien pilot visible through side window
            ctx.fillStyle = this.pilotColor;
            ctx.beginPath();
            ctx.arc(this.size * 0.3, 0, this.size * 0.14, 0, Math.PI * 2); // Head
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(this.size * 0.22, -this.size * 0.03, this.size * 0.04, 0, Math.PI * 2);
            ctx.arc(this.size * 0.38, -this.size * 0.03, this.size * 0.04, 0, Math.PI * 2);
            ctx.fill();

            // Engine exhausts
            ctx.fillStyle = 'rgba(50, 150, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(-this.size, this.size * 0.15, this.size * 0.12, 0, Math.PI * 2);
            ctx.arc(-this.size, -this.size * 0.15, this.size * 0.12, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Fire Explosion class
    class FireExplosion {
        constructor(x, y, size) {
            this.x = x;
            this.y = y;
            this.size = size;
            this.particles = [];
            this.life = 60; // Frames
            this.maxLife = 60;

            // Create fire particles
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 1;
                this.particles.push({
                    x: 0,
                    y: 0,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: Math.random() * size * 0.3 + size * 0.1,
                    life: 1.0
                });
            }
        }

        update() {
            this.life--;

            // Update particles
            this.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // Gravity
                p.vx *= 0.98; // Drag
                p.life -= 0.02; // Fade out
            });

            return this.life > 0;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);

            this.particles.forEach(p => {
                if (p.life > 0) {
                    // Fire color gradient: purple → red → orange → white
                    const lifePercent = p.life;
                    let color;

                    if (lifePercent > 0.75) {
                        // Purple to red
                        const t = (lifePercent - 0.75) / 0.25;
                        color = `rgba(${128 + 127 * (1 - t)}, ${0}, ${128 * t}, ${p.life})`;
                    } else if (lifePercent > 0.5) {
                        // Red to orange
                        const t = (lifePercent - 0.5) / 0.25;
                        color = `rgba(255, ${128 * (1 - t)}, 0, ${p.life})`;
                    } else if (lifePercent > 0.25) {
                        // Orange to white
                        const t = (lifePercent - 0.25) / 0.25;
                        color = `rgba(255, ${128 + 127 * (1 - t)}, ${255 * (1 - t)}, ${p.life})`;
                    } else {
                        // White fade out
                        color = `rgba(255, 255, 255, ${p.life})`;
                    }

                    ctx.fillStyle = color;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            ctx.restore();
        }
    }

    // Create initial stars
    const stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push(new Star());
    }

    const meteors = [];
    const spaceships = [];
    const aliens = [];
    const lasers = [];
    const explosions = [];
    const spacemen = [];

    // Update base positions on init
    updateBasePositions();

    // Animation loop
    let running = false;
    let frame = null;

    function animate() {
        if (!running) return;
        ctx.fillStyle = 'rgba(10, 10, 31, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw stars
        stars.forEach(star => star.draw());

        // Draw team bases
        updateBasePositions(); // Update positions each frame

        // Draw team kill counters (scoreboard at top center)
        ctx.save();
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;

        const scoreboardY = 20;
        const centerX = canvas.width / 2;

        // Red team kills (left of center)
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff4444';
        ctx.fillText(`RED: ${redTeamKills}`, centerX - 60, scoreboardY);

        // VS separator
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.fillText('VS', centerX, scoreboardY);

        // Blue team kills (right of center)
        ctx.fillStyle = '#4444ff';
        ctx.shadowColor = '#4444ff';
        ctx.fillText(`BLUE: ${blueTeamKills}`, centerX + 60, scoreboardY);

        ctx.restore();

        // Add meteors randomly (rare)
        if (Math.random() > 0.99) {
            meteors.push(new Meteor());
        }

        // Add spaceships for both teams
        if (Math.random() > 0.995 && spaceships.filter(s => s.team === 'red').length < 5) {
            spaceships.push(new Spaceship('red'));
        }
        if (Math.random() > 0.995 && spaceships.filter(s => s.team === 'blue').length < 5) {
            spaceships.push(new Spaceship('blue'));
        }

        // Add aliens VERY rarely
        if (Math.random() > 0.9985) {
            aliens.push(new Alien());
        }

        // Update and draw meteors
        for (let i = meteors.length - 1; i >= 0; i--) {
            if (meteors[i].update()) {
                meteors[i].draw();
            } else {
                meteors.splice(i, 1);
            }
        }

        // Update and draw spaceships (pass aliens, lasers, and spacemen)
        for (let i = spaceships.length - 1; i >= 0; i--) {
            if (spaceships[i].update(aliens, lasers, spacemen)) {
                spaceships[i].draw();
            } else {
                spaceships.splice(i, 1);
            }
        }

        // Update and draw spacemen
        for (let i = spacemen.length - 1; i >= 0; i--) {
            if (spacemen[i].update(spacemen)) {
                spacemen[i].draw();
            } else {
                spacemen.splice(i, 1);
            }
        }

        // Update and draw lasers
        for (let i = lasers.length - 1; i >= 0; i--) {
            if (lasers[i].update()) {
                lasers[i].draw();

                // Check for hits on aliens
                for (let j = aliens.length - 1; j >= 0; j--) {
                    if (aliens[j].checkHit(lasers[i])) {
                        // Hit!
                        const wasDestroyed = aliens[j].onHit();
                        const shooter = lasers[i].shooter; // Save shooter reference
                        lasers.splice(i, 1); // Remove laser

                        if (wasDestroyed) {
                            // Alien destroyed! Credit the ship that fired the laser
                            if (shooter) {
                                shooter.registerKill();
                                // Increment team kill counter
                                if (shooter.team === 'red') {
                                    redTeamKills++;
                                } else if (shooter.team === 'blue') {
                                    blueTeamKills++;
                                }
                                // Check if a team has won
                                checkGameWinner();
                            }

                            // Create fire explosion at alien's position
                            explosions.push(new FireExplosion(aliens[j].x, aliens[j].y, aliens[j].size));

                            aliens.splice(j, 1);

                            // Spawn a new alien somewhere else (normal size)
                            setTimeout(() => {
                                aliens.push(new Alien());
                            }, 1000 + Math.random() * 2000);
                        }
                        break; // Laser already removed
                    }
                }
            } else {
                lasers.splice(i, 1);
            }
        }

        // Update and draw aliens
        for (let i = aliens.length - 1; i >= 0; i--) {
            if (aliens[i].update()) {
                aliens[i].draw();
            } else {
                aliens.splice(i, 1);
            }
        }

        // Update and draw explosions
        for (let i = explosions.length - 1; i >= 0; i--) {
            if (explosions[i].update()) {
                explosions[i].draw();
            } else {
                explosions.splice(i, 1);
            }
        }

        frame = requestAnimationFrame(animate);
    }

    window.RickySpaceBattle = Object.freeze({
        selectTeam,
        start() {
            if (running) return;
            running = true;
            animate();
        },
        stop() {
            running = false;
            if (frame !== null) cancelAnimationFrame(frame);
            frame = null;
        }
    });
})();
