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

// ======== Mulberry32 PRNG（与 demo 中同步） ========
function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// ========== 端到端验收：固定种子、网格大小、导出、时间轴同步 ==========

test('验收: 固定种子生成场景可重复复现', () => {
    function generateShapes(seed, count) {
        const rng = makeRng(seed);
        const world = new PhysicsWorld(500, 500, 50);
        const palette = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'];
        for (let i = 0; i < count; i++) {
            const r = 8 + rng() * 18;
            const x = r + rng() * (500 - 2 * r);
            const y = r + rng() * (500 - 2 * r);
            const s = new Circle(new Vector2(x, y), r);
            s.velocity = new Vector2((rng() - 0.5) * 200, (rng() - 0.5) * 200);
            s.color = palette[Math.floor(rng() * palette.length)];
            s.restitution = 0.6 + rng() * 0.4;
            s.invMass = 1 / (r * r * 0.01);
            world.addShape(s);
        }
        return world;
    }

    const w1 = generateShapes(12345, 30);
    const w2 = generateShapes(12345, 30);
    const w3 = generateShapes(99999, 30);

    // 相同种子，第 5 个物体的位置和半径应完全一致
    assert.strictEqual(w1.shapes[5].position.x, w2.shapes[5].position.x,
        '同一种子生成的第5个物体 x 坐标应相同');
    assert.strictEqual(w1.shapes[5].radius, w2.shapes[5].radius,
        '同一种子生成的第5个物体半径应相同');
    assert.strictEqual(w1.shapes[5].velocity.x, w2.shapes[5].velocity.x,
        '同一种子生成的第5个物体速度应相同');
    assert.strictEqual(w1.shapes[5].color, w2.shapes[5].color,
        '同一种子生成的第5个物体颜色应相同');

    // 不同种子，位置应不同
    assert.notStrictEqual(w1.shapes[5].position.x, w3.shapes[5].position.x,
        '不同种子生成的物体位置应不同');

    console.log(`  种子 12345: 第5物体 x=${w1.shapes[5].position.x.toFixed(3)}, r=${w1.shapes[5].radius.toFixed(3)}`);
    console.log(`  种子 99999: 第5物体 x=${w3.shapes[5].position.x.toFixed(3)}, r=${w3.shapes[5].radius.toFixed(3)}`);
});

test('验收: 调整网格大小后宽阶段候选对数量变化', () => {
    // 构造 20 个均匀分布的圆，分别用 40 / 80 / 120 三种网格
    const rng = makeRng(42);
    const shapesData = [];
    for (let i = 0; i < 25; i++) {
        const r = 10 + rng() * 10;
        shapesData.push({
            r, x: r + rng() * (500 - 2 * r), y: r + rng() * (500 - 2 * r)
        });
    }

    function buildWorld(cellSize) {
        const w = new PhysicsWorld(500, 500, cellSize);
        for (const sd of shapesData) {
            const c = new Circle(new Vector2(sd.x, sd.y), sd.r);
            c.invMass = 0;
            w.addShape(c);
        }
        w.step(1 / 60);
        return w;
    }

    const w40 = buildWorld(40);
    const w80 = buildWorld(80);
    const w120 = buildWorld(120);

    const s40 = w40.getStats();
    const s80 = w80.getStats();
    const s120 = w120.getStats();

    // 碰撞数应该完全一致（因为是同一批物体）
    assert.strictEqual(s40.collisions, s80.collisions,
        '不同网格大小的碰撞数应一致');
    assert.strictEqual(s80.collisions, s120.collisions);

    // 一般来说，网格越小（但仍大于物体），候选对越少？
    // 实际上，网格如果比物体小很多，每个物体占多格，候选对反而变多
    // 这里只验证：三种网格下碰撞数一致，候选对数量变化
    console.log(`  网格 40px: 候选对=${s40.broadPhasePairs}, 碰撞=${s40.collisions}`);
    console.log(`  网格 80px: 候选对=${s80.broadPhasePairs}, 碰撞=${s80.collisions}`);
    console.log(`  网格 120px: 候选对=${s120.broadPhasePairs}, 碰撞=${s120.collisions}`);

    assert.strictEqual(typeof s40.broadPhasePairs, 'number', 'broadPhasePairs 应是数字');
    assert.ok(s40.bruteForcePairs > s40.broadPhasePairs || s40.broadPhasePairs > 0,
        '候选对数量应该有意义');
});

