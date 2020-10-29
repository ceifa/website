import getPosts from '../_posts.js'

export async function get(req, res) {
	res.writeHead(200, {
		'Content-Type': 'application/json'
	})

	let posts = await getPosts()
	posts = posts
		.sort((a, b) => b.written - a.written)
		.map(post => post.hidden ? ({
			hidden: true,
			slug: post.slug
		}) : ({
			title: post.title,
			preview: post.preview,
			slug: post.slug
		}))

	res.end(JSON.stringify(posts))
}