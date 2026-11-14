---
title: "What Garry taught me about programming"
written: "2020-08-21"
---

[Garry's Mod](https://store.steampowered.com/app/4000/Garrys_Mod/) is a game that [became a big hit](https://www.pcgamer.com/garrys-mod-interview/), and believe it or not, the credit doesn't go to its sandbox mode but to its community. It's basically a community game where anyone can be a developer and make new things, and that's beautiful. As I write this there are *more than 3,600 game modes* and *more than 25,000* maps on the [workshop](https://steamcommunity.com/app/4000/workshop/), and the most interesting part is that the game came out on Steam in 2006 and still has a big, active community today.

I've been an active member since 2014, and I've run servers in the game since 2015. Along the way I picked up a lot of experience, and not all of it is specific to video games. The point of this post is to share some of it.

## Lua

[Lua](http://www.lua.org/) is without a doubt the simplest language I've ever used. Version 5.1 (the one gmod uses) has only 8 types and 21 keywords. It's a scripting language that needs almost nothing to run, it's easy to prototype with and see things working, and even though it's interpreted the performance is great (and [LuaJIT](https://luajit.org/) exists to make that even more true).

### It's not your usual imperative language

Lua makes very few decisions for you. It lets you program in lots of ways: functional, OOP, and so on. But be careful, because it's very different from other languages. If you want to write Lua, I recommend studying it before writing anything important, since it's a very open language that will let you make terrible decisions without warning you.

In Lua there are no *objects* or arrays, everything is a table, and a table can behave like an ordered array, a graph, a tree, an associative array, etc. It's a single type that can hold many dynamically allocated values, created with `{}`.

As you can imagine, there are no classes in Lua either. If you want something like that, the most you get are metatables. There are actually several projects that try to bring these concepts into the Lua world. The only one I recommend is [MoonScript](https://moonscript.org/). The rest, as far as I've seen, just add more junk to your code and more complexity.

### You shouldn't learn Lua

Despite all that, I don't recommend Lua to anyone, especially beginners. It's a language that will hardly be useful for your future, and its behavior and conventions are very different from what we use in more popular languages. A few examples: there's no `++` increment operator or `+=` assignment, for *"not equal"* conditions you use `~=` instead of `!=`, there's no `&&` and `||` but `and` and `or`, there's no `continue` keyword for loops, which ends up cascading lots of `if`s, and arrays start at index `1`, not `0`.

## Separation of concerns

If you've played GMOD, you've probably run out of disk space. Every server you join downloads lots of custom files and models, and soon you have almost 100GB used by a single game. The most interesting part is that even after downloading more than 1,000 mods, they still work fine and interoperate transparently. I've always found that impressive. Back in the real world, honestly, writing independent code is really hard. Sure, we have design patterns for it, but sooner or later we end up tying some parts together.

The biggest lesson from all this is that you should always write code that is componentized, replaceable and extensible. Let's build an example: say you have a shop mod, and in it the users who donated to your server get a 10% discount on the whole shop. The simplest logic we'd think of is this (code in Lua):

- Some file in the shop mod:
```lua
function Shop:GetPrice(player, item_id)
    local price = Database:GetItemPrice(item_id)

    if player:IsDonator() then
        price = price - price * 0.1
    end

    return price
end
```

At first glance it looks right, but it's not great to mix shop logic with donation discount logic. They're completely different things. Ideally you'd make it extensible and put that logic straight into the donation mod, and for that Garry's Mod has the [hook API](https://wiki.facepunch.com/gmod/Hook_Library_Usage):

- Some file in the shop mod:
```lua
function Shop:GetPrice(player, item_id)
    local plain_price = Database:GetItemPrice(item_id)
    local player_price = hook.Run("SHOP_PlayerItemPrice", player, item_id, plain_price)

    return player_price or plain_price
end
```

- Some file in the donation mod:
```lua
if _G.Shop and _G.Shop:IsEnabled() then
    local donatorDiscount = 0.1

    hook.Add("SHOP_PlayerItemPrice", "CheckDonatorDiscount",
        function(player, item_id, plain_price)
            -- Always check that the arguments are valid when they come from public code
            if IsValid(player) and item_id and isnumber(plain_price) then
                if player:IsDonator() then
                    return plain_price * (1 - donatorDiscount)
                end
            end
        end)
end
```

Of course this code isn't 100% separating concerns: there's item logic inside the shop logic, event logic inside a function that gets a price, there are barely any layers, etc. But I think it illustrates extensible code well, which is what matters right now.

Focus on building small, extensible modules. In the real world, event architecture the way I showed it gets judged a lot, and passing data around in events is practically a crime, but honestly there are many cases where it works well. In JavaScript today we try hard to use monads, pure code and immutability, and the easiest way to get there is by writing [small independent modules](https://twitter.com/Rich_Harris/status/1139908960520220677) where extensibility lives in the parameters you pass.

Separation of concerns obviously involves a lot more. In bigger systems it might mean separating services or applications. The examples here are simple, and it's actually debatable whether they apply the [SRP](https://en.wikipedia.org/wiki/Single-responsibility_principle) at all, so don't take them as truth, take them as a starting point.

## Performance

Game development (or game modding) is delicate. Thousands of operations happen every millisecond, and if they're not orchestrated properly you'll easily run into performance problems, and when you try to optimize you might actually make things worse.

### Focus on the big bottlenecks

When there are performance problems, developers tend to dive into the code to micro-optimize: caching variables locally to reuse them, swapping arithmetic for constants, etc. That approach is naive at best and won't get you anywhere.

What you should do is focus on the big problems and make macro-optimizations. Those are the ones that pay off. In Garry's Mod, doubling FPS with a few optimizations isn't unusual, and the same goes for web apps: at the place I work now, a simple context menu once increased page load time by almost 80%, which is bizarre to say the least.

What are macro-optimizations? Reducing the complexity of heavy algorithms, using more efficient data structures, caching expensive calculations, doing less work inside the rendering context, and so on. Use a [profiler](https://developer.chrome.com/docs/devtools/performance) if you can. It's your friend and will help you find them.

The processing power available today is huge, and while that's great, it's also worrying. Garry's Mod has the Think hook, where you can run code on every frame, which means around 300 iterations per second, and it's not unusual to see mods running a bunch of unnecessary loops in there. The problem is that these bottlenecks don't show up right away. You only notice when you remember you used to run the game at 400 FPS and now you're at 200.

---

Garry's Mod is quite the school. Complex things done in simple ways, and every now and then you find yourself learning a bit more about bitwise operations, 3D rendering, networking, etc.

If you're into Garry's Mod modding too, don't hesitate to join our [Brazilian devs community on Discord](https://discord.gg/ytkXGNU).
