let _Vector2, _Shape, _Circle, _Rectangle, _Polygon;
let _CollisionInfo, _detectCollision, _detectCollisionSAT, _detectCollisionCircleCircle, _detectCollisionCirclePolygon, _detectCollisionDebug;
let _SpatialGrid;
let _PhysicsWorld, _CORRECTION_MODE;

if (typeof require !== 'undefined') {
    const shapes = require('./shapes');
    const sat = require('./sat');
    const grid = require('./spatial_grid');
    const world = require('./physics_world');

    _Vector2 = shapes.Vector2;
    _Shape = shapes.Shape;
    _Circle = shapes.Circle;
    _Rectangle = shapes.Rectangle;
    _Polygon = shapes.Polygon;

    _CollisionInfo = sat.CollisionInfo;
    _detectCollision = sat.detectCollision;
    _detectCollisionSAT = sat.detectCollisionSAT;
    _detectCollisionCircleCircle = sat.detectCollisionCircleCircle;
    _detectCollisionCirclePolygon = sat.detectCollisionCirclePolygon;
    _detectCollisionDebug = sat.detectCollisionDebug;

    _SpatialGrid = grid.SpatialGrid;

    _PhysicsWorld = world.PhysicsWorld;
    _CORRECTION_MODE = world.CORRECTION_MODE;
} else if (typeof window !== 'undefined' && window.Physics2D) {
    _Vector2 = window.Physics2D.Vector2;
    _Shape = window.Physics2D.Shape;
    _Circle = window.Physics2D.Circle;
    _Rectangle = window.Physics2D.Rectangle;
    _Polygon = window.Physics2D.Polygon;

    _CollisionInfo = window.Physics2D.CollisionInfo;
    _detectCollision = window.Physics2D.detectCollision;
    _detectCollisionSAT = window.Physics2D.detectCollisionSAT;
    _detectCollisionCircleCircle = window.Physics2D.detectCollisionCircleCircle;
    _detectCollisionCirclePolygon = window.Physics2D.detectCollisionCirclePolygon;
    _detectCollisionDebug = window.Physics2D.detectCollisionDebug;

    _SpatialGrid = window.Physics2D.SpatialGrid;

    _PhysicsWorld = window.Physics2D.PhysicsWorld;
    _CORRECTION_MODE = window.Physics2D.CORRECTION_MODE;
}

const _exports = {
    Vector2: _Vector2,
    Shape: _Shape,
    Circle: _Circle,
    Rectangle: _Rectangle,
    Polygon: _Polygon,
    CollisionInfo: _CollisionInfo,
    detectCollision: _detectCollision,
    detectCollisionSAT: _detectCollisionSAT,
    detectCollisionCircleCircle: _detectCollisionCircleCircle,
    detectCollisionCirclePolygon: _detectCollisionCirclePolygon,
    detectCollisionDebug: _detectCollisionDebug,
    SpatialGrid: _SpatialGrid,
    PhysicsWorld: _PhysicsWorld,
    CORRECTION_MODE: _CORRECTION_MODE
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = _exports;
}
