import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  ChefHat,
  Plus,
  Search,
  Clock,
  ArrowUpRight,
  X,
  Check,
  Trash2,
  Utensils,
  MessageCircle,
  Leaf,
  LoaderCircle,
} from "lucide-react";
import "./style.css";
const categories = ["家常菜", "荤菜", "素菜", "汤羹", "主食", "甜品"];
const symbols: Record<string, string> = {
  家常菜: "🍳",
  荤菜: "🥩",
  素菜: "🥬",
  汤羹: "🍲",
  主食: "🍜",
  甜品: "🍮",
};
type Recipe = {
  id: number;
  title: string;
  category: string;
  minutes: number;
  description: string;
  ingredients: string;
  steps: string;
};
type Comment = {
  id: number;
  author: string;
  content: string;
  created_at: string;
};
type Order = {
  id: number;
  recipe_id: number;
  title: string;
  category: string;
  minutes: number;
};
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "连接失败，请稍后重试");
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
function Modal({
  title,
  onClose,
  children,
  notice,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  notice?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="关闭" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {notice && (
        <div className="modal-notice" role="status">
          {notice}
        </div>
      )}
      {children}
    </dialog>
  );
}
function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]),
    [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("全部"),
    [view, setView] = useState("recipes");
  const [adding, setAdding] = useState(false),
    [selected, setSelected] = useState<Recipe | null>(null),
    [busy, setBusy] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]),
    [commentLoading, setCommentLoading] = useState(false),
    [commentError, setCommentError] = useState("");
  const [formError, setFormError] = useState("");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [r, o] = await Promise.all([
        api<Recipe[]>("/recipes"),
        api<Order[]>("/orders"),
      ]);
      setRecipes(r);
      setOrders(o);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    let active = true;
    setComments([]);
    setCommentError("");
    if (!selected) return;
    setCommentLoading(true);
    api<Comment[]>(`/recipes/${selected.id}/comments`)
      .then((c) => {
        if (active) setComments(c);
      })
      .catch((e) => {
        if (active) setCommentError(e.message);
      })
      .finally(() => {
        if (active) setCommentLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected]);
  async function order(recipe: Recipe) {
    setBusy(true);
    try {
      await api("/orders", "POST", { recipeId: recipe.id });
      setOrders(await api<Order[]>("/orders"));
      setToast(`已点「${recipe.title}」，等开饭啦`);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changeOrder(id: number, done: boolean) {
    setBusy(true);
    try {
      await api(
        `/orders/${id}`,
        done ? "PATCH" : "DELETE",
        done ? { status: "done" } : undefined,
      );
      setOrders((o) => o.filter((item) => item.id !== id));
      setToast(done ? "做好啦，好好享用！" : "已取消这道菜");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function addRecipe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setFormError("");
    try {
      const recipe = await api<Recipe>("/recipes", "POST", {
        ...Object.fromEntries(data),
        minutes: Number(data.get("minutes")),
      });
      setRecipes((r) => [recipe, ...r]);
      setAdding(false);
      setCategory("全部");
      setQuery("");
      setView("recipes");
      setToast("新菜谱已收进你的厨房");
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function addComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setCommentError("");
    try {
      const comment = await api<Comment>(
        `/recipes/${selected.id}/comments`,
        "POST",
        Object.fromEntries(data),
      );
      setComments((c) => [comment, ...c]);
      (form.elements.namedItem("content") as HTMLTextAreaElement).value = "";
      setToast("留言已保存");
    } catch (e) {
      setCommentError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = recipes.filter(
    (r) =>
      (category === "全部" || r.category === category) &&
      `${r.title} ${r.ingredients}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const ordered = (id: number) => orders.some((o) => o.recipe_id === id);
  return (
    <>
      <header>
        <div className="header-inner">
          <a className="brand" href="/" aria-label="好好吃饭首页">
            <span className="brand-icon">
              <Utensils size={23} />
            </span>
            <span>
              好好吃饭<small>OUR LITTLE KITCHEN</small>
            </span>
          </a>
          <nav aria-label="主导航">
            <button
              className={view === "recipes" ? "active" : ""}
              onClick={() => setView("recipes")}
            >
              <BookOpen size={18} />
              私家菜谱
            </button>
            <button
              className={view === "orders" ? "active" : ""}
              onClick={() => setView("orders")}
            >
              <ChefHat size={19} />
              待做清单<span className="count">{orders.length}</span>
            </button>
          </nav>
          <span className="header-note">
            <span /> 一日三餐，认真对待
          </span>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> HOME IS WHERE THE FOOD IS
            </div>
            <h1>
              今天，想吃点什么<span>？</span>
            </h1>
            <p>把喜欢的味道记下来，把平凡的日子煮成欢喜。</p>
            <button
              className="primary"
              onClick={() => {
                setFormError("");
                setAdding(true);
              }}
            >
              <Plus size={18} />
              添加一道拿手菜
            </button>
            <div className="hero-foot">
              <span>
                私藏 <b>{recipes.length}</b> 道美味
              </span>
              <i />
              属于我们的小小厨房
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="sprig sprig-one">✳</span>
            <span className="sprig sprig-two">✳</span>
            <div className="plate">
              <div className="plate-inner">
                <span className="food">🍳</span>
                <span className="food-leaf">🌿</span>
              </div>
            </div>
            <div className="art-label">
              用心做饭，好好生活 <span>↗</span>
            </div>
            <span className="art-caption">MADE WITH LOVE ♡</span>
          </div>
        </section>
        <section className="content">
          <div className="section-head">
            <div>
              <div className="eyebrow green">
                {view === "recipes" ? "THE RECIPE COLLECTION" : "ON THE MENU"}
              </div>
              <h2>
                {view === "recipes" ? "我们的私家菜谱" : "等着开饭"}
                <span>
                  {view === "recipes" ? recipes.length : orders.length}
                </span>
              </h2>
            </div>
            {view === "recipes" ? (
              <label className="search">
                <Search size={18} />
                <input
                  aria-label="搜索菜名或食材"
                  placeholder="搜搜菜名，或冰箱里的食材…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            ) : (
              <button className="secondary" onClick={() => setView("recipes")}>
                继续点菜 <ArrowUpRight size={17} />
              </button>
            )}
          </div>
          {view === "recipes" && (
            <div className="categories" aria-label="菜谱分类">
              {["全部", ...categories].map((c) => (
                <button
                  key={c}
                  aria-pressed={category === c}
                  className={category === c ? "selected" : ""}
                  onClick={() => setCategory(c)}
                >
                  {c === "全部" ? (
                    <Utensils size={15} />
                  ) : (
                    <span>{symbols[c]}</span>
                  )}
                  {c === "全部" ? "全部菜谱" : c}
                </button>
              ))}
            </div>
          )}
          {error ? (
            <div className="empty" role="alert">
              <h3>厨房暂时连不上了</h3>
              <p>{error}</p>
              <button className="secondary" onClick={() => void refresh()}>
                重新连接
              </button>
            </div>
          ) : loading ? (
            <div className="empty">
              <LoaderCircle className="spin" />
              <p>正在打开小厨房…</p>
            </div>
          ) : view === "recipes" ? (
            filtered.length ? (
              <div className="recipe-grid">
                {filtered.map((r) => (
                  <article className="recipe-card" key={r.id}>
                    <button
                      className={`recipe-image tone-${categories.indexOf(r.category)}`}
                      aria-label={`查看${r.title}`}
                      onClick={() => setSelected(r)}
                    >
                      <span className="category-tag">{r.category}</span>
                      <span className="dish-symbol">{symbols[r.category]}</span>
                      <span className="image-arrow">
                        <ArrowUpRight size={20} />
                      </span>
                    </button>
                    <div className="card-body">
                      <button
                        className="title-button"
                        onClick={() => setSelected(r)}
                      >
                        <h3>{r.title}</h3>
                      </button>
                      <p>{r.description || "家里的味道，值得好好记录。"}</p>
                      <div className="card-bottom">
                        <span>
                          <Clock size={15} />
                          {r.minutes} 分钟
                        </span>
                        <button
                          className={
                            ordered(r.id)
                              ? "order-button ordered"
                              : "order-button"
                          }
                          disabled={busy || ordered(r.id)}
                          onClick={() => void order(r)}
                        >
                          {ordered(r.id) ? (
                            <Check size={16} />
                          ) : (
                            <Plus size={16} />
                          )}{" "}
                          {ordered(r.id) ? "已点" : "想吃这道"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                <button
                  className="add-card"
                  onClick={() => {
                    setFormError("");
                    setAdding(true);
                  }}
                >
                  <span>
                    <Plus size={27} />
                  </span>
                  <b>再添一道家的味道</b>
                  <small>让我们的菜谱慢慢丰富起来</small>
                </button>
              </div>
            ) : (
              <div className="empty">
                <div className="empty-icon">
                  <BookOpen size={32} />
                </div>
                <h3>
                  {recipes.length
                    ? "没有找到这道菜"
                    : "第一道拿手菜，从这里开始"}
                </h3>
                <p>
                  {recipes.length
                    ? "换个关键词或分类试试吧。"
                    : "记下食材和做法，下次想吃的时候就能找到。"}
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    if (recipes.length) {
                      setQuery("");
                      setCategory("全部");
                    } else {
                      setFormError("");
                      setAdding(true);
                    }
                  }}
                >
                  {recipes.length ? "查看全部菜谱" : "添加第一道菜"}
                </button>
              </div>
            )
          ) : orders.length ? (
            <div className="orders-list">
              {orders.map((o) => (
                <article className="order-row" key={o.id}>
                  <span className="order-emoji">{symbols[o.category]}</span>
                  <div>
                    <h3>{o.title}</h3>
                    <p>
                      {o.category} · {o.minutes} 分钟
                    </p>
                  </div>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => void changeOrder(o.id, true)}
                  >
                    <Check size={17} />
                    做好了
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`取消${o.title}`}
                    disabled={busy}
                    onClick={() => void changeOrder(o.id, false)}
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-icon">
                <ChefHat size={34} />
              </div>
              <h3>今天的菜单，等你来决定</h3>
              <p>在菜谱里点一下「想吃这道」，它就会出现在这里。</p>
              <button className="primary" onClick={() => setView("recipes")}>
                去看看有什么好吃的 <ArrowUpRight size={17} />
              </button>
            </div>
          )}
        </section>
        <footer>
          <span>
            <Leaf size={15} />
            好好吃饭，好好生活。
          </span>
          <span>一个属于自己的点菜本</span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {adding && (
        <Modal
          notice={toast}
          title="记下一道拿手菜"
          onClose={() => {
            if (!busy) setAdding(false);
          }}
        >
          <form onSubmit={addRecipe} className="recipe-form">
            <p className="form-intro">不用复杂，写下你最熟悉的家的味道。</p>
            <label>
              菜名
              <input
                name="title"
                required
                maxLength={80}
                placeholder="例如：番茄炒蛋"
                autoFocus
              />
            </label>
            <div className="form-row">
              <label>
                分类
                <select name="category">
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                用时（分钟）
                <input
                  name="minutes"
                  type="number"
                  min="1"
                  max="1440"
                  defaultValue="20"
                  required
                />
              </label>
            </div>
            <label>
              一句话介绍 <span className="optional">选填</span>
              <input
                name="description"
                maxLength={300}
                placeholder="酸甜开胃，每次都能多吃一碗饭"
              />
            </label>
            <label>
              需要的食材
              <textarea
                name="ingredients"
                required
                maxLength={3000}
                rows={3}
                placeholder={"番茄 2 个\n鸡蛋 3 个\n盐、糖 适量"}
              />
            </label>
            <label>
              做法步骤
              <textarea
                name="steps"
                required
                maxLength={8000}
                rows={5}
                placeholder={
                  "每行写一步，做饭时更容易看\n鸡蛋打散，番茄切块\n热锅炒蛋，盛出备用…"
                }
              />
            </label>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy ? "正在保存…" : "收进我的菜谱"}
            </button>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal
          notice={toast}
          title={selected.title}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <div className="detail">
            <div className="detail-meta">
              <span>
                {symbols[selected.category]} {selected.category}
              </span>
              <span>
                <Clock size={15} />
                {selected.minutes} 分钟
              </span>
            </div>
            {selected.description && (
              <p className="detail-description">{selected.description}</p>
            )}
            <h3>准备食材</h3>
            <div className="ingredients">{selected.ingredients}</div>
            <h3>下厨步骤</h3>
            <ol className="steps">
              {selected.steps
                .split("\n")
                .filter((s) => s.trim())
                .map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
            </ol>
            <button
              className="primary full"
              disabled={busy || ordered(selected.id)}
              onClick={() => void order(selected)}
            >
              {ordered(selected.id) ? <Check size={18} /> : <Plus size={18} />}{" "}
              {ordered(selected.id)
                ? "已在待做清单"
                : "想吃这道 · 加入待做清单"}
            </button>
            <div className="comments">
              <h3>
                <MessageCircle size={19} />
                厨房留言 <small>{comments.length}</small>
              </h3>
              <p className="form-intro">少放一点辣，或记下这次下厨的小心得。</p>
              {commentLoading ? (
                <p>留言加载中…</p>
              ) : comments.length === 0 ? (
                <p className="no-comments">
                  还没有留言，留一句给下次做饭的自己吧。
                </p>
              ) : (
                comments.map((c) => (
                  <article className="comment" key={c.id}>
                    <div>
                      <strong>{c.author}</strong>
                      <time>
                        {new Date(c.created_at).toLocaleString("zh-CN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p>{c.content}</p>
                  </article>
                ))
              )}
              <form onSubmit={addComment} className="comment-form">
                <label>
                  怎么称呼
                  <input
                    name="author"
                    required
                    maxLength={30}
                    placeholder="你的名字"
                  />
                </label>
                <label>
                  留言
                  <textarea
                    name="content"
                    required
                    maxLength={1000}
                    rows={3}
                    placeholder="想说点什么？"
                  />
                </label>
                {commentError && (
                  <p className="form-error" role="alert">
                    {commentError}
                  </p>
                )}
                <button className="secondary" disabled={busy || commentLoading}>
                  {busy ? "保存中…" : "留下这句话"}
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
