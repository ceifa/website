{
    "title": "Porque não utilizar setTimeouts",
    "written": "2020-10-29"
}

Recentemente eu aprendi sobre os efeitos colaterais do `setTimeout`, isso da pior forma... Vou tentar compartilhar um pouco do meu sofrimento para que mais pessoas entendam o quão maldoso é esta função e possam proteger suas famílias. 

## Não use como eval

Este caso é um pouco mais obvio, você provavelmente já sabe que usar eval é também uma má pratica, a não ser que você esteja criando uma DRM é muito dificil encontrar um caso legítimo e que faça sentido o seu uso.

A questão que poucas pessoas sabem é que o `setTimeout` não aceita somente uma função como primeiro argumento, ele também aceita strings, e ela será executada no seu navegador com o mesmo comportamento do eval.

```js
setTimeout('DoEvilMaybeXSS()', 1000)
```

O aprendizado aqui é nunca confiar nos inputs de suas funções, se você estiver utilizando Typescript é um pouco mais fácil de confiar*, caso utilize javascript sempre faça checagens utilizando o `typeof`.

## Não use para animações

Criar animações com javascript é muito fácil, se você já tentou provavelmente usou o `setTimeout` ou `setInterval`, um exemplo básico seria:

```js
(function draw() {
    setTimeout(draw, 50);
    // Produz os desenhos da animação
})()
```

A função `draw` seria chamada a cada 50ms, esta frequência não é o ideal para animações tendo em vista que a suavidade da mesma depende também do "frame rate"(fps). A maioria das telas possuem uma taxa de atualização de 60Hz, ou seja, para a melhor suavidade possível nós devemos calcular em cima de 60fps:

<details>
<summary>Código utilizado para a animação</summary>
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

Isso produzirá o seguinte resultado:

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
    let lastTime = 0
    ;(function drawWithTimeout() {
        setTimeout(drawWithTimeout, 1000 / 60)
        doAnimation(document.querySelector("#timeout"), 1)
    })()
}
</script>

O problema é que o `setTimeout` não considera as renderizações do browser, ele simplesmente irá renderizar sempre que quiser, não quando/enquanto o browser puder, isso significa que o navegador precisará se preocupar em renderizar a animação enquanto desenha partes mais importantes da tela, e caso a taxa de quadros estiver em dessincronização com o redesenho da tela, pode ocupar mais CPU.

A solução para este caso é utilizar o [requestAnimationFrame](https://developer.mozilla.org/pt-BR/docs/Web/API/Window/requestAnimationFrame), ele sempre está em sincronia(a não ser que você tenha desligado o VSync) e te dá certeza que será chamado exatamente antes de cada renderização de quadro. O mesmo exemplo ficaria assim:

```js
(function drawWithRaf() {
    requestAnimationFrame(drawWithRaf)
    doAnimation(document.querySelector("#raf"))
})();
```

E produzirá o seguinte resultado, que é muito mais suave:

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
    ;(function drawWithRaf() {
        requestAnimationFrame(drawWithRaf)
        doAnimation(document.querySelector("#raf"), 1)
    })()
}
</script>

> Obs: Caso a velocidade esteja muito diferente saiba que você é um privilegiado por ter um monitor muito bom

## Desafogamento do event loop

É comum o uso de `setTimeout` para diminuir a quantidade de trabalho a ser feito durante a primeira renderização de um website:

```js
// ... um monte de js importante ...

setTimeout(function() {
    // ... alguma lógica bastante custosa e não trivial ...
}, 10)
```

No caso acima eu escolhi um intervalo de 10ms, mas será mesmo que o browser estará tranquilo para processar daqui 10ms? Sempre questione estes números mágicos, se você não tem certeza do valor utilizado provavelmente está fazendo errado. Com [requestIdleCallback](https://developer.mozilla.org/pt-BR/docs/Web/API/Window/requestIdleCallback) você sempre pegará um bom momento para executar o código, o objetivo dele é enfileirar uma função para ser chamada em um momento mais oportuno, que impacte menos os outros componentes.

## Seja preditivo

O uso do setTimeout é um caminho sem volta, quanto mais você usa, mais precisará usar, veja este exemplo:

```js
function changeFoo() {
    setTimeout(function() {
        foo = 10
    }, 1)
}
```

Aqui já criamos um problema, pois os consumidores agora precisarão também de um timeout para funcionar bem:

```js
foo = 5

changeFoo()
console.log(foo) // 5

setTimeout(function() {
    console.log(foo) // 10
}, 1)
```

E isso também impacta os testes unitários, que inclusive são ótimos para pegar estes casos de possivel caos:

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

Já sabemos onde isso acaba, em algum momento seu código vai estar lotado de `setTimeouts` sem sentido que você não sabe porque existem, você vai tentar retirá-los mas não conseguirá pois eles foram minimamente pensados e qualquer mudança é totalmente imprevisível do que pode acontecer.

Os exemplos utilizados apesar de ilustrarem bem, são fracos, é muito mais comum ver timeouts para esperar algo assíncrono ou para algo que você não possui muito controle do fluxo, nestes casos use callbacks, async-await, e eventos, eles trarão muito mais confiança.

## Casos legítimos

Então você possui um caso real de uma função trivial que não dependa do tempo do mundo real e pode ser atrasada?

Como ultima solução, se possível utilize um delay assincrono:

```js
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

;(async () => {
    console.log('foo')
    await sleep(1000) // Espera 1 segundo
    console.log('bar')
})()
```

Isto fará os testes e consumidores fiquem muito mais seguros do que acontece. :)