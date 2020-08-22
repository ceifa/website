{
    "title": "Ensinamentos do Garry sobre programação",
    "written": "2020-08-21"
}

[Garry's Mod](https://store.steampowered.com/app/4000/Garrys_Mod/) é um jogo que [fez bastante sucesso](https://www.pcgamer.com/garrys-mod-interview/), e por incrivel que pareça essa medalha não vai para o seu modo sandbox, e sim para a comunidade, é basicamente um jogo comunitário em que todos podem ser desenvolvedores e criar coisas novas, e isso é lindo. No momento que escrevo temos *mais de 3.600 modos de jogo* e *mais de 25.000* mapas na [workshop](https://steamcommunity.com/app/4000/workshop/), e o mais interessante é que o jogo foi lançado na steam em 2006 e possui uma grande comunidade ativa até hoje.

Eu mesmo sou um membro ativo desde 2014, e desde 2015 tenho servidores dentro do jogo, com isso adquiri muita experiência e nem todas elas 100% específicas para jogos digitais. O intuito desta postagem é compartilhar um pouco desta experiência.

## Lua

[Lua](http://www.lua.org/) é sem duvida a linguagem mais simples que já conheci, na versão 5.1(atual do gmod) ela possui somente 8 tipos e 21 palavras chaves, é uma linguagem de script que não necessita de quase nada para fazer funcionar, é fácil de prototipar e ver as coisas rodando, e mesmo sendo interpretada tem uma performance incrivel(e o [LuaJIT](https://luajit.org/) existe pra deixar essa afirmação ainda mais verdadeira).

### Não é uma linguagem imperativa comum

Lua toma poucas decisões por você, ela te permite programar de diversas maneiras: programação funcional, POO, etc. Mas deve tomar cuidado pois a mesma difere muito de outras linguagens, e se deseja programar em lua recomendo estudar antes de começar a escrever código importante, visto que é uma linguagem muito aberta e que deixará você tomar pessimas decisões sem te avisar sobre isso.

Em Lua não possuímos *objetos* ou vetores, é tudo tabela, e a mesma pode se comportar como um vetor ordenado, um grafo, uma árvore, um array associativo, etc. é um tipo unico que pode guardar vários valores alocados de forma dinâmica, criado a partir de um `{}`.

Como pode imaginar, também não temos classes em Lua, se quer fazer algo do tipo, o máximo que terá são as metatables, na verdade existem vários projetos que tentam trazer esses conceitos para o mundo Lua, o único que recomendo é o [Moonscript](https://moonscript.org/), já o resto, até onde vi, acabam só trazendo mais lixo para o seu código e aumentando a complexidade.

### Você não deve aprender Lua

Apesar disso tudo, eu não recomendo lua para ninguém, principalmente para novatos, é uma linguagem que dificilmente servirá para o futuro, ela possui um comportamento e um padrão muito divergente do que utilizamos em outras linguagens mais populares, entre eles: não existe o operador de incremento `++` ou atribuição por `+=`, para fazer condições de *"diferente de"*, utilizamos `~=`, e não `!=`, não possui `&&` e `||`, e sim `and` e `or`, não possui a keyword `continue` para ser usada em repetições, o que acaba cascatando varios `ifs`, arrays começam no indice `1`, e não no `0`.

## Separação de conceitos

Se você jogou GMOD, provavelmente já se viu com falta de espaço no disco, a cada servidor que entramos baixamos vários arquivos e modelos customizados e rapidamente temos quase 100GBs sendo utilizados por somente um jogo, e o mais interessante é que apesar de termos baixado mais de 1000 modificações elas ainda funcionam bem, e se interoperam de forma transparente. Eu sempre achei isso impressionante, e levando para o mundo real, sinceramente é muito complicado escrever código independente, claro que temos design patterns para isso, mas uma hora ou outra acabamos amarrando certas partes.

O maior aprendizado disso tudo é que você deve sempre escrever código componentizado, substituível, e extensivel, vamos criar um exemplo em cima disso: supomos que você possui um mod de loja, e neste os usuários que doaram para o seu servidor recebem um desconto de 10% em toda a loja, a lógica mais simples que pensaríamos seria essa(código escrito em lua):

- Um arquivo qualquer do mod de loja:
```lua
function Shop:GetPrice(player, item_id)
    local price = Database:GetItemPrice(item_id)

    if player:IsDonator() then
        price = price - price * 0.1
    end

    return price
end
```

A primeira vista parece correto, mas não é legal misturar lógica de uma loja com lógica de desconto por doação, são coisas completamente distintas, o ideal seria deixar isso extensível e criar a lógica direto no mod de doações, para isso temos a [API de hooks](https://wiki.facepunch.com/gmod/Hook_Library_Usage) do Garry's Mod:

- Um arquivo qualquer do mod de loja:
```lua
function Shop:GetPrice(player, item_id)
    local plain_price = Database:GetItemPrice(item_id)
    local player_price = hook.Run("SHOP_PlayerItemPrice", player, item_id, plain_price)

    return player_price or plain_price
end
```

- Um arquivo qualquer do mod de doações:
```lua
if _G.Shop and _G.Shop:IsEnabled() then
    local donatorDiscount = 0.1

    hook.Add("SHOP_PlayerItemPrice", "CheckDonatorDiscount",
        function(player, item_id, plain_price)
            -- Sempre checar se os argumentos são válidos quando vindo de código publico
            if IsValid(player) and item_id and isnumber(plain_price) then
                if player:IsDonator() then
                    return plain_price * (1 - donatorDiscount)
                end
            end
        end)
end
```

Claro que o código não está 100% utilizando a separação de conceitos, temos lógica de item dentro da lógica da loja, lógica de eventos dentro de uma função para pegar preço, quase não tem camadas, etc. mas acho que ilustra bem a situação de código extensível, que é o importante por agora.

Foque na criação de pequenos módulos e que sejam extensíveis, no mundo real a arquitetura de eventos da forma que representei é bem mais julgada, ficar trafegando dados em eventos é praticamente um crime, mas sinceramente existem muitos casos que isso funciona bem. Hoje em JavaScript tentamos ao máximo utilizar o conceito de monadas, código puro e imutabilidade, a forma mais facil de alcançar esse tipo de coisa seria criando [pequenos modulos independentes](https://twitter.com/Rich_Harris/status/1139908960520220677) e a extensabilidade fica na passagem de parâmetros.

Lógico que separação de conceitos envolve muito mais coisas, falando de sistemas maiores talvez envolva separação de serviços/aplicações, aqui mostrei exemplos simples e que na verdade são questionaveis se estão mesmo aplicando o [SRP](https://en.wikipedia.org/wiki/Single-responsibility_principle), não tome-os como verdade, mas sim como um ponto de partida.

## Performance

Desenvolvimento de jogos(ou mod de jogos) é algo delicado, milhares de operações são feitas por milissegundo, e se não orquestrado corretamente, facilmente terá problemas de performance, e quando tentamos otimizar podemos na verdade estar piorando as coisas.

### Foque nos grandes gargalos

Quando temos problemas de performance, os desenvolvedores tendem a entrar no código para fazer micro-otimizações: guardando variáveis localmente para reusar, trocando operações aritméticas por constantes, etc. esse tipo de abordagem é no mínimo ingênuo e não vai te levar a lugar nenhum.

O que você deve fazer é focar nos grandes problemas, fazer as macro-otimizações, elas sim trarão benefício. Em Garry's Mod dobrar o FPS com algumas otimizações não é algo incomum, e isso vale também para aplicações web, já teve um caso onde trabalho atualmente em que um simples menu de contexto aumentou em quase 80% o tempo de carregamento da pagina, o que é no minimo bizarro.

Quais são as macro-otimizações? Reduzir a complexidade de algoritmos complexos, utilizar estruturas de dados mais eficientes, cachear cálculos caros, diminuir operações dentro do contexto de renderização, e assim vai. Use um [profiler](https://developers.google.com/web/tools/chrome-devtools/rendering-tools) se possivel, ele é seu amigo e ajudará a encontra-los.

É fato que o processamento disponível hoje é gigantesco, e apesar disso ser algo muito bom, também é preocupante. Em Garry's Mod temos o hook Think, onde podemos adicionar processamento a cada frame processado, e nisso estamos falando de cerca de 300 interações por segundo, não é incomum ver mods fazendo vários laços de repetição desnecessários em cima disso, o problema é que esses gargalos não aparecem de cara, você só começa a notar quando se lembra que rodava o jogo a 400 FPS e agora está em 200.

---

Garry's Mod é uma faculdade e tanta, são coisas complexas feitas de maneira simples, e vez ou outra você se vê aprendendo um pouco mais sobre bitwise, renderização 3D, networking, etc.

Se você também é um entusiasta de mods de Garry's Mod, não hesite em entrar na nossa [comunidade de Devs BRs no discord](https://discord.gg/ytkXGNU).