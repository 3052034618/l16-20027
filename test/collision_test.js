const assert = require('assert');
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

let passCount = 0;
let failCount = 0;
const tests = [];

function test(name, fn) {
    tests.push({ name, fn });
}

function runTest(t) {
    try {
        console.log(`=== Test: ${t.name} ===`);
        t.fn();
        passCount++;
        console.log('  ✓ Passed\n');
    } catch (e) {
        failCount++;
        console.error(`  ✗ Failed: ${e.message}`);
        console.error(e.stack.split('\n').slice(0, 5).join('\n'));
        console.log();
    }
}

// ========== 基础碰撞检测 ==========

test('Circle vs Circle', () => {
    const c1 = new Circle(new Vector2(0, 0), 5);
    const c2 = new Circle(new Vector2(8, 0), 5);
    const col = detectCollision(c1, c2);
    assert.strictEqual(col.collision, true, '距离8应碰撞');
    assert.strictEqual(col.depth, 2, '穿透深度应为2');
    assert.strictEqual(col.normal.x, 1, '法线x应为1');

    const c3 = new Circle(new Vector2(15, 0), 5);
    const col2 = detectCollision(c1, c3);
    assert.strictEqual(col2.collision, false, '距离15不应碰撞');
});

test('Rectangle vs Rectangle', () => {
    const r1 = new Rectangle(new Vector2(0, 0), 20, 20);
    const r2 = new Rectangle(new Vector2(16, 0), 20, 20);
    const col = detectCollision(r1, r2);
    assert.strictEqual(col.collision, true, '应碰撞');
    assert.strictEqual(col.depth, 4, '深度应为4');

    const r3 = new Rectangle(new Vector2(30, 0), 20, 20);
    assert.strictEqual(detectCollision(r1, r3).collision, false, '不应碰撞');
});

test('Circle vs Rectangle', () => {
    const rect = new Rectangle(new Vector2(0, 0), 20, 20);
    const circle = new Circle(new Vector2(-17, 0), 10);
    const col = detectCollision(circle, rect);
    assert.strictEqual(col.collision, true, '圆和矩形边缘重叠应碰撞');
    assert.strictEqual(col.depth, 3, '深度应为3 (圆心距17 - 圆半径10 - 矩形半宽10 = 3)');

    const inner = new Circle(new Vector2(0, 0), 6);
    const col2 = detectCollision(inner, rect);
    assert.strictEqual(col2.collision, true, '圆在矩形内应碰撞');
    assert.strictEqual(col2.depth, 12, '圆在矩形内深度应为12 (SAT投影重叠 = 圆直径2*6 = 12)');
});

test('Circle vs Polygon', () => {
    const squareVerts = [
        new Vector2(-10, -10), new Vector2(10, -10),
        new Vector2(10, 10), new Vector2(-10, 10)
    ];
    const poly = new Polygon(new Vector2(0, 0), squareVerts);
    const circle = new Circle(new Vector2(-17, 0), 10);
    const col = detectCollision(circle, poly);
    assert.strictEqual(col.collision, true, '圆与多边形边缘重叠');
    assert.strictEqual(col.depth, 3, '深度应为3 (圆心距17 - 圆半径10 - 多边形半宽10 = 3)');

    const circle2 = new Circle(new Vector2(-30, 0), 10);
    assert.strictEqual(detectCollision(circle2, poly).collision, false, '远离时不碰撞');
});

test('Triangle vs Circle', () => {
    const triVerts = polyVerts(3, 15);
    const tri = new Polygon(new Vector2(0, 0), triVerts);
    const c = new Circle(new Vector2(0, 11), 5);
    const col = detectCollision(c, tri);
    assert.strictEqual(col.collision, true, '圆靠近三角形底边应碰撞');
    assert.ok(col.depth > 1 && col.depth < 2, `深度应在1-2之间，实际${col.depth}`);
});

test('Rotated-like Polygon (hexagon)', () => {
    const hexVerts = polyVerts(6, 20);
    const hex = new Polygon(new Vector2(0, 0), hexVerts);
    const c = new Circle(new Vector2(-22, 0), 10);
    const col = detectCollision(c, hex);
    assert.strictEqual(col.collision, true, '圆与六边形重叠');
    assert.ok(col.depth > 4 && col.depth < 7, `深度应在4-7之间，实际${col.depth}`);
});

// ========== 位置修正与速度响应 ==========

