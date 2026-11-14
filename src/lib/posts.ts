import { getCollection } from "astro:content";

export async function getPosts() {
  const posts = await getCollection("posts");
  return posts.sort((a, b) => b.data.written.valueOf() - a.data.written.valueOf());
}

// Posts without a description use the start of their first paragraph.
export function describe(post: Awaited<ReturnType<typeof getPosts>>[number]) {
  if (post.data.description) return post.data.description;
  const text = (post.rendered?.html ?? "")
    .match(/<p>([\s\S]*?)<\/p>/)?.[1]
    ?.replace(/<[^>]+>/g, "")
    .trim();
  if (!text || text.length <= 180) return text ?? "";
  return text.slice(0, 180).replace(/\s+\S*$/, "…");
}
