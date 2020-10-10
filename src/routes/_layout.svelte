<script>
  //export let segment;
</script>

<style>
  main {
    position: relative;
    max-width: 56em;
    background-color: white;
    padding: 2em;
    margin: 0 auto;
    box-sizing: border-box;
  }
</style>

<svelte:head>
  {#if typeof window !== 'undefined' && navigator.doNotTrack !== '1'}
    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-173405674-1"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'UA-173405674-1');
    </script>
  {/if}
</svelte:head>

<main>
  <slot />
</main>
