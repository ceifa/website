import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { describe, getPosts } from "../lib/posts";

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: "ceifa",
    description: "Posts by Gabriel Francisco.",
    site: context.site!,
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.written,
      link: `/${post.id}`,
      description: describe(post),
      content: post.rendered?.html,
    })),
  });
}
