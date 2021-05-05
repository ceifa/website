{
    "title": "Um pequeno resumo sobre WebRTC", 
    "written": "2021-05-05"
}

WebRTC API (Web Real-Time Communications) é uma tecnologia idealizada pela Google em 2009 e padronizada pela W3C e IETF em 2013, após uma [demonstração de uma video chamada entre a Mozilla e a Google em seus browsers](https://blog.chromium.org/2013/02/hello-firefox-this-is-chrome-calling.html). Apesar de seu amplo uso com transmissão de mídia, WebRTC não necessariamente é sobre isso, a tecnologia permite que aplicativos e sites capturem e transmitam informações arbitrárias entre os clientes via p2p(peer-to-peer), sem a necessidade de um intermediador.

## Como funciona?

### Servidor STUN e ICE

Para conectar pares, primeiramente você precisará de um servidor STUN(Session Traversal Utilities for NAT), este é um protocolo que serve como ferramenta para outros protocolos no tratamento do NAT(Network Address Translator). No nosso caso precisamos dele para gerar os [ICE candidates](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity#ice_candidates), que consiste em uma lista de IPs, portas e protocolos disponíveis naquele cliente.

### Servidor de Sinais

Os pares não tem conhecimento da existencia dos outros pares antes de fazer a conexão, sendo assim, após cada um dos clientes terem seus ICE candidates, eles precisarão negociar uma conexão, para isso cada um dos pares precisa mandar um [SDP](https://developer.mozilla.org/en-US/docs/Glossary/SDP)(Session Description Protocol) para os outros pares, e a tarefa de fazer o SDP de cada um chegar na outra ponta é do desenvolvedor.

O fluxo de troca de sinais é este: O primeiro par cria uma oferta e a envia para o segundo par, este a recebe e envia uma resposta de volta, quando o primeiro par recebe-la, eles estarão aptos a se conectarem.

### Servidor TURN

Não é seguro confiar que os navegadores conseguirão fazer uma conexão direta, isto porque algumas redes podem ser mais rigidas e terem um firewall mais estrito, neste caso você precisaria de um servidor TURN(Traversal Using Relays around NAT), este servirá para intermediar o trafego de dados entre os pares.

### Fluxo final

Odeio estas imagens mostrando o handshake do WebRTC porque costumam ser bem confusas, mas se você é uma pessoa visual, o fluxo fica mais ou menos assim:

<div style="text-align:center">
<img src="https://i.imgur.com/2S7ARGc.png">
</div>

## Na pratica

Apesar de todos estes servidores necessários para ter uma comunicação confiavel sob WebRTC, na prática você não precisa tudo isso para projetos pequenos, por serem tarefas baratas, um [servidor STUN](https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b) e um servidor para trocar sinais podem ser facilmente encontrados na internet. Já os servidores TURN são mais complicados por terem altos consumos de rede, mas também nem sempre precisamos de um, e caso precise, existem [boas soluções open source](https://github.com/coturn/coturn).

Para teste, fiz um [chat](https://chat.ceifa.tv) em 100 linhas utilizando WebRTC sem nenhuma necessidade de um servidor privado, utilizando somente ferramentas públicas, [código disponivel aqui](https://github.com/ceifa/serverless-webrtc-chat/blob/master/src/index.js).