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

// ========== 新补充：录制/回放/拖动/宽阶段一致性 验收 ==========

test('验收: 帧数据结构可序列化与恢复 (录制/回放基础)', () => {
    const world = new PhysicsWorld(400, 400, 50);
    const c = new Circle(new Vector2(100, 100), 15);
    c.velocity = new Vector2(50, -30);
    c.invMass = 1;
    c.restitution = 0.7;
    const r = new Rectangle(new Vector2(200, 200), 30, 40);
    r.velocity = new Vector2(-20, 10);
    world.addShape(c);
    world.addShape(r);
    world.step(1 / 60);

    // 模拟 captureFrame
    function captureFrame(w) {
        return {
            shapes: w.shapes.map(s => ({
                id: s.id, type: s.getType(),
                x: s.position.x, y: s.position.y,
                vx: s.velocity.x, vy: s.velocity.y,
                radius: s.radius, width: s.width, height: s.height,
                vertices: s.localVertices ? s.localVertices.map(v => ({ x: v.x, y: v.y })) : null,
                invMass: s.invMass, restitution: s.restitution
            })),
            stats: { ...w.getStats() }
        };
    }

    const frame = captureFrame(world);
    assert.strictEqual(frame.shapes.length, 2, '帧应包含2个物体');
    assert.strictEqual(typeof frame.stats, 'object', '帧应包含stats');
    assert.strictEqual(frame.shapes[0].type, 'Circle');
    assert.strictEqual(frame.shapes[1].type, 'Rectangle');
    assert.strictEqual(typeof frame.shapes[0].x, 'number');
    assert.strictEqual(typeof frame.shapes[0].vx, 'number');

    // 恢复到新 world 并验证属性保留
    const world2 = new PhysicsWorld(400, 400, 50);
    world2.clear();
    const idMap = new Map();
    for (const fd of frame.shapes) {
        let s;
        const pos = new Vector2(fd.x, fd.y);
        if (fd.type === 'Circle') s = new Circle(pos, fd.radius);
        else if (fd.type === 'Rectangle') s = new Rectangle(pos, fd.width, fd.height);
        else if (fd.type === 'Polygon') s = new Polygon(pos, fd.vertices.map(v => new Vector2(v.x, v.y)));
        if (s) {
            s.velocity = new Vector2(fd.vx, fd.vy);
            s.invMass = fd.invMass;
            s.restitution = fd.restitution;
            world2.addShape(s);
            idMap.set(fd.id, s);
        }
    }
    assert.strictEqual(world2.shapes.length, 2, '恢复后应有2个物体');
    assert.ok(Math.abs(world2.shapes[0].position.x - c.position.x) < 0.001, '位置应还原');
    assert.ok(Math.abs(world2.shapes[0].velocity.x - c.velocity.x) < 0.001, '速度应还原');
    assert.strictEqual(world2.shapes[0].restitution, 0.7, 'restitution 应还原');
});

test('验收: 录制多帧时物理状态逐帧变化', () => {
    const world = new PhysicsWorld(400, 400, 50);
    const c = new Circle(new Vector2(100, 200), 15);
    c.velocity = new Vector2(60, 0);
    c.invMass = 1;
    world.addShape(c);

    const frames = [];
    for (let i = 0; i < 10; i++) {
        world.step(1 / 60);
        frames.push({
            x: world.shapes[0].position.x,
            stats: { ...world.getStats() }
        });
    }

    // 物体向右运动，x 应单调递增
    for (let i = 1; i < frames.length; i++) {
        assert.ok(frames[i].x > frames[i - 1].x, `第${i}帧x应大于前一帧: ${frames[i].x.toFixed(2)} > ${frames[i - 1].x.toFixed(2)}`);
    }
    const totalMove = frames[9].x - frames[0].x;
    assert.ok(totalMove > 0.5, `10帧累计位移应 > 0.5，实际 ${totalMove.toFixed(3)}`);

    // 每帧都有 stats
    for (const f of frames) {
        assert.strictEqual(f.stats.totalShapes, 1, '每帧stats应包含totalShapes');
        assert.strictEqual(typeof f.stats.broadPhasePairs, 'number');
    }
    console.log(`  10帧累计位移: ${totalMove.toFixed(3)} 像素`);
});

