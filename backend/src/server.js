import express from "express";
import pg from "pg";
import {
  recipeSchema,
  commentSchema,
  orderSchema,
  statusSchema,
  parseId,
} from "./validation.js";
const pool = new pg.Pool();
pool.on("error", (error) => console.error("Idle database connection error:", error.message));
await pool.query(`
  CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
    minutes INTEGER NOT NULL CHECK(minutes > 0), description TEXT NOT NULL DEFAULT '',
    ingredients TEXT NOT NULL, steps TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY, recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    author TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY, recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','done')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS one_pending_per_recipe ON orders(recipe_id) WHERE status='pending';
  CREATE INDEX IF NOT EXISTS comments_recipe_id ON comments(recipe_id);
`);
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
const validate = (schema, req, res) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res
      .status(400)
      .json({ error: "请检查填写内容", details: result.error.flatten() });
    return null;
  }
  return result.data;
};
app.param("id", (req, res, next, value) => {
  const id = parseId(value);
  if (!id) return res.status(400).json({ error: "无效的编号" });
  req.entityId = id;
  next();
});
app.get("/api/health", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok" });
});
app.get("/api/recipes", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM recipes ORDER BY created_at DESC, id DESC",
  );
  res.json(rows);
});
app.post("/api/recipes", async (req, res) => {
  const data = validate(recipeSchema, req, res);
  if (!data) return;
  const { title, category, minutes, description, ingredients, steps } = data;
  const { rows } = await pool.query(
    "INSERT INTO recipes(title,category,minutes,description,ingredients,steps) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
    [title, category, minutes, description, ingredients, steps],
  );
  res.status(201).json(rows[0]);
});
app.get("/api/recipes/:id/comments", async (req, res) => {
  if (
    !(await pool.query("SELECT id FROM recipes WHERE id=$1", [req.entityId]))
      .rowCount
  )
    return res.status(404).json({ error: "菜谱不存在" });
  res.json(
    (
      await pool.query(
        "SELECT * FROM comments WHERE recipe_id=$1 ORDER BY created_at DESC,id DESC",
        [req.entityId],
      )
    ).rows,
  );
});
app.post("/api/recipes/:id/comments", async (req, res) => {
  const data = validate(commentSchema, req, res);
  if (!data) return;
  const { rows } = await pool.query(
    "INSERT INTO comments(recipe_id,author,content) VALUES($1,$2,$3) RETURNING *",
    [req.entityId, data.author, data.content],
  );
  res.status(201).json(rows[0]);
});
app.get("/api/orders", async (req, res) => {
  res.json(
    (
      await pool.query(
        "SELECT o.*,r.title,r.category,r.minutes FROM orders o JOIN recipes r ON r.id=o.recipe_id WHERE o.status='pending' ORDER BY o.created_at,o.id",
      )
    ).rows,
  );
});
app.post("/api/orders", async (req, res) => {
  const data = validate(orderSchema, req, res);
  if (!data) return;
  const { rows } = await pool.query(
    "INSERT INTO orders(recipe_id) VALUES($1) RETURNING *",
    [data.recipeId],
  );
  res.status(201).json(rows[0]);
});
app.patch("/api/orders/:id", async (req, res) => {
  const data = validate(statusSchema, req, res);
  if (!data) return;
  const { rows } = await pool.query(
    "UPDATE orders SET status=$1 WHERE id=$2 RETURNING *",
    [data.status, req.entityId],
  );
  if (!rows.length) return res.status(404).json({ error: "点菜记录不存在" });
  res.json(rows[0]);
});
app.delete("/api/orders/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM orders WHERE id=$1", [
    req.entityId,
  ]);
  if (!rowCount) return res.status(404).json({ error: "点菜记录不存在" });
  res.status(204).end();
});
app.use("/api", (req, res) => res.status(404).json({ error: "接口不存在" }));
app.use((err, req, res, next) => {
  if (err.code === "23503")
    return res.status(404).json({ error: "菜谱不存在" });
  if (err.code === "23505")
    return res.status(409).json({ error: "这道菜已在待做清单里啦" });
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ error: "请求格式错误" });
  if (err.type === "entity.too.large")
    return res.status(413).json({ error: "内容过长，请缩短后重试" });
  console.error(err);
  res.status(500).json({ error: "服务暂时出了点问题，请稍后再试" });
});
const server = app.listen(process.env.PORT || 3000, "0.0.0.0", () =>
  console.log("Foodie API ready"),
);
process.on("SIGTERM", () =>
  server.close(() => pool.end().then(() => process.exit(0))),
);
