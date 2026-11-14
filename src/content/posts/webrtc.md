---
title: "A short summary of WebRTC"
written: "2021-05-05"
---

The WebRTC API (Web Real-Time Communications) is a technology conceived by Google in 2009 and standardized by the W3C and IETF in 2013, after a [demo of a video call between Mozilla's and Google's browsers](https://blog.chromium.org/2013/02/hello-firefox-this-is-chrome-calling.html). Despite being used mostly for media streaming, WebRTC isn't necessarily about that. It lets apps and websites capture and send arbitrary data between clients peer-to-peer, without a middleman.

## How does it work?

### STUN server and ICE

To connect peers, first you'll need a STUN (Session Traversal Utilities for NAT) server. STUN is a protocol that other protocols use as a tool for dealing with NAT (Network Address Translation). In our case we need it to generate the [ICE candidates](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity#ice_candidates), a list of the IPs, ports and protocols available on that client.

### Signaling server

Peers don't know the others exist before connecting. So once each client has its ICE candidates, they need to negotiate a connection. For that, each peer has to send an [SDP](https://developer.mozilla.org/en-US/docs/Glossary/SDP) (Session Description Protocol) to the other peers, and getting each SDP to the other side is the developer's job.

The signaling flow goes like this: the first peer creates an offer and sends it to the second peer, which receives it and sends an answer back. Once the first peer receives the answer, they're ready to connect.

### TURN server

You can't count on browsers managing a direct connection, because some networks are more locked down and have stricter firewalls. In that case you'd need a TURN (Traversal Using Relays around NAT) server to relay the traffic between the peers.

### The whole flow

I hate these WebRTC handshake diagrams because they tend to be really confusing, but if you're a visual person, the flow looks more or less like this:

<a href="/images/webrtc-flow.png"><img src="/images/webrtc-flow.png" alt="The WebRTC connection flow between two peers, a signaling server and STUN/TURN servers" width="641" height="559" loading="lazy" decoding="async"></a>

## In practice

Despite all the servers needed for reliable communication over WebRTC, in practice you don't need all of it for small projects. They're cheap to run, so a [STUN server](https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b) and a signaling server are easy to find on the internet. TURN servers are trickier because they use a lot of bandwidth, but you don't always need one, and if you do, there are [good open source options](https://github.com/coturn/coturn).

To try it out, I wrote a chat in 100 lines using WebRTC with no private server at all, only public tools. [The code is here](https://github.com/ceifa/serverless-webrtc-chat/blob/master/src/index.js).
