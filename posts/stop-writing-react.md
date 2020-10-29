{
    "title": "Pare de escrever React (carta de um svelter aflito)",
    "written": "2020-08-08",
    "description": "React é bom, mas nem em todos os casos ele se aplica, vamos dar uma olhada no Svelte e seus comparativos"
}

Ahhh, o [React](https://pt-br.reactjs.org/), algumas pessoas dizem que é difícil de configurar, aprender, etc. mas eu não acho, para mim sempre foi muito simples, um `create-react-app` e você já tem um boilerplate pronto, agora só começar a escrever código JavaScript. Parece tudo funcionar tão bem, você escreve alguns "uses" e as coisas começam a ser reativas, a se comportarem da forma esperada, não poderia ser melhor.

Eu pensei assim por muito tempo, até que vi a palestra do Rich Harris, sobre [Repensando a reatividade](https://www.youtube.com/watch?v=AdNJ3fydeao), **e depois de testar o svelte, eu simplesmente não consigo voltar para o React**.

Só para deixar claro de antemão, React é bom e tem boas aplicações, é bem performático por conta de suas técnicas com virtual DOM, memoização, imutabilidade, eficiência na renderização, etc. E de fato ainda vai melhorar bastante, principalmente pois possui uma grande comunidade por trás e o Facebook assume o compromisso de continuar nisso, inclusive alocando funcionários exclusivamente para a biblioteca. Um exemplo da sua constante melhora é o atual e ainda experimental [modo concorrente](https://pt-br.reactjs.org/docs/concurrent-mode-intro.html).

## Performance

### Tamanho do bundle

No momento em que escrevo, de acordo com [esse gist](https://gist.github.com/Restuta/cda69e50a853aa64912d)(fácil de testar e reproduzir) React embarca em uma aplicação, com minificação e compressão GZip, obrigatóriamente, **31.8kB**. Já o Svelte por si só, com minificação e compressão GZip, leva consigo um enorme valor de **0kB**. Isso porque Svelte não é um framework ou uma biblioteca, **Svelte é uma linguagem**, e ele não tem nenhum *runtime* ou algo do tipo, ele simplesmente compila seu código da forma que ele é.

### DOM vs DOM Virtual

Em [Repensando Melhores Práticas](https://www.youtube.com/watch?v=x7cQ3mrcKaY), uma palestra dada em 2013 pelo Pete Hunt, membro do time de React do facebook, ele diz:

> This is actually extremely fast, primarily because most DOM operations tend to be slow. There's been a lot of performance work on the DOM, but most DOM operations tend to drop frames.

E infelizmente é uma verdade, operações do DOM não são tão baratas, isto porque a cada modificação ele tenta pintar a tela novamente, e se feito muitas vezes em um curto período, pode começar a gargalar sua aplicação, visto que ele usa a mesma thread de execução JavaScript.

O problema é, utilizando DOM Virtual não necessariamente resolve isso, pois ele trabalha em *adição* ao DOM real, e nós sabemos que a [tarefa de *diffing* não é assim tão gratuita](https://twitter.com/pcwalton/status/1015694528857047040).

Não estou dizendo que o DOM Virtual é lento, os frameworks de hoje tem muitas otimizações para resolver isso. Mas e se nós simplesmente não precisássemos de um?

Isso é exatamente o que Svelte faz, diferente dos frameworks tradicionais, ele trabalha como um compilador e joga todo esse trabalho para o tempo de build, ao invés de resoluções em tempo de execução, deixando tudo bem mais simples para só fazer o necessário, utilizando o DOM real diretamente.

## Código

### Curva de aprendizado

Lembro-me de quando estava fazendo meu primeiro projeto do zero com react, eu basicamente comecei com quase 0 conhecimento na ferramenta e consegui ir descobrindo as coisas só vendo a documentação oficial(que é muito boa e simples) e exemplos de código. React é fácil, basicamente você só precisa aprender JavaScript, e com isso já consegue sair criando um monte de coisas com `JSX`. Para exemplificar, este é um código React:

```js
class TodoApp extends React.Component {
    // ... um monte de logica js ...

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

E para um desenvolvedor **JavaScript**(não necessariamente web designer) é muito claro o que está acontecendo, quando precisar da exibição do componente ele irá chamar o `render`, que em sua essência fará o map dos `todos` transformando cada um em um novo elemento HTML. 


Svelte já não é assim, apesar de focar em deixar as coisas o mais próximas do puro HTML, incluindo ter que especificar as tags `script` e `style`, o mesmo ainda tem o problema de ter o seu próprio *template engine*, que não necessariamente segue convenções do JavaScript:

```html
<script>
    // ... um monte de lógica js ...
</script>

<ul>
    {#each todos as todo}
        <li>{todo}</li>
    {/each}
</ul>
```

### React não é reativo

React depende que você utilize de algumas funções em sua API para que a reatividade de fato aconteça(`this.setState()`, `useState()`, `useEffect()`), Svelte sendo uma linguagem não precisa fazer isso, ele por definição utiliza de declarações da linguagem como o [label](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Statements/label) para tratar a reatividade e embute tudo já no momento da compilação. Veja este [exemplo](https://svelte.dev/repl/3341b89218734139abe75ac1bc8aa530?version=3.24.1):

```html
<script>
    let counter = 0;
    $: doubleCounter = counter * 2; // "$" significa que ele deve reagir às alterações das variáveis
</script>

<button on:click={() => counter++}>
    {counter} ~ {doubleCounter}
</button>
```

Estas são partes do código compilado:

```js
// ...
function c() {
    button = element("button");
    t0 = text(ctx[0]); // Ele atrelou o índice  0 à variável "counter"
    t1 = text(" ~ ");
    t2 = text(ctx[1]); // Ele atrelou o índice  1 à variável "doubleCounter"
}

// ...
function instance($$self, $$props, $$invalidate) {
    let counter = 0;
    const click_handler = () => $$invalidate(0, counter++, counter); // Ao clicar no botão, incrementa ao counter e o invalida
    let doubleCounter;

    $$self.$$.update = () => {
        if ($$self.$$.dirty & 1) { // Se o counter foi modificado
            $: $$invalidate(1, doubleCounter = counter * 2); // Troca o valor do doubleCounter e o invalida
        }
    };

    return [counter, doubleCounter, click_handler];
}

```

### Lócus de controle

Renderizar um componente a cada modificação é uma estrategia muito boa, mas precisamos ter cuidado pois alguns componentes que parecem fazer um trabalho simples podem começar a trazer problemas de performance:

```js
class TodoApp extends React.Component {
    // ... um monte de logica js ...

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

Nesse caso ele está criando um novo array de elementos `li` e cada um com uma função anônima sempre que o estado é atualizado, independentemente se a propriedade `todos` foi alterada. Claro que um componente desses não vai trazer problemas para sua aplicação, até porque com o processamento de hoje, criar 10 ou 1000 funções são tarefas baratas, mas pensando em escalabilidade, a medida que sua aplicação vai crescendo este problema começa a ser cada vez mais perceptível.

## Casos de uso

**React vale a pena.** Apesar de optar por Svelte em projetos pessoais(inclusive este blog), eu preferiria utilizar React em aplicações empresariais, isto porque react possui uma vasta comunidade engajada, com várias bibliotecas e ferramentas que ajudam no desenvolvimento, e com certeza não seria deixada de lado fácil, em vista que é utilizado por várias empresas de nível astronômico. Mas é preciso saber pesar caso a caso, se você possui um legado que já tem problemas de performance, colocar mais uma biblioteca pesada pode piorar as coisas, eu optaria por suportar micro-frontends e começar a passar partes criticas para o Svelte.

Importante lembrar que o React por si só [nem é sobre paginas web](https://pt-br.reactjs.org/docs/react-dom.html), e sim sobre criação de interfaces. E em casos de aplicativos mobile eu com certeza optaria por utilizar React Native.

O maior problema do React não é o React, e sim as pessoas que o desenvolvem, me irrito bastante com a *gangue do hook*, a falácia dos componentes puros e o [uso excessivo de gerenciadores de estado](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367)(que algumas vezes só acabam trazendo mais complexidade). Mas isso vou deixar para outra postagem.

[DM aberta para xingamentos.](https://twitter.com/_ceifa)