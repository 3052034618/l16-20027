(function () {
    class SpatialGrid {
        constructor(cellSize, width, height) {
            this.cellSize = cellSize;
            this.width = width;
            this.height = height;
            this.cols = Math.ceil(width / cellSize);
            this.rows = Math.ceil(height / cellSize);
            this.grid = new Map();
        }

        clear() {
            this.grid.clear();
        }

        getCellKey(col, row) {
            return `${col},${row}`;
        }

        getCell(col, row, create = true) {
            const key = this.getCellKey(col, row);
            if (!this.grid.has(key) && create) {
                this.grid.set(key, new Set());
            }
            return this.grid.get(key);
        }

        insert(shape) {
            const aabb = shape.getAABB();

            const startCol = Math.max(0, Math.floor(aabb.minX / this.cellSize));
            const endCol = Math.min(this.cols - 1, Math.floor(aabb.maxX / this.cellSize));
            const startRow = Math.max(0, Math.floor(aabb.minY / this.cellSize));
            const endRow = Math.min(this.rows - 1, Math.floor(aabb.maxY / this.cellSize));

            for (let col = startCol; col <= endCol; col++) {
                for (let row = startRow; row <= endRow; row++) {
                    const cell = this.getCell(col, row, true);
                    cell.add(shape);
                }
            }
        }

        remove(shape) {
            const aabb = shape.getAABB();

            const startCol = Math.max(0, Math.floor(aabb.minX / this.cellSize));
            const endCol = Math.min(this.cols - 1, Math.floor(aabb.maxX / this.cellSize));
            const startRow = Math.max(0, Math.floor(aabb.minY / this.cellSize));
            const endRow = Math.min(this.rows - 1, Math.floor(aabb.maxY / this.cellSize));

            for (let col = startCol; col <= endCol; col++) {
                for (let row = startRow; row <= endRow; row++) {
                    const cell = this.getCell(col, row, false);
                    if (cell) {
                        cell.delete(shape);
                        if (cell.size === 0) {
                            this.grid.delete(this.getCellKey(col, row));
                        }
                    }
                }
            }
        }

        update(shape) {
            this.remove(shape);
            this.insert(shape);
        }

        getPotentialCollisions() {
            const pairs = new Set();
            const checked = new Set();

            for (const [, cell] of this.grid) {
                const shapes = Array.from(cell);
                for (let i = 0; i < shapes.length; i++) {
                    for (let j = i + 1; j < shapes.length; j++) {
                        const shapeA = shapes[i];
                        const shapeB = shapes[j];

                        const pairKey = shapeA.id < shapeB.id
                            ? `${shapeA.id}-${shapeB.id}`
                            : `${shapeB.id}-${shapeA.id}`;

                        if (!checked.has(pairKey)) {
                            checked.add(pairKey);
                            pairs.add({ shapeA, shapeB });
                        }
                    }
                }
            }

            return pairs;
        }

        getPotentialCollisionsFor(shape) {
            const potential = new Set();
            const aabb = shape.getAABB();

            const startCol = Math.max(0, Math.floor(aabb.minX / this.cellSize));
            const endCol = Math.min(this.cols - 1, Math.floor(aabb.maxX / this.cellSize));
            const startRow = Math.max(0, Math.floor(aabb.minY / this.cellSize));
            const endRow = Math.min(this.rows - 1, Math.floor(aabb.maxY / this.cellSize));

            for (let col = startCol; col <= endCol; col++) {
                for (let row = startRow; row <= endRow; row++) {
                    const cell = this.getCell(col, row, false);
                    if (cell) {
                        for (const other of cell) {
                            if (other !== shape) {
                                potential.add(other);
                            }
                        }
                    }
                }
            }

            return potential;
        }

        queryRange(minX, minY, maxX, maxY) {
            const result = new Set();

            const startCol = Math.max(0, Math.floor(minX / this.cellSize));
            const endCol = Math.min(this.cols - 1, Math.floor(maxX / this.cellSize));
            const startRow = Math.max(0, Math.floor(minY / this.cellSize));
            const endRow = Math.min(this.rows - 1, Math.floor(maxY / this.cellSize));

            for (let col = startCol; col <= endCol; col++) {
                for (let row = startRow; row <= endRow; row++) {
                    const cell = this.getCell(col, row, false);
                    if (cell) {
                        for (const shape of cell) {
                            result.add(shape);
                        }
                    }
                }
            }

            return result;
        }

        getStats() {
            let totalShapes = 0;
            let maxCellSize = 0;

            for (const [, cell] of this.grid) {
                totalShapes += cell.size;
                if (cell.size > maxCellSize) {
                    maxCellSize = cell.size;
                }
            }

            return {
                cellCount: this.grid.size,
                totalShapes,
                maxCellSize,
                avgCellSize: this.grid.size > 0 ? totalShapes / this.grid.size : 0
            };
        }
    }

    const _gridExports = { SpatialGrid };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = _gridExports;
    }
    if (typeof window !== 'undefined') {
        window.Physics2D = window.Physics2D || {};
        Object.assign(window.Physics2D, _gridExports);
    }
})();
