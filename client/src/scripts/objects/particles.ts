import { type Vector, vAdd, vMul, vDiv } from "../../../../common/src/utils/vector";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { type Game } from "../game";
import { random, randomRotation } from "../../../../common/src/utils/random";
import { lerp } from "../../../../common/src/utils/math";

export class ParticleManager {
    particles = new Set<Particle>();

    game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    update(delta: number): void {
        for (const particle of this.particles) {
            particle.update(delta);

            if (particle.dead) {
                this.particles.delete(particle);
                particle.image.destroy();
            }
        }
    }

    spawnParticle(options: ParticleOptions): Particle {
        const particle = new Particle(options);
        this.particles.add(particle);
        this.game.camera.container.addChild(particle.image);
        return particle;
    }

    spawnParticles(count: number, options: () => ParticleOptions): void {
        for (let i = 0; i < count; i++) this.spawnParticle(options());
    }

    clear(): void {
        this.particles.clear();
    }
}

export type ParticleProperty = {
    start: number
    end: number
    ease?: (x: number) => number
} | number;

export interface ParticleOptions {
    frames: string | string[]
    position: Vector
    speed: Vector
    lifeTime: number
    depth: number
    scale?: ParticleProperty
    alpha?: ParticleProperty
    rotation?: ParticleProperty
}

export class Particle {
    position: Vector;
    image: SuroiSprite;

    spawnTime = Date.now();
    deathTime: number;
    dead = false;

    options: ParticleOptions;

    scale = 1;
    alpha = 1;
    rotation = 0;

    constructor(options: ParticleOptions) {
        this.deathTime = this.spawnTime + options.lifeTime;
        this.position = options.position;
        const frames = options.frames;
        const frame = typeof frames === "string" ? frames : frames[random(0, frames.length - 1)];
        this.image = new SuroiSprite(frame);
        this.image.setDepth(options.depth);

        this.scale = typeof options.scale === "number" ? options.scale : 1;
        this.alpha = typeof options.alpha === "number" ? options.alpha : 1;
        this.rotation = typeof options.rotation === "number" ? options.rotation : randomRotation();

        this.options = options;
    }

    update(delta: number): void {
        this.position = vAdd(this.position, vDiv(vMul(this.options.speed, delta), 1000));
        const options = this.options;

        const now = Date.now();
        let interpFactor: number;
        if (now >= this.deathTime) {
            this.dead = true;
            interpFactor = 1;
        } else {
            interpFactor = (now - this.spawnTime) / options.lifeTime;
        }

        // i was too lazy to figure out a better way of doing that lol...
        if (typeof options.scale === "object" && "start" in options.scale) {
            this.scale = lerp(options.scale.start, options.scale.end, options.scale.ease ? options.scale.ease(interpFactor) : interpFactor);
        }

        if (typeof options.alpha === "object" && "start" in options.alpha) {
            this.alpha = lerp(options.alpha.start, options.alpha.end, options.alpha.ease ? options.alpha.ease(interpFactor) : interpFactor);
        }

        if (typeof options.rotation === "object" && "start" in options.rotation) {
            this.rotation = lerp(options.rotation.start, options.rotation.end, options.rotation.ease ? options.rotation.ease(interpFactor) : interpFactor);
        }

        this.image.position.copyFrom(toPixiCoords(this.position));
        this.image.scale.set(this.scale);
        this.image.setRotation(this.rotation).setAlpha(this.alpha);
    }
}