test('Position Correction (Physics World)', () => {
    const world = new PhysicsWorld(400, 400, 50);

    const c1 = new Circle(new Vector2(100, 200), 20);
    const c2 = new Circle(new Vector2(130, 200), 20);
    c1.invMass = 1;
    c2.invMass = 1;
    c1.velocity = new Vector2(0, 0);
    c2.velocity = new Vector2(0, 0);

    world.addShape(c1);
    world.addShape(c2);

    const initialDist = Vector2.distance(c1.position, c2.position);
    assert.strictEqual(initialDist, 30, '初始距离30');

    world.step(1 / 60);

    const finalDist = Vector2.distance(c1.position, c2.position);
    assert.ok(finalDist > 36, `修正后距离应显著增大，实际${finalDist.toFixed(2)}`);
});

test('Velocity Response', () => {
    const world = new PhysicsWorld(400, 400, 50);

    const c1 = new Circle(new Vector2(100, 200), 20);
    const c2 = new Circle(new Vector2(125, 200), 20);
    c1.invMass = 1;
    c2.invMass = 1;
    c1.velocity = new Vector2(100, 0);
    c2.velocity = new Vector2(0, 0);
    c1.restitution = 1;
    c2.restitution = 1;

    world.addShape(c1);
    world.addShape(c2);

    world.step(1 / 60);

    assert.ok(c1.velocity.x < 50, 'c1碰撞后速度应显著减小（质量相等弹性正碰应交换速度）');
    assert.ok(c2.velocity.x > 50, 'c2碰撞后应向右运动');
    assert.ok(Math.abs(c1.velocity.x + c2.velocity.x - 100) < 1,
        '动量近似守恒（总速度和约为100）');
});

// ========== 空间网格 ==========

test('Spatial Grid Broad Phase', () => {
    const world = new PhysicsWorld(500, 500, 50);

    for (let i = 0; i < 10; i++) {
        const c = new Circle(new Vector2(50 + i * 45, 250), 15);
        c.invMass = 0;
        world.addShape(c);
    }

    world.step(1 / 60);
    const stats = world.getStats();

    const bruteForce = stats.bruteForcePairs;
    const broadPhase = stats.broadPhasePairs;

    assert.strictEqual(bruteForce, 45, '暴力检测应为45对');
    assert.ok(broadPhase < bruteForce, `宽阶段应减少对数: ${broadPhase} < ${bruteForce}`);
    assert.ok(broadPhase > 0, '宽阶段应至少有一些对');

    const reduction = (1 - broadPhase / bruteForce) * 100;
    console.log(`  减少: ${reduction.toFixed(1)}%`);
});

test('Broad phase toggle (enableBroadPhase)', () => {
    const world = new PhysicsWorld(400, 400, 50);
    for (let i = 0; i < 6; i++) {
        world.addShape(new Circle(new Vector2(50 + i * 50, 200), 15));
    }

    world.enableBroadPhase = true;
    world.step(1 / 60);
    const onPairs = world.getStats().broadPhasePairs;

    world.enableBroadPhase = false;
    world.step(1 / 60);
    const offPairs = world.getStats().broadPhasePairs;

    assert.strictEqual(offPairs, 15, '关闭宽阶段应暴力检测 15 对');
    assert.ok(onPairs <= offPairs, '开启宽阶段对数应 <= 暴力对数');
    console.log(`  开启: ${onPairs} 对, 关闭: ${offPairs} 对`);
});

// ========== SAT 调试信息 ==========

