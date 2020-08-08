<script context="module">
  import "highlight.js/styles/vs2015.css"

  export async function preload({ params, query }) {
    const res = await this.fetch(`api/${params.slug}.json`);
    const data = await res.json();

    if (res.status === 200) {
      return { post: data };
    } else {
      this.error(res.status, data.message);
    }
  }
</script>

<script>
  export let post;
</script>

<style>
  h1 {
    font-weight: bold;
  }

  .content :global(h2) {
    font-size: 1.4em;
    font-weight: 500;
  }

  .content :global(ul) {
    line-height: 1.5;
  }

  .content :global(li) {
    margin: 0 0 0.5em 0;
  }

  .content :global(blockquote) {
    background: #f9f9f9;
    border-left: 10px solid #ccc;
    margin: 1.5em 0;
    padding: 0.5em 10px;
  }

  .content :global(blockquote p) {
    display: inline;
  }
</style>

<svelte:head>
  <title>{post.title}</title>
  <meta name="description" content={post.description} />
</svelte:head>

<h1>{post.title}</h1>

<div class="content">
  {@html post.html}
</div>

<div>
  <a href="/">&lt;- Voltar</a>
</div>
