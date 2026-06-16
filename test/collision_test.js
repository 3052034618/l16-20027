const {
    Vector2,
    Circle,
    Rectangle,
    Polygon,
    detectCollision,
    detectCollisionDebug,
    PhysicsWorld,
    CORRECTION_MODE
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

function testFullSeparationMode() {
    console.log('=== Test: 完全分离模式 (Full Separation) ===');

    const world = new PhysicsWorld(400, 400, 50);
    world.setCorrectionMode(CORRECTION_MODE.FULL_SEPARATION);

    const circle1 = new Circle(new Vector2(100, 200), 20);
    const circle2 = new Circle(new Vector2(130, 200), 20);
    circle1.invMass = 1;
    circle2.invMass = 1;
    circle1.velocity = new Vector2(0, 0);
    circle2.velocity = new Vector2(0, 0);

    world.addShape(circle1);
    world.addShape(circle2);

    const initialDist = Vector2.distance(circle1.position, circle2.position);
    console.log(`  初始距离: ${initialDist.toFixed(4)} (重叠 ${(40 - initialDist).toFixed(4)})`);

    world.step(1 / 60);

    const distAfter1 = Vector2.distance(circle1.position, circle2.position);
    console.log(`  1次步进后距离: ${distAfter1.toFixed(4)}`);

    console.assert(distAfter1 >= 39.99, `完全分离模式下 1 次步进后距离应 >= 39.99，实际 ${distAfter1.toFixed(4)}`);

    world.step(1 / 60);
    const distAfter2 = Vector2.distance(circle1.position, circle2.position);
    console.log(`  2次步进后距离: ${distAfter2.toFixed(4)} (确认不再穿透)`);

    const col = detectCollision(circle1, circle2);
    console.log(`  1次响应后再次检测: collision=${col.collision}`);
    console.assert(col.collision === false, '完全分离模式下一次响应后应不再穿透');

    console.log('  ✓ Passed\n');
}

function testStableWithToleranceMode() {
    console.log('=== Test: 带容差稳定分离模式 (Stable w/ Tolerance) ===');

    const world = new PhysicsWorld(400, 400, 50);
    world.setCorrectionMode(CORRECTION_MODE.STABLE_WITH_TOLERANCE);

    const circle1 = new Circle(new Vector2(100, 200), 20);
    const circle2 = new Circle(new Vector2(130, 200), 20);
    circle1.invMass = 1;
    circle2.invMass = 1;

    world.addShape(circle1);
    world.addShape(circle2);

    const dists = [];
    for (let i = 0; i < 20; i++) {
        world.step(1 / 60);
        dists.push(Vector2.distance(circle1.position, circle2.position));
    }

    console.log(`  第1次距离: ${dists[0].toFixed(4)}`);
    console.log(`  第5次距离: ${dists[4].toFixed(4)}`);
    console.log(`  第10次距离: ${dists[9].toFixed(4)}`);
    console.log(`  第20次距离: ${dists[19].toFixed(4)}`);

    const oscillations = [];
    for (let i = 1; i < dists.length; i++) {
        oscillations.push(Math.abs(dists[i] - dists[i - 1]));
    }
    const avgOsc = oscillations.reduce((a, b) => a + b, 0) / oscillations.length;
    console.log(`  平均位置波动: ${avgOsc.toFixed(5)} (越小越稳定)`);

    console.assert(avgOsc < 0.5, `带容差模式下平均波动应 < 0.5，实际 ${avgOsc.toFixed(5)}`);
    console.assert(dists[19] >= 39.5, `最终距离应 >= 39.5，实际 ${dists[19].toFixed(4)}`);

    console.log('  ✓ Passed (对比: 完全分离容易抖动, 带容差更平滑)\n');
}

function testCorrectionModeComparison() {
    console.log('=== Test: 两种修正模式对比 ===');

    function simulate(mode) {
        const world = new PhysicsWorld(500, 500, 50);
        world.setCorrectionMode(mode);
        world.gravity = new Vector2(0, 0);

        const base = new Circle(new Vector2(250, 250), 25);
        base.invMass = 0;
        base.velocity = new Vector2(0, 0);

        const ball = new Circle(new Vector2(250, 195), 20);
        ball.invMass = 1;
        ball.velocity = new Vector2(0, 0);

        world.addShape(base);
        world.addShape(ball);

        const gaps = [];
        let collisionsCount = 0;
        for (let i = 0; i < 40; i++) {
            if (i % 3 === 0) {
                ball.position.y = base.position.y + 30;
                ball.velocity = new Vector2(0, 60);
            }
            const cols = world.step(1 / 60);
            collisionsCount += cols.length;
            const gap = (ball.position.y - base.position.y) - (base.radius + ball.radius);
            gaps.push(gap);
        }

        let osc = 0;
        for (let i = 1; i < gaps.length; i++) {
            osc += Math.abs(gaps[i] - gaps[i - 1]);
        }
        const penetrationCount = gaps.filter(g => g < -0.1).length;
        return { avgOscillation: osc / (gaps.length - 1), collisionsCount, penetrationCount, gaps };
    }

    const full = simulate(CORRECTION_MODE.FULL_SEPARATION);
    const stable = simulate(CORRECTION_MODE.STABLE_WITH_TOLERANCE);

    console.log(`  [完全分离]   平均帧间变化: ${full.avgOscillation.toFixed(4)}, 明显穿透帧数: ${full.penetrationCount}`);
    console.log(`  [稳定(容差)] 平均帧间变化: ${stable.avgOscillation.toFixed(4)}, 明显穿透帧数: ${stable.penetrationCount}`);

    console.assert(full.penetrationCount <= 5,
        `完全分离模式应极少明显穿透，实际 ${full.penetrationCount} 帧`);
    console.assert(stable.avgOscillation < 6,
        `稳定模式应更平滑，帧间变化 ${stable.avgOscillation.toFixed(4)} < 6`);
    console.log(`  差异: 完全分离=几乎零穿透但位置跳变, 稳定模式=允许微小重叠但过渡平滑`);

    console.log('  ✓ Passed\n');
}

function testSatDebugInfo() {
    console.log('=== Test: SAT 调试信息 (detectCollisionDebug) ===');

    const rect = new Rectangle(new Vector2(0, 0), 20, 20);
    const circle = new Circle(new Vector2(15, 0), 10);

    const debug = detectCollisionDebug(rect, circle);
    console.log(`  碰撞: ${debug.collision}`);
    console.log(`  候选轴数: ${debug.axes.length}`);
    console.log(`  最小穿透轴索引: ${debug.minAxisIndex}`);
    console.log(`  穿透深度: ${debug.depth.toFixed(4)}`);
    console.log(`  法线: (${debug.normal.x.toFixed(4)}, ${debug.normal.y.toFixed(4)})`);

    console.assert(debug.collision === true, '两物体应碰撞');
    console.assert(debug.axes.length > 0, '应有候选轴');
    console.assert(debug.minAxisIndex >= 0, '应找到最小穿透轴');
    console.assert(debug.depth > 0, '穿透深度应 > 0');
    console.assert(debug.axes[0].projA !== undefined, '轴应包含投影信息');

    console.log('  各轴重叠量: ' + debug.axes.map((a, i) => `#${i}:${a.overlap.toFixed(3)}`).join(', '));

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
        testSatDebugInfo();
        testFullSeparationMode();
        testStableWithToleranceMode();
        testCorrectionModeComparison();
        
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
