(function () {
    class Vector2 {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        add(v) {
            return new Vector2(this.x + v.x, this.y + v.y);
        }

        sub(v) {
            return new Vector2(this.x - v.x, this.y - v.y);
        }

        mul(scalar) {
            return new Vector2(this.x * scalar, this.y * scalar);
        }

        dot(v) {
            return this.x * v.x + this.y * v.y;
        }

        length() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        }

        normalize() {
            const len = this.length();
            if (len === 0) return new Vector2(0, 0);
            return new Vector2(this.x / len, this.y / len);
        }

        perpendicular() {
            return new Vector2(-this.y, this.x);
        }

        clone() {
            return new Vector2(this.x, this.y);
        }

        static distance(a, b) {
            return a.sub(b).length();
        }
    }

    class Shape {
        constructor(position = new Vector2()) {
            this.position = position;
            this.velocity = new Vector2();
            this.restitution = 0.5;
            this.invMass = 1;
            this.id = Shape.nextId++;
        }

        getType() {
            return 'Shape';
        }

        getAABB() {
            throw new Error('getAABB must be implemented by subclasses');
        }

        getAxes() {
            throw new Error('getAxes must be implemented by subclasses');
        }

        project(axis) {
            throw new Error('project must be implemented by subclasses');
        }
    }

    Shape.nextId = 0;

    class Circle extends Shape {
        constructor(position, radius) {
            super(position);
            this.radius = radius;
        }

        getType() {
            return 'Circle';
        }

        getAABB() {
            return {
                minX: this.position.x - this.radius,
                maxX: this.position.x + this.radius,
                minY: this.position.y - this.radius,
                maxY: this.position.y + this.radius
            };
        }

        getAxes(other) {
            if (other.getType() === 'Circle') {
                const axis = this.position.sub(other.position).normalize();
                return [axis];
            } else if (other.getType() === 'Polygon' || other.getType() === 'Rectangle') {
                const axes = [];
                const vertices = other.getVertices();
                let closestPoint = null;
                let minDist = Infinity;

                for (const v of vertices) {
                    const worldV = v.add(other.position);
                    const dist = Vector2.distance(this.position, worldV);
                    if (dist < minDist) {
                        minDist = dist;
                        closestPoint = worldV;
                    }
                }

                if (closestPoint) {
                    const axis = this.position.sub(closestPoint).normalize();
                    axes.push(axis);
                }

                const polyAxes = other.getAxes();
                axes.push(...polyAxes);

                return axes;
            }

            return [];
        }

        project(axis) {
            const centerProj = this.position.dot(axis);
            return {
                min: centerProj - this.radius,
                max: centerProj + this.radius
            };
        }

        getFarthestPointInDirection(direction) {
            const dir = direction.normalize();
            return this.position.add(dir.mul(this.radius));
        }
    }

    class Rectangle extends Shape {
        constructor(position, width, height) {
            super(position);
            this.width = width;
            this.height = height;
        }

        getType() {
            return 'Rectangle';
        }

        getVertices() {
            const hw = this.width / 2;
            const hh = this.height / 2;
            return [
                new Vector2(-hw, -hh),
                new Vector2(hw, -hh),
                new Vector2(hw, hh),
                new Vector2(-hw, hh)
            ];
        }

        getWorldVertices() {
            return this.getVertices().map(v => v.add(this.position));
        }

        getAABB() {
            const hw = this.width / 2;
            const hh = this.height / 2;
            return {
                minX: this.position.x - hw,
                maxX: this.position.x + hw,
                minY: this.position.y - hh,
                maxY: this.position.y + hh
            };
        }

        getAxes() {
            return [
                new Vector2(1, 0),
                new Vector2(0, 1)
            ];
        }

        project(axis) {
            const vertices = this.getWorldVertices();
            let min = Infinity;
            let max = -Infinity;

            for (const v of vertices) {
                const proj = v.dot(axis);
                if (proj < min) min = proj;
                if (proj > max) max = proj;
            }

            return { min, max };
        }
    }

    class Polygon extends Shape {
        constructor(position, vertices) {
            super(position);
            if (vertices.length < 3) {
                throw new Error('Polygon must have at least 3 vertices');
            }
            this.localVertices = vertices;
        }

        getType() {
            return 'Polygon';
        }

        getVertices() {
            return this.localVertices;
        }

        getWorldVertices() {
            return this.localVertices.map(v => v.add(this.position));
        }

        getAABB() {
            const vertices = this.getWorldVertices();
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            for (const v of vertices) {
                if (v.x < minX) minX = v.x;
                if (v.x > maxX) maxX = v.x;
                if (v.y < minY) minY = v.y;
                if (v.y > maxY) maxY = v.y;
            }

            return { minX, maxX, minY, maxY };
        }

        getAxes() {
            const vertices = this.getWorldVertices();
            const axes = [];

            for (let i = 0; i < vertices.length; i++) {
                const p1 = vertices[i];
                const p2 = vertices[(i + 1) % vertices.length];
                const edge = p2.sub(p1);
                const normal = edge.perpendicular().normalize();
                axes.push(normal);
            }

            return axes;
        }

        project(axis) {
            const vertices = this.getWorldVertices();
            let min = Infinity;
            let max = -Infinity;

            for (const v of vertices) {
                const proj = v.dot(axis);
                if (proj < min) min = proj;
                if (proj > max) max = proj;
            }

            return { min, max };
        }
    }

    const _shapesExports = {
        Vector2,
        Shape,
        Circle,
        Rectangle,
        Polygon
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = _shapesExports;
    }
    if (typeof window !== 'undefined') {
        window.Physics2D = window.Physics2D || {};
        Object.assign(window.Physics2D, _shapesExports);
    }
})();
