"use server";

import { getProductBySlug, getProductById } from "@/lib/api/products";

export async function getProductBySlugAction(slug: string) {
  return getProductBySlug(slug);
}

export async function getProductByIdAction(id: string) {
  return getProductById(id);
}