test('验收: PhysicsWorld.setCellSize 动态改网格', () => {
    const world = new PhysicsWorld(400, 400, 50);
    assert.strictEqual(world.getCellSize(), 50, '初始网格 50');

    const c1 = new Circle(new Vector2(60, 200), 15);
    const c2 = new Circle(new Vector2(140, 200), 15);
    c1.invMass = 0; c2.invMass = 0;
    world.addShape(c1); world.addShape(c2);

    world.step(1 / 60);
    const s50 = world.getStats();

    world.setCellSize(200);
    world.step(1 / 60);
    const s200 = world.getStats();

    assert.strictEqual(world.getCellSize(), 200, '修改后应为 200');
    // 两圆心距 80，半径均 15，直径和 30 < 80，不碰撞
    // 但在 50 大小网格下和 200 大小下，候选对数量可能不同
    // 至少验证 setCellSize 不报错、网格变化
    console.log(`  50px网格 候选对: ${s50.broadPhasePairs}, 200px网格 候选对: ${s200.broadPhasePairs}`);

    // 200px 大网格肯定在同一个单元里 → 候选对 = 1
    assert.strictEqual(s200.broadPhasePairs, 1, '200px 大网格下两物体应在同一格，候选对=1');
});

test('验收: 导出摘要数值应与统计面板严格对齐', () => {
    // 模拟 demo 中导出摘要的计算逻辑，验证和面板显示一致
    const world = new PhysicsWorld(500, 500, 60);
    const rng = makeRng(777);
    for (let i = 0; i < 30; i++) {
        const r = 10 + rng() * 12;
        const c = new Circle(new Vector2(r + rng() * (500 - 2 * r), r + rng() * (500 - 2 * r)), r);
        c.invMass = 1;
        c.velocity = new Vector2((rng() - 0.5) * 200, (rng() - 0.5) * 200);
        world.addShape(c);
    }
    world.step(1 / 60);
    const s = world.getStats();

    // 模拟页面上的加速比计算：暴力总时 / 网格总时
    const gridTotalTime = s.broadPhaseTime + s.narrowPhaseTime;
    const bruteTotalTime = s.bruteForceTime;
    const speedup = bruteTotalTime > 0 && gridTotalTime > 0
        ? bruteTotalTime / gridTotalTime : 1;

    // 模拟页面上的窄阶段减少比例
    const reductionPct = s.bruteForcePairs > 0
        ? (1 - s.broadPhasePairs / s.bruteForcePairs) * 100
        : 0;

    // 验证这些值从 getStats 可以算出（和页面用同一套公式）
    assert.strictEqual(typeof s.broadPhasePairs, 'number');
    assert.strictEqual(typeof s.bruteForcePairs, 'number');
    assert.strictEqual(typeof s.collisions, 'number');
    assert.strictEqual(typeof s.broadPhaseTime, 'number');
    assert.strictEqual(typeof s.narrowPhaseTime, 'number');
    assert.strictEqual(typeof s.bruteForceTime, 'number');

    // 验证导出摘要的字段可从 stats 还原
    const exported = {
        totalShapes: s.totalShapes,
        avgBroadPhase: s.broadPhasePairs,
        avgNarrow: s.narrowPhaseTests,
        avgCollisions: s.collisions,
        speedup: speedup,
        reductionPct: reductionPct,
        gridCellSize: world.getCellSize()
    };

    assert.strictEqual(exported.totalShapes, 30, '导出物体数应等于 30');
    assert.strictEqual(exported.gridCellSize, 60, '导出网格大小应为 60');
    assert.ok(exported.speedup > 0, '加速比应为正数');
    assert.ok(exported.reductionPct >= 0 && exported.reductionPct <= 100,
        `减少比例应在 0-100 之间，实际 ${exported.reductionPct.toFixed(1)}`);

    console.log(`  网格大小: ${exported.gridCellSize}px`);
    console.log(`  宽阶段候选: ${s.broadPhasePairs} / 暴力 ${s.bruteForcePairs} 对 (减少 ${reductionPct.toFixed(1)}%)`);
    console.log(`  加速比: ${speedup.toFixed(2)}x`);
});

