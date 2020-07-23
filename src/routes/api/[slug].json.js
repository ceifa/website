import getPosts from '../_posts.js'

export async function get(req, res) {
	res.writeHead(200, {
		'Content-Type': 'application/json'
	})

	const { slug } = req.params;

	const posts = await getPosts()
	res.end(JSON.stringify(posts.find(post => post.slug === slug)))
}