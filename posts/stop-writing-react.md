{
    "title": "Stop writing React (a letter from a distressed svelter)",
    "written": "2020-08-08",
    "description": "React is good, but it doesn't fit every case. A look at Svelte and how the two compare."
}

Ahhh, [React](https://react.dev/). Some people say it's hard to set up, to learn, etc., but I don't think so. For me it was always really simple: one `create-react-app` and you have a boilerplate ready, now just start writing JavaScript. Everything seems to work so well. You write a few "uses" and things become reactive and behave the way you expect. It couldn't be better.

I thought that for a long time, until I watched Rich Harris's talk [Rethinking reactivity](https://www.youtube.com/watch?v=AdNJ3fydeao), **and after trying Svelte, I just can't go back to React**.

Just to be clear up front: React is good and has good use cases. It performs well thanks to its techniques around the virtual DOM, memoization, immutability, efficient rendering, etc. And it will still get a lot better, especially because it has a big community behind it and Facebook is committed to it, even assigning employees exclusively to the library. One example of how it keeps improving is the current, still experimental, concurrent mode.

## Performance

### Bundle size

As I write this, according to [this gist](https://gist.github.com/Restuta/cda69e50a853aa64912d) (easy to test and reproduce), React necessarily ships **31.8kB** into an application, minified and gzipped. Svelte on its own, minified and gzipped, brings along a whopping **0kB**. That's because Svelte isn't a framework or a library, **Svelte is a language**, and it has no *runtime* or anything like that. It just compiles your code as it is.

### DOM vs virtual DOM

In [Rethinking Best Practices](https://www.youtube.com/watch?v=x7cQ3mrcKaY), a 2013 talk by Pete Hunt from Facebook's React team, he says:

> This is actually extremely fast, primarily because most DOM operations tend to be slow. There's been a lot of performance work on the DOM, but most DOM operations tend to drop frames.

And sadly that's true. DOM operations aren't that cheap, because on every change the browser tries to repaint the screen, and if that happens many times in a short period it can start to bottleneck your application, since it uses the same thread as your JavaScript.

The problem is that using a virtual DOM doesn't necessarily solve this, because it works *on top of* the real DOM, and we know [diffing isn't exactly free](https://twitter.com/pcwalton/status/1015694528857047040).

I'm not saying the virtual DOM is slow. Today's frameworks have lots of optimizations for that. But what if we simply didn't need one?

That's exactly what Svelte does. Unlike traditional frameworks, it works as a compiler and moves all that work to build time instead of resolving it at runtime, which keeps things much simpler and does only what's needed, using the real DOM directly.

## Code

### Learning curve

I remember doing my first project from scratch with React. I started with almost zero knowledge of the tool and figured things out just by reading the official docs (which are really good and simple) and code examples. React is easy: you basically only need to learn JavaScript, and with that you can start building a bunch of stuff with `JSX`. For example, this is React code:

```js
class TodoApp extends React.Component {
    // ... a bunch of js logic ...

    render() {
        return (
            <ul>
                {this.state.todos.map(todo => (
                    <li>{todo}</li>
                ))}
            </ul>
        )
    }
}
```

For a **JavaScript** developer (not necessarily a web designer) it's very clear what's happening: when the component needs to be displayed it calls `render`, which essentially maps the `todos`, turning each one into a new HTML element.

Svelte isn't like that. Even though it focuses on staying as close as possible to plain HTML, including having to write the `script` and `style` tags, it still has the problem of having its own *template engine*, which doesn't necessarily follow JavaScript conventions:

```html
<script>
    // ... a bunch of js logic ...
</script>

<ul>
    {#each todos as todo}
        <li>{todo}</li>
    {/each}
</ul>
```

### React isn't reactive

React depends on you calling some functions from its API for reactivity to actually happen (`this.setState()`, `useState()`, `useEffect()`). Svelte, being a language, doesn't need that. By design it uses language statements like the [label](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/label) to handle reactivity and bakes everything in at compile time. Look at this [example](https://svelte.dev/repl/3341b89218734139abe75ac1bc8aa530?version=3.24.1):

```html
<script>
    let counter = 0;
    $: doubleCounter = counter * 2; // "$" means it should react to changes in the variables
</script>

<button on:click={() => counter++}>
    {counter} ~ {doubleCounter}
</button>
```

These are parts of the compiled code:

```js
// ...
function c() {
    button = element("button");
    t0 = text(ctx[0]); // It bound index 0 to the "counter" variable
    t1 = text(" ~ ");
    t2 = text(ctx[1]); // It bound index 1 to the "doubleCounter" variable
}

// ...
function instance($$self, $$props, $$invalidate) {
    let counter = 0;
    const click_handler = () => $$invalidate(0, counter++, counter); // On click, increments counter and invalidates it
    let doubleCounter;

    $$self.$$.update = () => {
        if ($$self.$$.dirty & 1) { // If counter changed
            $: $$invalidate(1, doubleCounter = counter * 2); // Updates doubleCounter and invalidates it
        }
    };

    return [counter, doubleCounter, click_handler];
}

```

### Locus of control

Re-rendering a component on every change is a really good strategy, but we need to be careful, because some components that seem to do simple work can start causing performance problems:

```js
class TodoApp extends React.Component {
    // ... a bunch of js logic ...

    render() {
        return (
            <ul>
                {this.state.todos.map(todo => (
                    <li onClick={() => deleteTodo(todo)}>{todo}</li>
                ))}
            </ul>
        )
    }
}
```

Here it creates a new array of `li` elements, each with an anonymous function, every time the state updates, whether or not the `todos` property changed. Of course a component like this won't hurt your application, since with today's hardware creating 10 or 1,000 functions is cheap, but thinking about scale, as your application grows this problem becomes more and more noticeable.

## Use cases

**React is worth it.** Even though I choose Svelte for personal projects (including this blog), I'd rather use React for business applications, because React has a huge engaged community, with lots of libraries and tools that help development, and it surely won't be abandoned easily, given it's used by companies of astronomical size. But you have to weigh it case by case. If you have a legacy app that already has performance problems, adding another heavy library might make things worse. I'd go with micro-frontends and start moving critical parts to Svelte.

It's worth remembering that React by itself [isn't even about web pages](https://react.dev/reference/react-dom), it's about building interfaces. And for mobile apps I'd definitely go with React Native.

React's biggest problem isn't React, it's the people who write it. The *hook gang*, the pure components fallacy and the [overuse of state managers](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367) (which sometimes just add more complexity) really get on my nerves. But I'll leave that for another post.

[DMs open for insults.](https://x.com/_ceifa)