test('验收: 选中ID映射机制 - 切帧不丢选中对象', () => {
    // 模拟 demo 中 selectedIds + idMap 的恢复逻辑
    const worldA = new PhysicsWorld(400, 400, 50);
    const s1 = new Circle(new Vector2(50, 50), 10);
    const s2 = new Rectangle(new Vector2(150, 150), 20, 20);
    const s3 = new Circle(new Vector2(250, 250), 10);
    worldA.addShape(s1); worldA.addShape(s2); worldA.addShape(s3);

    // 用户选中了 s1 和 s3（按 ID）
    const selectedIds = [s1.id, s3.id];

    // 序列化帧
    const frame = worldA.shapes.map(sh => ({
        id: sh.id, type: sh.getType(),
        x: sh.position.x + 10, y: sh.position.y, // 模拟下一帧位置变化
        radius: sh.radius, width: sh.width, height: sh.height,
        vertices: sh.localVertices ? sh.localVertices.map(v => ({ x: v.x, y: v.y })) : null,
        vx: 0, vy: 0, invMass: 1, restitution: 0.5
    }));

    // 切到下一帧，restoreFrame 重建 world
    const worldB = new PhysicsWorld(400, 400, 50);
    worldB.clear();
    const idMap = new Map();
    for (const fd of frame) {
        let s;
        const pos = new Vector2(fd.x, fd.y);
        if (fd.type === 'Circle') s = new Circle(pos, fd.radius);
        else s = new Rectangle(pos, fd.width, fd.height);
        worldB.addShape(s);
        idMap.set(fd.id, s);
    }

    // 按 selectedIds 映射恢复
    const selectedAfter = [];
    for (const oldId of selectedIds) {
        const ss = idMap.get(oldId);
        if (ss) selectedAfter.push(ss);
    }
    assert.strictEqual(selectedAfter.length, 2, '切帧后仍应保留2个选中物体');
    assert.ok(selectedAfter[0].getType() === 'Circle', '第一个选中物体仍是 Circle');
    assert.ok(selectedAfter[1].getType() === 'Circle', '第二个选中物体仍是 Circle');
    assert.strictEqual(selectedAfter[0].position.x, 60, '位置应是帧中新值');
});

test('验收: 物体移动后宽阶段候选对数量即时变化 (拖动统计刷新)', () => {
    const world = new PhysicsWorld(400, 400, 50);
    // 两个远离的圆
    const c1 = new Circle(new Vector2(30, 200), 15);
    const c2 = new Circle(new Vector2(370, 200), 15);
    c1.invMass = 0; c2.invMass = 0;
    world.addShape(c1); world.addShape(c2);
    world.step(1 / 60);

    const farStats = world.getStats();
    assert.strictEqual(farStats.bruteForcePairs, 1, '暴力永远 1 对');
    assert.strictEqual(farStats.broadPhasePairs, 0, '远离时宽阶段 0 对候选');

    // 靠近：把 c2 移到 c1 旁边（同一网格）
    c2.position.x = 50;
    c2.position.y = 200;
    world.spatialGrid.clear();
    for (const s of world.shapes) world.spatialGrid.insert(s);

    // 模拟 computeStatsRealtime 直接计算
    const broadNearSet = world.spatialGrid.getPotentialCollisions();
    const broadNear = Array.from(broadNearSet);
    let collisionsNear = 0;
    for (const pair of broadNear) {
        if (detectCollision(pair.shapeA, pair.shapeB).collision) collisionsNear++;
    }
    assert.ok(broadNear.length >= 1, `靠近时宽阶段应返回至少 1 对候选，实际 ${broadNear.length}`);
    assert.strictEqual(collisionsNear, 1, '靠近时应检测到 1 次碰撞');

    // 再移开
    c2.position.x = 370;
    world.spatialGrid.clear();
    for (const s of world.shapes) world.spatialGrid.insert(s);
    const broadFarSet2 = world.spatialGrid.getPotentialCollisions();
    const broadFar2 = Array.from(broadFarSet2);
    let collisionsFar2 = 0;
    for (const pair of broadFar2) {
        if (detectCollision(pair.shapeA, pair.shapeB).collision) collisionsFar2++;
    }
    assert.strictEqual(collisionsFar2, 0, '移远后不应有碰撞');
    console.log(`  远离候选: ${farStats.broadPhasePairs} 对, 靠近候选: ${broadNear.length} 对, 移远: ${broadFar2.length} 对`);
});

