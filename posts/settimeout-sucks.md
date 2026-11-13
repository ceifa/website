{
    "title": "Why you shouldn't use setTimeout",
    "written": "2020-10-29"
}

I recently learned about the side effects of `setTimeout`, the hard way... I'll try to share a bit of my suffering so more people understand how evil this function is and can protect their families.

## Don't use it as eval

This one is a bit more obvious. You probably already know that using eval is bad practice too, and unless you're building a DRM it's really hard to find a legitimate case where it makes sense.

What few people know is that `setTimeout` doesn't only take a function as its first argument. It also takes strings, which your browser will run exactly like eval.

```js
setTimeout('DoEvilMaybeXSS()', 1000)
```

The lesson here is to never trust your functions' inputs. If you're using TypeScript it's a little easier to trust them*, and if you're using JavaScript, always check with `typeof`.

## Don't use it for animations

Creating animations with JavaScript is really easy. If you've ever tried, you probably used `setTimeout` or `setInterval`. A basic example would be:

```js
(function draw() {
    setTimeout(draw, 50);
    // Draws the animation
})()
```

The `draw` function would be called every 50ms. That frequency isn't ideal for animations, since smoothness also depends on the frame rate (fps). Most screens refresh at 60Hz, so for the smoothest result we should aim for 60fps:

<details>
<summary>Code used for the animation</summary>
<p>

```js
let tick = 0;
function doAnimation(canvas, advance){
    const ctx = canvas.getContext("2d")

    tick += advance;
    tick %= canvas.width

    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    ctx.fillRect(tick, 0, 10, canvas.height)
}
```

</p>
</details>


```js
;(function drawWithTimeout() {
    // 1s = 1000ms
    // 1000ms / 60(fps) = 16.7ms

    setTimeout(drawWithTimeout, 1000 / 60)
    doAnimation(document.querySelector("#timeout"))
})();
```

This produces the following result:

<canvas id="timeout" style="width:100%;height:100px"></canvas>
<script>
{
    let tick = 0;
    function doAnimation(canvas, advance){
        const ctx = canvas.getContext("2d")
        tick += advance;
        tick %= canvas.width
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        ctx.fillRect(tick, 0, 10, canvas.height)
    }
    const canvas = document.querySelector("#timeout")
    ;(function drawWithTimeout() {
        if (!canvas.isConnected) return
        setTimeout(drawWithTimeout, 1000 / 60)
        doAnimation(canvas, 1)
    })()
}
</script>

The problem is that `setTimeout` doesn't care about the browser's rendering. It will draw whenever it wants, not when or while the browser can. That means the browser has to deal with rendering the animation while it paints more important parts of the screen, and if the frame rate is out of sync with the screen's repaints, it can use more CPU.

The fix for this case is [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). It's always in sync (unless you turned VSync off) and guarantees it will be called right before each frame is rendered. The same example would look like this:

```js
(function drawWithRaf() {
    requestAnimationFrame(drawWithRaf)
    doAnimation(document.querySelector("#raf"))
})();
```

And it produces the following result, which is much smoother:

<canvas id="raf" style="width:100%;height:100px"></canvas>
<script>
{
    let tick = 0;
    function doAnimation(canvas, advance){
        const ctx = canvas.getContext("2d")
        tick += advance;
        tick %= canvas.width
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        ctx.fillRect(tick, 0, 10, canvas.height)
    }
    const canvas = document.querySelector("#raf")
    ;(function drawWithRaf() {
        if (!canvas.isConnected) return
        requestAnimationFrame(drawWithRaf)
        doAnimation(canvas, 1)
    })()
}
</script>

> Note: if the speeds look very different, know that you're privileged to own a really good monitor

## Freeing up the event loop

It's common to use `setTimeout` to reduce the amount of work done during a website's first render:

```js
// ... a bunch of important js ...

setTimeout(function() {
    // ... some expensive, non-trivial logic ...
}, 10)
```

In the case above I picked a 10ms delay, but will the browser really be free to process it 10ms from now? Always question these magic numbers. If you're not sure about the value you're using, you're probably doing it wrong. With [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback) you'll always get a good moment to run the code. Its purpose is to queue a function to be called at a more convenient time, when it affects other components less.

## Be predictable

Using setTimeout is a one-way street: the more you use it, the more you'll need it. Look at this example:

```js
function changeFoo() {
    setTimeout(function() {
        foo = 10
    }, 1)
}
```

We've already created a problem, because now callers also need a timeout to work properly:

```js
foo = 5

changeFoo()
console.log(foo) // 5

setTimeout(function() {
    console.log(foo) // 10
}, 1)
```

And it also affects unit tests, which by the way are great at catching these cases of potential chaos:

```js
test('variable foo should change to 10', function() {
    // Arrange
    foo = 5

    // Act
    changeFoo()

    // Assert
    setTimeout(function() {
        equals(foo, 10)
    }, 1)
})
```

We already know where this ends: at some point your code will be full of pointless `setTimeout`s that you don't know why they exist. You'll try to remove them but you won't be able to, because they were barely thought through and there's no predicting what any change will do.

The examples I used illustrate the point but they're weak. It's much more common to see timeouts used to wait for something asynchronous or for something whose flow you don't really control. In those cases use callbacks, async/await and events. They'll give you much more confidence.

## Legitimate cases

So you have a real case of a trivial function that doesn't depend on real-world time and can be delayed?

As a last resort, if you can, use an async delay:

```js
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

;(async () => {
    console.log('foo')
    await sleep(1000) // Waits 1 second
    console.log('bar')
})()
```

This makes it much clearer to tests and callers what happens. :)
