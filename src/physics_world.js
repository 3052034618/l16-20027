(function () {
    let Vector2, detectCollision, SpatialGrid;
    if (typeof require !== 'undefined') {
        Vector2 = require('./shapes').Vector2;
        detectCollision = require('./sat').detectCollision;
        SpatialGrid = require('./spatial_grid').SpatialGrid;
    } else if (typeof window !== 'undefined' && window.Physics2D) {
        Vector2 = window.Physics2D.Vector2;
        detectCollision = window.Physics2D.detectCollision;
        SpatialGrid = window.Physics2D.SpatialGrid;
    }

    const CORRECTION_MODE = {
        FULL_SEPARATION: 'full_separation',
        STABLE_WITH_TOLERANCE: 'stable_with_tolerance'
    };

    class PhysicsWorld {
        constructor(width, height, cellSize = 50) {
            this.width = width;
            this.height = height;
            this.shapes = [];
            this.spatialGrid = new SpatialGrid(cellSize, width, height);
            this.gravity = new Vector2(0, 0);
            this.enableBroadPhase = true;
            this.correctionMode = CORRECTION_MODE.STABLE_WITH_TOLERANCE;
            this.stats = {
                broadPhasePairs: 0,
                narrowPhaseTests: 0,
                collisions: 0,
                bruteForcePairs: 0,
                broadPhaseTime: 0,
                narrowPhaseTime: 0,
                bruteForceTime: 0
            };
        }

        setCorrectionMode(mode) {
            this.correctionMode = mode;
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
            const totalInvMass = shapeA.invMass + shapeB.invMass;
            if (totalInvMass <= 0) return;

            let correctionMag;

            if (this.correctionMode === CORRECTION_MODE.FULL_SEPARATION) {
                correctionMag = depth / totalInvMass;
            } else {
                const percent = 0.8;
                const slop = 0.05;
                correctionMag = Math.max(depth - slop, 0) / totalInvMass * percent;
            }

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

        getBruteForcePairs() {
            const allPairs = [];
            for (let i = 0; i < this.shapes.length; i++) {
                for (let j = i + 1; j < this.shapes.length; j++) {
                    allPairs.push({ shapeA: this.shapes[i], shapeB: this.shapes[j] });
                }
            }
            return allPairs;
        }

        getCollisionPairs() {
            const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

            this.spatialGrid.clear();
            for (const shape of this.shapes) {
                this.spatialGrid.insert(shape);
            }

            const pairs = this.spatialGrid.getPotentialCollisions();
            const broadPhasePairs = Array.from(pairs);

            const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.stats.broadPhaseTime = t1 - t0;
            this.stats.broadPhasePairs = broadPhasePairs.length;

            if (!this.enableBroadPhase) {
                const bruteForcePairs = this.getBruteForcePairs();
                this.stats.broadPhasePairs = bruteForcePairs.length;
                this.stats.bruteForcePairs = bruteForcePairs.length;
                return bruteForcePairs;
            }

            const bruteForce = this.getBruteForcePairs();
            this.stats.bruteForcePairs = bruteForce.length;

            return broadPhasePairs;
        }

        step(deltaTime) {
            this.stats = {
                broadPhasePairs: 0,
                narrowPhaseTests: 0,
                collisions: 0,
                bruteForcePairs: 0,
                broadPhaseTime: 0,
                narrowPhaseTime: 0,
                bruteForceTime: 0
            };

            for (const shape of this.shapes) {
                if (shape.invMass > 0) {
                    shape.velocity = shape.velocity.add(this.gravity.mul(deltaTime));
                    shape.position = shape.position.add(shape.velocity.mul(deltaTime));
                }
            }

            const pairs = this.getCollisionPairs();
            this.stats.narrowPhaseTests = pairs.length;

            const t2 = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const collisions = [];

            for (const pair of pairs) {
                const collision = detectCollision(pair.shapeA, pair.shapeB);
                if (collision.collision) {
                    collisions.push(collision);
                }
            }

            const t3 = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.stats.narrowPhaseTime = t3 - t2;
            this.stats.collisions = collisions.length;

            const bruteForcePairs = this.getBruteForcePairs();
            const t4 = typeof performance !== 'undefined' ? performance.now() : Date.now();
            let bruteCollisions = 0;
            for (const pair of bruteForcePairs) {
                const collision = detectCollision(pair.shapeA, pair.shapeB);
                if (collision.collision) bruteCollisions++;
            }
            const t5 = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.stats.bruteForceTime = t5 - t4;

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
                gridStats: this.spatialGrid.getStats(),
                correctionMode: this.correctionMode,
                enableBroadPhase: this.enableBroadPhase
            };
        }
    }

    const _worldExports = {
        PhysicsWorld,
        CORRECTION_MODE
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = _worldExports;
    }
    if (typeof window !== 'undefined') {
        window.Physics2D = window.Physics2D || {};
        Object.assign(window.Physics2D, _worldExports);
    }
})();
