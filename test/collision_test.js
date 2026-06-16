const {
    Vector2,
    Circle,
    Rectangle,
    Polygon,
    detectCollision,
    PhysicsWorld
} = require('../src/index');

function testCircleCircleCollision() {
    console.log('=== Test: Circle vs Circle ===');
    
    const circle1 = new Circle(new Vector2(0, 0), 5);
    const circle2 = new Circle(new Vector2(8, 0), 5);
    
    const collision = detectCollision(circle1, circle2);
    console.log(`  Colliding at distance 8 (radius 5+5=10): ${collision.collision}`);
    console.log(`  Depth: ${collision.depth.toFixed(4)}`);
    console.log(`  Normal: (${collision.normal.x.toFixed(4)}, ${collision.normal.y.toFixed(4)})`);
    console.assert(collision.collision === true, 'Should collide');
    console.assert(Math.abs(collision.depth - 2) < 0.001, 'Depth should be 2');
    
    const circle3 = new Circle(new Vector2(15, 0), 5);
    const collision2 = detectCollision(circle1, circle3);
    console.log(`  Colliding at distance 15: ${collision2.collision}`);
    console.assert(collision2.collision === false, 'Should not collide');
    
    console.log('  ✓ Passed\n');
}

function testRectangleRectangleCollision() {
    console.log('=== Test: Rectangle vs Rectangle ===');
    
    const rect1 = new Rectangle(new Vector2(0, 0), 10, 10);
    const rect2 = new Rectangle(new Vector2(6, 0), 10, 10);
    
    const collision = detectCollision(rect1, rect2);
    console.log(`  Overlapping rectangles: ${collision.collision}`);
    console.log(`  Depth: ${collision.depth.toFixed(4)}`);
    console.log(`  Normal: (${collision.normal.x.toFixed(4)}, ${collision.normal.y.toFixed(4)})`);
    console.assert(collision.collision === true, 'Should collide');
    console.assert(Math.abs(collision.depth - 4) < 0.001, 'Depth should be 4');
    console.assert(Math.abs(collision.normal.x - 1) < 0.001, 'Normal should be (1,0)');
    
    const rect3 = new Rectangle(new Vector2(20, 0), 10, 10);
    const collision2 = detectCollision(rect1, rect3);
    console.log(`  Separated rectangles: ${collision2.collision}`);
    console.assert(collision2.collision === false, 'Should not collide');
    
    console.log('  ✓ Passed\n');
}

function testCirclePolygonCollision() {
    console.log('=== Test: Circle vs Polygon ===');
    
    const vertices = [
        new Vector2(-5, -5),
        new Vector2(5, -5),
        new Vector2(5, 5),
        new Vector2(-5, 5)
    ];
    const polygon = new Polygon(new Vector2(0, 0), vertices);
    const circle = new Circle(new Vector2(8, 0), 5);
    
    const collision = detectCollision(circle, polygon);
    console.log(`  Circle overlapping square edge: ${collision.collision}`);
    console.log(`  Depth: ${collision.depth.toFixed(4)}`);
    console.log(`  Normal: (${collision.normal.x.toFixed(4)}, ${collision.normal.y.toFixed(4)})`);
    console.assert(collision.collision === true, 'Should collide');
    console.assert(Math.abs(collision.depth - 2) < 0.001, 'Depth should be 2');
    
    const circle2 = new Circle(new Vector2(15, 0), 5);
    const collision2 = detectCollision(circle2, polygon);
    console.log(`  Circle separated from square: ${collision2.collision}`);
    console.assert(collision2.collision === false, 'Should not collide');
    
    console.log('  ✓ Passed\n');
}

function testCircleRectangleCollision() {
    console.log('=== Test: Circle vs Rectangle ===');
    
    const rect = new Rectangle(new Vector2(0, 0), 10, 10);
    const circle = new Circle(new Vector2(8, 3), 5);
    
    const collision = detectCollision(circle, rect);
    console.log(`  Circle overlapping rectangle: ${collision.collision}`);
    console.log(`  Depth: ${collision.depth.toFixed(4)}`);
    console.log(`  Normal: (${collision.normal.x.toFixed(4)}, ${collision.normal.y.toFixed(4)})`);
    console.assert(collision.collision === true, 'Should collide');
    
    const circle2 = new Circle(new Vector2(0, 0), 2);
    const collision2 = detectCollision(circle2, rect);
    console.log(`  Circle inside rectangle: ${collision2.collision}`);
    console.assert(collision2.collision === true, 'Should collide');
    console.log(`  Depth (circle inside): ${collision2.depth.toFixed(4)}`);
    
    console.log('  ✓ Passed\n');
}

function testTriangleCollision() {
    console.log('=== Test: Triangle vs Circle ===');
    
    const triangleVertices = [
        new Vector2(0, -5),
        new Vector2(5, 5),
        new Vector2(-5, 5)
    ];
    const triangle = new Polygon(new Vector2(0, 0), triangleVertices);
    const circle = new Circle(new Vector2(0, 7), 3);
    
    const collision = detectCollision(circle, triangle);
    console.log(`  Circle near triangle base: ${collision.collision}`);
    console.log(`  Depth: ${collision.depth.toFixed(4)}`);
    console.log(`  Normal: (${collision.normal.x.toFixed(4)}, ${collision.normal.y.toFixed(4)})`);
    console.assert(collision.collision === true, 'Should collide');
    console.assert(Math.abs(collision.depth - 1) < 0.001, 'Depth should be 1');
    
    console.log('  ✓ Passed\n');
}