test('SAT 调试信息 (detectCollisionDebug)', () => {
    const rect = new Rectangle(new Vector2(0, 0), 20, 20);
    const circle = new Circle(new Vector2(15, 0), 10);

    const debug = detectCollisionDebug(rect, circle);

    assert.strictEqual(debug.collision, true, '两物体应碰撞');
    assert.ok(Array.isArray(debug.axes), '应有axes数组');
    assert.ok(debug.axes.length > 0, '候选轴数应 > 0');
    assert.ok(debug.minAxisIndex >= 0, '应找到最小穿透轴');
    assert.ok(debug.depth > 0, '穿透深度应 > 0');
    assert.ok(debug.normal, '应有法线');
    assert.ok(debug.shapeA && debug.shapeB, '应包含形状引用');

    for (const ax of debug.axes) {
        assert.ok(ax.axis, '每条轴应有axis向量');
        assert.ok(ax.projA && ax.projB, '每条轴应有投影区间');
        assert.strictEqual(typeof ax.overlap, 'number', 'overlap应为数字');
    }

    console.log(`  各轴重叠量: ${debug.axes.map((a,i) => `#${i}:${a.overlap.toFixed(3)}`).join(', ')}`);
});

test('SAT 调试 - 分离时也返回全部轴', () => {
    const r1 = new Rectangle(new Vector2(0, 0), 20, 20);
    const r2 = new Rectangle(new Vector2(100, 0), 20, 20);

    const debug = detectCollisionDebug(r1, r2);
    assert.strictEqual(debug.collision, false, '两矩形应分离');
    assert.ok(debug.axes.length >= 2, '应有至少2条候选轴');
    assert.ok(debug.hasSeparatingAxis === true, 'hasSeparatingAxis 应为 true');

    let separatedCount = 0;
    for (const ax of debug.axes) {
        if (ax.separated) separatedCount++;
    }
    assert.ok(separatedCount >= 1, '至少有一条分离轴');
    console.log(`  候选轴: ${debug.axes.length}, 分离轴: ${separatedCount}`);
});

// ========== 两种修正模式 ==========

test('完全分离模式 (Full Separation)', () => {
    const world = new PhysicsWorld(400, 400, 50);
    world.setCorrectionMode(CORRECTION_MODE.FULL_SEPARATION);

    const c1 = new Circle(new Vector2(100, 200), 20);
    const c2 = new Circle(new Vector2(130, 200), 20);
    c1.invMass = 1;
    c2.invMass = 1;

    world.addShape(c1);
    world.addShape(c2);
    world.step(1 / 60);

    const dist = Vector2.distance(c1.position, c2.position);
    assert.ok(dist >= 39.99, `完全分离模式 1 次步进后距离应 >= 39.99，实际 ${dist.toFixed(4)}`);

    world.step(1 / 60);
    const col = detectCollision(c1, c2);
    assert.strictEqual(col.collision, false, '完全分离模式一次响应后不再穿透');
});

test('带容差稳定分离模式 (Stable w/ Tolerance)', () => {
    const world = new PhysicsWorld(400, 400, 50);
    world.setCorrectionMode(CORRECTION_MODE.STABLE_WITH_TOLERANCE);

    const c1 = new Circle(new Vector2(100, 200), 20);
    const c2 = new Circle(new Vector2(130, 200), 20);
    c1.invMass = 1;
    c2.invMass = 1;

    world.addShape(c1);
    world.addShape(c2);

    const dists = [];
    for (let i = 0; i < 20; i++) {
        world.step(1 / 60);
        dists.push(Vector2.distance(c1.position, c2.position));
    }

    let osc = 0;
    for (let i = 1; i < dists.length; i++) {
        osc += Math.abs(dists[i] - dists[i - 1]);
    }
    const avgOsc = osc / (dists.length - 1);

    assert.ok(avgOsc < 0.5, `带容差模式平均波动应 < 0.5，实际 ${avgOsc.toFixed(5)}`);
    assert.ok(dists[19] >= 39.5, `最终距离应 >= 39.5，实际 ${dists[19].toFixed(4)}`);
    console.log(`  平均位置波动: ${avgOsc.toFixed(5)}`);
});

test('两种修正模式对比', () => {
    function simulate(mode) {
        const world = new PhysicsWorld(500, 500, 50);
        world.setCorrectionMode(mode);

        const base = new Circle(new Vector2(250, 250), 25);
        base.invMass = 0;

        const ball = new Circle(new Vector2(250, 210), 20);
        ball.invMass = 1;

        world.addShape(base);
        world.addShape(ball);

        let penetrateFrames = 0;
        for (let i = 0; i < 15; i++) {
            if (i % 3 === 0) {
                ball.position.y = base.position.y + 30;
                ball.velocity = new Vector2(0, 60);
            }
            world.step(1 / 60);
            const gap = (ball.position.y - base.position.y) - (base.radius + ball.radius);
            if (gap < -0.01) penetrateFrames++;
        }
        return { penetrateFrames };
    }

    const full = simulate(CORRECTION_MODE.FULL_SEPARATION);
    const stable = simulate(CORRECTION_MODE.STABLE_WITH_TOLERANCE);

    assert.ok(full.penetrateFrames <= 1,
        `完全分离模式穿透应极少，实际 ${full.penetrateFrames} 帧`);
    assert.ok(stable.penetrateFrames >= full.penetrateFrames,
        '稳定模式穿透帧数应 >= 完全分离模式');

    console.log(`  完全分离穿透: ${full.penetrateFrames} 帧, 稳定模式穿透: ${stable.penetrateFrames} 帧`);
});

// ========== 验收测试 (API 层面) ==========

test('验收: CORRECTION_MODE 枚举值', () => {
    assert.strictEqual(typeof CORRECTION_MODE.FULL_SEPARATION, 'string');
    assert.strictEqual(typeof CORRECTION_MODE.STABLE_WITH_TOLERANCE, 'string');
    assert.notStrictEqual(CORRECTION_MODE.FULL_SEPARATION, CORRECTION_MODE.STABLE_WITH_TOLERANCE);
});

test('验收: PhysicsWorld 默认值', () => {
    const world = new PhysicsWorld(200, 300, 40);
    assert.strictEqual(world.width, 200);
    assert.strictEqual(world.height, 300);
    assert.strictEqual(world.enableBroadPhase, true);
    assert.strictEqual(world.correctionMode, CORRECTION_MODE.STABLE_WITH_TOLERANCE);
    assert.ok(world.shapes && Array.isArray(world.shapes));
    assert.ok(world.spatialGrid);
});

test('验收: setCorrectionMode 切换', () => {
    const world = new PhysicsWorld(200, 200);
    world.setCorrectionMode(CORRECTION_MODE.FULL_SEPARATION);
    assert.strictEqual(world.correctionMode, CORRECTION_MODE.FULL_SEPARATION);

    world.setCorrectionMode(CORRECTION_MODE.STABLE_WITH_TOLERANCE);
    assert.strictEqual(world.correctionMode, CORRECTION_MODE.STABLE_WITH_TOLERANCE);
});

test('验收: detectCollisionDebug 字段完整性', () => {
    const a = new Circle(new Vector2(0, 0), 10);
    const b = new Circle(new Vector2(100, 0), 10);

    const d = detectCollisionDebug(a, b);
    const expectedKeys = ['collision', 'normal', 'depth', 'shapeA', 'shapeB', 'axes', 'minAxisIndex', 'hasSeparatingAxis'];
    for (const key of expectedKeys) {
        assert.ok(key in d, `调试信息应包含 ${key} 字段`);
    }

    assert.ok(Array.isArray(d.axes), 'axes 应为数组');
    if (d.axes.length > 0) {
        const ax = d.axes[0];
        assert.ok('axis' in ax, '单条轴应有 axis');
        assert.ok('projA' in ax, '单条轴应有 projA');
        assert.ok('projB' in ax, '单条轴应有 projB');
        assert.ok('overlap' in ax, '单条轴应有 overlap');
        assert.ok('separated' in ax, '单条轴应有 separated');
    }
});

test('验收: 宽阶段开关影响 getCollisionPairs', () => {
    const world = new PhysicsWorld(300, 300, 50);
    for (let i = 0; i < 8; i++) {
        world.addShape(new Circle(new Vector2(30 + i * 35, 150), 12));
    }

    world.enableBroadPhase = true;
    world.step(1 / 60);
    const onNarrow = world.getStats().narrowPhaseTests;

    world.enableBroadPhase = false;
    world.step(1 / 60);
    const offNarrow = world.getStats().narrowPhaseTests;

    assert.strictEqual(offNarrow, 28, '关闭宽阶段窄阶段检测应为 28');
    assert.ok(onNarrow <= offNarrow, '开启宽阶段窄阶段检测数应减少');
});

test('验收: addShape / clear / shapes 数量', () => {
    const world = new PhysicsWorld(300, 300);
    assert.strictEqual(world.shapes.length, 0);

    world.addShape(new Circle(new Vector2(50, 50), 10));
    world.addShape(new Rectangle(new Vector2(100, 100), 20, 20));
    assert.strictEqual(world.shapes.length, 2);

    world.clear();
    assert.strictEqual(world.shapes.length, 0);
});

// ========== 工具 ==========

function polyVerts(sides, radius) {
    const arr = [];
    for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        arr.push(new Vector2(Math.cos(a) * radius, Math.sin(a) * radius));
    }
    return arr;
}

// ========== 运行 ==========

function runAllTests() {
    console.log('========================================');
    console.log('  2D Physics Collision Engine Tests');
    console.log('========================================\n');

    for (const t of tests) {
        runTest(t);
    }

    console.log('========================================');
    console.log(`  通过: ${passCount}, 失败: ${failCount}`);
    console.log('========================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests, tests };
