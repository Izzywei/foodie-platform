import { test } from "node:test";
import assert from "node:assert/strict";
import { recipeSchema, commentSchema, parseId } from "../src/validation.js";
const recipe = {
  title: " 番茄炒蛋 ",
  category: "家常菜",
  minutes: 15,
  ingredients: "番茄、鸡蛋",
  steps: "炒熟",
};
test("recipe trims title and rejects invalid cooking times", () => {
  assert.equal(recipeSchema.parse(recipe).title, "番茄炒蛋");
  for (const minutes of [0, -1, 1.5, 1441, "15"])
    assert.equal(recipeSchema.safeParse({ ...recipe, minutes }).success, false);
});
test("empty and oversized comments are rejected", () => {
  for (const content of ["   ", "a".repeat(1001)])
    assert.equal(
      commentSchema.safeParse({ author: "我", content }).success,
      false,
    );
});
test("IDs cannot be partial, negative or unsafe numbers", () => {
  for (const id of ["1abc", "-1", "0", "1.5", "9007199254740992"])
    assert.equal(parseId(id), null);
  assert.equal(parseId("12"), 12);
});