function testPositionCorrection() {
    console.log('=== Test: Position Correction (Physics World) ===');
    
    const world = new PhysicsWorld(400, 400, 50);
    
    const circle1 = new Circle(new Vector2(100, 200), 20);
    const circle2 = new Circle(new Vector2(130, 200), 20);
    
    circle1.invMass = 1;
    circle2.invMass = 1;
    
    world.addShape(circle1);
    world.addShape(circle2);
    
    const initialDist = Vector2.distance(circle1.position, circle2.position);
    console.log(`  Initial distance: ${initialDist.toFixed(4)}`);
    console.log(`  Overlap: ${(40 - initialDist).toFixed(4)}`);
    
    world.step(0.016);
    
    const finalDist = Vector2.distance(circle1.position, circle2.position);
    console.log(`  Final distance: ${finalDist.toFixed(4)}`);
    console.log(`  Circle1 pos: (${circle1.position.x.toFixed(4)}, ${circle1.position.y.toFixed(4)})`);
    console.log(`  Circle2 pos: (${circle2.position.x.toFixed(4)}, ${circle2.position.y.toFixed(4)})`);
    
    console.assert(finalDist >= 37.5, 'Objects should be mostly separated after resolution (80% correction)');
    
    console.log('  ✓ Passed\n');
}

function testSpatialGrid() {
    console.log('=== Test: Spatial Grid Broad Phase ===');
    
    const world = new PhysicsWorld(200, 200, 50);
    
    for (let i = 0; i < 10; i++) {
        const circle = new Circle(
            new Vector2(Math.random() * 180 + 10, Math.random() * 180 + 10),
            15
        );
        circle.invMass = 1;
        world.addShape(circle);
    }
    
    const bruteForcePairs = 10 * 9 / 2;
    console.log(`  Total objects: 10`);
    console.log(`  Brute force pairs: ${bruteForcePairs}`);
    
    world.step(0.016);
    const stats = world.getStats();
    console.log(`  Broad phase pairs: ${stats.broadPhasePairs}`);
    console.log(`  Narrow phase tests: ${stats.narrowPhaseTests}`);
    console.log(`  Actual collisions: ${stats.collisions}`);
    console.log(`  Reduction: ${((1 - stats.broadPhasePairs / bruteForcePairs) * 100).toFixed(1)}%`);
    
    console.assert(stats.broadPhasePairs <= bruteForcePairs, 'Broad phase should reduce pairs');
    
    console.log('  ✓ Passed\n');
}

function testVelocityResponse() {
    console.log('=== Test: Velocity Response ===');
    
    const world = new PhysicsWorld(400, 400, 50);
    
    const circle1 = new Circle(new Vector2(100, 200), 20);
    const circle2 = new Circle(new Vector2(135, 200), 20);
    
    circle1.invMass = 1;
    circle2.invMass = 0;
    circle1.velocity = new Vector2(100, 0);
    circle1.restitution = 1.0;
    circle2.restitution = 1.0;
    
    world.addShape(circle1);
    world.addShape(circle2);
    
    console.log(`  Initial velocity: (${circle1.velocity.x.toFixed(4)}, ${circle1.velocity.y.toFixed(4)})`);
    console.log(`  Initial position: (${circle1.position.x.toFixed(4)}, ${circle1.position.y.toFixed(4)})`);
    
    for (let i = 0; i < 3; i++) {
        world.step(0.016);
    }
    
    console.log(`  Final velocity: (${circle1.velocity.x.toFixed(4)}, ${circle1.velocity.y.toFixed(4)})`);
    console.log(`  Final position: (${circle1.position.x.toFixed(4)}, ${circle1.position.y.toFixed(4)})`);
    
    console.assert(circle1.velocity.x < 0, 'Circle should bounce back');
    
    console.log('  ✓ Passed\n');
}

function testRotatedPolygon() {
    console.log('=== Test: Rotated-like Polygon (Irregular Shape) ===');
    
    const hexVertices = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        hexVertices.push(new Vector2(
            Math.cos(angle) * 10,
            Math.sin(angle) * 10
        ));
    }
    
    const hexagon = new Polygon(new Vector2(0, 0), hexVertices);
    const circle = new Circle(new Vector2(15, 0), 8);
    
    const collision = detectCollision(circle, hexagon);
    console.log(`  Circle overlapping hexagon: ${collision.collision}`);
    console.log(`  Depth: ${collision.depth.toFixed(4)}`);
    console.log(`  Normal: (${collision.normal.x.toFixed(4)}, ${collision.normal.y.toFixed(4)})`);
    console.assert(collision.collision === true, 'Should collide');
    console.assert(Math.abs(collision.depth - 3) < 0.1, 'Depth should be ~3');
    
    console.log('  ✓ Passed\n');
}

function runAllTests() {
    console.log('========================================');
    console.log('  2D Physics Collision Engine Tests');
    console.log('========================================\n');
    
    try {
        testCircleCircleCollision();
        testRectangleRectangleCollision();
        testCircleRectangleCollision();
        testCirclePolygonCollision();
        testTriangleCollision();
        testRotatedPolygon();
        testPositionCorrection();
        testVelocityResponse();
        testSpatialGrid();
        
        console.log('========================================');
        console.log('  All tests passed! ✓');
        console.log('========================================');
    } catch (e) {
        console.error('Test failed:', e.message);
        console.error(e.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests };
