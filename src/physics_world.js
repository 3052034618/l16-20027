const { Vector2 } = require('./shapes');
const { detectCollision } = require('./sat');
const { SpatialGrid } = require('./spatial_grid');

class PhysicsWorld {
    constructor(width, height, cellSize = 50) {
        this.width = width;
        this.height = height;
        this.shapes = [];
        this.spatialGrid = new SpatialGrid(cellSize, width, height);
        this.gravity = new Vector2(0, 0);
        this.enableBroadPhase = true;
        this.stats = {
            broadPhasePairs: 0,
            narrowPhaseTests: 0,
            collisions: 0
        };
    }

    addShape(shape) {
        this.shapes.push(shape);
        this.spatialGrid.insert(shape);
    }

    removeShape(shape) {
        const index = this.shapes.indexOf(shape);
        if (index !== -1) {
            this.shapes.splice(index, 1);
            this.spatialGrid.remove(shape);
        }
    }

    clear() {
        this.shapes = [];
        this.spatialGrid.clear();
    }

    setGravity(x, y) {
        this.gravity = new Vector2(x, y);
    }

    resolveCollision(collision) {
        const { shapeA, shapeB, normal } = collision;

        const velocityRel = shapeB.velocity.sub(shapeA.velocity);

        const velAlongNormal = velocityRel.dot(normal);

        if (velAlongNormal > 0) {
            return;
        }

        const restitution = Math.min(shapeA.restitution, shapeB.restitution);

        const impulse = -(1 + restitution) * velAlongNormal / (shapeA.invMass + shapeB.invMass);

        const impulseVec = normal.mul(impulse);

        if (shapeA.invMass > 0) {
            shapeA.velocity = shapeA.velocity.sub(impulseVec.mul(shapeA.invMass));
        }
        if (shapeB.invMass > 0) {
            shapeB.velocity = shapeB.velocity.add(impulseVec.mul(shapeB.invMass));
        }
    }

    resolvePosition(collision) {
        const { shapeA, shapeB, normal, depth } = collision;

        const percent = 0.8;
        const slop = 0.05;
        const correctionMag = Math.max(depth - slop, 0) / (shapeA.invMass + shapeB.invMass) * percent;
        const correction = normal.mul(correctionMag);

        if (shapeA.invMass > 0) {
            shapeA.position = shapeA.position.sub(correction.mul(shapeA.invMass));
        }
        if (shapeB.invMass > 0) {
            shapeB.position = shapeB.position.add(correction.mul(shapeB.invMass));
        }
    }

    handleBoundaryCollision(shape) {
        const aabb = shape.getAABB();
        const damping = 0.5;

        if (aabb.minX < 0) {
            shape.position.x += -aabb.minX;
            if (shape.velocity.x < 0) {
                shape.velocity.x = -shape.velocity.x * shape.restitution * damping;
            }
        } else if (aabb.maxX > this.width) {
            shape.position.x -= aabb.maxX - this.width;
            if (shape.velocity.x > 0) {
                shape.velocity.x = -shape.velocity.x * shape.restitution * damping;
            }
        }

        if (aabb.minY < 0) {
            shape.position.y += -aabb.minY;
            if (shape.velocity.y < 0) {
                shape.velocity.y = -shape.velocity.y * shape.restitution * damping;
            }
        } else if (aabb.maxY > this.height) {
            shape.position.y -= aabb.maxY - this.height;
            if (shape.velocity.y > 0) {
                shape.velocity.y = -shape.velocity.y * shape.restitution * damping;
            }
        }
    }

    getCollisionPairs() {
        this.spatialGrid.clear();
        for (const shape of this.shapes) {
            this.spatialGrid.insert(shape);
        }

        const pairs = this.spatialGrid.getPotentialCollisions();
        this.stats.broadPhasePairs = pairs.size;

        if (!this.enableBroadPhase) {
            const allPairs = [];
            for (let i = 0; i < this.shapes.length; i++) {
                for (let j = i + 1; j < this.shapes.length; j++) {
                    allPairs.push({ shapeA: this.shapes[i], shapeB: this.shapes[j] });
                }
            }
            this.stats.broadPhasePairs = allPairs.length;
            return allPairs;
        }

        return Array.from(pairs);
    }

    step(deltaTime) {
        this.stats = {
            broadPhasePairs: 0,
            narrowPhaseTests: 0,
            collisions: 0
        };

        for (const shape of this.shapes) {
            if (shape.invMass > 0) {
                shape.velocity = shape.velocity.add(this.gravity.mul(deltaTime));
                shape.position = shape.position.add(shape.velocity.mul(deltaTime));
            }
        }

        const pairs = this.getCollisionPairs();
        this.stats.narrowPhaseTests = pairs.length;

        const collisions = [];

        for (const pair of pairs) {
            const collision = detectCollision(pair.shapeA, pair.shapeB);
            if (collision.collision) {
                collisions.push(collision);
            }
        }

        this.stats.collisions = collisions.length;

        for (const collision of collisions) {
            this.resolvePosition(collision);
            this.resolveCollision(collision);
        }

        for (const shape of this.shapes) {
            this.handleBoundaryCollision(shape);
        }

        return collisions;
    }

    getStats() {
        return {
            ...this.stats,
            totalShapes: this.shapes.length,
            gridStats: this.spatialGrid.getStats()
        };
    }
}

module.exports = {
    PhysicsWorld
};