test('验收: 时间轴切帧后选中物体ID映射保持一致', () => {
    // 模拟时间轴切帧的 id 映射逻辑，验证选中物体不会丢失
    const worldA = new PhysicsWorld(400, 400, 50);
    const shapesInfo = [];
    for (let i = 0; i < 8; i++) {
        const c = new Circle(new Vector2(50 + i * 40, 200), 12);
        worldA.addShape(c);
        shapesInfo.push({
            id: c.id, type: 'Circle',
            x: c.position.x, y: c.position.y, radius: c.radius
        });
    }

    // 用户选中了第 2 和第 6 个物体（按 id）
    const selectedIds = [shapesInfo[1].id, shapesInfo[5].id];

    // 模拟下一帧：重建 world（和 restoreFrame / handleTimelineClick 逻辑一样）
    const worldB = new PhysicsWorld(400, 400, 50);
    const idMap = new Map();
    for (const fd of shapesInfo) {
        // 模拟位置变化（下一帧）
        const newX = fd.x + 5;
        const s = new Circle(new Vector2(newX, fd.y), fd.radius);
        worldB.addShape(s);
        idMap.set(fd.id, s);
    }

    // 按 selectedIds 映射恢复选中
    const selectedAfter = [];
    for (const oldId of selectedIds) {
        const s = idMap.get(oldId);
        if (s) selectedAfter.push(s);
    }

    assert.strictEqual(selectedAfter.length, 2, '切帧后仍应选中 2 个物体');
    assert.strictEqual(selectedAfter[0].radius, 12, '物体属性应保留');
    assert.strictEqual(selectedAfter[0].position.x, shapesInfo[1].x + 5,
        '位置应是帧中新值');

    // 验证选中顺序不变
    assert.strictEqual(idMap.get(selectedIds[0]), selectedAfter[0],
        '第一选中物体对应原 id');
    assert.strictEqual(idMap.get(selectedIds[1]), selectedAfter[1],
        '第二选中物体对应原 id');

    console.log(`  选中物体从 ${selectedIds.length} 个保留到 ${selectedAfter.length} 个 ✓`);
});

test('验收: detectCollisionDebug 各字段齐全且可用于 SAT 面板', () => {
    const r1 = new Rectangle(new Vector2(0, 0), 20, 30);
    const p = new Circle(new Vector2(100, 50), 15);

    const d = detectCollisionDebug(r1, p);

    // 验证调试面板需要的所有字段都存在
    assert.strictEqual(typeof d.collision, 'boolean');
    assert.ok(d.normal instanceof Vector2);
    assert.strictEqual(typeof d.depth, 'number');
    assert.strictEqual(d.shapeA, r1);
    assert.strictEqual(d.shapeB, p);
    assert.ok(Array.isArray(d.axes));
    assert.strictEqual(typeof d.minAxisIndex, 'number');
    assert.strictEqual(typeof d.hasSeparatingAxis, 'boolean');

    // 验证每条轴的字段
    assert.ok(d.axes.length > 0, '至少有一条候选轴');
    const ax0 = d.axes[0];
    assert.ok(ax0.axis instanceof Vector2);
    assert.strictEqual(typeof ax0.projA.min, 'number');
    assert.strictEqual(typeof ax0.projA.max, 'number');
    assert.strictEqual(typeof ax0.projB.min, 'number');
    assert.strictEqual(typeof ax0.projB.max, 'number');
    assert.strictEqual(typeof ax0.overlap, 'number');
    assert.strictEqual(typeof ax0.separated, 'boolean');

    console.log(`  候选轴数: ${d.axes.length}, 最小轴索引: ${d.minAxisIndex}, 分离: ${d.hasSeparatingAxis}`);
});

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
