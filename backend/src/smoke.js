// Run with: docker compose exec api node src/smoke.js
import assert from "node:assert/strict";
import pg from "pg";
const pool = new pg.Pool();
const root = "http://localhost:3000/api";
const call = (path, method = "GET", body) =>
  fetch(root + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
let recipeId;
try {
  assert.equal((await call("/health")).status, 200);
  assert.equal(
    (await call("/recipes", "POST", { title: "缺少字段" })).status,
    400,
  );
  assert.equal((await call("/recipes/1abc/comments")).status, 400);
  const recipe = await call("/recipes", "POST", {
    title: "集成测试临时菜谱",
    category: "家常菜",
    minutes: 15,
    description: "自动测试后删除",
    ingredients: "鸡蛋 2 个",
    steps: "打散\n炒熟",
  });
  assert.equal(recipe.status, 201);
  recipeId = (await recipe.json()).id;
  assert.ok(
    (await (await call("/recipes")).json()).some((r) => r.id === recipeId),
  );
  assert.equal(
    (
      await call(`/recipes/${recipeId}/comments`, "POST", {
        author: "测试",
        content: "   ",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(`/recipes/${recipeId}/comments`, "POST", {
        author: "测试",
        content: "少放盐 <script>test</script>",
      })
    ).status,
    201,
  );
  assert.equal(
    (await (await call(`/recipes/${recipeId}/comments`)).json())[0].content,
    "少放盐 <script>test</script>",
  );
  const order = await call("/orders", "POST", { recipeId });
  assert.equal(order.status, 201);
  const orderId = (await order.json()).id;
  assert.equal((await call("/orders", "POST", { recipeId })).status, 409);
  assert.equal(
    (await call(`/orders/${orderId}`, "PATCH", { status: "done" })).status,
    200,
  );
  assert.ok(
    !(await (await call("/orders")).json()).some((o) => o.id === orderId),
  );
  const second = await call("/orders", "POST", { recipeId });
  assert.equal(second.status, 201);
  const secondId = (await second.json()).id;
  assert.equal((await call(`/orders/${secondId}`, "DELETE")).status, 204);
  console.log(
    "PASS: create/list recipe, comments, input validation, duplicate order, completion, re-order, cancellation",
  );
} finally {
  if (recipeId) await pool.query("DELETE FROM recipes WHERE id=$1", [recipeId]);
  await pool.end();
}
