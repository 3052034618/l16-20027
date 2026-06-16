# 二维物理碰撞检测引擎原理详解

## 一、分离轴定理 (Separating Axis Theorem, SAT)

### 1.1 基本原理

分离轴定理是判断两个凸形是否相交的核心算法。其核心思想是：

> **如果能找到一条轴，使得两个凸形在该轴上的投影不重叠，那么这两个凸形就不相交。反之，如果在所有候选轴上的投影都重叠，则两凸形相交。**

### 1.2 为什么只需检验有限条候选轴？

对于两个凸多边形，候选轴的数量是有限的，等于两个多边形的边数之和。这是因为：

**凸多边形的分离轴只能是其边的法线方向。**

直观理解：
- 两个凸多边形如果分离，那么必然存在一条直线（分离线）可以将它们分开
- 这条分离线的垂线就是分离轴
- 对于凸多边形来说，分离线必然与其中一条边平行
- 因此，分离轴必然与某条边的法线方向一致

数学推导：
- 设凸多边形 A 有 m 条边，凸多边形 B 有 n 条边
- 每条边对应一个法线方向
- 只需检验这 m + n 个方向
- 如果在所有这些方向上投影都重叠，则两多边形相交

**复杂度：O(m + n)**，远优于其他算法。

**代码位置**：[sat.js](file:///d:/trae-bz/TraeProjects/20027/src/sat.js#L13-L38) `getAxesForShapes` 函数

```javascript
// 获取两个形状的所有候选轴
function getAxesForShapes(shapeA, shapeB) {
    const axes = [];
    // ... 获取形状A的所有边的法线
    // ... 获取形状B的所有边的法线
    return axes;
}
```

### 1.3 投影重叠检测

对于每个候选轴：
1. 将两个形状的所有顶点投影到该轴上
2. 计算投影区间 [min, max]
3. 检查两个区间是否重叠

**代码位置**：[sat.js](file:///d:/trae-bz/TraeProjects/20027/src/sat.js#L48-L96) `detectCollisionSAT` 函数

```javascript
// 计算两个投影区间的距离
function intervalDistance(minA, maxA, minB, maxB) {
    if (minA < minB) {
        return minB - maxA;  // 正数表示分离，负数表示重叠
    } else {
        return minA - maxB;
    }
}
```

---

## 二、穿透深度和碰撞法线的计算

### 2.1 基本概念

当两个凸形相交时：
- **穿透深度 (Penetration Depth)**：两物体相互嵌入的深度
- **碰撞法线 (Collision Normal)**：将两物体推开的最佳方向

### 2.2 最小重叠量原则

**穿透深度和碰撞法线都来自于投影重叠量最小的那个轴。**

原因：
- 沿投影重叠最小的轴推开物体，需要移动的距离最短
- 这是最"省力"的分离方式，符合物理直觉
- 这个轴被称为**最小穿透轴 (Minimum Penetration Axis)**

计算过程：
1. 对每个候选轴，计算投影重叠量
2. 找出重叠量最小的轴
3. 该轴的方向就是碰撞法线方向
4. 该轴上的重叠量就是穿透深度

**代码位置**：[sat.js](file:///d:/trae-bz/TraeProjects/20027/src/sat.js#L59-L81)

```javascript
let minOverlap = Infinity;
let minAxis = null;

for (const axis of axes) {
    const projA = shapeA.project(axis);
    const projB = shapeB.project(axis);
    
    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
    
    if (overlap < minOverlap) {
        minOverlap = overlap;
        minAxis = axis.clone();
    }
}

// 最小重叠轴就是碰撞法线
result.normal = minAxis.normalize();
result.depth = minOverlap;
```

### 2.3 法线方向的确定

法线方向需要确保：
- 从 shapeA 指向 shapeB
- 可以通过质心连线与法线的点积来验证和修正

```javascript
const dir = shapeB.position.sub(shapeA.position);
if (dir.dot(minAxis) < 0) {
    minAxis = minAxis.mul(-1);  // 反转方向
}
```

---

## 三、圆与多边形的混合情况

### 3.1 问题分析

圆是特殊的凸形，它有无数条对称轴，不能直接套用多边形的方法。

### 3.2 补充轴的策略

对于圆与多边形的碰撞检测，需要**补充额外的轴**：

1. **多边形的所有边的法线**（与多边形-多边形检测相同）
2. **圆心到多边形最近点的连线方向**（圆特有的轴）

**为什么需要补充这个轴？**
- 多边形的边法线无法覆盖圆的所有可能分离方向
- 圆心到最近点的连线是圆与多边形之间最可能的分离方向

**代码位置**：[shapes.js](file:///d:/trae-bz/TraeProjects/20027/src/shapes.js#L93-L124) `Circle.getAxes` 方法

```javascript
// 圆的 getAxes 方法
getAxes(other) {
    if (other.getType() === 'Polygon' || other.getType() === 'Rectangle') {
        const axes = [];
        
        // 1. 找多边形上离圆心最近的点
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
        
        // 2. 补充圆心到最近点的连线方向作为轴
        if (closestPoint) {
            const axis = this.position.sub(closestPoint).normalize();
            axes.push(axis);
        }
        
        // 3. 加上多边形的所有边法线
        const polyAxes = other.getAxes();
        axes.push(...polyAxes);
        
        return axes;
    }
}
```

### 3.3 圆与圆的情况

两个圆的碰撞检测只需检验一条轴：**两圆圆心的连线方向**。

```javascript
if (other.getType() === 'Circle') {
    const axis = this.position.sub(other.position).normalize();
    return [axis];  // 只需一条轴
}
```

---

## 四、空间网格宽阶段剔除

### 4.1 为什么需要宽阶段？

碰撞检测分为两个阶段：

| 阶段 | 作用 | 复杂度 |
|------|------|--------|
| **宽阶段 (Broad Phase)** | 快速剔除明显不相交的物体对 | 近似 O(n) |
| **窄阶段 (Narrow Phase)** | 精确检测是否真的碰撞 | O(n²) 最坏情况 |

如果没有宽阶段，n 个物体需要进行 `n × (n - 1) / 2` 次检测，复杂度为 **O(n²)**。

例如：
- 10 个物体：45 次检测
- 100 个物体：4950 次检测
- 1000 个物体：499500 次检测！

### 4.2 空间网格的原理

将整个空间划分为大小相等的网格单元：

```
┌─────┬─────┬─────┬─────┐
│     │     │     │     │
│  A  │  A  │     │     │
├─────┼─────┼─────┼─────┤
│     │A B  │ B   │     │
│     │     │     │     │
├─────┼─────┼─────┼─────┤
│     │     │ B C │  C  │
│     │     │     │     │
└─────┴─────┴─────┴─────┘
```

**算法步骤**：
1. 每个物体根据其 AABB（轴对齐包围盒）插入到覆盖的网格单元中
2. 只对同一网格单元内的物体对进行窄阶段检测
3. 用哈希表去重，避免重复检测

**代码位置**：[spatial_grid.js](file:///d:/trae-bz/TraeProjects/20027/src/spatial_grid.js)

### 4.3 复杂度分析

- **插入操作**：O(1)，根据 AABB 计算网格坐标
- **查询潜在碰撞**：每个物体只需检查相邻的几个网格单元
- **总体复杂度**：接近 O(n)，当物体均匀分布时

**性能提升示例**：
```
100 个物体，均匀分布在 10×10 网格中：
- 暴力检测：4950 次
- 空间网格：约 100 次（每个网格约 1 个物体）
- 性能提升：约 50 倍！
```

**代码位置**：[spatial_grid.js](file:///d:/trae-bz/TraeProjects/20027/src/spatial_grid.js#L69-L93) `getPotentialCollisions` 方法

```javascript
getPotentialCollisions() {
    const pairs = new Set();
    const checked = new Set();
    
    // 遍历所有非空网格单元
    for (const [, cell] of this.grid) {
        const shapes = Array.from(cell);
        // 只比较同一单元内的物体
        for (let i = 0; i < shapes.length; i++) {
            for (let j = i + 1; j < shapes.length; j++) {
                // 用 Set 去重
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
```

### 4.4 网格大小的选择

网格大小是关键参数：
- **太大**：每个网格包含太多物体，退化为暴力检测
- **太小**：一个物体覆盖太多网格，增加插入和查询开销
- **经验值**：网格大小 ≈ 平均物体大小的 1.5 ~ 2 倍

---

## 五、碰撞响应与最小位移修正

### 5.1 位置修正 (Position Correction)

检测到碰撞后，需要将重叠的物体推开。

**基本原则**：沿碰撞法线方向，按质量反比分配位移。

**公式**：
```
总修正量 = 穿透深度 × 修正系数
物体A位移 = -法线 × 总修正量 × (invMassA / (invMassA + invMassB))
物体B位移 = 法线 × 总修正量 × (invMassB / (invMassA + invMassB))
```

其中 `invMass` 是质量的倒数（1/mass）。

**代码位置**：[physics_world.js](file:///d:/trae-bz/TraeProjects/20027/src/physics_world.js#L76-L90) `resolvePosition` 方法

```javascript
resolvePosition(collision) {
    const { shapeA, shapeB, normal, depth } = collision;
    
    const percent = 0.8;      // 修正系数，避免抖动
    const slop = 0.05;        // 允许的微小重叠，避免反复修正
    
    const correctionMag = Math.max(depth - slop, 0) / (shapeA.invMass + shapeB.invMass) * percent;
    const correction = normal.mul(correctionMag);
    
    // 按质量反比分配位移
    if (shapeA.invMass > 0) {
        shapeA.position = shapeA.position.sub(correction.mul(shapeA.invMass));
    }
    if (shapeB.invMass > 0) {
        shapeB.position = shapeB.position.add(correction.mul(shapeB.invMass));
    }
}
```

**为什么使用 80% 修正和 slop？**
- 避免因为浮点误差导致的反复修正（抖动）
- 允许微小的重叠，提高稳定性
- 多次迭代后自然会完全分离

### 5.2 速度响应 (Velocity Response)

碰撞后需要更新物体的速度，产生反弹效果。

**冲量公式 (Impulse Formula)**：
```
冲量大小 j = -(1 + restitution) × v_rel · n / (invMassA + invMassB)

其中：
- restitution: 恢复系数 (0~1)，0 完全非弹性，1 完全弹性
- v_rel: 相对速度 (velocityB - velocityA)
- n: 碰撞法线
```

**代码位置**：[physics_world.js](file:///d:/trae-bz/TraeProjects/20027/src/physics_world.js#L42-L74) `resolveCollision` 方法

```javascript
resolveCollision(collision) {
    const { shapeA, shapeB, normal } = collision;
    
    // 计算相对速度
    const velocityRel = shapeB.velocity.sub(shapeA.velocity);
    
    // 相对速度在法线方向的分量
    const velAlongNormal = velocityRel.dot(normal);
    
    // 如果物体正在分离，不处理
    if (velAlongNormal > 0) {
        return;
    }
    
    // 恢复系数（取较小值，更稳定）
    const restitution = Math.min(shapeA.restitution, shapeB.restitution);
    
    // 计算冲量大小
    const impulse = -(1 + restitution) * velAlongNormal / (shapeA.invMass + shapeB.invMass);
    const impulseVec = normal.mul(impulse);
    
    // 应用冲量，按质量反比分配
    if (shapeA.invMass > 0) {
        shapeA.velocity = shapeA.velocity.sub(impulseVec.mul(shapeA.invMass));
    }
    if (shapeB.invMass > 0) {
        shapeB.velocity = shapeB.velocity.add(impulseVec.mul(shapeB.invMass));
    }
}
```

### 5.3 处理顺序

完整的碰撞处理顺序：
1. **更新位置和速度**（应用重力、外力）
2. **宽阶段**（空间网格筛选潜在碰撞对）
3. **窄阶段**（SAT 精确检测碰撞）
4. **位置修正**（沿法线推开重叠物体）
5. **速度响应**（应用冲量，产生反弹）
6. **边界处理**（防止物体飞出世界边界）

**代码位置**：[physics_world.js](file:///d:/trae-bz/TraeProjects/20027/src/physics_world.js#L144-L182) `step` 方法

---

## 六、完整算法流程总结

```
┌─────────────────────────────────────────────────────────────┐
│                        物理世界步进                          │
└─────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────┐
│               1. 积分运动 (更新位置和速度)                   │
│   velocity += gravity × dt                                  │
│   position += velocity × dt                                 │
└─────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────┐
│               2. 宽阶段 - 空间网格剔除                        │
│   □ 将所有物体重新插入空间网格                               │
│   □ 获取同一网格内的物体对（潜在碰撞）                         │
│   复杂度: O(n)                                              │
└─────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────┐
│               3. 窄阶段 - SAT 精确检测                        │
│   对每个潜在碰撞对:                                          │
│     □ 获取所有候选轴 (边法线 + 特殊轴)                        │
│     □ 将两物体投影到每条轴上                                 │
│     □ 检查投影是否重叠                                       │
│     □ 找到最小重叠轴 → 碰撞法线 + 穿透深度                     │
│   复杂度: O(k), k 为宽阶段筛选后的对数                       │
└─────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────┐
│               4. 碰撞响应                                     │
│   □ 位置修正: 沿法线推开，按质量分配                         │
│   □ 速度响应: 应用冲量公式，产生反弹                         │
└─────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────┐
│               5. 边界碰撞处理                                 │
│   防止物体飞出世界边界                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 七、代码结构总览

```
src/
├── shapes.js          # 形状定义 (Vector2, Circle, Rectangle, Polygon)
│   ├── Vector2        # 二维向量，运算基础
│   ├── Shape          # 形状基类
│   ├── Circle         # 圆形
│   ├── Rectangle      # 轴对齐矩形
│   └── Polygon        # 凸多边形
│
├── sat.js             # 分离轴定理碰撞检测
│   ├── detectCollisionSAT          # 通用 SAT 检测
│   ├── detectCollisionCircleCircle # 圆圆碰撞
│   ├── detectCollisionCirclePolygon # 圆与多边形碰撞
│   └── detectCollision             # 统一入口
│
├── spatial_grid.js    # 空间网格宽阶段剔除
│   └── SpatialGrid    # 空间网格实现
│
├── physics_world.js   # 物理世界整合
│   └── PhysicsWorld   # 管理所有物体和碰撞检测
│
└── index.js           # 模块导出

test/
├── collision_test.js  # 单元测试
└── debug_test.js      # 调试脚本

demo.html              # 可视化演示
```

---

## 八、关键优化点总结

1. **分离轴定理**：有限条候选轴，O(m+n) 复杂度
2. **最小穿透轴**：从最小重叠量获取法线和深度
3. **圆的特殊处理**：补充圆心到最近点的轴
4. **空间网格**：将 O(n²) 降至近似 O(n)
5. **位置修正**：80% 修正 + slop，避免抖动
6. **速度响应**：冲量公式，按质量反比分配
7. **质量加权**：invMass 处理不同质量的物体交互

这些设计共同构成了一个高效、稳定的二维物理碰撞检测引擎。
