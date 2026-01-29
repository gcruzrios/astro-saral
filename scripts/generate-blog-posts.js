#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function generateBlogPosts() {
	try {
		console.log('Fetching posts from WordPress API...')
		const res = await fetch(
			'https://api.greiv.in/wp-json/wp/v2/posts?per_page=4'
		)
		const posts = await res.json()

		const blogDir = path.join(__dirname, '../src/content/blog')

		// Ensure blog directory exists
		if (!fs.existsSync(blogDir)) {
			fs.mkdirSync(blogDir, { recursive: true })
		}

		for (const post of posts) {
			const slug = post.slug
			const title = post.title.rendered.replace(/"/g, '\\"')
			const content = post.content.rendered

			// Convert HTML content to markdown-like format
			let cleanContent = content
				// Remove HTML tags but keep content
				.replace(/<[^>]*>/g, '')
				// Handle HTML entities
				.replace(/&quot;/g, '"')
				.replace(/&#8217;/g, "'")
				.replace(/&#8230;/g, '...')
				.replace(/&#8211;/g, '–')
				// Clean up extra whitespace
				.replace(/\n\s*\n/g, '\n\n')
				.trim()

			// Extract first paragraph as description
			const description =
				cleanContent.split('\n\n')[0].substring(0, 200) + '...'

			// Format date for frontmatter
			const pubDate = new Date(post.date).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			})

			const frontmatter = `---
title: "${title}"
description: |
  ${description}
pubDate: '${pubDate}'
---

`

			const filePath = path.join(blogDir, `${slug}.md`)
			const fullContent = frontmatter + cleanContent

			fs.writeFileSync(filePath, fullContent, 'utf8')
			console.log(`Created: ${filePath}`)
		}

		console.log('✅ Blog posts generated successfully!')
	} catch (error) {
		console.error('❌ Error generating blog posts:', error)
	}
}

generateBlogPosts()
