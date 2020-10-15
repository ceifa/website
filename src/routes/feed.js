import getPosts from './_posts.js'

export async function get(req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/atom+xml'
    })

    const posts = await getPosts()

    const feed = `
<feed xml:base="https://ceifa.tv/" xmlns="http://www.w3.org/2005/Atom">
    <title type="text">Ceifa's Blog</title>
    <subtitle type="text">Latest blog posts</subtitle>
    <id>ceifasblog</id>
    <updated>${posts.sort((a, b) => a.written > b.written)[0].written.toISOString()}</updated>
    <link href="https://ceifa.tv/" />${
        posts.map(post => `
    <entry>
        <id>${post.slug}</id>
        <title type="text">${post.title}</title>
        <updated>${post.written.toISOString()}</updated>
        <link rel="alternate" href="https://ceifa.tv/${post.slug}" />
        <content type="text" />
    </entry>`)
            .join('')
    }
</feed>
`.trim();

    res.end(feed)
}