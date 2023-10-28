import { type BulletDefiniton, Bullets } from "../definitions/bullets";
import { type Hitbox } from "./hitbox";
import { clamp, distanceSquared } from "./math";
import { type ReifiableDef } from "./objectDefinitions";
import { v, vAdd, vClone, vMul, type Vector } from "./vector";

export interface BulletOptions {
    readonly position: Vector
    readonly rotation: number
    readonly source: ReifiableDef<BulletDefiniton>
    readonly sourceID: number
    readonly reflectionCount?: number
    readonly variance?: number
    readonly clipDistance?: number
}

interface GameObject {
    readonly position: Vector
    readonly hitbox?: Hitbox
    readonly dead: boolean
    readonly damageable: boolean
    readonly id: number
}

interface Collision {
    readonly intersection: {
        readonly point: Vector
        readonly normal: Vector
    }
    readonly object: GameObject
}

export class BaseBullet {
    position: Vector;
    readonly initialPosition: Vector;

    readonly rotation: number;
    readonly velocity: Vector;

    readonly maxDistance: number;
    readonly maxDistanceSquared: number;

    readonly reflectionCount: number;

    readonly sourceID: number;

    readonly damagedIDs = new Set<number>();

    readonly rangeVariance: number;

    dead = false;

    readonly definition: BulletDefiniton;

    readonly canHitShooter: boolean;

    constructor(options: BulletOptions) {
        this.initialPosition = vClone(options.position);
        this.position = options.position;
        this.rotation = options.rotation;
        this.reflectionCount = options.reflectionCount ?? 0;
        this.sourceID = options.sourceID;
        this.rangeVariance = options.variance ?? 0;

        this.definition = Bullets.reify(options.source);

        let range = this.definition.maxDistance;

        if (this.definition.goToMouse && options.clipDistance !== undefined) {
            range = clamp(options.clipDistance, 0, this.definition.maxDistance);
        }
        this.maxDistance = (range * (this.rangeVariance + 1)) / (this.reflectionCount + 1);
        this.maxDistanceSquared = this.maxDistance ** 2;

        this.velocity = vMul(v(Math.sin(this.rotation), -Math.cos(this.rotation)), this.definition.speed * (this.rangeVariance + 1));

        this.canHitShooter = (this.definition.shrapnel ?? this.reflectionCount > 0);
    }

    /**
     * Update the bullet and check for collisions
     * @param delta The delta time between ticks
     * @param objects A set containing objects to check for collision
     * @returns An array containing the objects that the bullet collided and the intersection data
     */
    updateAndGetCollisions(delta: number, objects: { [Symbol.iterator]: () => Iterator<GameObject> }): Collision[] {
        const oldPosition = vClone(this.position);

        this.position = vAdd(this.position, vMul(this.velocity, delta));

        if (distanceSquared(this.initialPosition, this.position) > this.maxDistanceSquared) {
            this.dead = true;
            this.position = vAdd(this.initialPosition, (vMul(v(Math.sin(this.rotation), -Math.cos(this.rotation)), this.maxDistance)));
        }

        const collisions: Collision[] = [];

        for (const object of objects) {
            if (
                object.damageable && !object.dead &&
                !(!this.canHitShooter && object.id === this.sourceID) &&
                !this.damagedIDs.has(object.id)
            ) {
                const collision = object.hitbox?.intersectsLine(oldPosition, this.position);

                if (collision) {
                    collisions.push({
                        intersection: collision,
                        object
                    });
                }
            }
        }

        // Sort by closest to initial position
        collisions.sort(
            (a, b) =>
                distanceSquared(a.intersection?.point, this.initialPosition) -
                distanceSquared(b.intersection?.point, this.initialPosition)
        );

        return collisions;
    }
}
