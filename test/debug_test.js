const {
    Vector2,
    Circle,
    detectCollision,
    PhysicsWorld
} = require('../src/index');

console.log('=== Debug: Circle-Circle Collision Response ===\n');

const circle1 = new Circle(new Vector2(0, 100), 20);
const circle2 = new Circle(new Vector2(30, 100), 20);

circle1.invMass = 1;
circle2.invMass = 1;

console.log('Initial state:');
console.log(`  Circle1: pos=(${circle1.position.x}, ${circle1.position.y}), vel=(${circle1.velocity.x}, ${circle1.velocity.y})`);
console.log(`  Circle2: pos=(${circle2.position.x}, ${circle2.position.y}), vel=(${circle2.velocity.x}, ${circle2.velocity.y})`);
console.log(`  Distance: ${Vector2.distance(circle1.position, circle2.position)}`);
console.log(`  Should collide: ${Vector2.distance(circle1.position, circle2.position) < 40}`);

const collision = detectCollision(circle1, circle2);
console.log(`\nCollision detection result:`);
console.log(`  collision: ${collision.collision}`);
console.log(`  depth: ${collision.depth}`);
console.log(`  normal: (${collision.normal.x}, ${collision.normal.y})`);
console.log(`  shapeA.id: ${collision.shapeA.id}, shapeB.id: ${collision.shapeB.id}`);

console.log('\nApplying position correction:');
const { shapeA, shapeB, normal, depth } = collision;
const percent = 0.8;
const slop = 0.05;
const correctionMag = Math.max(depth - slop, 0) / (shapeA.invMass + shapeB.invMass) * percent;
const correction = normal.mul(correctionMag);

console.log(`  correctionMag: ${correctionMag}`);
console.log(`  correction: (${correction.x}, ${correction.y})`);
console.log(`  shapeA.id: ${shapeA.id}, shapeB.id: ${shapeB.id}`);

if (shapeA.invMass > 0) {
    shapeA.position = shapeA.position.sub(correction.mul(shapeA.invMass));
    console.log(`  ShapeA new pos: (${shapeA.position.x}, ${shapeA.position.y})`);
}
if (shapeB.invMass > 0) {
    shapeB.position = shapeB.position.add(correction.mul(shapeB.invMass));
    console.log(`  ShapeB new pos: (${shapeB.position.x}, ${shapeB.position.y})`);
}

console.log(`\nAfter position correction:`);
console.log(`  Circle1: pos=(${circle1.position.x}, ${circle1.position.y})`);
console.log(`  Circle2: pos=(${circle2.position.x}, ${circle2.position.y})`);
console.log(`  Distance: ${Vector2.distance(circle1.position, circle2.position)}`);

console.log('\n=== Debug: Physics World Step ===\n');

const world = new PhysicsWorld(200, 200, 50);
const c1 = new Circle(new Vector2(0, 100), 20);
const c2 = new Circle(new Vector2(30, 100), 20);
c1.invMass = 1;
c2.invMass = 1;

console.log('Before adding to world:');
console.log(`  c1.id: ${c1.id}, c2.id: ${c2.id}`);

world.addShape(c1);
world.addShape(c2);

console.log(`\nWorld shapes: ${world.shapes.length}`);
console.log(`  shape[0].id: ${world.shapes[0].id}`);
console.log(`  shape[1].id: ${world.shapes[1].id}`);

console.log('\nBefore step:');
console.log(`  c1: pos=(${c1.position.x}, ${c1.position.y}), vel=(${c1.velocity.x}, ${c1.velocity.y})`);
console.log(`  c2: pos=(${c2.position.x}, ${c2.position.y}), vel=(${c2.velocity.x}, ${c2.velocity.y})`);

const collisions = world.step(0.016);

console.log('\nAfter step:');
console.log(`  c1: pos=(${c1.position.x}, ${c1.position.y}), vel=(${c1.velocity.x}, ${c1.velocity.y})`);
console.log(`  c2: pos=(${c2.position.x}, ${c2.position.y}), vel=(${c2.velocity.x}, ${c2.velocity.y})`);
console.log(`  Distance: ${Vector2.distance(c1.position, c2.position)}`);
console.log(`  Collisions detected: ${collisions.length}`);

for (let i = 0; i < collisions.length; i++) {
    const col = collisions[i];
    console.log(`  Collision ${i}: depth=${col.depth}, normal=(${col.normal.x}, ${col.normal.y})`);
    console.log(`    shapeA.id: ${col.shapeA.id}, shapeB.id: ${col.shapeB.id}`);
}

console.log('\n=== Debug: Velocity Response ===\n');

const world2 = new PhysicsWorld(200, 200, 50);
const ball1 = new Circle(new Vector2(0, 100), 20);
const ball2 = new Circle(new Vector2(25, 100), 20);

ball1.invMass = 1;
ball2.invMass = 0;
ball1.velocity = new Vector2(100, 0);
ball1.restitution = 1.0;
ball2.restitution = 1.0;

world2.addShape(ball1);
world2.addShape(ball2);

console.log('Initial:');
console.log(`  ball1: pos=(${ball1.position.x}, ${ball1.position.y}), vel=(${ball1.velocity.x}, ${ball1.velocity.y})`);
console.log(`  ball2: pos=(${ball2.position.x}, ${ball2.position.y}), vel=(${ball2.velocity.x}, ${ball2.velocity.y})`);
console.log(`  Distance: ${Vector2.distance(ball1.position, ball2.position)}`);

for (let i = 0; i < 3; i++) {
    const cols = world2.step(0.016);
    console.log(`\nStep ${i + 1}:`);
    console.log(`  ball1: pos=(${ball1.position.x.toFixed(2)}, ${ball1.position.y.toFixed(2)}), vel=(${ball1.velocity.x.toFixed(2)}, ${ball1.velocity.y.toFixed(2)})`);
    console.log(`  ball2: pos=(${ball2.position.x.toFixed(2)}, ${ball2.position.y.toFixed(2)}), vel=(${ball2.velocity.x.toFixed(2)}, ${ball2.velocity.y.toFixed(2)})`);
    console.log(`  Distance: ${Vector2.distance(ball1.position, ball2.position).toFixed(2)}`);
    console.log(`  Collisions: ${cols.length}`);
    if (cols.length > 0) {
        console.log(`    normal=(${cols[0].normal.x.toFixed(2)}, ${cols[0].normal.y.toFixed(2)}), depth=${cols[0].depth.toFixed(2)}`);
    }
}
