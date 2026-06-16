const { Vector2, Circle, Rectangle, Polygon } = require('./shapes');

class CollisionInfo {
    constructor() {
        this.collision = false;
        this.normal = new Vector2();
        this.depth = 0;
        this.shapeA = null;
        this.shapeB = null;
    }
}

function getAxesForShapes(shapeA, shapeB) {
    const axes = [];

    const typeA = shapeA.getType();
    const typeB = shapeB.getType();

    if (typeA === 'Circle' && typeB === 'Circle') {
        return shapeA.getAxes(shapeB);
    }

    if (typeA === 'Circle') {
        return shapeA.getAxes(shapeB);
    }

    if (typeB === 'Circle') {
        return shapeB.getAxes(shapeA);
    }

    const axesA = shapeA.getAxes();
    const axesB = shapeB.getAxes();

    axes.push(...axesA);
    axes.push(...axesB);

    return axes;
}

function intervalDistance(minA, maxA, minB, maxB) {
    if (minA < minB) {
        return minB - maxA;
    } else {
        return minA - maxB;
    }
}

function detectCollisionSAT(shapeA, shapeB) {
    const result = new CollisionInfo();
    result.shapeA = shapeA;
    result.shapeB = shapeB;

    const axes = getAxesForShapes(shapeA, shapeB);

    if (axes.length === 0) {
        return result;
    }

    let minOverlap = Infinity;
    let minAxis = null;

    for (const axis of axes) {
        if (axis.length() === 0) continue;

        const projA = shapeA.project(axis);
        const projB = shapeB.project(axis);

        const dist = intervalDistance(projA.min, projA.max, projB.min, projB.max);

        if (dist > 0) {
            result.collision = false;
            return result;
        }

        const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);

        if (overlap < minOverlap) {
            minOverlap = overlap;
            minAxis = axis.clone();
        }
    }

    if (minOverlap < Infinity && minAxis !== null) {
        result.collision = true;
        result.depth = minOverlap;

        const dir = shapeB.position.sub(shapeA.position);
        if (dir.dot(minAxis) < 0) {
            minAxis = minAxis.mul(-1);
        }

        result.normal = minAxis.normalize();
    }

    return result;
}

function detectCollisionCircleCircle(circleA, circleB) {
    const result = new CollisionInfo();
    result.shapeA = circleA;
    result.shapeB = circleB;

    const dist = Vector2.distance(circleA.position, circleB.position);
    const minDist = circleA.radius + circleB.radius;

    if (dist < minDist) {
        result.collision = true;
        result.depth = minDist - dist;

        if (dist === 0) {
            result.normal = new Vector2(1, 0);
        } else {
            result.normal = circleB.position.sub(circleA.position).normalize();
        }
    }

    return result;
}

function detectCollisionCirclePolygon(circle, polygon) {
    const result = new CollisionInfo();
    result.shapeA = circle;
    result.shapeB = polygon;

    const vertices = polygon.getWorldVertices();

    let minDist = Infinity;
    let closestPoint = null;
    let closestEdgeIndex = 0;

    for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % vertices.length];

        const edge = p2.sub(p1);
        const t = Math.max(0, Math.min(1, circle.position.sub(p1).dot(edge) / edge.dot(edge)));
        const pointOnEdge = p1.add(edge.mul(t));

        const dist = Vector2.distance(circle.position, pointOnEdge);
        if (dist < minDist) {
            minDist = dist;
            closestPoint = pointOnEdge;
            closestEdgeIndex = i;
        }
    }

    if (closestPoint) {
        const axis = circle.position.sub(closestPoint);
        const axisLen = axis.length();

        if (axisLen === 0) {
            const edge = vertices[(closestEdgeIndex + 1) % vertices.length].sub(vertices[closestEdgeIndex]);
            result.normal = edge.perpendicular().normalize();
        } else {
            result.normal = axis.normalize();
        }

        const axes = polygon.getAxes();
        axes.push(result.normal);

        let minOverlap = Infinity;
        let minAxis = null;

        for (const axis of axes) {
            const projA = circle.project(axis);
            const projB = polygon.project(axis);

            const dist = intervalDistance(projA.min, projA.max, projB.min, projB.max);
            if (dist > 0) {
                return result;
            }

            const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
            if (overlap < minOverlap) {
                minOverlap = overlap;
                minAxis = axis.clone();
            }
        }

        if (minOverlap < Infinity) {
            result.collision = true;
            result.depth = minOverlap;

            const dir = polygon.position.sub(circle.position);
            if (dir.dot(minAxis) < 0) {
                minAxis = minAxis.mul(-1);
            }
            result.normal = minAxis.normalize();
        }
    }

    return result;
}

function detectCollision(shapeA, shapeB) {
    const typeA = shapeA.getType();
    const typeB = shapeB.getType();

    if (typeA === 'Circle' && typeB === 'Circle') {
        return detectCollisionCircleCircle(shapeA, shapeB);
    }

    if (typeA === 'Circle' && (typeB === 'Polygon' || typeB === 'Rectangle')) {
        return detectCollisionCirclePolygon(shapeA, shapeB);
    }

    if (typeB === 'Circle' && (typeA === 'Polygon' || typeA === 'Rectangle')) {
        const result = detectCollisionCirclePolygon(shapeB, shapeA);
        if (result.collision) {
            result.normal = result.normal.mul(-1);
            result.shapeA = shapeA;
            result.shapeB = shapeB;
        }
        return result;
    }

    return detectCollisionSAT(shapeA, shapeB);
}

module.exports = {
    CollisionInfo,
    detectCollision,
    detectCollisionSAT,
    detectCollisionCircleCircle,
    detectCollisionCirclePolygon
};
