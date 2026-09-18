import { z } from "zod";
export const categories = ["家常菜", "荤菜", "素菜", "汤羹", "主食", "甜品"];
const line = (max) => z.string().trim().min(1, "不能为空").max(max);
export const recipeSchema = z.object({
  title: line(80),
  category: z.enum(categories),
  minutes: z.number().int().min(1).max(1440),
  description: z.string().trim().max(300).default(""),
  ingredients: line(3000),
  steps: line(8000),
});
export const commentSchema = z.object({
  author: line(30),
  content: line(1000),
});
export const orderSchema = z.object({ recipeId: z.number().int().positive() });
export const statusSchema = z.object({ status: z.enum(["pending", "done"]) });
export function parseId(value) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
    return null;
  return Number(value);
}
