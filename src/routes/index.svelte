<script context="module">
  export function preload({ params, query }) {
    return this.fetch("api/posts")
      .then(r => r.json())
      .then(posts => {
        return { posts };
      });
  }
</script>

<script>
  export let posts;
</script>

<style>
  h1 {
    font-weight: bold;
  }

  h1:hover {
    color: #555;
  }

  a {
    text-decoration: none;
  }

  .content-preview-container {
    position: relative;
    user-select: none;
  }

  .content-preview-container span::after {
    content: "";
    background: linear-gradient(rgba(255, 255, 255, 0.2), white);
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: block;
  }
</style>

<svelte:head>
  <title>Ceifa's Blog</title>
</svelte:head>

{#each posts as post}
  {#if post.hidden}
    <!-- Lazy solution -->
    <a href={post.slug} style="visibility: hidden; position: absolute;" />
  {:else}
    <article>
      <header>
        <h1>
          <a href={post.slug} rel="prefetch">{post.title}</a>
        </h1>
      </header>
      <div class="content-preview-container">
        <span>
          {@html post.preview}
        </span>
      </div>
    </article>
  {/if}
{/each}
