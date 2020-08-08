const fs = require('fs').promises
var md = require('markdown-it')({
	html: true,
	linkify: true,
	typographer: true
})

export default async () => {
	let mdFiles = []

	try {
		mdFiles = await fs.readdir('./posts')
	} catch {
		console.error('Failed to get posts')
	}

	const posts = []

	for (const mdFile of mdFiles) {
		const content = await fs.readFile('./posts/' + mdFile, 'utf-8')
		const metadataEnding = content.indexOf('}') + 1
		const metadata = JSON.parse(content.substring(0, metadataEnding).trim())
		
		if (metadata.hidden) {
			continue;
		}

		const html = md.render(content.slice(metadataEnding))

		posts.push({
			slug: mdFile.slice(0, -3),
			title: metadata.title,
			description: metadata.description,
			written: new Date(metadata.written),
			preview: html.substring(0, 400) + '...',
			html,
		})
	}

	return posts.sort((a, b) => a.written > b.written)
}