test('验收: 开启/关闭宽阶段 碰撞数量应一致', () => {
    function makeWorld(useBroad, seedShapes) {
        const w = new PhysicsWorld(500, 500, 50);
        w.enableBroadPhase = useBroad;
        for (const sd of seedShapes) {
            let s;
            if (sd.type === 'Circle') s = new Circle(new Vector2(sd.x, sd.y), sd.radius);
            else s = new Rectangle(new Vector2(sd.x, sd.y), sd.w, sd.h);
            s.invMass = 0; s.velocity = new Vector2(0, 0);
            w.addShape(s);
        }
        return w;
    }

    // 构造一批分布：有些近有些远
    const seeds = [];
    for (let i = 0; i < 25; i++) {
        const r = 12;
        seeds.push({
            type: i % 3 === 0 ? 'Rectangle' : 'Circle',
            x: 30 + (i % 5) * 90,
            y: 30 + Math.floor(i / 5) * 90,
            radius: r, w: r * 2.2, h: r * 1.8
        });
    }
    // 再加几对故意重叠的
    seeds.push({ type: 'Circle', x: 80, y: 80, radius: 20 });
    seeds.push({ type: 'Circle', x: 95, y: 85, radius: 20 });

    const wGrid = makeWorld(true, seeds);
    const wBrute = makeWorld(false, seeds);

    wGrid.step(1 / 60);
    wBrute.step(1 / 60);

    const gridCollisions = wGrid.getStats().collisions;
    const bruteCollisions = wBrute.getStats().collisions;

    assert.strictEqual(gridCollisions, bruteCollisions,
        `宽阶段开启/关闭碰撞数应一致: grid=${gridCollisions}, brute=${bruteCollisions}`);
    assert.ok(wGrid.getStats().broadPhasePairs <= wGrid.getStats().bruteForcePairs,
        '网格宽阶段候选应 <= 暴力对数');

    console.log(`  碰撞数: 网格=${gridCollisions}, 暴力=${bruteCollisions} (相同 ✓)`);
    console.log(`  候选对: 网格=${wGrid.getStats().broadPhasePairs}, 暴力=${wGrid.getStats().bruteForcePairs}`);
});

test('验收: detectCollisionDebug 在临界位置随移动变化', () => {
    const c1 = new Circle(new Vector2(0, 0), 10);
    const c2 = new Circle(new Vector2(25, 0), 10);

    // 距离 25 > 20，未碰撞
    let d1 = detectCollisionDebug(c1, c2);
    assert.strictEqual(d1.collision, false);
    assert.ok(d1.hasSeparatingAxis === true, '未碰撞应有分离轴');

    // 移到 19，接近临界
    c2.position.x = 19;
    let d2 = detectCollisionDebug(c1, c2);
    assert.strictEqual(d2.collision, true, '距离19应碰撞');
    assert.strictEqual(d2.depth, 1, '深度应为1');
    assert.ok(d2.minAxisIndex >= 0);

    // 再移远
    c2.position.x = 100;
    let d3 = detectCollisionDebug(c1, c2);
    assert.strictEqual(d3.collision, false);
    assert.ok(d3.axes.length >= 1, '候选轴不应为空');

    // 验证所有字段连续性
    for (const d of [d1, d2, d3]) {
        assert.ok('collision' in d && 'normal' in d && 'depth' in d);
        assert.ok('axes' in d && 'minAxisIndex' in d && 'hasSeparatingAxis' in d);
        for (const ax of d.axes) {
            assert.ok('axis' in ax && 'projA' in ax && 'projB' in ax);
            assert.ok('overlap' in ax && 'separated' in ax);
        }
    }
    console.log(`  距离25: 分离, 距离19: 碰撞(depth=1), 距离100: 分离 — 临界变化正确`);
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
